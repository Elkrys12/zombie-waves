import Phaser from "phaser";

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  angle?: number;
  cone?: number;
}

/**
 * Oscuridad ambiental con "linternas" alrededor de los jugadores y destellos.
 * Se pinta en un canvas 2D propio (a media resolución) que se muestra como imagen fija a la cámara:
 * relleno oscuro + gradientes de luz recortados con `destination-out`. Funciona en WebGL y Canvas.
 */
export class Lighting {
  private static readonly SCALE = 0.5; // resolución del canvas de luz respecto a la pantalla
  private texture: Phaser.Textures.CanvasTexture;
  private image: Phaser.GameObjects.Image;
  private lightSprite: HTMLCanvasElement;
  private flashes: { x: number; y: number; size: number; ttl: number }[] = [];
  /** Oscuridad 0..1 (0 = día, 1 = negro total). */
  darkness = 0.45;

  constructor(private scene: Phaser.Scene) {
    const w = Math.ceil(scene.scale.width * Lighting.SCALE);
    const h = Math.ceil(scene.scale.height * Lighting.SCALE);
    this.texture = scene.textures.createCanvas("lightmap", w, h)!;
    this.image = scene.add.image(0, 0, "lightmap").setOrigin(0).setScrollFactor(0).setDepth(50);
    this.image.setDisplaySize(scene.scale.width, scene.scale.height);

    // Gradiente radial pre-dibujado (se escala al radio de cada luz)
    this.lightSprite = document.createElement("canvas");
    this.lightSprite.width = this.lightSprite.height = 256;
    const ctx = this.lightSprite.getContext("2d")!;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.4, "rgba(0,0,0,0.9)");
    grad.addColorStop(0.75, "rgba(0,0,0,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    scene.scale.on("resize", () => this.resize());
  }

  private resize() {
    const w = Math.ceil(this.scene.scale.width * Lighting.SCALE);
    const h = Math.ceil(this.scene.scale.height * Lighting.SCALE);
    this.texture.setSize(w, h);
    this.image.setTexture("lightmap").setDisplaySize(this.scene.scale.width, this.scene.scale.height);
  }

  addFlash(x: number, y: number, size = 260, ttl = 0.08) {
    this.flashes.push({ x, y, size, ttl });
  }

  /**
   * @param lights fuentes de luz (mundo) con su radio; si llevan `angle` y `cone` (radianes)
   *               se dibujan como linterna: un cono en esa dirección más un pequeño halo alrededor
   */
  update(dt: number, lights: LightSource[]) {
    const cam = this.scene.cameras.main;
    const s = Lighting.SCALE;
    const ctx = this.texture.getContext();
    const { width, height } = this.texture;

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = `rgba(5,6,12,${this.darkness})`;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "destination-out";
    const drawLight = (x: number, y: number, radius: number) => {
      const r = radius * s;
      ctx.drawImage(this.lightSprite, (x - cam.scrollX) * s - r, (y - cam.scrollY) * s - r, r * 2, r * 2);
    };
    const drawCone = (x: number, y: number, radius: number, angle: number, cone: number) => {
      const cx = (x - cam.scrollX) * s, cy = (y - cam.scrollY) * s, r = radius * s;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle - cone / 2, angle + cone / 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(this.lightSprite, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    };
    for (const l of lights) {
      if (l.angle !== undefined && l.cone !== undefined) {
        drawCone(l.x, l.y, l.radius, l.angle, l.cone);
        drawLight(l.x, l.y, l.radius * 0.38); // halo cercano para no quedarse a ciegas por detrás
      } else {
        drawLight(l.x, l.y, l.radius);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.ttl -= dt;
      if (f.ttl <= 0) { this.flashes.splice(i, 1); continue; }
      drawLight(f.x, f.y, f.size / 2);
    }

    ctx.globalCompositeOperation = "source-over";
    this.texture.refresh();
  }
}
