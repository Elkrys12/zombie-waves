import { Client, getStateCallbacks, type Room } from "@colyseus/sdk";
import type {
  InputMessage, UpgradeId, WeaponId, JoinOptions,
  PlayerState, ZombieState, BulletState, WavePhase,
} from "@zombie-waves/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

/** Forma del estado tal y como lo ve el cliente (espejo de GameState del servidor). */
export interface GameStateView {
  players: Map<string, PlayerState>;
  zombies: Map<string, ZombieState>;
  bullets: Map<string, BulletState>;
  wave: number;
  phase: WavePhase;
  countdown: number;
  zombiesLeft: number;
}

/** Envuelve la conexión con el servidor Colyseus. */
export class NetworkManager {
  private client = new Client(SERVER_URL);
  private lastSent?: InputMessage;
  private lastSentAt = 0;
  room!: Room<GameStateView>;

  async join(name: string) {
    const options: JoinOptions = { name };
    this.room = await this.client.joinOrCreate<GameStateView>("game", options);
    return this.room;
  }

  get state(): GameStateView {
    return this.room.state;
  }

  get sessionId() {
    return this.room.sessionId;
  }

  get me(): PlayerState | undefined {
    return this.state.players.get(this.sessionId);
  }

  /** Proxy para suscribirse a cambios del estado (onAdd / onRemove / listen). */
  get callbacks() {
    return getStateCallbacks(this.room);
  }

  /** Envía el input solo si cambió o si pasó un tiempo mínimo (keep-alive). */
  sendInput(input: InputMessage, now: number) {
    const changed =
      !this.lastSent ||
      this.lastSent.up !== input.up ||
      this.lastSent.down !== input.down ||
      this.lastSent.left !== input.left ||
      this.lastSent.right !== input.right ||
      this.lastSent.shooting !== input.shooting ||
      Math.abs(this.lastSent.angle - input.angle) > 0.01;

    if (!changed && now - this.lastSentAt < 100) return;
    this.room.send("input", input);
    this.lastSent = input;
    this.lastSentAt = now;
  }

  buyUpgrade(upgrade: UpgradeId) {
    this.room.send("buy_upgrade", { upgrade });
  }

  buyWeapon(weapon: WeaponId) {
    this.room.send("buy_weapon", { weapon });
  }
}
