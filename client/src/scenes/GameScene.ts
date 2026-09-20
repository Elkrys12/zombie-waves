import Phaser from "phaser";
import type { NetworkManager } from "../net/NetworkManager";
import { SoundManager } from "../audio/SoundManager";
import { PLAYER_LOOKS, ZOMBIE_SPRITE, WEAPON_SIZE, WORLD_PPM, type SheetMeta } from "./BootScene";
import { MapRenderer } from "../gfx/MapRenderer";
import { Lighting, type LightSource } from "../gfx/Lighting";
import { Effects } from "../gfx/Effects";
import {
  MAP_WIDTH, MAP_HEIGHT, PLAYER_RADIUS, GUN_SIDE_OFFSET, ZOMBIES, WEAPONS, pointBlocked,
  type PlayerState, type ZombieState, type BulletState, type WeaponId, type WavePhase,
} from "@zombie-waves/shared";

const LERP = 0.35; // suavizado entre actualizaciones del servidor (20 Hz)
const MAX_DECALS = 60;

interface PlayerView {
  root: Phaser.GameObjects.Container; // rota con el ángulo de apuntado
  body: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  sheet?: string; // hoja animada (personaje 3D renderizado) o undefined si es imagen estática
  gun: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  lastX: number;
  lastY: number;
  moving: boolean;
}

interface ZombieView {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  facing: number;
  lastX: number;
  lastY: number;
  moving: boolean;
  wobbleSeed: number;
}

/**
 * Escena principal: dibuja jugadores, zombies y balas según el estado del servidor
 * (con interpolación), reproduce efectos y envía los inputs locales (WASD/flechas + ratón).
 */
export class GameScene extends Phaser.Scene {
  private net!: NetworkManager;
  private sfx!: SoundManager;
  private players = new Map<string, PlayerView>();
  private zombies = new Map<string, ZombieView>();
  private bullets = new Map<string, Phaser.GameObjects.Image>();
  private decals: Phaser.GameObjects.Image[] = [];
  private blood!: Phaser.GameObjects.Particles.ParticleEmitter;
  private damageFlash!: Phaser.GameObjects.Rectangle;
  private lighting!: Lighting;
  private fx!: Effects;
  private lightningTimer = 12; // segundos hasta el próximo relámpago
  private lightningLeft = 0;   // segundos que quedan de destello
  private lamps: { x: number; y: number }[] = [];
  private keys!: Record<"W" | "A" | "S" | "D" | "UP" | "DOWN" | "LEFT" | "RIGHT", Phaser.Input.Keyboard.Key>;
  private colorIndex = 0;
  private synced = false; // true tras el primer frame: los zombies ya existentes no "nacen" animados

  constructor() {
    super("game");
  }

  create() {
    this.net = this.registry.get("net") as NetworkManager;
    this.sfx = new SoundManager();
    this.sfx.init();
    this.registry.set("sfx", this.sfx);
    this.input.on("pointerdown", () => this.sfx.resume());

    // Mapa e iluminación
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.lamps = new MapRenderer(this).draw();
    this.lighting = new Lighting(this);
    this.fx = new Effects(this);

    // Partículas de sangre (se disparan con explode)
    this.blood = this.add.particles(0, 0, "particle", {
      speed: { min: 60, max: 200 },
      lifespan: { min: 200, max: 500 },
      scale: { start: 1.2, end: 0 },
      tint: [0x8b0000, 0xb00000, 0xd42020],
      emitting: false,
    }).setDepth(9);

    // Destello rojo al recibir daño (fijo a la cámara)
    this.damageFlash = this.add.rectangle(0, 0, 10, 10, 0xff0000, 0).setOrigin(0).setScrollFactor(0).setDepth(100);
    this.scale.on("resize", () => this.damageFlash.setSize(this.scale.width, this.scale.height));
    this.damageFlash.setSize(this.scale.width, this.scale.height);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as GameScene["keys"];
    this.input.mouse?.disableContextMenu();

    this.bindState();
    this.scene.launch("hud");
  }

  // ------------------------------------------------------------------ estado

