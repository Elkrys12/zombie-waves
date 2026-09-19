/**
 * Definición del mapa: zonas de suelo, obstáculos y puntos de aparición.
 * El servidor lo usa para colisiones y el cliente para dibujarlo.
 * Todo son datos estáticos, así que ambos lados ven exactamente el mismo mundo.
 */

export const MAP_WIDTH = 3200;
export const MAP_HEIGHT = 3200;

export type GroundKind = "grass" | "asphalt" | "concrete" | "dirt";

export interface GroundZone {
  kind: GroundKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ObstacleKind = "building" | "wall" | "car" | "crate" | "barrel" | "tree" | "sandbag" | "fence";

export interface Obstacle {
  kind: ObstacleKind;
  x: number; // centro
  y: number;
  w: number; // para los circulares (tree, barrel), w = h = diámetro
  h: number;
  rotation?: number; // solo estético (coches)
  variant?: number; // color / estilo
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CIRCULAR: ReadonlySet<ObstacleKind> = new Set(["tree", "barrel"]);
/** Obstáculos bajos (o copas de árbol): bloquean el paso pero las balas pasan. */
const BULLET_PASS: ReadonlySet<ObstacleKind> = new Set(["crate", "barrel", "sandbag", "fence", "car", "tree"]);

export function isCircular(o: Obstacle) {
  return CIRCULAR.has(o.kind);
}

export function blocksBullets(o: Obstacle) {
  return !BULLET_PASS.has(o.kind);
}

/** Semiejes del rectángulo de colisión, teniendo en cuenta la rotación (coches). */
export function halfExtents(o: Obstacle): { hw: number; hh: number } {
  const rot = o.rotation ?? 0;
  if (rot === 0) return { hw: o.w / 2, hh: o.h / 2 };
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  return { hw: (o.w * c + o.h * s) / 2, hh: (o.w * s + o.h * c) / 2 };
}

/** Radio de colisión de un obstáculo circular (los árboles solo bloquean por el tronco). */
export function collisionRadius(o: Obstacle) {
  return o.kind === "tree" ? o.w * 0.22 : o.w / 2;
}

// ------------------------------------------------------------------ Suelo

// El fondo por defecto es hierba; estas zonas se pintan encima en orden.
export const GROUND_ZONES: GroundZone[] = [
  // Campo de tierra al noreste
  { kind: "dirt", x: 2150, y: 150, w: 950, h: 1000 },
  // Aparcamiento del supermercado al suroeste
  { kind: "asphalt", x: 150, y: 2100, w: 1100, h: 950 },
  // Explanada del almacén al sureste
  { kind: "concrete", x: 2100, y: 2150, w: 1000, h: 900 },
  // Carreteras en cruz
  { kind: "asphalt", x: 0, y: 1480, w: MAP_WIDTH, h: 240 },
  { kind: "asphalt", x: 1480, y: 0, w: 240, h: MAP_HEIGHT },
  // Plaza central de hormigón
  { kind: "concrete", x: 1250, y: 1250, w: 700, h: 700 },
];

// ------------------------------------------------------------------ Obstáculos

function building(x: number, y: number, w: number, h: number, variant = 0): Obstacle {
  return { kind: "building", x, y, w, h, variant };
}
function wall(x: number, y: number, w: number, h: number): Obstacle {
  return { kind: "wall", x, y, w, h };
}
function fence(x: number, y: number, w: number, h: number): Obstacle {
  return { kind: "fence", x, y, w, h };
}
function car(x: number, y: number, rotation = 0, variant = 0): Obstacle {
  return { kind: "car", x, y, w: 80, h: 42, rotation, variant };
}
function crate(x: number, y: number, size = 40): Obstacle {
  return { kind: "crate", x, y, w: size, h: size };
}
function barrel(x: number, y: number): Obstacle {
  return { kind: "barrel", x, y, w: 30, h: 30 };
}
function tree(x: number, y: number, size = 70): Obstacle {
  return { kind: "tree", x, y, w: size, h: size };
}
function sandbag(x: number, y: number, w: number, h: number): Obstacle {
  return { kind: "sandbag", x, y, w, h };
}

export const OBSTACLES: Obstacle[] = [
  // ---- Barrio residencial (noroeste) ----
  building(300, 300, 360, 260, 0),
  building(800, 280, 300, 220, 1),
  building(320, 800, 280, 300, 2),
  building(900, 820, 380, 260, 1),
  fence(600, 1120, 700, 12),
  tree(1250, 200), tree(1300, 620), tree(120, 620), tree(650, 560, 60),
  car(1180, 1300, 0.2, 0), car(1330, 1120, 1.4, 2),

  // ---- Campo (noreste): granero, vallas y árboles ----
  building(2650, 350, 340, 220, 3),
  fence(2150, 700, 12, 450), fence(2450, 1150, 600, 12),
  tree(2250, 300, 80), tree(2950, 800, 90), tree(2400, 950, 70), tree(3050, 1100, 60),
  barrel(2520, 560), barrel(2555, 575), barrel(2530, 605),
  crate(2820, 620), crate(2870, 640, 34),

  // ---- Plaza central: fuente y sacos de arena ----
  { kind: "barrel", x: 1600, y: 1600, w: 90, h: 90 }, // fuente (círculo grande)
  sandbag(1350, 1320, 120, 28), sandbag(1850, 1320, 120, 28),
  sandbag(1350, 1880, 120, 28), sandbag(1850, 1880, 120, 28),
  tree(1320, 1400, 60), tree(1880, 1400, 60), tree(1320, 1800, 60), tree(1880, 1800, 60),

  // ---- Parque (oeste, entre barrio y aparcamiento) ----
  tree(250, 1300, 90), tree(450, 1250, 80), tree(700, 1350, 100), tree(950, 1280, 70),
  tree(300, 1850, 90), tree(600, 1900, 100), tree(900, 1850, 80), tree(1150, 1950, 70),
  wall(700, 1780, 500, 14),

  // ---- Aparcamiento y supermercado (suroeste) ----
  building(650, 2800, 800, 300, 4),
  car(300, 2250, 0, 1), car(420, 2250, 0, 3), car(540, 2250, 0, 0), car(660, 2250, 0.1, 2),
  car(300, 2420, 0, 2), car(540, 2420, 0, 1), car(780, 2420, 3.0, 3),
  car(1050, 2350, 1.57, 0), car(1050, 2500, 1.57, 1),
  crate(1180, 2800), barrel(1220, 2760),

  // ---- Almacén industrial (sureste) ----
  building(2650, 2500, 700, 360, 5),
  wall(2100, 2160, 14, 700), wall(2100, 3050, 1000, 14),
  crate(2250, 2300), crate(2300, 2300), crate(2250, 2350), crate(2280, 2420, 34),
  crate(2900, 2900), crate(2950, 2900), crate(2925, 2950),
  barrel(2450, 2950), barrel(2485, 2965), barrel(2460, 2995),
  car(2350, 2800, 0.3, 3),

  // ---- Bordes de carretera: coches abandonados ----
  car(1560, 400, 1.7, 2), car(1640, 2700, 1.5, 0), car(400, 1620, 0.1, 1), car(2800, 1580, 3.1, 3),
];

// ------------------------------------------------------------------ Apariciones

/** Puntos donde aparecen los zombies: extremos de las carreteras y huecos entre zonas. */
export const ZOMBIE_SPAWNS: { x: number; y: number }[] = [
  { x: 1600, y: 40 }, { x: 1600, y: MAP_HEIGHT - 40 }, { x: 40, y: 1600 }, { x: MAP_WIDTH - 40, y: 1600 },
  { x: 60, y: 60 }, { x: MAP_WIDTH - 60, y: 60 }, { x: 60, y: MAP_HEIGHT - 60 }, { x: MAP_WIDTH - 60, y: MAP_HEIGHT - 60 },
  { x: 1000, y: 40 }, { x: 2300, y: 40 }, { x: 40, y: 2500 }, { x: MAP_WIDTH - 40, y: 900 },
];

/** Punto de aparición de los jugadores (la plaza, alrededor de la fuente). */
export const PLAYER_SPAWN = { x: 1600, y: 1600, radius: 180 };

// ------------------------------------------------------------------ Colisiones

/**
 * Empuja un círculo fuera de todos los obstáculos con los que se solape.
 * Devuelve la posición corregida (permite "deslizar" por las paredes).
 */
export function resolveCircleCollisions(x: number, y: number, r: number): { x: number; y: number } {
  for (const o of OBSTACLES) {
    if (isCircular(o)) {
      const or = collisionRadius(o);
      const dx = x - o.x;
      const dy = y - o.y;
      const dist = Math.hypot(dx, dy);
      const min = or + r;
      if (dist < min) {
        const nx = dist > 0.001 ? dx / dist : 1;
        const ny = dist > 0.001 ? dy / dist : 0;
        x = o.x + nx * min;
        y = o.y + ny * min;
      }
    } else {
      const { hw, hh } = halfExtents(o);
      const cx = Math.max(o.x - hw, Math.min(o.x + hw, x));
      const cy = Math.max(o.y - hh, Math.min(o.y + hh, y));
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < r) {
        if (dist > 0.001) {
          x = cx + (dx / dist) * r;
          y = cy + (dy / dist) * r;
        } else {
          // Centro dentro del rectángulo: salir por el lado más cercano
          const left = x - (o.x - hw), right = o.x + hw - x, top = y - (o.y - hh), bottom = o.y + hh - y;
          const m = Math.min(left, right, top, bottom);
          if (m === left) x = o.x - hw - r;
          else if (m === right) x = o.x + hw + r;
          else if (m === top) y = o.y - hh - r;
          else y = o.y + hh + r;
        }
      }
    }
  }
  return { x, y };
}

/** ¿El punto está dentro de un obstáculo que bloquea balas? */
export function pointBlocked(x: number, y: number): boolean {
  for (const o of OBSTACLES) {
    if (!blocksBullets(o)) continue;
    if (isCircular(o)) {
      if (Math.hypot(x - o.x, y - o.y) < o.w / 2) return true;
    } else {
      const { hw, hh } = halfExtents(o);
      if (Math.abs(x - o.x) < hw && Math.abs(y - o.y) < hh) return true;
    }
  }
  return false;
}

/** Bounding box de un obstáculo (para dibujar o para el minimapa). */
export function obstacleRect(o: Obstacle): Rect {
  const { hw, hh } = halfExtents(o);
  return { x: o.x - hw, y: o.y - hh, w: hw * 2, h: hh * 2 };
}
