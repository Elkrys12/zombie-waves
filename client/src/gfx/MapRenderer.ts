import Phaser from "phaser";
import {
  MAP_WIDTH, MAP_HEIGHT, GROUND_ZONES, OBSTACLES, ZOMBIE_SPAWNS,
  type Obstacle, type GroundKind,
} from "@zombie-waves/shared";

const GROUND_TEXTURE: Record<GroundKind, string> = {
  grass: "ground_grass",
  asphalt: "ground_asphalt",
  concrete: "ground_concrete",
  dirt: "ground_dirt",
};

const ROOF_COLORS = [0x8d6e63, 0x78909c, 0x6d4c41, 0xa1887f, 0x546e7a, 0x5d6d7e];

/**
 * Dibuja el mundo estático: suelos por zonas, carreteras, obstáculos y decoración.
 * Todo lo que no se mueve se crea una sola vez.
 */
export class MapRenderer {
  constructor(private scene: Phaser.Scene) {}

  draw() {
    this.drawGround();
    this.drawRoadMarkings();
    this.drawSpawnMarkers();
    for (const o of OBSTACLES) this.drawObstacle(o);
    // Borde del mundo
    this.scene.add.rectangle(0, 0, MAP_WIDTH, MAP_HEIGHT).setOrigin(0).setStrokeStyle(8, 0x101014, 0.9).setDepth(6);
  }

  private drawGround() {
    this.scene.add.tileSprite(0, 0, MAP_WIDTH, MAP_HEIGHT, GROUND_TEXTURE.grass).setOrigin(0).setDepth(0);
    for (const z of GROUND_ZONES) {
      this.scene.add.tileSprite(z.x, z.y, z.w, z.h, GROUND_TEXTURE[z.kind]).setOrigin(0).setDepth(1);
      // Bordillo sutil alrededor de cada zona
      this.scene.add.rectangle(z.x, z.y, z.w, z.h).setOrigin(0).setStrokeStyle(3, 0x000000, 0.25).setDepth(1);
    }
  }

  private drawRoadMarkings() {
    const g = this.scene.add.graphics().setDepth(2);
    // Línea discontinua central de las dos carreteras
    g.fillStyle(0xe6d68a, 0.7);
    for (let x = 40; x < MAP_WIDTH; x += 90) g.fillRect(x, 1596, 50, 8);
    for (let y = 40; y < MAP_HEIGHT; y += 90) g.fillRect(1596, y, 8, 50);
    // Paso de peatones en los accesos a la plaza
    g.fillStyle(0xdddddd, 0.6);
    for (let i = 0; i < 6; i++) {
      g.fillRect(1180 + i * 12, 1500, 6, 200).fillRect(1950 + i * 12, 1500, 6, 200);
      g.fillRect(1500, 1180 + i * 12, 200, 6).fillRect(1500, 1950 + i * 12, 200, 6);
    }
    // Plazas de aparcamiento del supermercado
    g.lineStyle(3, 0xdddddd, 0.35);
    for (let i = 0; i < 8; i++) {
      g.lineBetween(240 + i * 120, 2200, 240 + i * 120, 2300).lineBetween(240 + i * 120, 2370, 240 + i * 120, 2470);
    }
    // Borde de la fuente (adoquines)
    g.lineStyle(2, 0x5a5a55, 0.5).strokeCircle(1600, 1600, 70);
  }

  private drawSpawnMarkers() {
    // Marcas discretas donde entran los zombies (ayudan a orientarse)
    const g = this.scene.add.graphics().setDepth(2);
    for (const s of ZOMBIE_SPAWNS) {
      g.fillStyle(0x3a1a1a, 0.45).fillCircle(s.x, s.y, 40);
      g.lineStyle(2, 0x7a2a2a, 0.5).strokeCircle(s.x, s.y, 40);
    }
  }

