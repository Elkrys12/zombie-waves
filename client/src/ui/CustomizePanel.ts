import Phaser from "phaser";
import type { NetworkManager } from "../net/NetworkManager";
import { loadAppearance } from "../net/NetworkManager";
import { CharacterFigure } from "../gfx/CharacterFigure";
import { WORLD_PPM, sheetMeta } from "../scenes/BootScene";
import { SKIN_TONES, CLOTH_COLORS, HAIR_COLORS, HATS, GLASSES, MODELS, type Appearance } from "@zombie-waves/shared";

const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const DISPLAY_FONT = "Bangers, Impact, system-ui, sans-serif";
const W = 300;
const HAT_NAMES: Record<string, string> = { none: "Ninguna", cap: "Gorra" };
const GLASSES_NAMES: Record<string, string> = { none: "No", glasses: "Sí" };

/**
 * Panel "Tu personaje" del lobby: personaje base, vista previa animada y selectores de colores y
 * accesorios. Las filas dependen de las capas que tenga la hoja del personaje elegido (un modelo
 * sin capa "skin" no ofrece tono de piel; las gorras son las capas "hat_*", etc.).
 * Cada cambio se guarda en el navegador y se envía al servidor.
 */
export class CustomizePanel {
  readonly root: Phaser.GameObjects.Container;
  private appearance: Appearance = loadAppearance();
  private figure: CharacterFigure;
  private bg: Phaser.GameObjects.Graphics;
  private rows?: Phaser.GameObjects.Container;
  private marks: { key: keyof Appearance; value: number | string; ring: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle }[] = [];
  private modelButtons: { index: number; bg: Phaser.GameObjects.Rectangle }[] = [];
  private height = 0;

  constructor(private scene: Phaser.Scene, private net: NetworkManager) {
    this.bg = scene.add.graphics();
    this.root = scene.add.container(0, 0, [this.bg]).setDepth(120);
    this.root.add(scene.add.text(W / 2, 12, "TU PERSONAJE", { fontFamily: DISPLAY_FONT, fontSize: "24px", color: "#7ed957" }).setOrigin(0.5, 0));

    // Personaje base: un botón por modelo
    let x = 14;
    const bw = (W - 28 - 8 * (MODELS.length - 1)) / MODELS.length;
    MODELS.forEach((m, index) => {
      const bg = scene.add.rectangle(x, 44, bw, 26, 0x2b2b38).setOrigin(0).setStrokeStyle(2, 0xffffff, 0);
      const txt = scene.add.text(x + bw / 2, 44 + 13, m.name, { fontFamily: FONT, fontSize: "12px", color: "#f2f2f2" }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.set("model", index));
      this.root.add([bg, txt]);
      this.modelButtons.push({ index, bg });
      x += bw + 8;
    });

    // Vista previa: el personaje animado, grande, mirando hacia abajo
    this.root.add(scene.add.ellipse(W / 2, 158, 96, 34, 0x000000, 0.35));
    this.figure = new CharacterFigure(scene, this.sheet());
    this.figure.setPosition(W / 2, 142).setRotation(Math.PI / 2);
    this.root.add(this.figure);
    this.fitPreview();
    this.figure.setAppearance(this.appearance);

    this.buildRows();
  }

  setPosition(x: number, y: number) {
    this.root.setPosition(x, y);
  }

  setVisible(v: boolean) {
    this.root.setVisible(v);
  }

  private sheet() {
    return MODELS[this.appearance.model]?.id ?? MODELS[0].id;
  }

  /** La vista previa ocupa siempre el mismo hueco, sea cual sea el tamaño del personaje. */
  private fitPreview() {
    const meta = sheetMeta(this.scene, this.figure.sheet);
    const scale = meta.extent ? 130 / meta.extent : WORLD_PPM / meta.ppm;
    this.figure.setScale(Phaser.Math.Clamp(scale, 0.8, 3));
  }

