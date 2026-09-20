import Phaser from "phaser";
import { SKIN_TONES, CLOTH_COLORS, HAIR_COLORS, type Appearance } from "@zombie-waves/shared";
import type { SheetMeta } from "../scenes/BootScene";

/**
 * Personaje 3D renderizado por capas (pantalón, camiseta, piel, pelo, gorra, gafas...).
 * Cada capa es un sprite con la misma animación; las capas "tintables" se colorean con la
 * apariencia del jugador y los accesorios se muestran u ocultan según lo elegido.
 */
export class CharacterFigure extends Phaser.GameObjects.Container {
  private layers: { name: string; tintable: boolean; sprite: Phaser.GameObjects.Sprite }[] = [];
  private current = "";

  constructor(scene: Phaser.Scene, readonly sheet: string) {
    super(scene, 0, 0);
    const meta = scene.cache.json.get(`${sheet}_meta`) as SheetMeta;
    const layers = meta.layers ?? [{ name: "", tintable: false }];
    for (const l of layers) {
      const key = l.name ? `${sheet}_${l.name}` : sheet;
      const sprite = scene.add.sprite(0, 0, key, 0).setOrigin(0.5, 0.5);
      this.add(sprite);
      this.layers.push({ name: l.name, tintable: l.tintable, sprite });
    }
    this.play("idle");
    scene.add.existing(this);
  }

  /** Reproduce una animación (por nombre de acción) en todas las capas a la vez. */
  play(anim: string) {
    if (this.current === anim) return;
    this.current = anim;
    for (const l of this.layers) l.sprite.play(`${l.sprite.texture.key}/${anim}`, true);
  }

  get anim() {
    return this.current;
  }

  /** Colores y accesorios del jugador. */
  setAppearance(a: Appearance) {
    for (const l of this.layers) {
      const s = l.sprite;
      switch (l.name) {
        case "skin": s.setTint(SKIN_TONES[a.skin] ?? SKIN_TONES[0]); break;
        case "shirt": s.setTint(CLOTH_COLORS[a.shirt] ?? CLOTH_COLORS[0]); break;
        case "pants": s.setTint(CLOTH_COLORS[a.pants] ?? CLOTH_COLORS[0]); break;
        case "hair": s.setTint(HAIR_COLORS[a.hair] ?? HAIR_COLORS[0]); s.setVisible(a.hat === "none"); break;
        default:
          if (l.name.startsWith("hat_")) { s.setVisible(l.name === `hat_${a.hat}`); if (l.tintable) s.setTint(CLOTH_COLORS[a.shirt]); }
          else if (l.name.startsWith("glasses")) s.setVisible(a.glasses !== "none" && (l.name === "glasses" || l.name === `glasses_${a.glasses}`));
      }
    }
  }

  /** Mismo alfa para todas las capas. */
  setFigureAlpha(alpha: number) {
    for (const l of this.layers) l.sprite.setAlpha(alpha);
    return this;
  }
}
