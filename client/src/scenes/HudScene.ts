import Phaser from "phaser";
import type { NetworkManager } from "../net/NetworkManager";
import type { SoundManager } from "../audio/SoundManager";
import { Minimap } from "../ui/Minimap";
import {
  WEAPONS, WEAPON_IDS, UPGRADES, UPGRADE_IDS, upgradeCost, MAX_PLAYERS,
  type WeaponId, type UpgradeId,
} from "@zombie-waves/shared";

const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const DISPLAY_FONT = "Bangers, Impact, system-ui, sans-serif";
const C = { panel: 0x0c0d14, border: 0x7ed957, text: "#f2f2f2", muted: "#9aa0a6", accent: "#7ed957", danger: "#ff6b6b", gold: "#ffd166" };

interface ShopCard {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  info: Phaser.GameObjects.Text;
  price: Phaser.GameObjects.Text;
}

/**
 * HUD superpuesto: vida, dinero, arma, oleada, marcador, minimapa, tienda (B) y lobby.
 * Se dibuja encima de GameScene y lee el estado directamente del servidor.
 */
export class HudScene extends Phaser.Scene {
  private net!: NetworkManager;
  private sfx!: SoundManager;
  private minimap!: Minimap;

  private statusPanel!: Phaser.GameObjects.Container;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private weaponIcon!: Phaser.GameObjects.Image;
  private killsText!: Phaser.GameObjects.Text;

  private wavePanel!: Phaser.GameObjects.Container;
  private waveText!: Phaser.GameObjects.Text;
  private waveSub!: Phaser.GameObjects.Text;

  private scorePanel!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;

  private banner!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private codeText!: Phaser.GameObjects.Text;

  private shopPanel!: Phaser.GameObjects.Container;
  private shopMoney!: Phaser.GameObjects.Text;
  private shopCards: ShopCard[] = [];
  private waveBanner!: Phaser.GameObjects.Text;
  private bigCountdown!: Phaser.GameObjects.Text;
  private lastCountdownShown = -1;
  private lobbyPanel!: Phaser.GameObjects.Container;
  private lobbyText!: Phaser.GameObjects.Text;
  private pausePanel!: Phaser.GameObjects.Container;
  private pauseOpen = false;
  private shopOpen = false;

  constructor() {
    super("hud");
  }