  private bindState() {
    const $ = this.net.callbacks;
    const state = this.net.state;

    $(state).players.onAdd((player: PlayerState, id: string) => {
      const isMe = id === this.net.sessionId;
      // Sprite propio: la cabeza (pivote de giro) está a ~1/3 del ancho; el arma sobresale a la derecha
      const look = PLAYER_LOOKS[this.colorIndex++ % PLAYER_LOOKS.length];
      let body: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
      let baseScale: number;
      if (look.sheet) {
        // Personaje 3D renderizado: el frame está centrado en la raíz del modelo
        const meta = this.cache.json.get(`${look.sheet}_meta`) as SheetMeta;
        const sprite = this.add.sprite(0, 0, look.sheet, 0).setOrigin(0.5, 0.5);
        sprite.play(`${look.sheet}/idle`);
        body = sprite;
        baseScale = WORLD_PPM / meta.ppm;
      } else {
        body = this.add.image(0, 0, look.image).setOrigin(0.3, 0.5);
        baseScale = (PLAYER_RADIUS * 3.4) / body.height;
      }
      body.setScale(baseScale).setData("base", baseScale);
      // Arma como capa aparte, DEBAJO del cuerpo y alineada con el brazo derecho: la culata queda bajo
      // la mano (que se dibuja encima) y el cañón sobresale hacia delante
      const handX = look.sheet ? 0.36 * WORLD_PPM : body.displayWidth * 0.5;
      const gun = this.add.image(handX, GUN_SIDE_OFFSET, `weapon_${player.weapon}`).setOrigin(0.22, 0.5);
      gun.setScale(WEAPON_SIZE[player.weapon] / gun.height);
      const shadow = this.add.ellipse(2, 5, PLAYER_RADIUS * 3, PLAYER_RADIUS * 2.6, 0x000000, 0.35);
      const root = this.add.container(player.x, player.y, [shadow, gun, body]).setDepth(10);
      const name = this.add.text(0, 0, player.name, { fontSize: "12px", color: "#fff", fontFamily: "system-ui", stroke: "#000", strokeThickness: 3 })
        .setOrigin(0.5, 1).setDepth(12);
      const hpBg = this.add.rectangle(0, 0, 40, 5, 0x000000, 0.6).setDepth(12);
      const hpBar = this.add.rectangle(0, 0, 40, 5, 0x7ed957).setOrigin(0, 0.5).setDepth(13);
      this.players.set(id, { root, body, sheet: look.sheet, gun, name, hpBg, hpBar, lastX: player.x, lastY: player.y, moving: false });

      if (isMe) {
        // ?cam=x,y (pruebas): cámara fija en un punto del mapa en vez de seguir al jugador
        const cam = new URLSearchParams(location.search).get("cam")?.split(",").map(Number);
        if (cam && cam.length === 2 && cam.every(Number.isFinite)) this.cameras.main.centerOn(cam[0], cam[1]);
        else this.cameras.main.startFollow(root, true, 0.12, 0.12);
        $(player).listen("hp", (hp: number, prev: number) => {
          if (prev !== undefined && hp < prev) this.onLocalDamage();
        });
        $(player).listen("money", (money: number, prev: number) => {
          if (prev !== undefined && money < prev) this.sfx.purchase();
        });
      }
      $(player).listen("hp", (hp: number, prev: number) => {
        if (prev === undefined || hp >= prev) return;
        const view = this.players.get(id);
        if (view) this.lungeNearest(view.root.x, view.root.y);
      });
    });

    $(state).players.onRemove((_player: PlayerState, id: string) => {
      const view = this.players.get(id);
      if (!view) return;
      [view.root, view.name, view.hpBg, view.hpBar].forEach((o) => o.destroy());
      this.players.delete(id);
    });

    $(state).zombies.onAdd((zombie: ZombieState, id: string) => {
      const config = ZOMBIES[zombie.type];
      const look = ZOMBIE_SPRITE[zombie.type];
      const sprite = this.add.image(zombie.x, zombie.y, `zombie_${zombie.type}`).setOrigin(look.originX, look.originY).setDepth(8);
      const zScale = (config.radius * look.heightK) / sprite.height;
      sprite.setData("scale", zScale);
      const shadow = this.add.ellipse(zombie.x, zombie.y + 3, config.radius * 2.4, config.radius * 2.1, 0x000000, 0.35).setDepth(7);
      const w = config.radius * 2;
      const hpBg = this.add.rectangle(0, 0, w, 4, 0x000000, 0.6).setDepth(9).setVisible(false);
      const hpBar = this.add.rectangle(0, 0, w, 4, 0xff5252).setOrigin(0, 0.5).setDepth(9).setVisible(false);
      this.zombies.set(id, { sprite, shadow, hpBg, hpBar, facing: 0, lastX: zombie.x, lastY: zombie.y, moving: false, wobbleSeed: Math.random() * 10 });

      // Aparece creciendo desde el suelo (solo los que aparecen durante la partida)
      if (this.synced) {
        sprite.setScale(zScale * 0.2);
        this.tweens.add({ targets: sprite, scale: zScale, duration: 250, ease: "Back.Out" });
      } else {
        sprite.setScale(zScale);
      }

      $(zombie).listen("hp", (hp: number, prev: number) => {
        if (prev === undefined || hp >= prev) return;
        this.blood.explode(6, sprite.x, sprite.y);
        this.sfx.zombieHit();
        this.fx.damageNumber(sprite.x, sprite.y - config.radius, prev - hp, hp <= 0);
        sprite.setTintFill(0xffffff);
        this.time.delayedCall(50, () => sprite.clearTint());
      });
    });

    $(state).zombies.onRemove((_zombie: ZombieState, id: string) => {
      const view = this.zombies.get(id);
      if (!view) return;
      this.onZombieDeath(view.sprite.x, view.sprite.y);
      this.fx.corpse(view.sprite, `${view.sprite.texture.key}_dead`);
      [view.sprite, view.shadow, view.hpBg, view.hpBar].forEach((o) => o.destroy());
      this.zombies.delete(id);
    });

    $(state).bullets.onAdd((bullet: BulletState, id: string) => {
      const img = this.add.image(bullet.x, bullet.y, "bullet").setScale(0.3).setRotation(bullet.angle).setDepth(9);
      this.bullets.set(id, img);
      this.onShot(bullet);
    });

    $(state).bullets.onRemove((bullet: BulletState, id: string) => {
      const img = this.bullets.get(id);
      if (img) {
        // Si termina pegada a un muro o edificio, chispas (si dio a un zombie ya salpicó sangre)
        const ahead = { x: bullet.x + Math.cos(bullet.angle) * 6, y: bullet.y + Math.sin(bullet.angle) * 6 };
        if (pointBlocked(ahead.x, ahead.y) || pointBlocked(bullet.x, bullet.y)) this.fx.wallSparks(bullet.x, bullet.y);
        img.destroy();
      }
      this.bullets.delete(id);
    });

    $(state).listen("phase", (phase: WavePhase, prev: WavePhase) => {
      if (prev === undefined) return;
      if (phase === "active") this.sfx.waveStart();
      else if (phase === "countdown" && prev === "active") this.sfx.waveClear();
      else if (phase === "gameover") this.sfx.gameOver();
    });
  }

