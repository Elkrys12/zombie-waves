import Phaser from "phaser";
import { NetworkManager } from "../net/NetworkManager";
import { MAP_WIDTH, MAP_HEIGHT, PLAYER_RADIUS } from "@zombie-waves/shared";

/**
 * Escena principal: se conecta a la sala, dibuja a los jugadores según
 * el estado del servidor y envía los inputs locales (WASD/flechas + ratón).
 */
export class GameScene extends Phaser.Scene {
  private net = new NetworkManager();
  private players = new Map<string, Phaser.GameObjects.Arc>();
  private keys!: Record<"W" | "A" | "S" | "D" | "UP" | "DOWN" | "LEFT" | "RIGHT", Phaser.Input.Keyboard.Key>;

  constructor() {
    super("game");
  }

  async create() {
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.add.grid(0, 0, MAP_WIDTH, MAP_HEIGHT, 64, 64, 0x22222c, 1, 0x2e2e3a, 1).setOrigin(0);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as GameScene["keys"];

    const room = await this.net.join();

    room.state.players.onAdd((player: any, id: string) => {
      const circle = this.add.circle(player.x, player.y, PLAYER_RADIUS, id === room.sessionId ? 0x4caf50 : 0x2196f3);
      this.players.set(id, circle);
      if (id === room.sessionId) this.cameras.main.startFollow(circle, true, 0.1, 0.1);

      player.onChange(() => {
        circle.setPosition(player.x, player.y);
      });
    });

    room.state.players.onRemove((_player: any, id: string) => {
      this.players.get(id)?.destroy();
      this.players.delete(id);
    });
  }

  update() {
    if (!this.net.room) return;

    const pointer = this.input.activePointer;
    const me = this.players.get(this.net.room.sessionId);
    const angle = me ? Phaser.Math.Angle.Between(me.x, me.y, pointer.worldX, pointer.worldY) : 0;

    this.net.sendInput({
      up: this.keys.W.isDown || this.keys.UP.isDown,
      down: this.keys.S.isDown || this.keys.DOWN.isDown,
      left: this.keys.A.isDown || this.keys.LEFT.isDown,
      right: this.keys.D.isDown || this.keys.RIGHT.isDown,
      angle,
      shooting: pointer.isDown,
    });
  }
}
