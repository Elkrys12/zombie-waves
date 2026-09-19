import { Client, type Room } from "@colyseus/sdk";
import type { InputMessage } from "@zombie-waves/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

/** Envuelve la conexión con el servidor Colyseus. */
export class NetworkManager {
  private client = new Client(SERVER_URL);
  room?: Room;

  async join(): Promise<Room> {
    this.room = await this.client.joinOrCreate("game");
    return this.room;
  }

  sendInput(input: InputMessage) {
    this.room?.send("input", input);
  }
}
