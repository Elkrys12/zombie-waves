import Phaser from "phaser";
import {
  MAP_WIDTH, MAP_HEIGHT, GROUND_ZONES, OBSTACLES, ZOMBIE_SPAWNS,
  type Obstacle, type GroundKind,
} from "@zombie-waves/shared";

const GROUND_TEXTURE: Record<GroundKind, string> = { grass: "ground_grass", asphalt: "ground_asphalt", concrete: "ground_concrete", dirt: "ground_dirt" };
const CAR_KEYS = ["car_red", "car_blue", "car_green", "car_white"];
const ROOFS = ["roof_red", "roof_gray", "roof_brown"];

/** Farolas: iluminan de noche (posiciones devueltas a la escena). */
const LAMPS = [
  { x: 1270, y: 1270 }, { x: 1930, y: 1270 }, { x: 1270, y: 1930 }, { x: 1930, y: 1930 }, // plaza
  { x: 1460, y: 700 }, { x: 1740, y: 2500 }, { x: 700, y: 1460 }, { x: 2500, y: 1740 },   // carreteras
  { x: 260, y: 2560 }, { x: 900, y: 2560 },                                                 // aparcamiento
];

/** Decoración sin colisión: conos, rocas, arbustos, neumáticos. */
const DECOR: { key: string; x: number; y: number; size: number; rot?: number }[] = [
  // conos en los cruces y accesos
  { key: "cone", x: 1180, y: 1450, size: 22 }, { key: "cone", x: 1210, y: 1470, size: 22 }, { key: "cone", x: 2020, y: 1740, size: 22 },
  { key: "cone", x: 1560, y: 520, size: 22 }, { key: "cone", x: 1650, y: 2620, size: 22 }, { key: "cone", x: 1000, y: 1560, size: 22 },
  // rocas en el campo y el parque
  { key: "rock", x: 2300, y: 450, size: 60 }, { key: "rock", x: 2700, y: 900, size: 48 }, { key: "rock", x: 2450, y: 1000, size: 36 },
  { key: "rock", x: 2950, y: 300, size: 44 }, { key: "rock", x: 3000, y: 1000, size: 52 }, { key: "rock", x: 2200, y: 800, size: 34 }, { key: "rock", x: 500, y: 1550, size: 40 },
  // arbustos
  { key: "bush", x: 200, y: 1000, size: 56 }, { key: "bush", x: 1100, y: 1000, size: 50 }, { key: "bush", x: 520, y: 1600, size: 60 }, { key: "bush", x: 1050, y: 1700, size: 48 },
  { key: "bush", x: 150, y: 1700, size: 54 }, { key: "bush", x: 800, y: 1200, size: 46 }, { key: "bush", x: 3000, y: 2000, size: 58 }, { key: "bush", x: 2300, y: 1300, size: 50 },
  { key: "bush", x: 560, y: 480, size: 44 }, { key: "bush", x: 1060, y: 520, size: 40 }, { key: "bush", x: 2840, y: 560, size: 48 },
  // buzones e hidrantes junto a las casas y calles
  { key: "mailbox", x: 300, y: 470, size: 36, rot: 1.57 }, { key: "mailbox", x: 800, y: 430, size: 36, rot: 1.57 }, { key: "mailbox", x: 900, y: 980, size: 36, rot: 1.57 },
  { key: "hydrant", x: 1440, y: 1200, size: 22 }, { key: "hydrant", x: 1760, y: 2000, size: 22 }, { key: "hydrant", x: 1200, y: 1760, size: 22 }, { key: "hydrant", x: 2000, y: 1440, size: 22 },
  // neumáticos y trastos del almacén / aparcamiento
  { key: "tires", x: 2400, y: 2700, size: 44 }, { key: "tires", x: 2440, y: 2720, size: 44 }, { key: "tires", x: 1150, y: 2650, size: 44 },
  { key: "barrel", x: 2470, y: 2920, size: 30 }, { key: "crate", x: 2330, y: 2440, size: 30 }, { key: "crate", x: 2900, y: 700, size: 28 },
  // manchas viejas en el suelo
  { key: "blood_splat", x: 1500, y: 1400, size: 70 }, { key: "blood_splat", x: 640, y: 2300, size: 60 }, { key: "blood_splat", x: 2600, y: 1560, size: 64 },
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
    for (const d of DECOR) {
      const img = this.scene.add.image(d.x, d.y, d.key).setRotation(d.rot ?? Math.random() * 6.28).setDepth(3);
      img.setScale(d.size / Math.max(img.width, img.height));
      if (d.key === "blood_splat") img.setAlpha(0.6);
    }
    for (const o of OBSTACLES) this.drawObstacle(o);
    for (const l of LAMPS) this.drawLamp(l.x, l.y);
    this.scene.add.rectangle(0, 0, MAP_WIDTH, MAP_HEIGHT).setOrigin(0).setStrokeStyle(8, 0x101014, 0.9).setDepth(6);
    return LAMPS;
  }

  private drawGround() {
    const GROUND_SCALE: Record<GroundKind, number> = { grass: 0.45, asphalt: 0.6, concrete: 0.55, dirt: 0.45 };
    this.scene.add.tileSprite(0, 0, MAP_WIDTH, MAP_HEIGHT, GROUND_TEXTURE.grass).setOrigin(0).setDepth(0).setTileScale(GROUND_SCALE.grass);
    for (const z of GROUND_ZONES) {
      this.scene.add.tileSprite(z.x, z.y, z.w, z.h, GROUND_TEXTURE[z.kind]).setOrigin(0).setDepth(1).setTileScale(GROUND_SCALE[z.kind]);
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
    // Farola vista desde arriba: halo cálido en el suelo + sprite (la base del poste es el pivote)
    const s = this.scene;
    s.add.circle(x + 24, y, 64, 0xffe0a0, 0.10).setDepth(3);
    s.add.circle(x + 24, y, 30, 0xffe0a0, 0.12).setDepth(3);
    s.add.circle(x + 3, y + 4, 11, 0x000000, 0.3).setDepth(4);
    s.add.image(x, y, "lamp_post").setOrigin(0.2, 0.5).setScale(0.45).setDepth(22);
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
        s.add.tileSprite(r.x, r.y, o.w, o.h, "wall_brick").setOrigin(0).setDepth(5).setTileScale(0.12);
        s.add.rectangle(r.x, r.y, o.w, o.h).setOrigin(0).setStrokeStyle(2, 0x2a1d17).setDepth(5);
        break;
      }
      case "fence": {
        // Valla: el sprite se repite a lo largo; las verticales se giran 90°
        const horizontal = o.w >= o.h;
        const length = horizontal ? o.w : o.h;
        const thickness = 26;
        const tex = s.textures.get("fence_white").getSourceImage() as HTMLImageElement;
        const k = thickness / tex.height;
        s.add.ellipse(o.x + 2, o.y + 4, horizontal ? length : thickness, horizontal ? thickness : length, 0x000000, 0.25).setDepth(4);
        s.add.tileSprite(o.x, o.y, length, thickness, "fence_white").setTileScale(k).setRotation(horizontal ? 0 : Math.PI / 2).setDepth(5);
        break;
      }
      case "sandbag":
        s.add.ellipse(o.x + 2, o.y + 4, o.w + 6, o.h + 10, 0x000000, 0.3).setDepth(4);
        s.add.image(o.x, o.y, "sandbags").setDisplaySize(o.w + 8, o.h + 8).setDepth(5);
        break;
      case "tree": {
        const key = o.w >= 80 ? "tree_big" : "tree_small";
        s.add.ellipse(o.x + 6, o.y + 8, o.w * 1.1, o.h * 1.0, 0x000000, 0.3).setDepth(3);
        s.add.image(o.x, o.y, key).setDisplaySize(o.w * 1.15, o.h * 1.15).setDepth(20).setAngle(Math.random() * 360).setAlpha(0.95);
        break;
      }
      case "barrel":
        if (o.w >= 80) s.add.image(o.x, o.y, "fountain").setDisplaySize(o.w + 4, o.h + 4).setDepth(5);
        else s.add.image(o.x, o.y, "barrel").setDisplaySize(o.w + 6, o.h + 6).setDepth(5);
        break;
      case "crate":
        s.add.image(o.x, o.y, "crate").setDisplaySize(o.w + 4, o.h + 4).setDepth(5);
        break;
      case "car": {
        const img = s.add.image(o.x, o.y, CAR_KEYS[(o.variant ?? 0) % CAR_KEYS.length]).setDepth(5);
        img.setScale((o.w + 10) / img.width).setRotation(o.rotation ?? 0);
        s.add.ellipse(o.x + 4, o.y + 6, o.w, o.h + 6, 0x000000, 0.3).setRotation(o.rotation ?? 0).setDepth(4);
        break;
      }
    }
  }

  private drawBuilding(o: Obstacle) {
    const x = o.x - o.w / 2, y = o.y - o.h / 2;
    const roof = ROOFS[(o.variant ?? 0) % ROOFS.length];
    const s = this.scene;

    s.add.rectangle(x + 12, y + 16, o.w, o.h, 0x000000, 0.4).setOrigin(0).setDepth(4); // sombra proyectada
    s.add.rectangle(x - 8, y - 8, o.w + 16, o.h + 16, 0x2e2622).setOrigin(0).setDepth(21); // alero
    s.add.rectangle(x - 5, y - 5, o.w + 10, o.h + 10, 0x4a3d36).setOrigin(0).setDepth(21);
    s.add.tileSprite(x, y, o.w, o.h, roof).setOrigin(0).setDepth(21).setTileScale(0.22); // tejas

    const g = s.add.graphics().setDepth(22);
    g.fillStyle(0xffffff, 0.10).fillRect(x, y, o.w, o.h / 2); // vertiente iluminada
    g.fillStyle(0x000000, 0.18).fillRect(x, o.y, o.w, o.h / 2); // vertiente en sombra
    g.lineStyle(5, 0x2a1d17, 0.85).lineBetween(x, o.y, x + o.w, o.y); // cumbrera
    g.lineStyle(3, 0x2a1d17, 0.9).strokeRect(x, y, o.w, o.h);

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
