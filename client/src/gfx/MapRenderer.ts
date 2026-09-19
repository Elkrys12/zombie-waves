import Phaser from "phaser";
import {
  MAP_WIDTH, MAP_HEIGHT, GROUND_ZONES, OBSTACLES, ZOMBIE_SPAWNS,
  type Obstacle, type GroundKind,
} from "@zombie-waves/shared";

const GROUND_TEXTURE: Record<GroundKind, string> = { grass: "grass", asphalt: "asphalt", concrete: "concrete", dirt: "dirt" };
const CAR_KEYS = ["car_red_1", "car_blue_1", "car_green_1", "car_yellow_1", "car_black_1"];
const ROOF_COLORS = [0xb5473a, 0x5b7f96, 0x8a6b4f, 0x4f7f5a, 0x9c8a6e, 0x6e6e78];

/** Farolas: iluminan de noche (posiciones devueltas a la escena). */
const LAMPS = [
  { x: 1270, y: 1270 }, { x: 1930, y: 1270 }, { x: 1270, y: 1930 }, { x: 1930, y: 1930 }, // plaza
  { x: 1460, y: 700 }, { x: 1740, y: 2500 }, { x: 700, y: 1460 }, { x: 2500, y: 1740 },   // carreteras
  { x: 260, y: 2560 }, { x: 900, y: 2560 },                                                 // aparcamiento
];

/** Decoración sin colisión: conos, rocas, arbustos, neumáticos. */
const DECOR: { key: string; x: number; y: number; scale?: number; rot?: number }[] = [
  { key: "cone_straight", x: 1180, y: 1450, scale: 0.5 }, { key: "cone_straight", x: 1210, y: 1470, scale: 0.5 }, { key: "cone_straight", x: 2020, y: 1740, scale: 0.5 },
  { key: "cone_straight", x: 1560, y: 520, scale: 0.5 }, { key: "cone_straight", x: 1650, y: 2620, scale: 0.5 },
  { key: "rock1", x: 2300, y: 450, scale: 0.7 }, { key: "rock2", x: 2700, y: 900, scale: 0.6 }, { key: "rock_a", x: 2450, y: 1000 }, { key: "rock_b", x: 2950, y: 300 },
  { key: "rock_a", x: 3000, y: 1000 }, { key: "rock_b", x: 2200, y: 800 },
  { key: "bush", x: 200, y: 1000 }, { key: "bush", x: 1100, y: 1000 }, { key: "bush_orange", x: 520, y: 1600 }, { key: "bush", x: 1050, y: 1700 },
  { key: "bush", x: 150, y: 1700 }, { key: "bush_orange", x: 800, y: 1200 }, { key: "bush", x: 3000, y: 2000 }, { key: "bush_orange", x: 2300, y: 1300 },
  { key: "tires_white", x: 2400, y: 2700, scale: 0.8 }, { key: "tires_white", x: 2440, y: 2720, scale: 0.8 }, { key: "tires_white", x: 1150, y: 2650, scale: 0.8 },
  { key: "barrel_gray", x: 2470, y: 2920 }, { key: "crate_small", x: 2330, y: 2440 }, { key: "crate_small", x: 2900, y: 700 },
  { key: "splat_dark", x: 1500, y: 1400, scale: 1.2 }, { key: "splat_dark", x: 640, y: 2300 }, { key: "splat_dark", x: 2600, y: 1560 },
];

/**
 * Dibuja el mundo estático con los tiles y props de Kenney: suelos por zonas, carreteras,
 * obstáculos y decoración. Todo lo que no se mueve se crea una sola vez.
 */
export class MapRenderer {
  constructor(private scene: Phaser.Scene) {}

  /** @returns posiciones de las farolas para el sistema de iluminación */
  draw(): { x: number; y: number }[] {
    this.drawGround();
    this.drawRoadMarkings();
    this.drawSpawnMarkers();
    for (const d of DECOR) this.scene.add.image(d.x, d.y, d.key).setScale(d.scale ?? 1).setRotation(d.rot ?? Math.random() * 6.28).setDepth(3);
    for (const o of OBSTACLES) this.drawObstacle(o);
    for (const l of LAMPS) this.drawLamp(l.x, l.y);
    this.scene.add.rectangle(0, 0, MAP_WIDTH, MAP_HEIGHT).setOrigin(0).setStrokeStyle(8, 0x101014, 0.9).setDepth(6);
    return LAMPS;
  }

