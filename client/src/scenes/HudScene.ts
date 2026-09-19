import Phaser from "phaser";
import type { NetworkManager } from "../net/NetworkManager";
import type { SoundManager } from "../audio/SoundManager";
import { Minimap } from "../ui/Minimap";
import {
  WEAPONS, WEAPON_IDS, UPGRADES, UPGRADE_IDS, upgradeCost, MAX_PLAYERS,
  type WeaponId, type UpgradeId,
} from "@zombie-waves/shared";

const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const C = { panel: 0x0c0d14, border: 0x7ed957, text: "#f2f2f2", muted: "#9aa0a6", accent: "#7ed957", danger: "#ff6b6b", gold: "#ffd166" };

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
  private shopText!: Phaser.GameObjects.Text;
  private lobbyPanel!: Phaser.GameObjects.Container;
  private lobbyText!: Phaser.GameObjects.Text;
  private shopOpen = false;

  constructor() {
    super("hud");
  }

  create() {
    this.net = this.registry.get("net") as NetworkManager;
    this.sfx = this.registry.get("sfx") as SoundManager;

    // ---- Estado del jugador (arriba izquierda)
    this.statusPanel = this.panel(0, 0, 250, 96);
    this.statusPanel.add(this.add.rectangle(14, 14, 222, 18, 0x000000, 0.6).setOrigin(0));
    this.hpBar = this.add.rectangle(15, 15, 220, 16, 0x7ed957).setOrigin(0);
    this.hpText = this.text(125, 23, "", 12, C.text, "bold").setOrigin(0.5);
    this.moneyText = this.text(14, 42, "", 16, C.gold, "bold");
    this.weaponText = this.text(14, 64, "", 14, C.text);
    this.killsText = this.text(236, 64, "", 14, C.muted).setOrigin(1, 0);
    this.statusPanel.add([this.hpBar, this.hpText, this.moneyText, this.weaponText, this.killsText]);

    // ---- Oleada (arriba centro)
    this.wavePanel = this.panel(0, 0, 360, 64);
    this.waveText = this.text(180, 12, "", 24, C.text, "bold").setOrigin(0.5, 0);
    this.waveSub = this.text(180, 42, "", 13, C.muted).setOrigin(0.5, 0);
    this.wavePanel.add([this.waveText, this.waveSub]);

    // ---- Marcador (arriba derecha)
    this.scorePanel = this.panel(0, 0, 200, 96);
    this.scoreText = this.text(186, 12, "", 13, C.text).setOrigin(1, 0).setLineSpacing(3);
    this.scorePanel.add([this.text(14, 12, "EQUIPO", 11, C.muted, "bold"), this.scoreText]);

    // ---- Minimapa (abajo derecha) y código de sala
    this.minimap = new Minimap(this, this.net);
    this.codeText = this.text(0, 0, "", 12, C.muted).setOrigin(1, 1);

    // ---- Aviso central y ayuda
    this.banner = this.text(0, 0, "", 34, C.danger, "bold").setOrigin(0.5).setAlign("center").setShadow(0, 3, "#000", 6);
    this.hint = this.text(0, 0, "B: tienda · M: sonido", 12, C.muted).setOrigin(0, 1);

    // ---- Tienda
    this.shopPanel = this.panel(0, 0, 520, 420).setVisible(false);
    this.shopText = this.text(18, 14, "", 14, C.text).setLineSpacing(6).setFontFamily("Consolas, Menlo, monospace");
    this.shopPanel.add(this.shopText);

    // ---- Lobby (sala de espera)
    this.lobbyPanel = this.panel(0, 0, 500, 320).setVisible(false);
    this.lobbyText = this.text(250, 160, "", 16, C.text).setOrigin(0.5).setAlign("center").setLineSpacing(6);
    this.lobbyPanel.add(this.lobbyText);

    // ---- Teclas
    const kb = this.input.keyboard!;
    kb.on("keydown-ENTER", () => {
      if (this.net.state.phase === "lobby" && this.net.isHost) this.net.startGame();
    });
    kb.on("keydown-B", () => {
      this.shopOpen = !this.shopOpen;
      this.shopPanel.setVisible(this.shopOpen);
    });
    kb.on("keydown-M", () => {
      const muted = this.sfx.toggleMute();
      this.hint.setText(muted ? "B: tienda · M: sonido (silenciado)" : "B: tienda · M: sonido");
    });
    kb.on("keydown", (event: KeyboardEvent) => {
      if (!this.shopOpen) return;
      const n = Number(event.key);
      if (Number.isInteger(n)) this.tryBuy(n);
    });

    this.scale.on("resize", () => this.layout());
    this.layout();
  }

  // ------------------------------------------------------------------ helpers de UI

  private panel(x: number, y: number, w: number, h: number) {
    const g = this.add.graphics();
    g.fillStyle(C.panel, 0.82).fillRoundedRect(0, 0, w, h, 10);
    g.lineStyle(2, C.border, 0.5).strokeRoundedRect(0, 0, w, h, 10);
    g.fillStyle(C.border, 0.9).fillRect(10, 0, w - 20, 3);
    return this.add.container(x, y, [g]);
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
    this.shopPanel.setPosition(width / 2 - 260, height / 2 - 210);
    this.lobbyPanel.setPosition(width / 2 - 250, height / 2 - 160);
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

    if (this.shopOpen) this.renderShop();
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

  private renderShop() {
    const me = this.net.me!;
    const lines: string[] = ["TIENDA  ·  pulsa el número para comprar", ""];

    lines.push("ARMAS");
    WEAPON_IDS.forEach((id, i) => {
      const w = WEAPONS[id];
      const tag = me.weapon === id ? "[equipada]" : `$${w.cost}`;
      lines.push(`  ${i + 1}. ${w.name.padEnd(10)} ${tag.padEnd(11)} daño ${String(w.damage).padStart(2)}  ${w.fireRate}/s`);
    });

    lines.push("", "MEJORAS");
    UPGRADE_IDS.forEach((id: UpgradeId, i) => {
      const u = UPGRADES[id];
      const level = me[id];
      const tag = level >= u.maxLevel ? "[MÁX]" : `$${upgradeCost(id, level)}`;
      lines.push(`  ${i + 5}. ${u.name.padEnd(12)} ${level}/${u.maxLevel}  ${tag.padEnd(7)} ${u.description}`);
    });

    lines.push("", `Dinero disponible: $${me.money}`);
    this.shopText.setText(lines.join("\n"));
  }
}
