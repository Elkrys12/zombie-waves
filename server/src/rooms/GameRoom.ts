import { Room, matchMaker, type Client } from "colyseus";
import { GameState, Player, Zombie, Bullet } from "./GameState.js";
import {
  MAP_WIDTH, MAP_HEIGHT, TICK_RATE, PLAYER_BASE_SPEED, PLAYER_BASE_HP, PLAYER_RADIUS,
  WEAPONS, UPGRADES, ZOMBIES, upgradeCost,
  VEST_REDUCTION_PER_LEVEL, SPEED_BONUS_PER_LEVEL, DAMAGE_BONUS_PER_LEVEL,
  FIRE_RATE_BONUS_PER_LEVEL, MAX_HP_BONUS_PER_LEVEL,
  WAVE_COUNTDOWN, FIRST_WAVE_COUNTDOWN, GAME_OVER_DELAY, BULLET_RADIUS,
  ROOM_CODE_LENGTH, ROOM_CODE_ALPHABET, MAX_PLAYERS,
  ZOMBIE_SPAWNS, PLAYER_SPAWN, resolveCircleCollisions, pointBlocked,
  cellOf, cellCenter, distanceField, bestNeighbor, hasLineOfSight, UNREACHABLE,
  type InputMessage, type BuyUpgradeMessage, type BuyWeaponMessage, type JoinOptions, type CreateRoomOptions,
  type WeaponId, type UpgradeId, type ZombieType,
} from "@zombie-waves/shared";

/** Datos de servidor que no hace falta sincronizar con los clientes. */
interface BulletData {
  vx: number;
  vy: number;
  damage: number;
  remaining: number; // distancia restante antes de desaparecer
}

interface ZombieData {
  attackTimer: number;
  stuckTimer: number; // tiempo que lleva sin avanzar (atascado en una esquina)
  detour: number; // ángulo de desvío mientras se desatasca (NaN = ninguno)
  detourTimer: number;
}

/**
 * Sala autoritativa: el servidor simula el movimiento, los disparos, los zombies y el daño.
 * Los clientes solo envían sus inputs y renderizan el estado sincronizado.
 */
export class GameRoom extends Room<{ state: GameState }> {
  maxClients = MAX_PLAYERS;

  private lastInput = new Map<string, InputMessage>();
  private shootCooldown = new Map<string, number>();
  private bulletData = new Map<string, BulletData>();
  private zombieData = new Map<string, ZombieData>();
  private spawnQueue: ZombieType[] = [];
  private navFields = new Map<string, { cell: number; field: Uint16Array }>();
  private navTimer = 0;
  private spawnTimer = 0;
  private nextId = 1;

