import { Room, type Client } from "colyseus";
import { GameState, Player } from "./GameState.js";
import { MAP_WIDTH, MAP_HEIGHT, TICK_RATE, PLAYER_BASE_SPEED, type InputMessage } from "@zombie-waves/shared";

/**
 * Sala autoritativa: el servidor simula el movimiento, los zombies y el daño.
 * Los clientes solo envían sus inputs y renderizan el estado sincronizado.
 */
export class GameRoom extends Room<{ state: GameState }> {
  maxClients = 4;

  /** Último input recibido de cada cliente, indexado por sessionId */
  private lastInput = new Map<string, InputMessage>();

  onCreate() {
    this.setState(new GameState());

    this.onMessage("input", (client, input: InputMessage) => {
      this.lastInput.set(client.sessionId, input);
    });

    this.setSimulationInterval((dt) => this.update(dt / 1000), 1000 / TICK_RATE);
  }

  onJoin(client: Client) {
    const player = new Player();
    player.x = MAP_WIDTH / 2;
    player.y = MAP_HEIGHT / 2;
    this.state.players.set(client.sessionId, player);
    console.log(`[room ${this.roomId}] ${client.sessionId} se unió`);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.lastInput.delete(client.sessionId);
    console.log(`[room ${this.roomId}] ${client.sessionId} salió`);
  }

  private update(dt: number) {
    this.state.players.forEach((player: Player, id: string) => {
      const input = this.lastInput.get(id);
      if (!input) return;

      let dx = 0;
      let dy = 0;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;

      // Normalizar diagonal para no ir más rápido
      if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }

      player.x = Math.max(0, Math.min(MAP_WIDTH, player.x + dx * PLAYER_BASE_SPEED * dt));
      player.y = Math.max(0, Math.min(MAP_HEIGHT, player.y + dy * PLAYER_BASE_SPEED * dt));
      player.angle = input.angle;
    });
  }
}
