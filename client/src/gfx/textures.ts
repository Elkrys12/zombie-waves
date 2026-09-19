import Phaser from "phaser";

/** Colores de los jugadores (minimapa, marcador), en orden de entrada a la sala. */
export const PLAYER_COLORS = [0x3fa34d, 0x2f80ed, 0xf2994a, 0xbb6bd9];

/**
 * Texturas que se siguen generando por código (el resto son sprites de Kenney cargados en BootScene).
 */
export function generateTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Bala: pequeña cápsula amarilla con halo
  g.fillStyle(0xffe066, 0.35).fillRoundedRect(0, 0, 14, 8, 4);
  g.fillStyle(0xfff4b0).fillRoundedRect(2, 2, 10, 4, 2);
  g.generateTexture("bullet", 14, 8);
  g.clear();

  // Fogonazo
  g.fillStyle(0xffc24d, 0.9).fillTriangle(0, 4, 18, 0, 18, 8).fillTriangle(0, 4, 12, -3, 12, 11);
  g.fillStyle(0xffffff).fillCircle(4, 4, 3);
  g.generateTexture("flash", 18, 12);
  g.clear();

  // Partícula genérica (se tinta)
  g.fillStyle(0xffffff).fillCircle(3, 3, 3);
  g.generateTexture("particle", 6, 6);
  g.clear();

  // Fuente de la plaza (círculo grande de piedra con agua)
  g.fillStyle(0x000000, 0.3).fillCircle(47, 48, 45);
  g.fillStyle(0x8c8c85).fillCircle(45, 45, 45);
  g.lineStyle(3, 0x6b6b65).strokeCircle(45, 45, 45).strokeCircle(45, 45, 34);
  g.fillStyle(0x2f6f9f).fillCircle(45, 45, 33);
  g.fillStyle(0x4f93c4, 0.7).fillCircle(40, 40, 22);
  g.fillStyle(0x8c8c85).fillCircle(45, 45, 8);
  g.generateTexture("fountain", 94, 94);
  g.clear();

  g.destroy();
}