  // ------------------------------------------------------------------ efectos

  private onShot(bullet: BulletState) {
    const owner = this.net.state.players.get(bullet.ownerId);
    const me = this.net.me;
    if (!owner) return;

    // Fogonazo en la boca del arma (sprite + luz)
    const flash = this.add.image(bullet.x, bullet.y, "muzzle_flash").setOrigin(0, 0.5).setScale(0.45).setRotation(bullet.angle).setDepth(11);
    this.time.delayedCall(60, () => flash.destroy());
    this.lighting.addFlash(bullet.x, bullet.y);

    // Volumen según distancia al jugador local (la escopeta dispara 6 balas: solo suena una)
    const distance = me ? Math.hypot(owner.x - me.x, owner.y - me.y) : 0;
    const factor = Phaser.Math.Clamp(1 - distance / 1200, 0.15, 1);
    if (bullet.ownerId === this.net.sessionId || Math.random() < 0.5) {
      this.sfx.shoot(owner.weapon as WeaponId, factor);
    }

    // Retroceso, casquillo y golpe de cámara (una vez por disparo aunque la escopeta cree varias balas)
    const view = this.players.get(bullet.ownerId);
    const now = this.time.now;
    if (view && now - ((view.root.getData("lastShot") as number | undefined) ?? 0) > 30) {
      view.root.setData("lastShot", now);
      const weapon = WEAPONS[owner.weapon as WeaponId];
      const kick = weapon.bulletsPerShot > 1 ? 9 : weapon.damage > 30 ? 7 : 4;
      this.fx.recoil(view.body, view.gun, kick);
      const side = owner.angle + Math.PI / 2;
      this.fx.casing(view.root.x + Math.cos(owner.angle) * 26 + Math.cos(side) * GUN_SIDE_OFFSET, view.root.y + Math.sin(owner.angle) * 26 + Math.sin(side) * GUN_SIDE_OFFSET, owner.angle);
      if (bullet.ownerId === this.net.sessionId) this.cameras.main.shake(70, kick * 0.0006);
    }
  }

