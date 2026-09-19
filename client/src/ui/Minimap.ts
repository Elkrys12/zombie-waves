import Phaser from "phaser";
import type { NetworkManager } from "../net/NetworkManager";
import { MAP_WIDTH, MAP_HEIGHT, GROUND_ZONES, OBSTACLES, ZOMBIE_SPAWNS, obstacleRect, type GroundKind } from "@zombie-waves/shared";
import { PLAYER_COLORS } from "../gfx/textures";

const GROUND_COLORS: Record<GroundKind, number> = { grass: 0x2f4a2b, asphalt: 0x2a2a2f, concrete: 0x5a5a56, dirt: 0x5a4530 };

/** Mapa en miniatura: fondo estático dibujado una vez + puntos dinámicos cada frame. */
export class Minimap {
  readonly size = 180;
  private container: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Graphics;
  private scale: number;

  constructor(private scene: Phaser.Scene, private net: NetworkManager) {
    this.scale = this.size / Math.max(MAP_WIDTH, MAP_HEIGHT);
    const s = this.scale;

    const frame = scene.add.graphics();
    frame.fillStyle(0x0c0d14, 0.85).fillRoundedRect(-6, -6, this.size + 12, this.size + 12, 8);
    frame.lineStyle(2, 0x7ed957, 0.5).strokeRoundedRect(-6, -6, this.size + 12, this.size + 12, 8);

    const bg = scene.add.graphics();
    bg.fillStyle(GROUND_COLORS.grass).fillRect(0, 0, MAP_WIDTH * s, MAP_HEIGHT * s);
    for (const z of GROUND_ZONES) bg.fillStyle(GROUND_COLORS[z.kind]).fillRect(z.x * s, z.y * s, z.w * s, z.h * s);
    for (const o of OBSTACLES) {
      const r = obstacleRect(o);
      if (o.kind === "tree") bg.fillStyle(0x3f6f36, 0.9).fillCircle(o.x * s, o.y * s, Math.max(1.5, (o.w / 2) * s));
      else if (o.kind === "building") bg.fillStyle(0x9a8a7a).fillRect(r.x * s, r.y * s, Math.max(2, r.w * s), Math.max(2, r.h * s));
      else if (o.kind === "wall" || o.kind === "fence") bg.fillStyle(0x8a8a80).fillRect(r.x * s, r.y * s, Math.max(1, r.w * s), Math.max(1, r.h * s));
      else if (o.kind === "car") bg.fillStyle(0xaaaaaa, 0.8).fillRect(r.x * s, r.y * s, Math.max(2, r.w * s), Math.max(2, r.h * s));
    }
    for (const sp of ZOMBIE_SPAWNS) bg.fillStyle(0x8a2a2a, 0.8).fillCircle(sp.x * s, sp.y * s, 2.5);

    this.dots = scene.add.graphics();
    this.container = scene.add.container(0, 0, [frame, bg, this.dots]);
  }

  setPosition(x: number, y: number) {
    this.container.setPosition(x, y);
  }

  update() {
    const s = this.scale;
    const g = this.dots;
    g.clear();

    this.net.state.zombies.forEach((z) => {
      g.fillStyle(z.type === "tank" ? 0xb04ad6 : z.type === "runner" ? 0xf0932b : 0xff4d4d, 0.95)
        .fillCircle(z.x * s, z.y * s, z.type === "tank" ? 2.5 : 1.8);
    });

    let i = 0;
    this.net.state.players.forEach((p, id) => {
      const color = PLAYER_COLORS[i++ % PLAYER_COLORS.length];
      const isMe = id === this.net.sessionId;
      g.fillStyle(color, p.alive ? 1 : 0.4).fillCircle(p.x * s, p.y * s, isMe ? 3.5 : 2.8);
      if (isMe) g.lineStyle(1.5, 0xffffff, 0.9).strokeCircle(p.x * s, p.y * s, 5);
    });

    // Área visible por la cámara
    const cam = this.scene.scene.get("game").cameras.main;
    g.lineStyle(1, 0xffffff, 0.35).strokeRect(cam.scrollX * s, cam.scrollY * s, cam.width * s, cam.height * s);
  }
}
