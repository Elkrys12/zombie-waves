import Phaser from "phaser";
import type { NetworkManager } from "../net/NetworkManager";
import { loadAppearance } from "../net/NetworkManager";
import { CharacterFigure } from "../gfx/CharacterFigure";
import { PLAYER_LOOKS, WORLD_PPM, type SheetMeta } from "../scenes/BootScene";
import { SKIN_TONES, CLOTH_COLORS, HAIR_COLORS, HATS, GLASSES, type Appearance } from "@zombie-waves/shared";

const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const DISPLAY_FONT = "Bangers, Impact, system-ui, sans-serif";
const W = 300;
const H = 492;

/**
 * Panel "Tu personaje" del lobby: vista previa animada y selectores de piel, camiseta,
 * pantalón, pelo, gorra y gafas. Cada cambio se guarda en el navegador y se envía al servidor.
 */
export class CustomizePanel {
  readonly root: Phaser.GameObjects.Container;
  private appearance: Appearance = loadAppearance();
  private figure?: CharacterFigure;
  private marks: { key: keyof Appearance; value: number | string; ring: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle }[] = [];

  constructor(private scene: Phaser.Scene, private net: NetworkManager) {
    const g = scene.add.graphics();
    g.fillStyle(0x0c0d14, 0.85).fillRoundedRect(0, 0, W, H, 10);
    g.lineStyle(2, 0x7ed957, 0.5).strokeRoundedRect(0, 0, W, H, 10);
    g.fillStyle(0x7ed957, 0.9).fillRect(10, 0, W - 20, 3);
    this.root = scene.add.container(0, 0, [g]).setDepth(120);
    this.root.add(scene.add.text(W / 2, 12, "TU PERSONAJE", { fontFamily: DISPLAY_FONT, fontSize: "24px", color: "#7ed957" }).setOrigin(0.5, 0));

    // Vista previa: el personaje animado, grande, mirando hacia abajo
    const sheet = PLAYER_LOOKS[0].sheet;
    if (sheet) {
      const meta = scene.cache.json.get(`${sheet}_meta`) as SheetMeta;
      this.figure = new CharacterFigure(scene, sheet);
      this.figure.setPosition(W / 2, 96).setScale((WORLD_PPM / meta.ppm) * 1.35).setRotation(Math.PI / 2);
      this.figure.setAppearance(this.appearance);
      this.root.add(scene.add.ellipse(W / 2, 112, 96, 34, 0x000000, 0.35));
      this.root.add(this.figure);
    }

    let y = 178;
    y = this.colorRow(y, "Piel", "skin", SKIN_TONES);
    y = this.colorRow(y, "Camiseta", "shirt", CLOTH_COLORS);
    y = this.colorRow(y, "Pantalón", "pants", CLOTH_COLORS);
    y = this.colorRow(y, "Pelo", "hair", HAIR_COLORS);
    y = this.optionRow(y, "Gorra", "hat", HATS, { none: "Ninguna", cap: "Gorra" });
    y = this.optionRow(y, "Gafas", "glasses", GLASSES, { none: "No", glasses: "Sí" });
    this.root.add(scene.add.text(W / 2, H - 16, "Los cambios se guardan en este navegador", { fontFamily: FONT, fontSize: "11px", color: "#9aa0a6" }).setOrigin(0.5, 1));
    this.refreshMarks();
  }

  setPosition(x: number, y: number) {
    this.root.setPosition(x, y);
  }

  setVisible(v: boolean) {
    this.root.setVisible(v);
  }

  /** Fila de muestras de color. */
  private colorRow(y: number, label: string, key: "skin" | "shirt" | "pants" | "hair", colors: number[]) {
    this.root.add(this.scene.add.text(14, y, label, { fontFamily: FONT, fontSize: "12px", color: "#9aa0a6", fontStyle: "bold" }));
    const size = 20, gap = 4, perRow = 12;
    const startX = 14, rowY = y + 20;
    colors.forEach((color, i) => {
      const cx = startX + (i % perRow) * (size + gap) + size / 2;
      const cy = rowY + Math.floor(i / perRow) * (size + gap) + size / 2;
      const ring = this.scene.add.circle(cx, cy, size / 2 + 3, 0xffffff, 0).setStrokeStyle(2, 0xffffff, 0);
      const dot = this.scene.add.circle(cx, cy, size / 2, color).setStrokeStyle(1, 0x000000, 0.5);
      dot.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.set(key, i));
      this.root.add([ring, dot]);
      this.marks.push({ key, value: i, ring });
    });
    return rowY + Math.ceil(colors.length / perRow) * (size + gap) + 8;
  }

  /** Fila de opciones (botones) para accesorios. */
  private optionRow(y: number, label: string, key: "hat" | "glasses", options: readonly string[], names: Record<string, string>) {
    this.root.add(this.scene.add.text(14, y + 6, label, { fontFamily: FONT, fontSize: "12px", color: "#9aa0a6", fontStyle: "bold" }));
    let x = 90;
    for (const opt of options) {
      const w = 74;
      const bg = this.scene.add.rectangle(x, y, w, 26, 0x2b2b38).setOrigin(0).setStrokeStyle(2, 0xffffff, 0);
      const txt = this.scene.add.text(x + w / 2, y + 13, names[opt] ?? opt, { fontFamily: FONT, fontSize: "12px", color: "#f2f2f2" }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.set(key, opt));
      this.root.add([bg, txt]);
      this.marks.push({ key, value: opt, ring: bg });
      x += w + 8;
    }
    return y + 36;
  }

  private set<K extends keyof Appearance>(key: K, value: Appearance[K]) {
    this.appearance = { ...this.appearance, [key]: value };
    this.figure?.setAppearance(this.appearance);
    this.refreshMarks();
    this.net.customize(this.appearance);
  }

  private refreshMarks() {
    for (const m of this.marks) {
      const selected = this.appearance[m.key] === m.value;
      if (m.ring instanceof Phaser.GameObjects.Rectangle) {
        m.ring.setStrokeStyle(2, selected ? 0x7ed957 : 0xffffff, selected ? 1 : 0);
        m.ring.setFillStyle(selected ? 0x2f5a24 : 0x2b2b38);
      } else {
        m.ring.setStrokeStyle(2, 0x7ed957, selected ? 1 : 0);
      }
    }
  }
}