  /** Filas de opciones según las capas del personaje elegido. */
  private buildRows() {
    this.rows?.destroy();
    this.marks = [];
    this.rows = this.scene.add.container(0, 0);
    this.root.add(this.rows);
    const layers = (sheetMeta(this.scene, this.sheet()).layers ?? []).map((l) => l.name);
    const has = (name: string) => layers.includes(name);

    let y = 224;
    if (has("skin")) y = this.colorRow(y, "Piel", "skin", SKIN_TONES);
    if (has("shirt")) y = this.colorRow(y, "Camiseta", "shirt", CLOTH_COLORS);
    if (has("pants")) y = this.colorRow(y, "Pantalón", "pants", CLOTH_COLORS);
    if (has("hair")) y = this.colorRow(y, "Pelo", "hair", HAIR_COLORS);
    const hats = HATS.filter((h) => h === "none" || has(`hat_${h}`));
    if (hats.length > 1) y = this.optionRow(y, "Gorra", "hat", hats, HAT_NAMES);
    const glasses = GLASSES.filter((g) => g === "none" || has("glasses") || has(`glasses_${g}`));
    if (glasses.length > 1) y = this.optionRow(y, "Gafas", "glasses", glasses, GLASSES_NAMES);
    if (y === 224) {
      this.rows.add(this.scene.add.text(W / 2, y + 4, "Este personaje no tiene opciones", { fontFamily: FONT, fontSize: "12px", color: "#9aa0a6" }).setOrigin(0.5, 0));
      y += 30;
    }

    this.height = y + 26;
    this.rows.add(this.scene.add.text(W / 2, this.height - 16, "Los cambios se guardan en este navegador", { fontFamily: FONT, fontSize: "11px", color: "#9aa0a6" }).setOrigin(0.5, 1));
    this.bg.clear();
    this.bg.fillStyle(0x0c0d14, 0.85).fillRoundedRect(0, 0, W, this.height, 10);
    this.bg.lineStyle(2, 0x7ed957, 0.5).strokeRoundedRect(0, 0, W, this.height, 10);
    this.bg.fillStyle(0x7ed957, 0.9).fillRect(10, 0, W - 20, 3);
    this.refreshMarks();
  }

  /** Fila de muestras de color. */
  private colorRow(y: number, label: string, key: "skin" | "shirt" | "pants" | "hair", colors: number[]) {
    this.rows!.add(this.scene.add.text(14, y, label, { fontFamily: FONT, fontSize: "12px", color: "#9aa0a6", fontStyle: "bold" }));
    const size = 20, gap = 4, perRow = 12;
    const startX = 14, rowY = y + 20;
    colors.forEach((color, i) => {
      const cx = startX + (i % perRow) * (size + gap) + size / 2;
      const cy = rowY + Math.floor(i / perRow) * (size + gap) + size / 2;
      const ring = this.scene.add.circle(cx, cy, size / 2 + 3, 0xffffff, 0).setStrokeStyle(2, 0xffffff, 0);
      const dot = this.scene.add.circle(cx, cy, size / 2, color).setStrokeStyle(1, 0x000000, 0.5);
      dot.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.set(key, i));
      this.rows!.add([ring, dot]);
      this.marks.push({ key, value: i, ring });
    });
    return rowY + Math.ceil(colors.length / perRow) * (size + gap) + 8;
  }

  /** Fila de opciones (botones) para accesorios. */
  private optionRow(y: number, label: string, key: "hat" | "glasses", options: readonly string[], names: Record<string, string>) {
    this.rows!.add(this.scene.add.text(14, y + 6, label, { fontFamily: FONT, fontSize: "12px", color: "#9aa0a6", fontStyle: "bold" }));
    let x = 90;
    for (const opt of options) {
      const w = 74;
      const bg = this.scene.add.rectangle(x, y, w, 26, 0x2b2b38).setOrigin(0).setStrokeStyle(2, 0xffffff, 0);
      const txt = this.scene.add.text(x + w / 2, y + 13, names[opt] ?? opt, { fontFamily: FONT, fontSize: "12px", color: "#f2f2f2" }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.set(key, opt));
      this.rows!.add([bg, txt]);
      this.marks.push({ key, value: opt, ring: bg });
      x += w + 8;
    }
    return y + 36;
  }

  private set<K extends keyof Appearance>(key: K, value: Appearance[K]) {
    if (this.appearance[key] === value) return;
    this.appearance = { ...this.appearance, [key]: value };
    if (key === "model") {
      this.figure.setSheet(this.sheet());
      this.fitPreview();
      this.buildRows();
    }
    this.figure.setAppearance(this.appearance);
    this.refreshMarks();
    this.net.customize(this.appearance);
  }

  private refreshMarks() {
    const button = (bg: Phaser.GameObjects.Rectangle, selected: boolean) => {
      bg.setStrokeStyle(2, selected ? 0x7ed957 : 0xffffff, selected ? 1 : 0);
      bg.setFillStyle(selected ? 0x2f5a24 : 0x2b2b38);
    };
    for (const b of this.modelButtons) button(b.bg, this.appearance.model === b.index);
    for (const m of this.marks) {
      const selected = this.appearance[m.key] === m.value;
      if (m.ring instanceof Phaser.GameObjects.Rectangle) button(m.ring, selected);
      else m.ring.setStrokeStyle(2, 0x7ed957, selected ? 1 : 0);
    }
  }
}
