import { Client, getStateCallbacks, type Room } from "@colyseus/sdk";
import type {
  InputMessage, UpgradeId, WeaponId, JoinOptions, CreateRoomOptions,
  PlayerState, ZombieState, BulletState, WavePhase,
} from "@zombie-waves/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

/** Forma del estado tal y como lo ve el cliente (espejo de GameState del servidor). */
export interface GameStateView {
  code: string;
  hostId: string;
  isPrivate: boolean;
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

  /** Partida rápida: entra en una sala pública con hueco o crea una nueva. */
  async quickPlay(name: string) {
    const options: JoinOptions = { name };
    this.room = await this.client.joinOrCreate<GameStateView>("game", options);
    return this.waitForState();
  }

  /** Crea una sala privada a la que solo se entra con el código. */
  async createPrivate(name: string) {
    const options: CreateRoomOptions = { name, private: true };
    this.room = await this.client.create<GameStateView>("game", options);
    return this.waitForState();
  }

  /** Entra en la sala de un amigo por su código (el código es el roomId). */
  async joinByCode(code: string, name: string) {
    const options: JoinOptions = { name };
    this.room = await this.client.joinById<GameStateView>(code.toUpperCase(), options);
    return this.waitForState();
  }

  /** El estado completo llega en un mensaje aparte tras unirse: esperamos a tenerlo antes de dibujar nada. */
  private waitForState(): Promise<Room<GameStateView>> {
    const room = this.room;
    if (room.state?.players) return Promise.resolve(room);
    return new Promise((resolve) => room.onStateChange.once(() => resolve(room)));
  }

  get isHost() {
    return this.state.hostId === this.sessionId;
  }

  startGame() {
    this.room.send("start");
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