  private drawGround() {
    this.scene.add.tileSprite(0, 0, MAP_WIDTH, MAP_HEIGHT, GROUND_TEXTURE.grass).setOrigin(0).setDepth(0);
    for (const z of GROUND_ZONES) {
      this.scene.add.tileSprite(z.x, z.y, z.w, z.h, GROUND_TEXTURE[z.kind]).setOrigin(0).setDepth(1);
      if (z.kind !== "asphalt") this.scene.add.rectangle(z.x, z.y, z.w, z.h).setOrigin(0).setStrokeStyle(4, 0x000000, 0.2).setDepth(1);
    }
    // Aceras (borde claro) a lo largo de las carreteras
    const g = this.scene.add.graphics().setDepth(1);
    g.fillStyle(0x9a9a94, 0.9);
    g.fillRect(0, 1466, MAP_WIDTH, 14).fillRect(0, 1720, MAP_WIDTH, 14).fillRect(1466, 0, 14, MAP_HEIGHT).fillRect(1720, 0, 14, MAP_HEIGHT);
  }

  private drawRoadMarkings() {
    const g = this.scene.add.graphics().setDepth(2);
    g.fillStyle(0xf2c94c, 0.85);
    for (let x = 40; x < MAP_WIDTH; x += 90) if (x < 1180 || x > 1980) g.fillRect(x, 1596, 50, 8);
    for (let y = 40; y < MAP_HEIGHT; y += 90) if (y < 1180 || y > 1980) g.fillRect(1596, y, 8, 50);
    g.fillStyle(0xf2f2f2, 0.75);
    for (let i = 0; i < 6; i++) {
      g.fillRect(1180 + i * 12, 1500, 6, 200).fillRect(1950 + i * 12, 1500, 6, 200);
      g.fillRect(1500, 1180 + i * 12, 200, 6).fillRect(1500, 1950 + i * 12, 200, 6);
    }
    g.lineStyle(3, 0xf2f2f2, 0.4);
    for (let i = 0; i < 8; i++) g.lineBetween(240 + i * 120, 2200, 240 + i * 120, 2300).lineBetween(240 + i * 120, 2370, 240 + i * 120, 2470);
    g.lineStyle(2, 0x5a5a55, 0.5).strokeCircle(1600, 1600, 70);
  }

  private drawSpawnMarkers() {
    const g = this.scene.add.graphics().setDepth(2);
    for (const s of ZOMBIE_SPAWNS) {
      g.fillStyle(0x3a1a1a, 0.45).fillCircle(s.x, s.y, 40);
      g.lineStyle(2, 0x7a2a2a, 0.5).strokeCircle(s.x, s.y, 40);
    }
  }

  private drawLamp(x: number, y: number) {
    // Farola vista desde arriba: base, brazo, cabeza luminosa y halo cálido en el suelo
    const s = this.scene;
    s.add.circle(x, y, 60, 0xffe0a0, 0.10).setDepth(3);
    s.add.circle(x, y, 28, 0xffe0a0, 0.12).setDepth(3);
    s.add.circle(x + 3, y + 4, 9, 0x000000, 0.3).setDepth(4);
    s.add.circle(x, y, 8, 0x4a4a4f).setStrokeStyle(2, 0x26262a).setDepth(22);
    s.add.rectangle(x + 11, y, 22, 5, 0x4a4a4f).setDepth(22);
    s.add.circle(x + 24, y, 9, 0xfff3c4).setStrokeStyle(2, 0x8a7a40).setDepth(22);
  }

