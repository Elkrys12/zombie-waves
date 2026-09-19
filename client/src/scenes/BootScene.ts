import Phaser from "phaser";
import { generateTextures } from "../gfx/textures";

/** Aspecto de cada jugador según su orden de entrada (packs de Kenney, CC0). */
export const PLAYER_SKINS = ["survivor1", "manBlue", "womanGreen", "hitman1"] as const;
const POSES = ["gun", "machine", "silencer", "hold", "stand"] as const;

/** Pose del sprite del personaje según el arma equipada. */
export const WEAPON_POSE: Record<string, (typeof POSES)[number]> = {
  pistol: "gun",
  smg: "silencer",
  shotgun: "machine",
  rifle: "machine",
};

const TILES: Record<string, string> = {
  grass: "tile_01", dirt: "tile_05", concrete: "tile_07",
  asphalt: "tile_86", brick: "tile_42", crate: "tile_129", crate_small: "tile_156",
  tree_medium: "tile_183", tree_orange: "tile_186", tree_tiny: "tile_210", bush: "tile_235", bush_orange: "tile_236",
  rock_a: "tile_237", rock_b: "tile_238", barrel: "tile_316", barrel_gray: "tile_317", splat: "tile_319", splat_dark: "tile_320",
};

const PROPS = ["tree_large", "tree_small", "cone_straight", "barrier_white", "tires_white", "rock1", "rock2",
  "car_red_1", "car_blue_1", "car_green_1", "car_yellow_1", "car_black_1"];

/**
 * Carga los sprites (assets de Kenney en /assets/kenney) y genera el resto de texturas por código.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    this.load.setBaseURL(import.meta.env.BASE_URL);
    for (const skin of PLAYER_SKINS) for (const pose of POSES) this.load.image(`${skin}_${pose}`, `assets/kenney/chars/${skin}_${pose}.png`);
    this.load.image("zombie_hold", "assets/kenney/chars/zoimbie1_hold.png");
    this.load.image("zombie_stand", "assets/kenney/chars/zoimbie1_stand.png");
    for (const [key, file] of Object.entries(TILES)) this.load.image(key, `assets/kenney/tiles/${file}.png`);
    for (const p of PROPS) this.load.image(p, `assets/kenney/props/${p}.png`);

    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 0, 6, 0x7ed957).setOrigin(0, 0.5).setX(width / 2 - 120);
    this.add.text(width / 2, height / 2 - 20, "Cargando...", { fontFamily: "system-ui", fontSize: "14px", color: "#9aa0a6" }).setOrigin(0.5);
    this.load.on("progress", (v: number) => bar.setSize(240 * v, 6));
  }

  create() {
    generateTextures(this);

    // Variantes de zombie por tipo: cambio de tono sobre el sprite base (funciona en WebGL y Canvas)
    this.makeHueVariant("zombie_hold", "zombie_walker", 0, 1);
    this.makeHueVariant("zombie_hold", "zombie_runner", -70, 1.2);
    this.makeHueVariant("zombie_hold", "zombie_tank", 170, 0.9);
    // Salpicadura de sangre a partir del "splat" de Kenney, oscurecido
    this.makeHueVariant("splat", "blood_decal", -20, 0.8, 0.55);

    this.scene.start("game");
  }

  /** Crea una copia de una textura con rotación de tono, saturación y brillo distintos. */
  private makeHueVariant(srcKey: string, dstKey: string, hueDeg: number, saturate: number, brightness = 1) {
    const src = this.textures.get(srcKey).getSourceImage() as HTMLImageElement;
    const canvas = this.textures.createCanvas(dstKey, src.width, src.height)!;
    const ctx = canvas.getContext();
    ctx.filter = `hue-rotate(${hueDeg}deg) saturate(${saturate}) brightness(${brightness})`;
    ctx.drawImage(src, 0, 0);
    ctx.filter = "none";
    canvas.refresh();
  }
}
