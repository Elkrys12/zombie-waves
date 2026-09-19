import Phaser from "phaser";
import { PLAYER_RADIUS, ZOMBIES, type ZombieType } from "@zombie-waves/shared";

/** Colores de los jugadores, en orden de entrada a la sala. */
export const PLAYER_COLORS = [0x3fa34d, 0x2f80ed, 0xf2994a, 0xbb6bd9];
export const CAR_COLORS = [0x9e2a2b, 0x2b4c7e, 0xd9d9d9, 0x3c6e47];

export const GROUND_TILE = 128;

/**
 * Genera todas las texturas del juego por código (sin archivos externos).
 * Todos los sprites "miran" hacia la derecha (ángulo 0) para poder rotarlos.
 */
export function generateTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const rnd = new Phaser.Math.RandomDataGenerator(["zombie-waves"]); // determinista: mismo suelo para todos

  // ---------------------------------------------------------------- Suelos
  const T = GROUND_TILE;

  // Hierba: base verde apagado con briznas y calvas
  g.fillStyle(0x3d5a3a).fillRect(0, 0, T, T);
  for (let i = 0; i < 260; i++) {
    g.fillStyle(rnd.pick([0x476a43, 0x36512f, 0x4f7449, 0x2f4a2b]), 1)
      .fillRect(rnd.between(0, T - 2), rnd.between(0, T - 4), rnd.between(1, 2), rnd.between(2, 5));
  }
  for (let i = 0; i < 5; i++) g.fillStyle(0x4a5f3a, 0.5).fillCircle(rnd.between(0, T), rnd.between(0, T), rnd.between(6, 14));
  g.generateTexture("ground_grass", T, T);
  g.clear();

  // Asfalto: gris oscuro con grano y grietas
  g.fillStyle(0x2c2c31).fillRect(0, 0, T, T);
  for (let i = 0; i < 400; i++) {
    g.fillStyle(rnd.pick([0x333338, 0x26262a, 0x3a3a40]), 1).fillRect(rnd.between(0, T - 1), rnd.between(0, T - 1), rnd.between(1, 2), rnd.between(1, 2));
  }
  g.lineStyle(1, 0x1f1f23, 0.8);
  for (let i = 0; i < 3; i++) {
    let x = rnd.between(0, T), y = rnd.between(0, T);
    g.beginPath().moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += rnd.between(-14, 14); y += rnd.between(-14, 14); g.lineTo(x, y); }
    g.strokePath();
  }
  g.generateTexture("ground_asphalt", T, T);
  g.clear();

  // Hormigón: losas claras con juntas
  g.fillStyle(0x6f6f6a).fillRect(0, 0, T, T);
  for (let i = 0; i < 300; i++) {
    g.fillStyle(rnd.pick([0x75756f, 0x686863, 0x7c7c76]), 1).fillRect(rnd.between(0, T - 1), rnd.between(0, T - 1), 2, 2);
  }
  g.lineStyle(2, 0x5a5a55).strokeRect(1, 1, T - 2, T - 2).lineBetween(T / 2, 0, T / 2, T).lineBetween(0, T / 2, T, T / 2);
  g.generateTexture("ground_concrete", T, T);
  g.clear();

  // Tierra: marrón con piedras y matojos
  g.fillStyle(0x6b5237).fillRect(0, 0, T, T);
  for (let i = 0; i < 300; i++) {
    g.fillStyle(rnd.pick([0x74593c, 0x5e4630, 0x7d6244]), 1).fillRect(rnd.between(0, T - 2), rnd.between(0, T - 2), rnd.between(1, 3), rnd.between(1, 3));
  }
  for (let i = 0; i < 10; i++) g.fillStyle(0x8a8378, 1).fillCircle(rnd.between(0, T), rnd.between(0, T), rnd.between(1, 3));
  for (let i = 0; i < 6; i++) g.fillStyle(0x556b3a, 1).fillRect(rnd.between(0, T), rnd.between(0, T), 2, rnd.between(3, 6));
  g.generateTexture("ground_dirt", T, T);
  g.clear();

  // ---------------------------------------------------------------- Jugador
  const pr = PLAYER_RADIUS;
  const ps = pr * 2 + 12;
  const pc = ps / 2;
  PLAYER_COLORS.forEach((color, i) => {
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(25).color;
    const light = Phaser.Display.Color.IntegerToColor(color).lighten(18).color;
    g.fillStyle(0x000000, 0.35).fillCircle(pc + 2, pc + 4, pr); // sombra
    g.fillStyle(0x3b3b3b).fillRoundedRect(pc - pr - 4, pc - 8, 10, 16, 3); // mochila
    g.fillStyle(color).fillCircle(pc, pc, pr); // torso / chaqueta
    g.fillStyle(light, 0.6).fillCircle(pc - 4, pc - 4, pr * 0.55); // brillo
    g.lineStyle(2, dark).strokeCircle(pc, pc, pr);
    // brazos hacia delante sujetando el arma
    g.fillStyle(color).fillRoundedRect(pc, pc - pr * 0.8, pr + 6, 7, 3).fillRoundedRect(pc, pc + pr * 0.8 - 7, pr + 6, 7, 3);
    g.fillStyle(0xf1c27d).fillCircle(pc + pr + 4, pc - pr * 0.8 + 3.5, 4).fillCircle(pc + pr + 4, pc + pr * 0.8 - 3.5, 4); // manos
    g.fillStyle(0xf1c27d).fillCircle(pc, pc, pr * 0.55); // cabeza
    g.fillStyle(0x3a2a1a).fillCircle(pc - 2, pc, pr * 0.55); // pelo
    g.fillStyle(0xf1c27d).fillCircle(pc + 3, pc, pr * 0.47); // cara
    g.lineStyle(1.5, 0x000000, 0.35).strokeCircle(pc, pc, pr * 0.55);
    g.generateTexture(`player_${i}`, ps, ps);
    g.clear();
  });

  // Armas: se dibujan aparte para poder cambiarlas
  g.fillStyle(0x2c2c2c).fillRoundedRect(0, 0, 26, 6, 2); g.fillStyle(0x4a4a4a).fillRect(0, 1, 8, 4);
  g.generateTexture("gun_pistol", 26, 6); g.clear();
  g.fillStyle(0x2c2c2c).fillRoundedRect(0, 0, 32, 7, 2); g.fillStyle(0x555555).fillRect(4, 1, 10, 5); g.fillStyle(0x1f1f1f).fillRect(12, 4, 5, 8);
  g.generateTexture("gun_smg", 32, 12); g.clear();
  g.fillStyle(0x5a3a1e).fillRoundedRect(0, 0, 14, 8, 2); g.fillStyle(0x2c2c2c).fillRoundedRect(10, 1, 30, 6, 2);
  g.generateTexture("gun_shotgun", 40, 8); g.clear();
  g.fillStyle(0x4a3520).fillRoundedRect(0, 0, 16, 8, 2); g.fillStyle(0x2c2c2c).fillRoundedRect(12, 2, 36, 5, 2); g.fillStyle(0x111111).fillRect(20, 0, 12, 3);
  g.generateTexture("gun_rifle", 48, 8); g.clear();

  // ---------------------------------------------------------------- Zombies
  const looks: Record<ZombieType, { body: number; dark: number; eyes: number; cloth: number }> = {
    walker: { body: 0x7aa05a, dark: 0x4a6a35, eyes: 0xff3b3b, cloth: 0x5a5a6e },
    runner: { body: 0xb5875a, dark: 0x7a5636, eyes: 0xffd23b, cloth: 0x6e3a3a },
    tank: { body: 0x8a5aa8, dark: 0x53306a, eyes: 0xff3b3b, cloth: 0x3a3a3a },
  };
  (Object.keys(looks) as ZombieType[]).forEach((type) => {
    const r = ZOMBIES[type].radius;
    const size = r * 2 + 18;
    const c = size / 2;
    const { body, dark, eyes, cloth } = looks[type];

    g.fillStyle(0x000000, 0.35).fillCircle(c + 2, c + 4, r); // sombra
    // brazos extendidos, ligeramente asimétricos
    g.fillStyle(body).fillRoundedRect(c, c - r * 0.8, r + 8, 7, 3).fillRoundedRect(c - 2, c + r * 0.8 - 7, r + 5, 7, 3);
    g.fillStyle(dark).fillCircle(c + r + 6, c - r * 0.8 + 3.5, 4).fillCircle(c + r + 3, c + r * 0.8 - 3.5, 4); // manos
    g.fillStyle(body).fillCircle(c, c, r); // torso
    g.fillStyle(cloth).fillRect(c - r * 0.7, c - r * 0.35, r * 0.9, r * 0.7); // camisa rota
    g.fillStyle(cloth).fillRect(c - r * 0.2, c - r * 0.6, r * 0.5, r * 0.3);
    g.fillStyle(0x7a1b1b, 0.8).fillCircle(c - r * 0.4, c + r * 0.4, r * 0.18).fillCircle(c + r * 0.2, c - r * 0.5, r * 0.12); // sangre
    g.lineStyle(2, dark).strokeCircle(c, c, r);
    if (type === "tank") {
      g.fillStyle(0x2a2a2a).fillRoundedRect(c - r * 0.9, c - r * 0.25, r * 0.8, r * 0.5, 4); // placa de blindaje
      g.lineStyle(2, 0x111111).strokeRoundedRect(c - r * 0.9, c - r * 0.25, r * 0.8, r * 0.5, 4);
    }
    g.fillStyle(body).fillCircle(c + r * 0.15, c, r * 0.5); // cabeza
    g.fillStyle(dark).fillCircle(c + r * 0.05, c - r * 0.1, r * 0.45); // pelo / calva oscura
    g.fillStyle(body).fillCircle(c + r * 0.25, c + r * 0.05, r * 0.4);
    g.fillStyle(eyes).fillCircle(c + r * 0.5, c - r * 0.22, Math.max(2, r * 0.11)).fillCircle(c + r * 0.5, c + r * 0.22, Math.max(2, r * 0.11)); // ojos
    g.lineStyle(1.5, 0x000000, 0.35).strokeCircle(c + r * 0.15, c, r * 0.5);
    g.generateTexture(`zombie_${type}`, size, size);
    g.clear();
  });

  // ---------------------------------------------------------------- Proyectiles y efectos
  g.fillStyle(0xffe066, 0.35).fillRoundedRect(0, 0, 14, 8, 4);
  g.fillStyle(0xfff4b0).fillRoundedRect(2, 2, 10, 4, 2);
  g.generateTexture("bullet", 14, 8);
  g.clear();

  g.fillStyle(0xffc24d, 0.9).fillTriangle(0, 4, 18, 0, 18, 8).fillTriangle(0, 4, 12, -3, 12, 11);
  g.fillStyle(0xffffff).fillCircle(4, 4, 3);
  g.generateTexture("flash", 18, 12);
  g.clear();

  g.fillStyle(0xffffff).fillCircle(3, 3, 3);
  g.generateTexture("particle", 6, 6);
  g.clear();

  g.fillStyle(0x6e0f0f, 0.85);
  for (let i = 0; i < 6; i++) g.fillCircle(20 + rnd.between(-9, 9), 20 + rnd.between(-9, 9), rnd.between(5, 11));
  g.generateTexture("blood", 40, 40);
  g.clear();

  // ---------------------------------------------------------------- Obstáculos
  // Árbol: copa vista desde arriba (se escala según el tamaño)
  g.fillStyle(0x000000, 0.35).fillCircle(56, 60, 46); // sombra
  g.fillStyle(0x2f5d2a).fillCircle(50, 50, 46);
  g.fillStyle(0x3f7a36).fillCircle(44, 44, 36);
  g.fillStyle(0x4f9440, 0.9).fillCircle(38, 38, 22);
  g.fillStyle(0x2a5226, 0.9).fillCircle(64, 62, 16).fillCircle(30, 66, 12);
  g.lineStyle(2, 0x1f3f1c, 0.8).strokeCircle(50, 50, 46);
  g.generateTexture("tree", 104, 108);
  g.clear();

  // Caja de madera
  g.fillStyle(0x000000, 0.3).fillRect(3, 4, 40, 40);
  g.fillStyle(0x9c6b3c).fillRect(0, 0, 40, 40);
  g.lineStyle(2, 0x6b4526).strokeRect(1, 1, 38, 38).lineBetween(0, 13, 40, 13).lineBetween(0, 27, 40, 27);
  g.lineStyle(2, 0x5a3a1e, 0.7).lineBetween(2, 2, 38, 38).lineBetween(38, 2, 2, 38);
  g.generateTexture("crate", 44, 44);
  g.clear();

  // Barril (vista superior)
  g.fillStyle(0x000000, 0.3).fillCircle(17, 18, 15);
  g.fillStyle(0x4b5563).fillCircle(15, 15, 15);
  g.lineStyle(2, 0x2f3640).strokeCircle(15, 15, 15).strokeCircle(15, 15, 9);
  g.fillStyle(0x6b7280).fillCircle(15, 15, 5);
  g.fillStyle(0xd9a300, 0.8).fillCircle(15, 15, 3);
  g.generateTexture("barrel", 34, 34);
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

  // Coches: un color por variante, vista superior mirando a la derecha
  CAR_COLORS.forEach((color, i) => {
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(30).color;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(3, 4, 80, 42, 8); // sombra
    g.fillStyle(color).fillRoundedRect(0, 0, 80, 42, 8);
    g.lineStyle(2, dark).strokeRoundedRect(1, 1, 78, 40, 8);
    g.fillStyle(0x1c2733).fillRoundedRect(18, 5, 14, 32, 3).fillRoundedRect(54, 6, 10, 30, 3); // parabrisas / luneta
    g.fillStyle(dark).fillRoundedRect(32, 4, 22, 34, 4); // techo
    g.fillStyle(0xfff1a8).fillRect(76, 6, 3, 8).fillRect(76, 28, 3, 8); // faros
    g.fillStyle(0xd12b2b).fillRect(1, 6, 3, 8).fillRect(1, 28, 3, 8); // pilotos
    g.generateTexture(`car_${i}`, 84, 48);
    g.clear();
  });

  // Luz (gradiente radial) para el sistema de iluminación
  const light = scene.textures.createCanvas("light", 512, 512)!;
  const ctx = light.getContext();
  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.8, "rgba(255,255,255,0.25)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  light.refresh();

  g.destroy();
}