  create() {
    this.net = this.registry.get("net") as NetworkManager;
    this.sfx = this.registry.get("sfx") as SoundManager;

    // ---- Estado del jugador (arriba izquierda)
    this.statusPanel = this.panel(0, 0, 270, 104);
    this.statusPanel.add(this.icon(26, 24, "icon_heart", 22));
    this.statusPanel.add(this.add.rectangle(42, 14, 214, 20, 0x000000, 0.6).setOrigin(0));
    this.hpBar = this.add.rectangle(43, 15, 212, 18, 0x7ed957).setOrigin(0);
    this.hpText = this.text(149, 24, "", 12, C.text, "bold").setOrigin(0.5);
    this.statusPanel.add(this.icon(26, 54, "icon_money", 22));
    this.moneyText = this.text(44, 44, "", 17, C.gold, "bold");
    this.weaponIcon = this.icon(28, 82, "icon_pistol", 26);
    this.statusPanel.add(this.weaponIcon);
    this.weaponText = this.text(46, 73, "", 14, C.text);
    this.killsText = this.text(256, 73, "", 13, C.muted).setOrigin(1, 0);
    this.statusPanel.add([this.hpBar, this.hpText, this.moneyText, this.weaponText, this.killsText]);

    // ---- Oleada (arriba centro)
    this.wavePanel = this.panel(0, 0, 360, 64);
    this.waveText = this.add.text(180, 8, "", { fontFamily: DISPLAY_FONT, fontSize: "30px", color: C.text }).setOrigin(0.5, 0);
    this.waveSub = this.text(180, 42, "", 13, C.muted).setOrigin(0.5, 0);
    this.wavePanel.add([this.waveText, this.waveSub]);

    // ---- Marcador (arriba derecha)
    this.scorePanel = this.panel(0, 0, 200, 96);
    this.scoreText = this.text(186, 12, "", 13, C.text).setOrigin(1, 0).setLineSpacing(3);
    this.scorePanel.add([this.text(14, 12, "EQUIPO", 11, C.muted, "bold"), this.scoreText]);

    // ---- Minimapa (abajo derecha) y código de sala
    this.minimap = new Minimap(this, this.net);
    this.codeText = this.text(0, 0, "", 12, C.muted).setOrigin(1, 1);

    // ---- Cartel de oleada (entra con golpe) y cuenta atrás grande
    this.waveBanner = this.add.text(0, 0, "", { fontFamily: DISPLAY_FONT, fontSize: "72px", color: "#ff6b6b", stroke: "#000", strokeThickness: 8 })
      .setOrigin(0.5).setAlpha(0).setDepth(150);
    this.bigCountdown = this.add.text(0, 0, "", { fontFamily: DISPLAY_FONT, fontSize: "96px", color: "#ffd166", stroke: "#000", strokeThickness: 8 })
      .setOrigin(0.5).setAlpha(0).setDepth(150);
    this.net.callbacks(this.net.state).listen("phase", (phase: string, prev: string) => {
      if (prev === undefined) return;
      if (phase === "active") this.showBanner(`OLEADA ${this.net.state.wave}`, "#ff6b6b");
      else if (phase === "countdown" && prev === "active") this.showBanner("¡OLEADA SUPERADA!", "#7ed957");
      else if (phase === "gameover") this.showBanner("GAME OVER", "#ff6b6b");
    });

    // ---- Aviso central y ayuda
    this.banner = this.text(0, 0, "", 34, C.danger, "bold").setOrigin(0.5).setAlign("center").setShadow(0, 3, "#000", 6);
    this.hint = this.text(0, 0, "B: tienda · M: sonido · ESC: menú", 12, C.muted).setOrigin(0, 1);

    // ---- Tienda
    this.shopPanel = this.panel(0, 0, 640, 400).setVisible(false);
    this.shopPanel.add(this.add.text(320, 14, "TIENDA", { fontFamily: DISPLAY_FONT, fontSize: "30px", color: C.accent }).setOrigin(0.5, 0));
    this.shopMoney = this.text(320, 50, "", 14, C.gold, "bold").setOrigin(0.5, 0);
    this.shopPanel.add(this.shopMoney);
    this.shopPanel.add(this.text(20, 80, "ARMAS", 12, C.muted, "bold"));
    this.shopPanel.add(this.text(20, 232, "MEJORAS", 12, C.muted, "bold"));
    const upgradeIcons: Record<UpgradeId, string> = { vest: "icon_vest", speed: "icon_speed", damage: "icon_damage", fire_rate: "icon_firerate", max_hp: "icon_hp" };
    WEAPON_IDS.forEach((id, i) => this.shopCards.push(this.card(20 + i * 152, 98, 140, 122, i + 1, `icon_${id}`, () => this.tryBuy(i + 1))));
    UPGRADE_IDS.forEach((id, i) => this.shopCards.push(this.card(20 + i * 121, 250, 110, 128, i + 5, upgradeIcons[id], () => this.tryBuy(i + 5))));
    for (const c of this.shopCards) this.shopPanel.add(c.root);

    // ---- Lobby (sala de espera)
    this.lobbyPanel = this.panel(0, 0, 500, 320).setVisible(false);
    this.lobbyText = this.text(250, 160, "", 16, C.text).setOrigin(0.5).setAlign("center").setLineSpacing(6);
    this.lobbyPanel.add(this.lobbyText);

    // ---- Menú de pausa (ESC)
    this.pausePanel = this.panel(0, 0, 360, 190).setVisible(false).setDepth(200);
    this.pausePanel.add(this.add.text(180, 14, "MENÚ", { fontFamily: DISPLAY_FONT, fontSize: "28px", color: C.accent }).setOrigin(0.5, 0));
    this.pausePanel.add(this.button(180, 70, 300, "Seguir jugando  (ESC)", () => this.togglePause(false)));
    this.pausePanel.add(this.button(180, 124, 300, "Salir al menú principal  (Q)", () => this.exitGame(), true));

    // ---- Teclas
    const kb = this.input.keyboard!;
    kb.on("keydown-ESC", () => this.togglePause(!this.pauseOpen));
    kb.on("keydown-Q", () => { if (this.pauseOpen) this.exitGame(); });
    kb.on("keydown-ENTER", () => {
      if (this.net.state.phase === "lobby" && this.net.isHost) this.net.startGame();
    });
    kb.on("keydown-B", () => {
      this.shopOpen = !this.shopOpen;
      this.shopPanel.setVisible(this.shopOpen);
    });
    kb.on("keydown-M", () => {
      const muted = this.sfx.toggleMute();
      this.hint.setText(muted ? "B: tienda · M: sonido (silenciado) · ESC: menú" : "B: tienda · M: sonido · ESC: menú");
    });
    kb.on("keydown", (event: KeyboardEvent) => {
      if (!this.shopOpen) return;
      const n = Number(event.key);
      if (Number.isInteger(n)) this.tryBuy(n);
    });

    this.scale.on("resize", () => this.layout());
    this.layout();
    // ?shop=1 (pruebas): abre la tienda al entrar
    if (new URLSearchParams(location.search).get("shop")) { this.shopOpen = true; this.shopPanel.setVisible(true); }
  }