  private onZombieDeath(x: number, y: number) {
    this.blood.explode(18, x, y);
    this.sfx.zombieDeath();

    const decal = this.add.image(x, y, "blood_splat").setRotation(Math.random() * Math.PI * 2).setScale(0.35 + Math.random() * 0.25).setDepth(2).setAlpha(0.9);
    this.decals.push(decal);
    if (this.decals.length > MAX_DECALS) this.decals.shift()?.destroy();
    this.tweens.add({ targets: decal, alpha: 0, delay: 8000, duration: 3000, onComplete: () => decal.destroy() });
  }

  /** El zombie más cercano a un punto (a distancia de mordisco) hace el gesto de ataque. */
  private lungeNearest(x: number, y: number) {
    let best: Phaser.GameObjects.Image | undefined;
    let bestD = 70;
    this.zombies.forEach((view) => {
      const d = Math.hypot(view.sprite.x - x, view.sprite.y - y);
      if (d < bestD) { bestD = d; best = view.sprite; }
    });
    if (best) this.fx.lunge(best);
  }

  private onLocalDamage() {
    this.sfx.playerHurt();
    this.cameras.main.shake(120, 0.006);
    this.damageFlash.setAlpha(0.35);
    this.tweens.add({ targets: this.damageFlash, alpha: 0, duration: 250 });
  }

  // ------------------------------------------------------------------ bucle

  update(time: number, delta: number) {
    this.synced = true;
    this.sendInput(time);
    this.syncPlayers(time);
    this.syncZombies(time);
    this.syncBullets();
    this.updateWeather(delta / 1000);
    this.updateLighting(delta / 1000);
    this.fx.update();
  }