  private drawObstacle(o: Obstacle) {
    const s = this.scene;
    switch (o.kind) {
      case "building":
        this.drawBuilding(o);
        break;
      case "wall": {
        const r = { x: o.x - o.w / 2, y: o.y - o.h / 2 };
        s.add.rectangle(r.x + 3, r.y + 4, o.w, o.h, 0x000000, 0.3).setOrigin(0).setDepth(4);
        s.add.tileSprite(r.x, r.y, o.w, o.h, "brick").setOrigin(0).setDepth(5).setTileScale(0.5);
        s.add.rectangle(r.x, r.y, o.w, o.h).setOrigin(0).setStrokeStyle(2, 0x4f3a2a).setDepth(5);
        break;
      }
      case "fence": {
        const g = s.add.graphics().setDepth(5);
        const x = o.x - o.w / 2, y = o.y - o.h / 2;
        g.fillStyle(0x000000, 0.25).fillRect(x + 2, y + 3, o.w, o.h);
        g.fillStyle(0xf2f2f2).fillRect(x, y, o.w, o.h);
        g.fillStyle(0xd0d0d0);
        if (o.w > o.h) for (let i = 0; i <= o.w; i += 40) g.fillRect(x + i - 3, y - 4, 6, o.h + 8);
        else for (let i = 0; i <= o.h; i += 40) g.fillRect(x - 4, y + i - 3, o.w + 8, 6);
        break;
      }
      case "sandbag": {
        const g = s.add.graphics().setDepth(5);
        const x = o.x - o.w / 2, y = o.y - o.h / 2;
        g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 2, y + 3, o.w, o.h, 8);
        for (let i = 0; i < o.w; i += 30) {
          g.fillStyle(0xc9b37f).fillRoundedRect(x + i, y, 30, o.h, 8);
          g.lineStyle(2, 0x9a865a).strokeRoundedRect(x + i + 1, y + 1, 28, o.h - 2, 8);
        }
        break;
      }
      case "tree": {
        const key = o.w >= 85 ? "tree_large" : "tree_medium";
        s.add.ellipse(o.x + 6, o.y + 8, o.w * 1.1, o.h * 1.0, 0x000000, 0.3).setDepth(3);
        s.add.image(o.x, o.y, key).setDisplaySize(o.w * 1.15, o.h * 1.15).setDepth(20).setAngle(Math.random() * 360).setAlpha(0.95);
        break;
      }
      case "barrel":
        if (o.w >= 80) s.add.image(o.x, o.y, "fountain").setDisplaySize(o.w + 4, o.h + 4).setDepth(5);
        else s.add.image(o.x, o.y, "barrel").setDisplaySize(o.w + 10, o.h + 10).setDepth(5);
        break;
      case "crate":
        s.add.image(o.x, o.y, "crate").setDisplaySize(o.w + 8, o.h + 8).setDepth(5);
        break;
      case "car": {
        // Los coches de Kenney apuntan hacia arriba: +90° para que miren a la derecha con rotación 0
        const img = s.add.image(o.x, o.y, CAR_KEYS[(o.variant ?? 0) % CAR_KEYS.length]).setDepth(5);
        const k = o.w / img.height; // el "largo" del coche es su alto en la textura
        img.setScale(k).setRotation((o.rotation ?? 0) + Math.PI / 2);
        s.add.ellipse(o.x + 4, o.y + 6, o.w, o.h + 6, 0x000000, 0.3).setRotation(o.rotation ?? 0).setDepth(4);
        break;
      }
    }
  }

  private drawBuilding(o: Obstacle) {
    const x = o.x - o.w / 2, y = o.y - o.h / 2;
    const base = ROOF_COLORS[(o.variant ?? 0) % ROOF_COLORS.length];
    const col = Phaser.Display.Color.IntegerToColor(base);
    const light = col.clone().lighten(14).color;
    const dark = col.clone().darken(22).color;
    const line = col.clone().darken(40).color;
    const g = this.scene.add.graphics().setDepth(21);

    this.scene.add.rectangle(x + 12, y + 16, o.w, o.h, 0x000000, 0.4).setOrigin(0).setDepth(4); // sombra proyectada
    g.fillStyle(0x2e2622).fillRect(x - 8, y - 8, o.w + 16, o.h + 16); // alero / paredes
    g.fillStyle(0x4a3d36).fillRect(x - 5, y - 5, o.w + 10, o.h + 10);

    // Dos vertientes: la norte recibe la luz, la sur queda en sombra
    g.fillStyle(light).fillRect(x, y, o.w, o.h / 2);
    g.fillStyle(dark).fillRect(x, o.y, o.w, o.h / 2);
    // Tejas: hileras horizontales con juntas desplazadas
    g.lineStyle(1, line, 0.45);
    for (let ty = y + 10; ty < y + o.h; ty += 10) g.lineBetween(x, ty, x + o.w, ty);
    for (let ty = y, row = 0; ty < y + o.h; ty += 10, row++) {
      for (let tx = x + (row % 2) * 12; tx < x + o.w; tx += 24) g.lineBetween(tx, ty, tx, Math.min(ty + 10, y + o.h));
    }
    g.lineStyle(4, line, 0.9).lineBetween(x, o.y, x + o.w, o.y); // cumbrera
    g.lineStyle(3, 0x2e2622, 0.9).strokeRect(x, y, o.w, o.h);

    // Chimenea (con sombra), claraboya y, en naves grandes, depósito de agua
    g.fillStyle(0x000000, 0.35).fillRect(x + 30, y + 26, 26, 26);
    g.fillStyle(0x7a5a4a).fillRect(x + 26, y + 20, 26, 26);
    g.fillStyle(0x3b2a22).fillRect(x + 31, y + 25, 16, 16);
    g.lineStyle(2, 0x3b2a22).strokeRect(x + 26, y + 20, 26, 26);
    g.fillStyle(0x263238).fillRect(x + o.w - 76, y + 22, 50, 34);
    g.fillStyle(0xa7d8f0, 0.55).fillRect(x + o.w - 72, y + 26, 42, 26);
    g.lineStyle(1, 0xffffff, 0.35).lineBetween(x + o.w - 72, y + 26, x + o.w - 30, y + 52);
    if (o.w > 400) {
      g.fillStyle(0x000000, 0.3).fillCircle(o.x + 5, o.y + 6, 26);
      g.fillStyle(0x7d8b93).fillCircle(o.x, o.y, 26);
      g.lineStyle(2, 0x455a64).strokeCircle(o.x, o.y, 26).strokeCircle(o.x, o.y, 14).strokeCircle(o.x, o.y, 5);
    }
    g.fillStyle(0x3e2723).fillRect(o.x - 18, y + o.h - 2, 36, 10); // puerta sur
  }
}
