import Phaser from "phaser";
import { PLAYER_RADIUS, ZOMBIES, type ZombieType } from "@zombie-waves/shared";

/** Colores de los jugadores, en orden de entrada a la sala. */
export const PLAYER_COLORS = [0x4caf50, 0x2196f3, 0xffb300, 0xe040fb];

/**
 * Genera todas las texturas del juego por código (sin archivos externos).
 * Todos los sprites "miran" hacia la derecha (ángulo 0) para poder rotarlos.
 */
export function generateTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // ---- Suelo: baldosa oscura con ruido y junta ----
  const tile = 64;
  g.fillStyle(0x24242e).fillRect(0, 0, tile, tile);
  for (let i = 0; i < 40; i++) {
    const shade = Phaser.Math.Between(0, 1) ? 0x2a2a35 : 0x1f1f28;
    g.fillStyle(shade).fillRect(Phaser.Math.Between(0, tile - 3), Phaser.Math.Between(0, tile - 3), Phaser.Math.Between(1, 3), Phaser.Math.Between(1, 3));
  }
  g.lineStyle(1, 0x1a1a22).strokeRect(0.5, 0.5, tile - 1, tile - 1);
  g.generateTexture("floor", tile, tile);
  g.clear();

  // ---- Jugador: una textura por color (el tinte solo funciona en WebGL) ----
  const pr = PLAYER_RADIUS;
  const ps = pr * 2 + 8;
  const pc = ps / 2;
  PLAYER_COLORS.forEach((color, i) => {
    g.fillStyle(0x000000, 0.35).fillCircle(pc + 2, pc + 3, pr); // sombra
    g.fillStyle(color).fillCircle(pc, pc, pr); // torso
    g.lineStyle(2, 0x000000, 0.45).strokeCircle(pc, pc, pr);
    g.fillStyle(0xf1c27d).fillCircle(pc, pc, pr * 0.55); // cabeza
    g.lineStyle(1.5, 0x000000, 0.4).strokeCircle(pc, pc, pr * 0.55);
    g.fillStyle(0xf1c27d).fillCircle(pc + pr * 0.35, pc - pr * 0.75, 4).fillCircle(pc + pr * 0.35, pc + pr * 0.75, 4); // manos
    g.generateTexture(`player_${i}`, ps, ps);
    g.clear();
  });

  // ---- Arma: se dibuja aparte para poder cambiarla ----
  g.fillStyle(0x2c2c2c).fillRoundedRect(0, 0, 26, 6, 2);
  g.fillStyle(0x4a4a4a).fillRect(0, 1, 8, 4);
  g.generateTexture("gun", 26, 6);
  g.clear();

  // ---- Zombies: un sprite por tipo, con brazos extendidos y ojos rojos ----
  const looks: Record<ZombieType, { body: number; dark: number; eyes: number }> = {
    walker: { body: 0x6ab04c, dark: 0x3f7a2a, eyes: 0xff3b3b },
    runner: { body: 0xd98d2b, dark: 0x8a5514, eyes: 0xffd23b },
    tank: { body: 0x7e3fa0, dark: 0x4b1f66, eyes: 0xff3b3b },
  };
  (Object.keys(looks) as ZombieType[]).forEach((type) => {
    const r = ZOMBIES[type].radius;
    const size = r * 2 + 14;
    const c = size / 2;
    const { body, dark, eyes } = looks[type];

    g.fillStyle(0x000000, 0.35).fillCircle(c + 2, c + 3, r); // sombra
    // brazos hacia delante
    g.fillStyle(dark).fillRoundedRect(c, c - r * 0.75 - 3, r + 5, 6, 3).fillRoundedRect(c, c + r * 0.75 - 3, r + 5, 6, 3);
    g.fillStyle(body).fillCircle(c, c, r); // cuerpo
    g.lineStyle(2, dark).strokeCircle(c, c, r);
    g.fillStyle(dark).fillCircle(c - r * 0.3, c - r * 0.35, r * 0.2).fillCircle(c + r * 0.1, c + r * 0.45, r * 0.15); // manchas
    g.fillStyle(eyes).fillCircle(c + r * 0.45, c - r * 0.3, Math.max(2, r * 0.13)).fillCircle(c + r * 0.45, c + r * 0.3, Math.max(2, r * 0.13)); // ojos
    g.generateTexture(`zombie_${type}`, size, size);
    g.clear();
  });

  // ---- Bala: pequeña cápsula amarilla con halo ----
  g.fillStyle(0xffe066, 0.35).fillRoundedRect(0, 0, 14, 8, 4);
  g.fillStyle(0xfff4b0).fillRoundedRect(2, 2, 10, 4, 2);
  g.generateTexture("bullet", 14, 8);
  g.clear();

  // ---- Fogonazo ----
  g.fillStyle(0xffc24d, 0.9).fillTriangle(0, 4, 18, 0, 18, 8).fillTriangle(0, 4, 12, -3, 12, 11);
  g.fillStyle(0xffffff).fillCircle(4, 4, 3);
  g.generateTexture("flash", 18, 12);
  g.clear();

  // ---- Partícula genérica (se tinta) ----
  g.fillStyle(0xffffff).fillCircle(3, 3, 3);
  g.generateTexture("particle", 6, 6);
  g.clear();

  // ---- Charco de sangre (decal al morir un zombie) ----
  g.fillStyle(0x8b0000, 0.8);
  for (let i = 0; i < 6; i++) {
    g.fillCircle(20 + Phaser.Math.Between(-9, 9), 20 + Phaser.Math.Between(-9, 9), Phaser.Math.Between(5, 11));
  }
  g.generateTexture("blood", 40, 40);
  g.clear();

  g.destroy();
}
