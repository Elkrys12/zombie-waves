/**
 * Código compartido entre cliente y servidor:
 * constantes del juego, configuración de armas y mejoras, tipos de mensajes.
 */

// ---- Mapa y física ----
export * from "./map.js";
export * from "./nav.js";
export const TICK_RATE = 20; // simulaciones por segundo en el servidor

// ---- Jugador ----
export const PLAYER_BASE_SPEED = 200; // px/s
export const PLAYER_BASE_HP = 100;
export const PLAYER_RADIUS = 16;

// ---- Armas ----
export type WeaponId = "pistol" | "smg" | "shotgun" | "rifle";

export interface WeaponConfig {
  name: string;
  cost: number;
  damage: number;
  fireRate: number; // disparos por segundo
  bulletSpeed: number;
  bulletsPerShot: number;
  spread: number; // radianes
  range: number;
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  pistol: { name: "Pistola", cost: 0, damage: 20, fireRate: 3, bulletSpeed: 600, bulletsPerShot: 1, spread: 0.02, range: 500 },
  smg: { name: "Subfusil", cost: 300, damage: 12, fireRate: 10, bulletSpeed: 650, bulletsPerShot: 1, spread: 0.08, range: 450 },
  shotgun: { name: "Escopeta", cost: 500, damage: 15, fireRate: 1.2, bulletSpeed: 550, bulletsPerShot: 6, spread: 0.3, range: 300 },
  rifle: { name: "Rifle", cost: 800, damage: 45, fireRate: 2, bulletSpeed: 900, bulletsPerShot: 1, spread: 0.01, range: 800 },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];

// ---- Mejoras ----
export type UpgradeId = "vest" | "speed" | "damage" | "fire_rate" | "max_hp";

export interface UpgradeConfig {
  name: string;
  description: string;
  cost: number; // coste base; cada nivel cuesta cost * nivelSiguiente
  maxLevel: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeConfig> = {
  vest: { name: "Chaleco", description: "-15% daño recibido por nivel", cost: 150, maxLevel: 3 },
  speed: { name: "Velocidad", description: "+10% velocidad por nivel", cost: 100, maxLevel: 3 },
  damage: { name: "Daño", description: "+15% daño por nivel", cost: 200, maxLevel: 5 },
  fire_rate: { name: "Cadencia", description: "+12% cadencia por nivel", cost: 200, maxLevel: 5 },
  max_hp: { name: "Vida máxima", description: "+25 vida máxima por nivel", cost: 150, maxLevel: 5 },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/** Coste del siguiente nivel de una mejora. */
export function upgradeCost(id: UpgradeId, currentLevel: number): number {
  return UPGRADES[id].cost * (currentLevel + 1);
}

// Multiplicadores por nivel de mejora
export const VEST_REDUCTION_PER_LEVEL = 0.15;
export const SPEED_BONUS_PER_LEVEL = 0.1;
export const DAMAGE_BONUS_PER_LEVEL = 0.15;
export const FIRE_RATE_BONUS_PER_LEVEL = 0.12;
export const MAX_HP_BONUS_PER_LEVEL = 25;

// ---- Zombies ----
export type ZombieType = "walker" | "runner" | "tank";

export interface ZombieConfig {
  hp: number;
  speed: number;
  damage: number;
  reward: number; // dinero al matarlo
  radius: number; // radio físico (movimiento, contacto)
  hitRadius: number; // radio para recibir disparos (acorde al tamaño visible del sprite)
  attackCooldown: number; // segundos entre ataques
}

export const ZOMBIES: Record<ZombieType, ZombieConfig> = {
  walker: { hp: 50, speed: 80, damage: 10, reward: 10, radius: 16, hitRadius: 24, attackCooldown: 1 },
  runner: { hp: 30, speed: 180, damage: 8, reward: 15, radius: 12, hitRadius: 19, attackCooldown: 0.7 },
  tank: { hp: 300, speed: 50, damage: 30, reward: 50, radius: 26, hitRadius: 38, attackCooldown: 1.5 },
};

// ---- Oleadas ----
export const WAVE_COUNTDOWN = 15; // segundos entre oleadas (tiempo de tienda)
export const FIRST_WAVE_COUNTDOWN = 8;
export const GAME_OVER_DELAY = 6;
export const BULLET_RADIUS = 4;

export type WavePhase = "lobby" | "countdown" | "active" | "gameover";

// ---- Salas ----
export const ROOM_CODE_LENGTH = 5;
// Sin caracteres ambiguos (0/O, 1/I/L) para dictar el código en voz alta
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const MAX_PLAYERS = 4;

// ---- Forma del estado sincronizado (para tipar el cliente) ----
export interface PlayerState {
  name: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  money: number;
  weapon: WeaponId;
  alive: boolean;
  kills: number;
  vest: number;
  speed: number;
  damage: number;
  fire_rate: number;
  max_hp: number;
}

export interface ZombieState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: ZombieType;
}

export interface BulletState {
  x: number;
  y: number;
  angle: number;
  ownerId: string;
}

// ---- Mensajes cliente -> servidor ----
export interface InputMessage {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  angle: number; // ángulo de apuntado en radianes
  shooting: boolean;
}

export interface BuyUpgradeMessage {
  upgrade: UpgradeId;
}

export interface BuyWeaponMessage {
  weapon: WeaponId;
}

export interface JoinOptions {
  name?: string;
}

export interface CreateRoomOptions extends JoinOptions {
  /** Sala privada: solo se entra con el código, no por partida rápida */
  private?: boolean;
}
