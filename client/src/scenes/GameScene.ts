import Phaser from "phaser";
import type { NetworkManager } from "../net/NetworkManager";
import {
  MAP_WIDTH, MAP_HEIGHT, PLAYER_RADIUS, BULLET_RADIUS, ZOMBIES,
  type PlayerState, type ZombieState, type BulletState, type ZombieType,
} from "@zombie-waves/shared";

const LERP = 0.35; // suavizado entre actualizaciones del servidor (20 Hz)

const ZOMBIE_COLORS: Record<ZombieType, number> = {
  walker: 0x6ab04c,
  runner: 0xf0932b,
  tank: 0x8e44ad,
};

interface PlayerView {
  body: Phaser.GameObjects.Arc;
  aim: Phaser.GameObjects.Line;
  name: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
}

interface ZombieView {
  body: Phaser.GameObjects.Arc;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
}

/**
 * Escena principal: dibuja jugadores, zombies y balas según el estado del servidor
 * (con interpolación) y envía los inputs locales (WASD/flechas + ratón).
 */
export class GameScene extends Phaser.Scene {
  private net!: NetworkManager;
  private players = new Map<string, PlayerView>();
  private zombies = new Map<string, ZombieView>();
  private bullets = new Map<string, Phaser.GameObjects.Arc>();
  private keys!: Record<"W" | "A" | "S" | "D" | "UP" | "DOWN" | "LEFT" | "RIGHT", Phaser.Input.Keyboard.Key>;

  constructor() {
    super("game");
  }

  create() {
    this.net = this.registry.get("net") as NetworkManager;

    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.add.grid(0, 0, MAP_WIDTH, MAP_HEIGHT, 64, 64, 0x22222c, 1, 0x2e2e3a, 1).setOrigin(0);
    this.add.rectangle(0, 0, MAP_WIDTH, MAP_HEIGHT).setOrigin(0).setStrokeStyle(4, 0x7ed957, 0.6);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as GameScene["keys"];
    this.input.mouse?.disableContextMenu();

    this.bindState();
    this.scene.launch("hud");
  }

  private bindState() {
    const $ = this.net.callbacks;
    const state = this.net.state;

    $(state).players.onAdd((player: PlayerState, id: string) => {
      const isMe = id === this.net.sessionId;
      const color = isMe ? 0x4caf50 : 0x2196f3;
      const body = this.add.circle(player.x, player.y, PLAYER_RADIUS, color).setDepth(10);
      const aim = this.add.line(0, 0, 0, 0, PLAYER_RADIUS + 10, 0, 0xffffff, 0.8).setOrigin(0, 0).setLineWidth(2).setDepth(11);
      const name = this.add.text(0, 0, player.name, { fontSize: "12px", color: "#fff", fontFamily: "system-ui" })
        .setOrigin(0.5, 1).setDepth(12);
      const hpBg = this.add.rectangle(0, 0, 40, 5, 0x000000, 0.6).setDepth(12);
      const hpBar = this.add.rectangle(0, 0, 40, 5, 0x7ed957).setOrigin(0, 0.5).setDepth(13);
      this.players.set(id, { body, aim, name, hpBg, hpBar });

      if (isMe) this.cameras.main.startFollow(body, true, 0.12, 0.12);
    });

    $(state).players.onRemove((_player: PlayerState, id: string) => {
      const view = this.players.get(id);
      if (!view) return;
      Object.values(view).forEach((obj) => obj.destroy());
      this.players.delete(id);
    });

    $(state).zombies.onAdd((zombie: ZombieState, id: string) => {
      const config = ZOMBIES[zombie.type];
      const body = this.add.circle(zombie.x, zombie.y, config.radius, ZOMBIE_COLORS[zombie.type]).setDepth(8);
      body.setStrokeStyle(2, 0x000000, 0.5);
      const w = config.radius * 2;
      const hpBg = this.add.rectangle(0, 0, w, 4, 0x000000, 0.6).setDepth(9).setVisible(false);
      const hpBar = this.add.rectangle(0, 0, w, 4, 0xff5252).setOrigin(0, 0.5).setDepth(9).setVisible(false);
      this.zombies.set(id, { body, hpBg, hpBar });
    });

    $(state).zombies.onRemove((_zombie: ZombieState, id: string) => {
      const view = this.zombies.get(id);
      if (!view) return;
      this.spawnDeathEffect(view.body.x, view.body.y, view.body.fillColor);
      Object.values(view).forEach((obj) => obj.destroy());
      this.zombies.delete(id);
    });

    $(state).bullets.onAdd((bullet: BulletState, id: string) => {
      const dot = this.add.circle(bullet.x, bullet.y, BULLET_RADIUS, 0xffe066).setDepth(9);
      this.bullets.set(id, dot);
    });

    $(state).bullets.onRemove((_bullet: BulletState, id: string) => {
      this.bullets.get(id)?.destroy();
      this.bullets.delete(id);
    });
  }