  private updateWeather(dt: number) {
    const night = this.net.state.phase === "active" || this.net.state.phase === "gameover";
    this.fx.rainIntensity = Phaser.Math.Linear(this.fx.rainIntensity, night ? 1 : 0.25, Math.min(1, dt * 0.5));

    if (this.lightningLeft > 0) this.lightningLeft -= dt;
    if (!night) return;
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningTimer = 14 + Math.random() * 26;
      this.lightningLeft = this.fx.lightning() / 1000;
      this.cameras.main.shake(200, 0.002);
    }
  }

  private updateLighting(dt: number) {
    const lights: LightSource[] = [];
    this.players.forEach((view, id) => {
      const player = this.net.state.players.get(id);
      if (!player) return;
      // Los muertos conservan una luz tenue; los vivos llevan linterna en cono hacia donde apuntan
      if (!player.alive) lights.push({ x: view.root.x, y: view.root.y, radius: 220 });
      else lights.push({ x: view.root.x, y: view.root.y, radius: id === this.net.sessionId ? 520 : 400, angle: player.angle, cone: 1.15 });
    });
    // Farolas del pueblo, con un parpadeo sutil
    const t = this.time.now / 1000;
    this.lamps.forEach((l, i) => lights.push({ x: l.x + 24, y: l.y, radius: 230 + Math.sin(t * 7 + i * 1.7) * 6 + Math.sin(t * 23 + i) * 3 }));
    // Las balas iluminan un poco a su paso
    this.bullets.forEach((b) => lights.push({ x: b.x, y: b.y, radius: 60 }));
    // De día en la sala de espera; anochece cuando empieza la acción
    let target = this.net.state.phase === "active" || this.net.state.phase === "gameover" ? 0.8 : 0.45;
    if (this.lightningLeft > 0) target = 0.15; // el relámpago ilumina todo el mapa un instante
    this.lighting.darkness = Phaser.Math.Linear(this.lighting.darkness, target, Math.min(1, dt * (this.lightningLeft > 0 ? 12 : 0.8)));
    this.lighting.update(dt, lights);
  }

  private sendInput(time: number) {
    const me = this.players.get(this.net.sessionId);
    const pointer = this.input.activePointer;
    const angle = me ? Phaser.Math.Angle.Between(me.root.x, me.root.y, pointer.worldX, pointer.worldY) : 0;

    this.net.sendInput({
      up: this.keys.W.isDown || this.keys.UP.isDown,
      down: this.keys.S.isDown || this.keys.DOWN.isDown,
      left: this.keys.A.isDown || this.keys.LEFT.isDown,
      right: this.keys.D.isDown || this.keys.RIGHT.isDown,
      angle,
      shooting: pointer.isDown && pointer.leftButtonDown(),
    }, time);
  }

  private syncPlayers(time: number) {
    this.net.state.players.forEach((player, id) => {
      const view = this.players.get(id);
      if (!view) return;

      view.moving = Math.hypot(player.x - view.lastX, player.y - view.lastY) > 0.5;
      view.lastX = player.x;
      view.lastY = player.y;

      view.root.x = Phaser.Math.Linear(view.root.x, player.x, LERP);
      view.root.y = Phaser.Math.Linear(view.root.y, player.y, LERP);
      view.root.setRotation(player.angle);
      view.root.setAlpha(player.alive ? 1 : 0.35);

      const base = view.body.getData("base") as number;
      if (view.sheet && view.body instanceof Phaser.GameObjects.Sprite) {
        // Personaje animado: elegir la animación según lo que hace
        const oneHand = player.weapon === "pistol";
        const shooting = time - ((view.root.getData("lastShot") as number | undefined) ?? -9999) < 220;
        let anim: string;
        if (!player.alive) anim = "die";
        else if (shooting) anim = oneHand ? "holding-right-shoot" : "holding-both-shoot";
        else if (view.moving) anim = "walk";
        else anim = oneHand ? "holding-right" : "holding-both";
        const key = `${view.sheet}/${anim}`;
        if (view.body.anims.currentAnim?.key !== key) view.body.play(key, true);
        view.body.setScale(base);
        // Con pistola el arma va en la mano derecha; con dos manos, centrada entre ambas
        view.gun.y = oneHand ? GUN_SIDE_OFFSET : 0;
      } else {
        // Imagen estática: balanceo al andar y respiración en reposo
        const bob = !player.alive ? 1 : view.moving ? 1 + Math.sin(time / 60) * 0.05 : 1 + Math.sin(time / 420) * 0.015;
        view.body.setScale(base * bob, base * (2 - bob));
      }

      // Arma equipada (cambia al comprar) y visible solo en vida
      const gunKey = `weapon_${player.weapon}`;
      if (view.gun.texture.key !== gunKey) {
        view.gun.setTexture(gunKey);
        view.gun.setScale(WEAPON_SIZE[player.weapon] / view.gun.height);
      }
      view.gun.setVisible(player.alive);
      view.body.setAlpha(1);

      view.name.setPosition(view.root.x, view.root.y - PLAYER_RADIUS - 12);
      view.hpBg.setPosition(view.root.x, view.root.y - PLAYER_RADIUS - 6);
      view.hpBar.setPosition(view.root.x - 20, view.root.y - PLAYER_RADIUS - 6);
      view.hpBar.width = 40 * Math.max(0, player.hp / player.maxHp);
    });
  }

  private syncZombies(time: number) {
    this.net.state.zombies.forEach((zombie, id) => {
      const view = this.zombies.get(id);
      if (!view) return;

      const dx = zombie.x - view.lastX;
      const dy = zombie.y - view.lastY;
      view.moving = Math.hypot(dx, dy) > 0.5;
      if (view.moving) view.facing = Math.atan2(dy, dx);
      view.lastX = zombie.x;
      view.lastY = zombie.y;

      const sprite = view.sprite;
      sprite.x = Phaser.Math.Linear(sprite.x, zombie.x, LERP);
      sprite.y = Phaser.Math.Linear(sprite.y, zombie.y, LERP);
      view.shadow.setPosition(sprite.x, sprite.y + 3);

      // Giro suave hacia la dirección de avance + tambaleo al caminar
      const wobble = view.moving ? Math.sin(time / 90 + view.wobbleSeed) * 0.15 : 0;
      sprite.setRotation(Phaser.Math.Angle.RotateTo(sprite.rotation - wobble, view.facing, 0.15) + wobble);

      const radius = ZOMBIES[zombie.type].radius;
      const damaged = zombie.hp < zombie.maxHp;
      view.hpBg.setVisible(damaged).setPosition(sprite.x, sprite.y - radius - 8);
      view.hpBar.setVisible(damaged).setPosition(sprite.x - radius, sprite.y - radius - 8);
      view.hpBar.width = radius * 2 * Math.max(0, zombie.hp / zombie.maxHp);
    });
  }

  private syncBullets() {
    this.net.state.bullets.forEach((bullet, id) => {
      const img = this.bullets.get(id);
      if (!img) return;
      // Las balas van rápido: interpolación más agresiva para que no "salten"
      img.x = Phaser.Math.Linear(img.x, bullet.x, 0.6);
      img.y = Phaser.Math.Linear(img.y, bullet.y, 0.6);
    });
  }
}