  async onCreate(options: CreateRoomOptions = {}) {
    // El roomId pasa a ser un código corto que los amigos pueden teclear
    this.roomId = await this.generateUniqueCode();

    const state = new GameState();
    state.code = this.roomId;
    state.isPrivate = options.private === true;
    this.setState(state);

    // Las salas privadas no aparecen en la partida rápida (joinOrCreate)
    if (state.isPrivate) await this.setPrivate(true);

    this.onMessage("input", (client, input: InputMessage) => {
      this.lastInput.set(client.sessionId, input);
    });

    this.onMessage("start", (client) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== "lobby") return;
      this.startCountdown(FIRST_WAVE_COUNTDOWN);
    });

    this.onMessage("buy_upgrade", (client, msg: BuyUpgradeMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (player) this.buyUpgrade(player, msg.upgrade);
    });

    this.onMessage("buy_weapon", (client, msg: BuyWeaponMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (player) this.buyWeapon(player, msg.weapon);
    });

    this.setSimulationInterval((dt) => this.update(dt / 1000), 1000 / TICK_RATE);
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const player = new Player();
    player.name = (options.name ?? "").trim().slice(0, 12) || `Jugador ${this.state.players.size + 1}`;
    this.placeAtSpawn(player);
    // Si entra en mitad de una oleada, espera muerto a la siguiente para no aparecer rodeado
    player.alive = this.state.phase !== "active";
    if (!player.alive) player.hp = 0;
    this.state.players.set(client.sessionId, player);
    if (!this.state.hostId) this.state.hostId = client.sessionId;
    console.log(`[room ${this.roomId}] ${player.name} (${client.sessionId}) se unió`);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.lastInput.delete(client.sessionId);
    this.shootCooldown.delete(client.sessionId);
    console.log(`[room ${this.roomId}] ${client.sessionId} salió`);

    // Si se va el anfitrión, hereda el rol el siguiente jugador
    if (client.sessionId === this.state.hostId) {
      const next = this.state.players.keys().next();
      this.state.hostId = next.done ? "" : next.value;
    }
  }

  /** Coloca al jugador en un punto libre alrededor de la plaza. */
  private placeAtSpawn(player: Player) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * (PLAYER_SPAWN.radius - 60);
    const pos = resolveCircleCollisions(PLAYER_SPAWN.x + Math.cos(angle) * dist, PLAYER_SPAWN.y + Math.sin(angle) * dist, PLAYER_RADIUS);
    player.x = pos.x;
    player.y = pos.y;
  }

  // ---------------------------------------------------------------- Código de sala

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = "";
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
      }
      const existing = await matchMaker.findRoomsByIds([code]);
      if (existing.size === 0) return code;
    }
    throw new Error("No se pudo generar un código de sala único");
  }

  // ---------------------------------------------------------------- Tienda

  private buyUpgrade(player: Player, id: UpgradeId) {
    const config = UPGRADES[id];
    if (!config) return;
    const level = player[id];
    if (level >= config.maxLevel) return;
    const cost = upgradeCost(id, level);
    if (player.money < cost) return;

    player.money -= cost;
    player[id] = level + 1;
    if (id === "max_hp") {
      player.maxHp = PLAYER_BASE_HP + player.max_hp * MAX_HP_BONUS_PER_LEVEL;
      player.hp = Math.min(player.maxHp, player.hp + MAX_HP_BONUS_PER_LEVEL);
    }
  }

  private buyWeapon(player: Player, id: WeaponId) {
    const config = WEAPONS[id];
    if (!config || player.weapon === id) return;
    if (player.money < config.cost) return;
    player.money -= config.cost;
    player.weapon = id;
  }

  // ---------------------------------------------------------------- Oleadas

  private startCountdown(seconds: number) {
    this.state.phase = "countdown";
    this.state.countdown = seconds;
  }

  private startWave() {
    this.state.wave += 1;
    this.state.phase = "active";
    this.state.countdown = 0;

    // Reaparecen los jugadores muertos con vida completa
    this.state.players.forEach((player) => {
      if (!player.alive) {
        player.alive = true;
        player.hp = player.maxHp;
        this.placeAtSpawn(player);
      }
    });

    const wave = this.state.wave;
    const playerFactor = 1 + (this.state.players.size - 1) * 0.5;
    const walkers = Math.round((5 + wave * 3) * playerFactor);
    const runners = wave >= 3 ? Math.round((wave - 2) * 2 * playerFactor) : 0;
    const tanks = wave >= 5 ? Math.round((wave - 4) * playerFactor) : 0;

    this.spawnQueue = [
      ...Array<ZombieType>(walkers).fill("walker"),
      ...Array<ZombieType>(runners).fill("runner"),
      ...Array<ZombieType>(tanks).fill("tank"),
    ].sort(() => Math.random() - 0.5);
    this.spawnTimer = 0;
    this.state.zombiesLeft = this.spawnQueue.length;
  }

  private spawnZombie(type: ZombieType) {
    const config = ZOMBIES[type];
    const zombie = new Zombie();
    zombie.type = type;
    zombie.hp = config.hp;
    zombie.maxHp = config.hp;

    // Aparece en uno de los puntos de entrada del mapa, con algo de dispersión
    const spawn = ZOMBIE_SPAWNS[Math.floor(Math.random() * ZOMBIE_SPAWNS.length)];
    const pos = resolveCircleCollisions(
      Math.max(config.radius, Math.min(MAP_WIDTH - config.radius, spawn.x + (Math.random() - 0.5) * 120)),
      Math.max(config.radius, Math.min(MAP_HEIGHT - config.radius, spawn.y + (Math.random() - 0.5) * 120)),
      config.radius,
    );
    zombie.x = pos.x;
    zombie.y = pos.y;

    const id = `z${this.nextId++}`;
    this.state.zombies.set(id, zombie);
    this.zombieData.set(id, { attackTimer: 0, stuckTimer: 0, detour: NaN, detourTimer: 0 });
  }

  private resetGame() {
    this.state.zombies.clear();
    this.state.bullets.clear();
    this.zombieData.clear();
    this.bulletData.clear();
    this.spawnQueue = [];
    this.state.wave = 0;
    this.state.zombiesLeft = 0;

    this.state.players.forEach((player) => {
      player.alive = true;
      player.money = 0;
      player.kills = 0;
      player.weapon = "pistol";
      player.vest = player.speed = player.damage = player.fire_rate = player.max_hp = 0;
      player.maxHp = PLAYER_BASE_HP;
      player.hp = PLAYER_BASE_HP;
      this.placeAtSpawn(player);
    });

    // De vuelta al lobby: el anfitrión decide cuándo volver a empezar
    this.state.phase = "lobby";
    this.state.countdown = 0;
  }

  // ---------------------------------------------------------------- Simulación

  private update(dt: number) {
    this.updatePhase(dt);
    this.updatePlayers(dt);
    this.updateBullets(dt);
    this.updateZombies(dt);
  }

  private updatePhase(dt: number) {
    const state = this.state;
    if (state.phase === "lobby") return;

    if (state.phase === "countdown" || state.phase === "gameover") {
      state.countdown = Math.max(0, state.countdown - dt);
      if (state.countdown > 0) return;
      if (state.phase === "gameover") this.resetGame();
      else if (state.players.size > 0) this.startWave();
      return;
    }

    // Fase activa: aparecer zombies de la cola de forma escalonada
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnZombie(this.spawnQueue.shift()!);
        this.spawnTimer = 0.5;
      }
    }

    state.zombiesLeft = this.spawnQueue.length + state.zombies.size;

    let anyAlive = false;
    state.players.forEach((p) => { if (p.alive) anyAlive = true; });
    if (!anyAlive && state.players.size > 0) {
      state.phase = "gameover";
      state.countdown = GAME_OVER_DELAY;
      return;
    }

    if (state.zombiesLeft === 0) this.startCountdown(WAVE_COUNTDOWN);
  }

  private updatePlayers(dt: number) {
    this.state.players.forEach((player: Player, id: string) => {
      const cooldown = Math.max(0, (this.shootCooldown.get(id) ?? 0) - dt);
      this.shootCooldown.set(id, cooldown);

      const input = this.lastInput.get(id);
      if (!input || !player.alive) return;

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

      const speed = PLAYER_BASE_SPEED * (1 + player.speed * SPEED_BONUS_PER_LEVEL);
      const pos = resolveCircleCollisions(
        Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, player.x + dx * speed * dt)),
        Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, player.y + dy * speed * dt)),
        PLAYER_RADIUS,
      );
      player.x = pos.x;
      player.y = pos.y;
      player.angle = input.angle;

      if (input.shooting && cooldown <= 0 && this.state.phase === "active") {
        this.shoot(id, player);
      }
    });
  }

  private shoot(ownerId: string, player: Player) {
    const weapon = WEAPONS[player.weapon as WeaponId] ?? WEAPONS.pistol;
    const fireRate = weapon.fireRate * (1 + player.fire_rate * FIRE_RATE_BONUS_PER_LEVEL);
    const damage = weapon.damage * (1 + player.damage * DAMAGE_BONUS_PER_LEVEL);
    this.shootCooldown.set(ownerId, 1 / fireRate);

    for (let i = 0; i < weapon.bulletsPerShot; i++) {
      const angle = player.angle + (Math.random() - 0.5) * weapon.spread * 2;
      const bullet = new Bullet();
      bullet.ownerId = ownerId;
      bullet.angle = angle;
      bullet.x = player.x + Math.cos(angle) * (PLAYER_RADIUS + 4);
      bullet.y = player.y + Math.sin(angle) * (PLAYER_RADIUS + 4);

      const id = `b${this.nextId++}`;
      this.state.bullets.set(id, bullet);
      this.bulletData.set(id, {
        vx: Math.cos(angle) * weapon.bulletSpeed,
        vy: Math.sin(angle) * weapon.bulletSpeed,
        damage,
        remaining: weapon.range,
      });
    }
  }

  private updateBullets(dt: number) {
    const toRemove: string[] = [];

    this.state.bullets.forEach((bullet: Bullet, id: string) => {
      const data = this.bulletData.get(id)!;
      const x0 = bullet.x, y0 = bullet.y;
      const dx = data.vx * dt, dy = data.vy * dt;
      const step = Math.hypot(dx, dy);
      data.remaining -= step;

      // Colisión barrida: la bala avanza 30-45 px por tick, así que se comprueba todo el
      // segmento recorrido (si no, "salta" por encima de zombies y muros finos).
      // Se busca el impacto más cercano al origen, sea zombie o muro.
      let hitT = Infinity;
      let hitId: string | undefined;

      this.state.zombies.forEach((zombie: Zombie, zid: string) => {
        const t = segmentCircleHit(x0, y0, dx, dy, zombie.x, zombie.y, ZOMBIES[zombie.type as ZombieType].hitRadius + BULLET_RADIUS);
        if (t !== null && t < hitT) { hitT = t; hitId = zid; }
      });

      // Muros: muestreo del segmento cada pocos píxeles
      const samples = Math.max(1, Math.ceil(step / 6));
      for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        if (t >= hitT) break;
        const sx = x0 + dx * t, sy = y0 + dy * t;
        if (sx < 0 || sx > MAP_WIDTH || sy < 0 || sy > MAP_HEIGHT || pointBlocked(sx, sy)) { hitT = t; hitId = undefined; break; }
      }

      if (hitT <= 1) {
        bullet.x = x0 + dx * hitT;
        bullet.y = y0 + dy * hitT;
        if (hitId) this.damageZombie(hitId, data.damage, bullet.ownerId);
        toRemove.push(id);
        return;
      }

      bullet.x = x0 + dx;
      bullet.y = y0 + dy;
      if (data.remaining <= 0) toRemove.push(id);
    });

    for (const id of toRemove) {
      this.state.bullets.delete(id);
      this.bulletData.delete(id);
    }
  }

  private damageZombie(id: string, damage: number, killerId: string) {
    const zombie = this.state.zombies.get(id);
    if (!zombie) return;
    zombie.hp -= damage;
    if (zombie.hp > 0) return;

    const killer = this.state.players.get(killerId);
    if (killer) {
      killer.money += ZOMBIES[zombie.type as ZombieType].reward;
      killer.kills += 1;
    }
    this.state.zombies.delete(id);
    this.zombieData.delete(id);
  }

  /** Recalcula (con límite de frecuencia) el campo de distancias de cada jugador vivo. */
  private updateNavFields(dt: number, alivePlayers: { id: string; p: Player }[]) {
    this.navTimer -= dt;
    const due = this.navTimer <= 0;
    if (due) this.navTimer = 0.2;

    const alive = new Set(alivePlayers.map((a) => a.id));
    for (const id of this.navFields.keys()) if (!alive.has(id)) this.navFields.delete(id);

    for (const { id, p } of alivePlayers) {
      const cell = cellOf(p.x, p.y);
      const nav = this.navFields.get(id);
      if (!nav || (due && nav.cell !== cell)) {
        this.navFields.set(id, { cell, field: distanceField(p.x, p.y) });
      }
    }
  }

  /**
   * Dirección de avance de un zombie hacia su objetivo: en línea recta si no hay nada en medio,
   * o siguiendo el campo de distancias (rodeando muros y edificios) si lo hay.
   */
  private steer(zombie: Zombie, target: Player, field: Uint16Array | undefined): number {
    if (!field || hasLineOfSight(zombie.x, zombie.y, target.x, target.y)) {
      return Math.atan2(target.y - zombie.y, target.x - zombie.x);
    }
    // Sigue el gradiente varias celdas y apunta a la más lejana que vea directamente
    let cell = cellOf(zombie.x, zombie.y);
    let aim = cellCenter(cell);
    for (let i = 0; i < 4; i++) {
      const next = bestNeighbor(field, cell);
      if (next < 0) break;
      const center = cellCenter(next);
      if (i > 0 && !hasLineOfSight(zombie.x, zombie.y, center.x, center.y)) break;
      aim = center;
      cell = next;
    }
    return Math.atan2(aim.y - zombie.y, aim.x - zombie.x);
  }

  private updateZombies(dt: number) {
    const alivePlayers: { id: string; p: Player }[] = [];
    this.state.players.forEach((p, id) => { if (p.alive) alivePlayers.push({ id, p }); });
    if (alivePlayers.length === 0) return;

    this.updateNavFields(dt, alivePlayers);

    this.state.zombies.forEach((zombie: Zombie, id: string) => {
      const config = ZOMBIES[zombie.type as ZombieType];
      const data = this.zombieData.get(id)!;
      data.attackTimer = Math.max(0, data.attackTimer - dt);

      // Objetivo: el jugador más cercano *por camino* (no en línea recta)
      const zCell = cellOf(zombie.x, zombie.y);
      let target = alivePlayers[0].p;
      let targetField: Uint16Array | undefined;
      let bestCost = Infinity;
      for (const { id: pid, p } of alivePlayers) {
        const nav = this.navFields.get(pid);
        const pathCost = nav ? nav.field[zCell] : UNREACHABLE;
        // Sin camino (celda bloqueada o recinto cerrado): usa la distancia euclídea como respaldo
        const cost = pathCost < UNREACHABLE ? pathCost : 100000 + Math.hypot(p.x - zombie.x, p.y - zombie.y);
        if (cost < bestCost) { bestCost = cost; target = p; targetField = pathCost < UNREACHABLE ? nav?.field : undefined; }
      }

      const distToTarget = Math.hypot(target.x - zombie.x, target.y - zombie.y);
      const reach = config.radius + PLAYER_RADIUS;
      if (distToTarget > reach) {
        let dir = this.steer(zombie, target, targetField);

        // Respaldo por si aun así se queda clavado: pequeño desvío lateral
        if (!Number.isNaN(data.detour)) {
          dir = data.detour;
          data.detourTimer -= dt;
          if (data.detourTimer <= 0) data.detour = NaN;
        }

        const step = Math.min(config.speed * dt, distToTarget - reach);
        const before = { x: zombie.x, y: zombie.y };
        const pos = resolveCircleCollisions(
          Math.max(config.radius, Math.min(MAP_WIDTH - config.radius, zombie.x + Math.cos(dir) * step)),
          Math.max(config.radius, Math.min(MAP_HEIGHT - config.radius, zombie.y + Math.sin(dir) * step)),
          config.radius,
        );
        zombie.x = pos.x;
        zombie.y = pos.y;

        const moved = Math.hypot(zombie.x - before.x, zombie.y - before.y);
        if (moved < step * 0.3 && Number.isNaN(data.detour)) {
          data.stuckTimer += dt;
          if (data.stuckTimer > 0.6) {
            data.stuckTimer = 0;
            data.detour = dir + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2);
            data.detourTimer = 0.4;
          }
        } else if (moved >= step * 0.3) {
          data.stuckTimer = 0;
        }
      } else if (data.attackTimer <= 0) {
        data.attackTimer = config.attackCooldown;
        this.damagePlayer(target, config.damage);
      }
    });

    // Separación simple para que no se apilen todos en el mismo punto
    const ids = Array.from(this.state.zombies.keys());
    for (let i = 0; i < ids.length; i++) {
      const a = this.state.zombies.get(ids[i])!;
      const ra = ZOMBIES[a.type as ZombieType].radius;
      for (let j = i + 1; j < ids.length; j++) {
        const b = this.state.zombies.get(ids[j])!;
        const minDist = ra + ZOMBIES[b.type as ZombieType].radius;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= minDist) continue;
        const push = (minDist - dist) / 2;
        a.x -= (dx / dist) * push;
        a.y -= (dy / dist) * push;
        b.x += (dx / dist) * push;
        b.y += (dy / dist) * push;
      }
    }
  }

  private damagePlayer(player: Player, damage: number) {
    const reduction = Math.min(0.75, player.vest * VEST_REDUCTION_PER_LEVEL);
    player.hp = Math.max(0, player.hp - damage * (1 - reduction));
    if (player.hp <= 0) player.alive = false;
  }
}

/**
 * Primer punto (0..1) del segmento P + t·D que entra en el círculo (cx, cy, r), o null si no lo toca.
 */
function segmentCircleHit(px: number, py: number, dxv: number, dyv: number, cx: number, cy: number, r: number): number | null {
  const fx = px - cx, fy = py - cy;
  const a = dxv * dxv + dyv * dyv;
  const b = 2 * (fx * dxv + fy * dyv);
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0; // ya está dentro
  if (a === 0) return null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