  private spawnDeathEffect(x: number, y: number, color: number) {
    const ring = this.add.circle(x, y, 8, color, 0.7).setDepth(7);
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 250,
      onComplete: () => ring.destroy(),
    });
  }

  update(time: number) {
    this.sendInput(time);
    this.syncPlayers();
    this.syncZombies();
    this.syncBullets();
  }

  private sendInput(time: number) {
    const me = this.players.get(this.net.sessionId);
    const pointer = this.input.activePointer;
    const angle = me ? Phaser.Math.Angle.Between(me.body.x, me.body.y, pointer.worldX, pointer.worldY) : 0;

    this.net.sendInput({
      up: this.keys.W.isDown || this.keys.UP.isDown,
      down: this.keys.S.isDown || this.keys.DOWN.isDown,
      left: this.keys.A.isDown || this.keys.LEFT.isDown,
      right: this.keys.D.isDown || this.keys.RIGHT.isDown,
      angle,
      shooting: pointer.isDown && pointer.leftButtonDown(),
    }, time);
  }

  private syncPlayers() {
    this.net.state.players.forEach((player, id) => {
      const view = this.players.get(id);
      if (!view) return;

      view.body.x = Phaser.Math.Linear(view.body.x, player.x, LERP);
      view.body.y = Phaser.Math.Linear(view.body.y, player.y, LERP);
      view.body.setAlpha(player.alive ? 1 : 0.35);

      view.aim.setPosition(view.body.x, view.body.y).setRotation(player.angle).setVisible(player.alive);
      view.name.setPosition(view.body.x, view.body.y - PLAYER_RADIUS - 10);
      view.hpBg.setPosition(view.body.x, view.body.y - PLAYER_RADIUS - 6);
      view.hpBar.setPosition(view.body.x - 20, view.body.y - PLAYER_RADIUS - 6);
      view.hpBar.width = 40 * Math.max(0, player.hp / player.maxHp);
    });
  }

  private syncZombies() {
    this.net.state.zombies.forEach((zombie, id) => {
      const view = this.zombies.get(id);
      if (!view) return;

      view.body.x = Phaser.Math.Linear(view.body.x, zombie.x, LERP);
      view.body.y = Phaser.Math.Linear(view.body.y, zombie.y, LERP);

      const radius = ZOMBIES[zombie.type].radius;
      const damaged = zombie.hp < zombie.maxHp;
      view.hpBg.setVisible(damaged).setPosition(view.body.x, view.body.y - radius - 6);
      view.hpBar.setVisible(damaged).setPosition(view.body.x - radius, view.body.y - radius - 6);
      view.hpBar.width = radius * 2 * Math.max(0, zombie.hp / zombie.maxHp);
    });
  }

  private syncBullets() {
    this.net.state.bullets.forEach((bullet, id) => {
      const dot = this.bullets.get(id);
      if (!dot) return;
      // Las balas van rápido: interpolación más agresiva para que no "salten"
      dot.x = Phaser.Math.Linear(dot.x, bullet.x, 0.6);
      dot.y = Phaser.Math.Linear(dot.y, bullet.y, 0.6);
    });
  }
}
