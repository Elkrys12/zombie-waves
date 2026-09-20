import Phaser from "phaser";

/**
 * Efectos visuales "de sensación": casquillos, chispas, números de daño, muertes de zombies,
 * lluvia y relámpagos. No dependen de sprites nuevos: todo sale de texturas mínimas generadas aquí.
 */
export class Effects {
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private rain: Phaser.GameObjects.Particles.ParticleEmitter;
  private lightningRect: Phaser.GameObjects.Rectangle;
  private casings: Phaser.GameObjects.Rectangle[] = [];
  private corpses: Phaser.GameObjects.Image[] = [];
  /** 0 = sin lluvia, 1 = tormenta */
  rainIntensity = 0;

  constructor(private scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff).fillRect(0, 0, 2, 16);
    g.generateTexture("raindrop", 2, 16);
    g.clear();
    g.fillStyle(0xffffff).fillCircle(2, 2, 2);
    g.generateTexture("spark", 4, 4);
    g.destroy();

    this.sparks = scene.add.particles(0, 0, "spark", {
      speed: { min: 80, max: 260 },
      lifespan: { min: 120, max: 320 },
      scale: { start: 1.2, end: 0 },
      tint: [0xfff2a8, 0xffc24d, 0xffffff],
      gravityY: 300,
      emitting: false,
    }).setDepth(12);

    // Lluvia: capa fija a la cámara que cubre toda la pantalla
    this.rain = scene.add.particles(0, 0, "raindrop", {
      x: { min: -100, max: scene.scale.width + 100 },
      y: -30,
      lifespan: 900,
      speedY: { min: 900, max: 1200 },
      speedX: { min: -140, max: -100 },
      rotate: 8,
      scaleY: { min: 0.7, max: 1.3 },
      alpha: { start: 0.45, end: 0.15 },
      quantity: 3,
      frequency: 14,
      emitting: false,
    }).setScrollFactor(0).setDepth(60);
    scene.scale.on("resize", () => this.rain.updateConfig({ x: { min: -100, max: scene.scale.width + 100 } }));

    this.lightningRect = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0xf4f6ff, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(61);
    scene.scale.on("resize", () => this.lightningRect.setSize(scene.scale.width, scene.scale.height));
  }

  update() {
    const shouldRain = this.rainIntensity > 0.05;
    if (shouldRain !== this.rain.emitting) this.rain.emitting = shouldRain;
    if (shouldRain) this.rain.setQuantity(Math.round(1 + this.rainIntensity * 4));
  }

  /** Casquillo que sale disparado hacia un lado del arma, cae y se queda en el suelo. */
  casing(x: number, y: number, angle: number) {
    const side = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const dist = 22 + Math.random() * 16;
    const c = this.scene.add.rectangle(x, y, 5, 2, 0xd9a83a).setStrokeStyle(1, 0x7a5a14).setRotation(angle).setDepth(11);
    this.casings.push(c);
    if (this.casings.length > 80) this.casings.shift()?.destroy();
    this.scene.tweens.add({
      targets: c,
      x: x + Math.cos(side) * dist,
      y: y + Math.sin(side) * dist,
      rotation: angle + (Math.random() - 0.5) * 6,
      duration: 220 + Math.random() * 120,
      ease: "Quad.Out",
      onComplete: () => {
        c.setDepth(3);
        this.scene.tweens.add({ targets: c, alpha: 0, delay: 5000, duration: 1500, onComplete: () => c.destroy() });
      },
    });
  }

  /** Chispas al impactar en un muro o edificio. */
  wallSparks(x: number, y: number) {
    this.sparks.explode(7, x, y);
  }

  /** Número de daño flotante sobre un zombie. */
  damageNumber(x: number, y: number, amount: number, killing: boolean) {
    const t = this.scene.add.text(x + (Math.random() - 0.5) * 16, y - 18, `${Math.round(amount)}`, {
      fontFamily: "Bangers, Impact, system-ui", fontSize: killing ? "22px" : "16px",
      color: killing ? "#ffd166" : "#ffffff", stroke: "#000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.scene.tweens.add({ targets: t, y: t.y - 34, alpha: 0, duration: 650, ease: "Quad.Out", onComplete: () => t.destroy() });
  }

  /** El zombie cae y se queda como cadáver en el suelo (misma orientación y tamaño), y se desvanece pasado un rato. */
  corpse(sprite: Phaser.GameObjects.Image, key: string) {
    const live = this.scene.textures.get(sprite.texture.key).getSourceImage() as HTMLImageElement;
    const dead = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const k = (live.width * sprite.scaleX) / dead.width; // mismo ancho que el sprite vivo
    const c = this.scene.add.image(sprite.x, sprite.y, key)
      .setOrigin(0.5, 0.5).setRotation(sprite.rotation).setScale(k * 1.15).setDepth(3).setAlpha(0.95);
    this.corpses.push(c);
    if (this.corpses.length > 40) this.corpses.shift()?.destroy();
    this.scene.tweens.add({ targets: c, scale: k, duration: 160, ease: "Quad.Out" });
    this.scene.tweens.add({ targets: c, alpha: 0, delay: 16000, duration: 3000, onComplete: () => c.destroy() });
  }

  /** Estirón hacia delante del zombie al atacar. */
  lunge(sprite: Phaser.GameObjects.Image) {
    const base = sprite.getData("scale") as number;
    this.scene.tweens.add({
      targets: sprite, scaleX: base * 1.25, scaleY: base * 0.9, duration: 90, yoyo: true, ease: "Quad.Out",
    });
  }

  /** Retroceso: el arma se echa atrás con fuerza y el cuerpo la acompaña un poco (posiciones locales del contenedor). */
  recoil(body: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, gun: Phaser.GameObjects.Image, strength: number) {
    const gunBase = (gun.getData("baseX") as number | undefined) ?? gun.x;
    gun.setData("baseX", gunBase);
    this.scene.tweens.killTweensOf([body, gun]);
    body.x = -strength * 0.5;
    gun.x = gunBase - strength;
    this.scene.tweens.add({ targets: body, x: 0, duration: 110, ease: "Quad.Out" });
    this.scene.tweens.add({ targets: gun, x: gunBase, duration: 130, ease: "Quad.Out" });
  }

  /** Relámpago: dos destellos rápidos. Devuelve la duración total (para bajar la oscuridad mientras). */
  lightning(): number {
    const r = this.lightningRect;
    this.scene.tweens.chain({
      targets: r,
      tweens: [
        { alpha: 0.55, duration: 40 }, { alpha: 0.05, duration: 90 },
        { alpha: 0.4, duration: 40 }, { alpha: 0, duration: 260 },
      ],
    });
    return 430;
  }
}
