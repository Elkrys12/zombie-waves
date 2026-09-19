import { schema, t, type SchemaType } from "@colyseus/schema";
import { PLAYER_BASE_HP } from "@zombie-waves/shared";

export const Player = schema({
  name: t.string().default(""),
  x: t.number().default(0),
  y: t.number().default(0),
  angle: t.number().default(0),
  hp: t.number().default(PLAYER_BASE_HP),
  maxHp: t.number().default(PLAYER_BASE_HP),
  money: t.number().default(0),
  weapon: t.string().default("pistol"),
  alive: t.boolean().default(true),
  kills: t.number().default(0),

  // Niveles de mejoras
  vest: t.number().default(0),
  speed: t.number().default(0),
  damage: t.number().default(0),
  fire_rate: t.number().default(0),
  max_hp: t.number().default(0),
}, "Player");
export type Player = SchemaType<typeof Player>;

export const Zombie = schema({
  x: t.number().default(0),
  y: t.number().default(0),
  hp: t.number().default(0),
  maxHp: t.number().default(0),
  type: t.string().default("walker"),
}, "Zombie");
export type Zombie = SchemaType<typeof Zombie>;

export const Bullet = schema({
  x: t.number().default(0),
  y: t.number().default(0),
  angle: t.number().default(0),
  ownerId: t.string().default(""),
}, "Bullet");
export type Bullet = SchemaType<typeof Bullet>;

export const GameState = schema({
  players: t.map(Player),
  zombies: t.map(Zombie),
  bullets: t.map(Bullet),
  wave: t.number().default(0),
  phase: t.string().default("countdown"),
  countdown: t.number().default(0),
  zombiesLeft: t.number().default(0), // vivos + pendientes de aparecer
}, "GameState");
export type GameState = SchemaType<typeof GameState>;
