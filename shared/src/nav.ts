/**
 * Navegación: rejilla de celdas transitables sobre el mapa y campos de distancia
 * (Dijkstra) que los zombies descienden para llegar a un jugador rodeando obstáculos.
 */
import { MAP_WIDTH, MAP_HEIGHT, resolveCircleCollisions } from "./map.js";

export const NAV_CELL = 32;
export const NAV_COLS = Math.ceil(MAP_WIDTH / NAV_CELL);
export const NAV_ROWS = Math.ceil(MAP_HEIGHT / NAV_CELL);
/** Radio con el que se "inflan" los obstáculos: un zombie cabe si su centro está en una celda libre. */
const INFLATE = 22;
export const UNREACHABLE = 0xffff;

/** 1 = bloqueada. Se calcula una vez a partir de los obstáculos del mapa. */
export const NAV_BLOCKED: Uint8Array = (() => {
  const grid = new Uint8Array(NAV_COLS * NAV_ROWS);
  for (let r = 0; r < NAV_ROWS; r++) {
    for (let c = 0; c < NAV_COLS; c++) {
      const x = c * NAV_CELL + NAV_CELL / 2;
      const y = r * NAV_CELL + NAV_CELL / 2;
      const p = resolveCircleCollisions(x, y, INFLATE);
      if (p.x !== x || p.y !== y) grid[r * NAV_COLS + c] = 1;
    }
  }
  return grid;
})();

export function cellOf(x: number, y: number): number {
  const c = Math.max(0, Math.min(NAV_COLS - 1, Math.floor(x / NAV_CELL)));
  const r = Math.max(0, Math.min(NAV_ROWS - 1, Math.floor(y / NAV_CELL)));
  return r * NAV_COLS + c;
}

export function cellCenter(cell: number): { x: number; y: number } {
  return { x: (cell % NAV_COLS) * NAV_CELL + NAV_CELL / 2, y: Math.floor(cell / NAV_COLS) * NAV_CELL + NAV_CELL / 2 };
}

/** Si la celda está bloqueada, devuelve la celda libre más cercana (búsqueda en anillos). */
export function nearestFreeCell(cell: number): number {
  if (!NAV_BLOCKED[cell]) return cell;
  const c0 = cell % NAV_COLS;
  const r0 = Math.floor(cell / NAV_COLS);
  for (let ring = 1; ring < 6; ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = c0 + dc, r = r0 + dr;
        if (c < 0 || r < 0 || c >= NAV_COLS || r >= NAV_ROWS) continue;
        const idx = r * NAV_COLS + c;
        if (!NAV_BLOCKED[idx]) return idx;
      }
    }
  }
  return cell;
}

// Vecinos en 8 direcciones con coste 10 (recto) o 14 (diagonal)
const NEIGHBORS: [number, number, number][] = [
  [1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10],
  [1, 1, 14], [1, -1, 14], [-1, 1, 14], [-1, -1, 14],
];

/** Cola de prioridad mínima muy simple (heap binario) sobre pares (coste, celda). */
class MinHeap {
  private cost: number[] = [];
  private cell: number[] = [];
  get size() { return this.cost.length; }
  push(cost: number, cell: number) {
    this.cost.push(cost); this.cell.push(cell);
    let i = this.cost.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cost[p] <= this.cost[i]) break;
      this.swap(i, p); i = p;
    }
  }
  pop(): [number, number] {
    const top: [number, number] = [this.cost[0], this.cell[0]];
    const lastCost = this.cost.pop()!, lastCell = this.cell.pop()!;
    if (this.cost.length > 0) {
      this.cost[0] = lastCost; this.cell[0] = lastCell;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.cost.length && this.cost[l] < this.cost[m]) m = l;
        if (r < this.cost.length && this.cost[r] < this.cost[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.cost[a], this.cost[b]] = [this.cost[b], this.cost[a]];
    [this.cell[a], this.cell[b]] = [this.cell[b], this.cell[a]];
  }
}

/**
 * Campo de distancias desde una posición objetivo: dist[celda] = coste hasta el objetivo
 * (UNREACHABLE si no hay camino). Descender el gradiente lleva al objetivo por el camino más corto.
 */
export function distanceField(targetX: number, targetY: number): Uint16Array {
  const dist = new Uint16Array(NAV_COLS * NAV_ROWS).fill(UNREACHABLE);
  const start = nearestFreeCell(cellOf(targetX, targetY));
  const heap = new MinHeap();
  dist[start] = 0;
  heap.push(0, start);

  while (heap.size > 0) {
    const [d, cell] = heap.pop();
    if (d > dist[cell]) continue;
    const c = cell % NAV_COLS;
    const r = (cell - c) / NAV_COLS;
    for (const [dc, dr, cost] of NEIGHBORS) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= NAV_COLS || nr >= NAV_ROWS) continue;
      const n = nr * NAV_COLS + nc;
      if (NAV_BLOCKED[n]) continue;
      // No cortar esquinas: en diagonal, las dos celdas ortogonales deben estar libres
      if (dc !== 0 && dr !== 0 && (NAV_BLOCKED[r * NAV_COLS + nc] || NAV_BLOCKED[nr * NAV_COLS + c])) continue;
      const nd = d + cost;
      if (nd < dist[n]) {
        dist[n] = nd;
        heap.push(nd, n);
      }
    }
  }
  return dist;
}

/** Celda vecina con menor distancia (o -1 si ninguna mejora). */
export function bestNeighbor(field: Uint16Array, cell: number): number {
  const c = cell % NAV_COLS;
  const r = (cell - c) / NAV_COLS;
  let best = -1;
  let bestD = field[cell];
  for (const [dc, dr] of NEIGHBORS) {
    const nc = c + dc, nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= NAV_COLS || nr >= NAV_ROWS) continue;
    const n = nr * NAV_COLS + nc;
    if (NAV_BLOCKED[n]) continue;
    if (dc !== 0 && dr !== 0 && (NAV_BLOCKED[r * NAV_COLS + nc] || NAV_BLOCKED[nr * NAV_COLS + c])) continue;
    if (field[n] < bestD) { bestD = field[n]; best = n; }
  }
  return best;
}

/** ¿Se puede ir en línea recta entre dos puntos sin cruzar celdas bloqueadas? */
export function hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / (NAV_CELL / 2)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (NAV_BLOCKED[cellOf(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)]) return false;
  }
  return true;
}
