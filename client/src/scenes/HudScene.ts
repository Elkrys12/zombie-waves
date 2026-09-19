import Phaser from "phaser";
import type { NetworkManager } from "../net/NetworkManager";
import {
  WEAPONS, WEAPON_IDS, UPGRADES, UPGRADE_IDS, upgradeCost,
  type WeaponId, type UpgradeId,
} from "@zombie-waves/shared";

const FONT = { fontFamily: "system-ui, sans-serif", color: "#ffffff" };

/**
 * HUD superpuesto: vida, dinero, arma, oleada, marcador y tienda (tecla B).
 * Se dibuja encima de GameScene y lee el estado directamente del servidor.
 */
export class HudScene extends Phaser.Scene {
  private net!: NetworkManager;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private waveSub!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private shopPanel!: Phaser.GameObjects.Container;
  private shopText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private shopOpen = false;

  constructor() {
    super("hud");
  }

  create() {
    this.net = this.registry.get("net") as NetworkManager;

    // Vida (arriba izquierda)
    this.add.rectangle(20, 20, 220, 22, 0x000000, 0.6).setOrigin(0);
    this.hpBar = this.add.rectangle(22, 22, 216, 18, 0x7ed957).setOrigin(0);
    this.hpText = this.add.text(130, 31, "", { ...FONT, fontSize: "13px", fontStyle: "bold" }).setOrigin(0.5);
    this.infoText = this.add.text(20, 50, "", { ...FONT, fontSize: "15px" });

    // Oleada (arriba centro)
    this.waveText = this.add.text(0, 16, "", { ...FONT, fontSize: "26px", fontStyle: "bold" }).setOrigin(0.5, 0);
    this.waveSub = this.add.text(0, 48, "", { ...FONT, fontSize: "15px", color: "#cccccc" }).setOrigin(0.5, 0);

    // Marcador (arriba derecha)
    this.scoreText = this.add.text(0, 20, "", { ...FONT, fontSize: "14px", align: "right" }).setOrigin(1, 0);

    // Aviso central (muerto / game over)
    this.banner = this.add.text(0, 0, "", { ...FONT, fontSize: "34px", fontStyle: "bold", color: "#ff6b6b", align: "center" })
      .setOrigin(0.5);

    // Tienda
    const bg = this.add.rectangle(0, 0, 420, 400, 0x0b0b0f, 0.88).setOrigin(0).setStrokeStyle(2, 0x7ed957);
    this.shopText = this.add.text(16, 12, "", { ...FONT, fontSize: "14px", lineSpacing: 5 });
    this.shopPanel = this.add.container(0, 0, [bg, this.shopText]).setVisible(false);

    this.add.text(20, 0, "B: tienda", { ...FONT, fontSize: "13px", color: "#999999" }).setOrigin(0, 1).setName("hint");

    this.input.keyboard!.on("keydown-B", () => {
      this.shopOpen = !this.shopOpen;
      this.shopPanel.setVisible(this.shopOpen);
    });

    // Compras: 1-4 armas, 5-9 mejoras
    this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
      if (!this.shopOpen) return;
      const n = Number(event.key);
      if (!Number.isInteger(n)) return;
      if (n >= 1 && n <= WEAPON_IDS.length) this.net.buyWeapon(WEAPON_IDS[n - 1]);
      else if (n >= 5 && n - 5 < UPGRADE_IDS.length) this.net.buyUpgrade(UPGRADE_IDS[n - 5]);
    });

    this.scale.on("resize", () => this.layout());
    this.layout();
  }

  private layout() {
    const { width, height } = this.scale;
    this.waveText.setX(width / 2);
    this.waveSub.setX(width / 2);
    this.scoreText.setX(width - 20);
    this.banner.setPosition(width / 2, height / 2 - 60);
    this.shopPanel.setPosition(width / 2 - 210, height / 2 - 200);
    (this.children.getByName("hint") as Phaser.GameObjects.Text).setY(height - 16);
  }

  update() {
    const state = this.net.state;
    const me = this.net.me;
    if (!me) return;

    // Vida y datos del jugador
    this.hpBar.width = 216 * Math.max(0, me.hp / me.maxHp);
    this.hpText.setText(`${Math.ceil(me.hp)} / ${me.maxHp}`);
    const weapon = WEAPONS[me.weapon as WeaponId];
    this.infoText.setText(`$ ${me.money}\n${weapon.name}\nBajas: ${me.kills}`);

    // Oleada
    if (state.phase === "active") {
      this.waveText.setText(`OLEADA ${state.wave}`);
      this.waveSub.setText(`Zombies restantes: ${state.zombiesLeft}`);
    } else if (state.phase === "countdown") {
      this.waveText.setText(state.wave === 0 ? "PREPÁRATE" : `OLEADA ${state.wave} SUPERADA`);
      this.waveSub.setText(`Siguiente oleada en ${Math.ceil(state.countdown)}s — pulsa B para comprar`);
    } else {
      this.waveText.setText("GAME OVER");
      this.waveSub.setText(`Llegasteis a la oleada ${state.wave} · reinicio en ${Math.ceil(state.countdown)}s`);
    }

    // Marcador
    const rows: string[] = [];
    state.players.forEach((p) => rows.push(`${p.alive ? "" : "☠ "}${p.name}: ${p.kills}`));
    this.scoreText.setText(rows.join("\n"));

    // Aviso central
    if (state.phase === "gameover") this.banner.setText("HABÉIS MUERTO");
    else if (!me.alive) this.banner.setText("Has muerto\nReaparecerás en la siguiente oleada");
    else this.banner.setText("");

    if (this.shopOpen) this.renderShop();
  }

  private renderShop() {
    const me = this.net.me!;
    const lines: string[] = ["TIENDA  (pulsa el número para comprar)", ""];

    lines.push("ARMAS");
    WEAPON_IDS.forEach((id, i) => {
      const w = WEAPONS[id];
      const owned = me.weapon === id;
      const tag = owned ? "[equipada]" : `$${w.cost}`;
      lines.push(`  ${i + 1}. ${w.name.padEnd(10)} ${tag.padEnd(11)} daño ${w.damage}  cadencia ${w.fireRate}/s`);
    });

    lines.push("", "MEJORAS");
    UPGRADE_IDS.forEach((id: UpgradeId, i) => {
      const u = UPGRADES[id];
      const level = me[id];
      const maxed = level >= u.maxLevel;
      const tag = maxed ? "[MÁX]" : `$${upgradeCost(id, level)}`;
      lines.push(`  ${i + 5}. ${u.name.padEnd(12)} nv ${level}/${u.maxLevel}  ${tag.padEnd(7)} ${u.description}`);
    });

    lines.push("", `Dinero: $${me.money}`);
    this.shopText.setText(lines.join("\n"));
  }
}
