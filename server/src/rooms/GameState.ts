import { Schema, MapSchema, type } from "@colyseus/schema";
import { PLAYER_BASE_HP } from "@zombie-waves/shared";

export class Player extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") angle = 0;
  @type("number") hp = PLAYER_BASE_HP;
  @type("number") money = 0;
  @type("string") weapon = "pistol";
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("number") wave = 0;
}