  private drawObstacle(o: Obstacle) {
    const s = this.scene;
    switch (o.kind) {
      case "building":
        this.drawBuilding(o);
        break;
      case "wall": {
        const g = s.add.graphics().setDepth(5);
        const x = o.x - o.w / 2, y = o.y - o.h / 2;
        g.fillStyle(0x000000, 0.3).fillRect(x + 3, y + 4, o.w, o.h);
        g.fillStyle(0x7d7d78).fillRect(x, y, o.w, o.h);
        g.lineStyle(2, 0x4f4f4b).strokeRect(x, y, o.w, o.h);
        // Juntas de ladrillo
        g.lineStyle(1, 0x5f5f5a, 0.8);
        if (o.w > o.h) for (let i = 20; i < o.w; i += 20) g.lineBetween(x + i, y, x + i, y + o.h);
        else for (let i = 20; i < o.h; i += 20) g.lineBetween(x, y + i, x + o.w, y + i);
        break;
      }
      case "fence": {
        const g = s.add.graphics().setDepth(5);
        const x = o.x - o.w / 2, y = o.y - o.h / 2;
        g.fillStyle(0x000000, 0.25).fillRect(x + 2, y + 3, o.w, o.h);
        g.fillStyle(0x8b6b45).fillRect(x, y, o.w, o.h);
        g.fillStyle(0x5a4328);
        if (o.w > o.h) for (let i = 0; i <= o.w; i += 40) g.fillRect(x + i - 3, y - 4, 6, o.h + 8);
        else for (let i = 0; i <= o.h; i += 40) g.fillRect(x - 4, y + i - 3, o.w + 8, 6);
        break;
      }
      case "sandbag": {
        const g = s.add.graphics().setDepth(5);
        const x = o.x - o.w / 2, y = o.y - o.h / 2;
        g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 2, y + 3, o.w, o.h, 8);
        for (let i = 0; i < o.w; i += 30) {
          g.fillStyle(0xb8a276).fillRoundedRect(x + i, y, 30, o.h, 8);
          g.lineStyle(2, 0x8a7652).strokeRoundedRect(x + i + 1, y + 1, 28, o.h - 2, 8);
        }
        break;
      }
      case "tree": {
        s.add.image(o.x, o.y, "tree").setDisplaySize(o.w * 1.1, o.h * 1.15).setDepth(20).setAngle(Math.random() * 360); // por encima de todo
        s.add.circle(o.x, o.y, o.w * 0.2, 0x4a3320).setStrokeStyle(2, 0x2f2014).setDepth(4); // tronco
        break;
      }
      case "barrel":
        if (o.w >= 80) s.add.image(o.x, o.y, "fountain").setDisplaySize(o.w + 4, o.h + 4).setDepth(5);
        else s.add.image(o.x, o.y, "barrel").setDepth(5);
        break;
      case "crate":
        s.add.image(o.x, o.y, "crate").setDisplaySize(o.w + 4, o.h + 4).setDepth(5);
        break;
      case "car":
        s.add.image(o.x, o.y, `car_${(o.variant ?? 0) % 4}`).setRotation(o.rotation ?? 0).setDepth(5);
        break;
    }
  }

  private drawBuilding(o: Obstacle) {
    const g = this.scene.add.graphics().setDepth(21); // los tejados tapan a quien pase pegado
    const x = o.x - o.w / 2, y = o.y - o.h / 2;
    const roof = ROOF_COLORS[(o.variant ?? 0) % ROOF_COLORS.length];
    const dark = Phaser.Display.Color.IntegerToColor(roof).darken(35).color;
    const light = Phaser.Display.Color.IntegerToColor(roof).lighten(12).color;

    // Sombra proyectada y "paredes" (borde grueso oscuro que da volumen)
    this.scene.add.rectangle(x + 10, y + 14, o.w, o.h, 0x000000, 0.4).setOrigin(0).setDepth(4);
    g.fillStyle(dark).fillRect(x - 6, y - 6, o.w + 12, o.h + 12);
    g.fillStyle(roof).fillRect(x, y, o.w, o.h);
    g.fillStyle(light, 0.5).fillRect(x, y, o.w, 10); // arista iluminada
    g.lineStyle(2, dark, 0.7).strokeRect(x + 12, y + 12, o.w - 24, o.h - 24); // parapeto interior

    // Detalles del tejado: unidad de aire acondicionado, claraboya, depósito
    g.fillStyle(0x9e9e9e).fillRect(x + 24, y + 24, 36, 28);
    g.lineStyle(2, 0x616161).strokeRect(x + 24, y + 24, 36, 28).strokeCircle(x + 42, y + 38, 9);
    g.fillStyle(0x37474f, 0.9).fillRect(x + o.w - 70, y + 26, 44, 30);
    g.fillStyle(0x90caf9, 0.35).fillRect(x + o.w - 66, y + 30, 36, 22);
    if (o.w > 400) {
      g.fillStyle(0x546e7a).fillCircle(x + o.w / 2, y + o.h / 2, 22);
      g.lineStyle(2, 0x37474f).strokeCircle(x + o.w / 2, y + o.h / 2, 22).strokeCircle(x + o.w / 2, y + o.h / 2, 12);
    }
    // Puerta en el lado sur (decorativa)
    g.fillStyle(0x3e2723).fillRect(o.x - 16, y + o.h - 4, 32, 8);
  }
}
