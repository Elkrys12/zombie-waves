/**
 * Código compartido entre cliente y servidor:
 * constantes del juego, configuración de armas y mejoras, tipos de mensajes.
 */

// ---- Mapa y física ----
export const MAP_WIDTH = 2000;
export const MAP_HEIGHT = 2000;
export const TICK_RATE = 20; // simulaciones por segundo en el servidor

// ---- Jugador ----
export const PLAYER_BASE_SPEED = 200; // px/s
export const PLAYER_BASE_HP = 100;
export const PLAYER_RADIUS = 16;

// ---- Armas ----
export type WeaponId = "pistol" | "shotgun" | "rifle" | "smg";

export interface WeaponConfig {
  name: string;
  damage: number;
  fireRate: number; // disparos por segundo
  bulletSpeed: number;
  bulletsPerShot: number;
  spread: number; // radianes
  range: number;
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  pistol: { name: "Pistola", damage: 20, fireRate: 3, bulletSpeed: 600, bulletsPerShot: 1, spread: 0.02, range: 500 },
  smg: { name: "Subfusil", damage: 12, fireRate: 10, bulletSpeed: 650, bulletsPerShot: 1, spread: 0.08, range: 450 },
  shotgun: { name: "Escopeta", damage: 15, fireRate: 1.2, bulletSpeed: 550, bulletsPerShot: 6, spread: 0.3, range: 300 },
  rifle: { name: "Rifle", damage: 45, fireRate: 2, bulletSpeed: 900, bulletsPerShot: 1, spread: 0.01, range: 800 },
};

// ---- Mejoras ----
export type UpgradeId = "vest" | "speed" | "damage" | "fire_rate" | "max_hp";

export interface UpgradeConfig {
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeConfig> = {
  vest: { name: "Chaleco", description: "Reduce el daño recibido", cost: 150, maxLevel: 3 },
  speed: { name: "Velocidad", description: "Aumenta la velocidad de movimiento", cost: 100, maxLevel: 3 },
  damage: { name: "Daño", description: "Aumenta el daño de las armas", cost: 200, maxLevel: 5 },
  fire_rate: { name: "Cadencia", description: "Dispara más rápido", cost: 200, maxLevel: 5 },
  max_hp: { name: "Vida máxima", description: "Aumenta la vida máxima", cost: 150, maxLevel: 5 },
};

// ---- Zombies ----
export type ZombieType = "walker" | "runner" | "tank";

export interface ZombieConfig {
  hp: number;
  speed: number;
  damage: number;
  reward: number; // dinero al matarlo
}

export const ZOMBIES: Record<ZombieType, ZombieConfig> = {
  walker: { hp: 50, speed: 80, damage: 10, reward: 10 },
  runner: { hp: 30, speed: 180, damage: 8, reward: 15 },
  tank: { hp: 300, speed: 50, damage: 30, reward: 50 },
};

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
