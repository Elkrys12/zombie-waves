import Phaser from "phaser";
import { generateTextures } from "../gfx/textures";

/** Sprites de personaje por orden de entrada a la sala. */
export const PLAYER_SPRITES = ["player_1", "player_2", "player_3", "player_4"] as const;

/** Todo el arte propio (generado con IA y procesado con tools/process-art.mjs). */
const ART = [
  "player_1", "player_2", "player_3", "player_4",
  "zombie_walker", "zombie_runner", "zombie_tank",
  "car_red", "car_blue", "car_green", "car_white",
  "tree_big", "tree_small", "bush", "fountain",
  "crate", "barrel", "sandbags", "fence_white", "lamp_post", "mailbox", "hydrant", "cone", "rock", "tires",
  "blood_splat", "muzzle_flash", "bullet",
  "icon_heart", "icon_money", "icon_skull", "icon_pistol", "icon_smg", "icon_shotgun", "icon_rifle",
  "icon_vest", "icon_speed", "icon_damage", "icon_firerate", "icon_hp",
  "ground_grass", "ground_asphalt", "ground_concrete", "ground_dirt",
  "roof_red", "roof_gray", "roof_brown", "wall_brick",
];

/** Carga el arte desde /assets/art y genera por código las pocas texturas restantes. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    this.load.setBaseURL(import.meta.env.BASE_URL);
    for (const key of ART) this.load.image(key, `assets/art/${key}.png`);

    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2 - 120, height / 2, 0, 6, 0x7ed957).setOrigin(0, 0.5);
    this.add.text(width / 2, height / 2 - 20, "Cargando...", { fontFamily: "system-ui", fontSize: "14px", color: "#9aa0a6" }).setOrigin(0.5);
    this.load.on("progress", (v: number) => bar.setSize(240 * v, 6));
  }

  create() {
    generateTextures(this);
    this.game.events.emit("assets-ready");
    this.scene.start("game");
  }
}