  // ------------------------------------------------------------------ helpers de UI

  private panel(x: number, y: number, w: number, h: number) {
    const g = this.add.graphics();
    g.fillStyle(C.panel, 0.82).fillRoundedRect(0, 0, w, h, 10);
    g.lineStyle(2, C.border, 0.5).strokeRoundedRect(0, 0, w, h, 10);
    g.fillStyle(C.border, 0.9).fillRect(10, 0, w - 20, 3);
    return this.add.container(x, y, [g]);
  }

  /** Botón clicable centrado en (x, y). */
  private button(x: number, y: number, w: number, label: string, onClick: () => void, danger = false) {
    const bg = this.add.rectangle(x, y, w, 40, danger ? 0x5a1f1f : 0x2b2b38).setStrokeStyle(2, danger ? 0xff6b6b : 0x7ed957, 0.7);
    const txt = this.text(x, y, label, 15, C.text, "bold").setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true })
      .on("pointerover", () => bg.setFillStyle(danger ? 0x7a2a2a : 0x3a3a4a))
      .on("pointerout", () => bg.setFillStyle(danger ? 0x5a1f1f : 0x2b2b38))
      .on("pointerdown", onClick);
    return this.add.container(0, 0, [bg, txt]);
  }

  private togglePause(open: boolean) {
    this.pauseOpen = open;
    this.pausePanel.setVisible(open);
    if (open) { this.shopOpen = false; this.shopPanel.setVisible(false); }
  }

  private exitGame() {
    const onExit = this.registry.get("onExit") as (() => void) | undefined;
    onExit?.();
  }

  /** Icono centrado en (x, y) ajustado a un tamaño máximo. */
  private icon(x: number, y: number, key: string, size: number) {
    const img = this.add.image(x, y, key);
    img.setScale(size / Math.max(img.width, img.height));
    return img;
  }

  private showBanner(label: string, color: string) {
    const b = this.waveBanner;
    this.tweens.killTweensOf(b);
    b.setText(label).setColor(color).setAlpha(1).setScale(3);
    this.tweens.chain({
      targets: b,
      tweens: [
        { scale: 1, duration: 260, ease: "Back.Out" },
        { alpha: 0, delay: 1300, duration: 400 },
      ],
    });
  }

  /** Tarjeta de la tienda: icono, nombre, precio/nivel y tecla. Se actualiza en refreshCards. */
  private card(x: number, y: number, w: number, h: number, key: number, iconKey: string, onClick: () => void): ShopCard {
    const bg = this.add.rectangle(0, 0, w, h, 0x1a1c26, 0.95).setOrigin(0).setStrokeStyle(2, 0x3a3f4d);
    const icon = this.icon(w / 2, 36, iconKey, 40);
    const name = this.text(w / 2, 62, "", 13, C.text, "bold").setOrigin(0.5, 0);
    const info = this.text(w / 2, 80, "", 11, C.muted).setOrigin(0.5, 0).setAlign("center").setWordWrapWidth(w - 12);
    const price = this.text(w / 2, h - 22, "", 14, C.gold, "bold").setOrigin(0.5, 0);
    const keyBadge = this.add.container(w - 14, 14, [
      this.add.circle(0, 0, 10, 0x7ed957),
      this.text(0, 0, String(key), 12, "#0b0b0f", "bold").setOrigin(0.5),
    ]);
    bg.setInteractive({ useHandCursor: true }).on("pointerdown", onClick)
      .on("pointerover", () => bg.setStrokeStyle(2, 0x7ed957)).on("pointerout", () => bg.setStrokeStyle(2, 0x3a3f4d));
    const root = this.add.container(x, y, [bg, icon, name, info, price, keyBadge]);
    return { root, bg, name, info, price };
  }

  private refreshCards() {
    const me = this.net.me!;
    this.shopMoney.setText(`Dinero disponible: ${me.money}`);
    WEAPON_IDS.forEach((id, i) => {
      const c = this.shopCards[i];
      const w = WEAPONS[id];
      const owned = me.weapon === id;
      c.name.setText(w.name);
      c.info.setText(`daño ${w.damage} · ${w.fireRate}/s${w.bulletsPerShot > 1 ? ` · x${w.bulletsPerShot}` : ""}`);
      c.price.setText(owned ? "EQUIPADA" : `${w.cost}`).setColor(owned ? C.accent : me.money >= w.cost ? C.gold : C.danger);
      c.root.setAlpha(owned || me.money >= w.cost ? 1 : 0.55);
    });
    UPGRADE_IDS.forEach((id, i) => {
      const c = this.shopCards[WEAPON_IDS.length + i];
      const u = UPGRADES[id];
      const level = me[id];
      const maxed = level >= u.maxLevel;
      const cost = upgradeCost(id, level);
      c.name.setText(u.name);
      c.info.setText(`${u.description}\nnivel ${level}/${u.maxLevel}`);
      c.price.setText(maxed ? "MÁXIMO" : `${cost}`).setColor(maxed ? C.accent : me.money >= cost ? C.gold : C.danger);
      c.root.setAlpha(maxed || me.money >= cost ? 1 : 0.55);
    });
  }

  private text(x: number, y: number, str: string, size: number, color: string, style = "normal") {
    return this.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: style });
  }

  private layout() {
    const { width, height } = this.scale;
    this.statusPanel.setPosition(16, 16);
    this.wavePanel.setPosition(width / 2 - 180, 16);
    this.scorePanel.setPosition(width - 216, 16);
    this.minimap.setPosition(width - 16 - this.minimap.size, height - 16 - this.minimap.size);
    this.codeText.setPosition(width - 16, height - 20 - this.minimap.size);
    this.banner.setPosition(width / 2, height / 2 - 80);
    this.hint.setPosition(16, height - 14);
    this.shopPanel.setPosition(width / 2 - 320, height / 2 - 200);
    this.waveBanner.setPosition(width / 2, height / 2 - 140);
    this.bigCountdown.setPosition(width / 2, height / 2 - 140);
    this.lobbyPanel.setPosition(width / 2 - 250, height / 2 - 160);
    this.pausePanel.setPosition(width / 2 - 180, height / 2 - 95);
  }

  // ------------------------------------------------------------------ bucle

  update() {
    const state = this.net.state;
    const me = this.net.me;
    if (!me) return;

    this.hpBar.width = 220 * Math.max(0, me.hp / me.maxHp);
    this.hpBar.fillColor = me.hp / me.maxHp > 0.5 ? 0x7ed957 : me.hp / me.maxHp > 0.25 ? 0xffd166 : 0xff6b6b;
    this.hpText.setText(`${Math.ceil(me.hp)} / ${me.maxHp}`);
    this.moneyText.setText(`$ ${me.money}`);
    this.weaponText.setText(WEAPONS[me.weapon as WeaponId].name);
    const weaponKey = `icon_${me.weapon}`;
    if (this.weaponIcon.texture.key !== weaponKey) {
      this.weaponIcon.setTexture(weaponKey);
      this.weaponIcon.setScale(26 / Math.max(this.weaponIcon.width, this.weaponIcon.height));
    }
    this.killsText.setText(`Bajas: ${me.kills}`);

    this.codeText.setText(`Sala ${state.code}${state.isPrivate ? " · privada" : ""}`);

    const inLobby = state.phase === "lobby";
    this.lobbyPanel.setVisible(inLobby);
    if (inLobby) this.renderLobby();

    if (inLobby) {
      this.waveText.setText("SALA DE ESPERA");
      this.waveSub.setText("Explora el mapa mientras llegan tus amigos");
    } else if (state.phase === "active") {
      this.waveText.setText(`OLEADA ${state.wave}`);
      this.waveSub.setText(`Zombies restantes: ${state.zombiesLeft}`);
    } else if (state.phase === "countdown") {
      this.waveText.setText(state.wave === 0 ? "PREPÁRATE" : `OLEADA ${state.wave} SUPERADA`);
      this.waveSub.setText(`Siguiente oleada en ${Math.ceil(state.countdown)}s · B para comprar`);
    } else {
      this.waveText.setText("GAME OVER");
      this.waveSub.setText(`Oleada ${state.wave} · vuelta a la sala en ${Math.ceil(state.countdown)}s`);
    }

    const rows: string[] = [];
    state.players.forEach((p) => rows.push(`${p.alive ? "" : "☠ "}${p.name} · ${p.kills}`));
    this.scoreText.setText(rows.join("\n"));

    if (state.phase === "gameover") this.banner.setText("HABÉIS MUERTO");
    else if (!me.alive) this.banner.setText("Has muerto\nReaparecerás en la siguiente oleada");
    else this.banner.setText("");

    if (this.shopOpen) this.refreshCards();

    // Cuenta atrás grande en los últimos 3 segundos antes de una oleada
    const secs = Math.ceil(state.countdown);
    if (state.phase === "countdown" && secs <= 3 && secs > 0 && secs !== this.lastCountdownShown) {
      this.lastCountdownShown = secs;
      this.tweens.killTweensOf(this.bigCountdown);
      this.bigCountdown.setText(String(secs)).setAlpha(1).setScale(1.6);
      this.tweens.add({ targets: this.bigCountdown, scale: 1, alpha: 0, duration: 900, ease: "Quad.Out" });
    }
    if (state.phase !== "countdown") this.lastCountdownShown = -1;
    this.minimap.update();
  }

  /** Compra con validación local para dar feedback inmediato (el servidor vuelve a validar). */
  private tryBuy(n: number) {
    const me = this.net.me;
    if (!me) return;

    if (n >= 1 && n <= WEAPON_IDS.length) {
      const id = WEAPON_IDS[n - 1];
      if (me.weapon === id || me.money < WEAPONS[id].cost) return this.sfx.denied();
      this.net.buyWeapon(id);
    } else if (n >= 5 && n - 5 < UPGRADE_IDS.length) {
      const id = UPGRADE_IDS[n - 5];
      const level = me[id];
      if (level >= UPGRADES[id].maxLevel || me.money < upgradeCost(id, level)) return this.sfx.denied();
      this.net.buyUpgrade(id);
    }
  }

  private renderLobby() {
    const state = this.net.state;
    const link = `${location.origin}${location.pathname}?sala=${state.code}`;
    const lines: string[] = [
      `CÓDIGO DE SALA:  ${state.code}`,
      state.isPrivate ? "Sala privada: solo entran con el código" : "Sala pública: puede entrar cualquiera",
      `Enlace: ${link}`,
      "",
      `Jugadores (${state.players.size}/${MAX_PLAYERS}):`,
    ];
    state.players.forEach((p, id) => lines.push(`  ${p.name}${id === state.hostId ? "  ★ anfitrión" : ""}`));
    lines.push("");
    lines.push(this.net.isHost ? "Pulsa ENTER para empezar" : "Esperando a que el anfitrión empiece...");
    this.lobbyText.setText(lines.join("\n"));
  }

}
