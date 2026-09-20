#!/usr/bin/env node
/**
 * Procesa las imágenes generadas con IA (client/public/assets/custom) y deja PNGs listos
 * para el juego en client/public/assets/art:
 *   - quita el "tablero de ajedrez" falso del fondo (relleno desde los bordes + huecos cerrados),
 *   - recorta al contenido,
 *   - reduce al tamaño objetivo (filtro de caja con alfa premultiplicado),
 *   - guarda PNG RGBA.
 * Sin dependencias: decodificador/codificador PNG mínimo con zlib.
 *
 * Uso: node tools/process-art.mjs [nombre-sin-extension ...]   (sin args: todas)
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const SRC = path.resolve("client/public/assets/custom");
const OUT = path.resolve("client/public/assets/art");

/** Tamaño máximo (lado mayor) por asset y modo de procesado. */
const SPEC = {
  // personajes y zombies: sprites grandes para que se vean nítidos al escalar
  player_1: { max: 256 }, player_2: { max: 256 }, player_3: { max: 256 }, player_4: { max: 256 },
  zombie_walker: { max: 256 }, zombie_runner: { max: 256 }, zombie_tank: { max: 320 },
  zombie_walker_dead: { max: 256 }, zombie_runner_dead: { max: 256 }, zombie_tank_dead: { max: 320 },
  player_1_base: { max: 256 }, player_2_base: { max: 256 }, player_3_base: { max: 256 }, player_4_base: { max: 256 },
  weapon_pistol: { max: 160 }, weapon_smg: { max: 200 }, weapon_shotgun: { max: 220 }, weapon_rifle: { max: 240 },
  car_red: { max: 256 }, car_blue: { max: 256 }, car_green: { max: 256 }, car_white: { max: 256 },
  tree_big: { max: 256 }, tree_small: { max: 200 }, bush: { max: 128 }, fountain: { max: 256 },
  crate: { max: 128 }, barrel: { max: 128 }, sandbags: { max: 256 }, fence_white: { max: 320 },
  lamp_post: { max: 160, loose: true }, mailbox: { max: 128 }, hydrant: { max: 96 }, cone: { max: 96 },
  rock: { max: 128 }, tires: { max: 128, holes: true },
  blood_splat: { max: 160 }, muzzle_flash: { max: 128, loose: true }, bullet: { max: 96, loose: true },
  icon_heart: { max: 96 }, icon_money: { max: 96 }, icon_skull: { max: 96 }, icon_pistol: { max: 96 },
  icon_smg: { max: 96 }, icon_shotgun: { max: 96 }, icon_rifle: { max: 96 }, icon_vest: { max: 96 },
  icon_speed: { max: 96 }, icon_damage: { max: 96 }, icon_firerate: { max: 96 }, icon_hp: { max: 96 },
  logo: { max: 900, holes: true }, // holes: también quitar tablero en huecos cerrados (las "O")
  // texturas: sin quitar fondo, solo reducir
  ground_grass: { max: 512, texture: true }, ground_asphalt: { max: 512, texture: true },
  ground_concrete: { max: 512, texture: true }, ground_dirt: { max: 512, texture: true },
  roof_red: { max: 512, texture: true }, roof_gray: { max: 512, texture: true }, roof_brown: { max: 512, texture: true },
  wall_brick: { max: 512, texture: true },
  menu_bg: { max: 1376, texture: true },
};

// ------------------------------------------------------------------ PNG mínimo

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function decodePng(buf) {
  let off = 8, w = 0, h = 0, ct = 0, depth = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ct = data[9]; }
    if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  if (depth !== 8) throw new Error(`profundidad ${depth} no soportada`);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const line = new Uint8Array(raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride));
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (ch === 4) { px[o] = line[x * 4]; px[o + 1] = line[x * 4 + 1]; px[o + 2] = line[x * 4 + 2]; px[o + 3] = line[x * 4 + 3]; }
      else if (ch === 3) { px[o] = line[x * 3]; px[o + 1] = line[x * 3 + 1]; px[o + 2] = line[x * 3 + 2]; px[o + 3] = 255; }
      else if (ch === 2) { px[o] = px[o + 1] = px[o + 2] = line[x * 2]; px[o + 3] = line[x * 2 + 1]; }
      else { px[o] = px[o + 1] = px[o + 2] = line[x]; px[o + 3] = 255; }
    }
    prev = line;
  }
  return { w, h, px };
}

function encodePng({ w, h, px }) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    raw.set(px.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ quitar tablero

/** ¿Parece un píxel del tablero de fondo? (claro y sin saturación; en modo "loose", admite tinte) */
function isBgLike(px, o, loose) {
  const r = px[o], g = px[o + 1], b = px[o + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const bright = (r + g + b) / 3;
  // Gris neutro de cualquier brillo (los generadores usan tableros claros u oscuros)
  return loose ? bright > 140 && max - min < 95 : bright > 90 && max - min < 30;
}

function removeCheckerboard(img, loose, holes = false) {
  const { w, h, px } = img;
  const label = new Int32Array(w * h).fill(-1);
  const bg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bg[i] = isBgLike(px, i * 4, loose) ? 1 : 0;

  // Componentes conexas de píxeles "de fondo"
  const comps = [];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!bg[start] || label[start] !== -1) continue;
    const id = comps.length;
    const comp = { size: 0, border: false, lums: [] };
    comps.push(comp);
    let sp = 0; stack[sp++] = start; label[start] = id;
    while (sp > 0) {
      const i = stack[--sp];
      const x = i % w, y = (i - x) / w;
      comp.size++;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) comp.border = true;
      comp.lums.push((px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3);
      const nb = [i - 1, i + 1, i - w, i + w];
      if (x === 0) nb[0] = -1; if (x === w - 1) nb[1] = -1;
      for (const n of nb) if (n >= 0 && n < w * h && bg[n] && label[n] === -1) { label[n] = id; stack[sp++] = n; }
    }
  }

  // Se elimina lo que toca el borde y los huecos cerrados que muestran el patrón de dos tonos
  const isChecker = (c) => {
    if (c.size < 300) return false;
    const mean = c.lums.reduce((a, b) => a + b, 0) / c.size;
    let hi = 0, lo = 0;
    for (const l of c.lums) { if (l > mean + 12) hi++; else if (l < mean - 12) lo++; }
    return hi > c.size * 0.15 && lo > c.size * 0.15;
  };
  // Por defecto solo se quita lo que toca el borde: el sombreado plano de un sprite (metal, piel)
  // también tiene "dos tonos" y se confundiría con tablero.
  const remove = comps.map((c) => c.border || (holes && isChecker(c)));
  for (let i = 0; i < w * h; i++) if (label[i] !== -1 && remove[label[i]]) px[i * 4 + 3] = 0;

  // Borde suave: los píxeles claros pegados a zona eliminada se atenúan según su luminosidad
  const out = new Uint8Array(px);
  for (let i = 0; i < w * h; i++) {
    if (px[i * 4 + 3] === 0) continue;
    const x = i % w, y = (i - x) / w;
    let touching = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (px[(ny * w + nx) * 4 + 3] === 0) { touching = true; break; }
    }
    if (!touching) continue;
    const lum = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
    if (lum > 120) out[i * 4 + 3] = Math.round(255 * Math.max(0.15, 1 - (lum - 120) / 140));
  }
  img.px = out;
}

// ------------------------------------------------------------------ recorte y escala

function crop(img, pad = 2) {
  const { w, h, px } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (x1 < 0) return img;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) out.set(px.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x0 + nw) * 4), y * nw * 4);
  return { w: nw, h: nh, px: out };
}

/** Reducción por promedio de área con alfa premultiplicado (evita halos oscuros). */
function resize(img, max) {
  const { w, h, px } = img;
  const scale = Math.min(1, max / Math.max(w, h));
  if (scale === 1) return img;
  const nw = Math.max(1, Math.round(w * scale)), nh = Math.max(1, Math.round(h * scale));
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const sy0 = Math.floor(y * h / nh), sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * h / nh));
    for (let x = 0; x < nw; x++) {
      const sx0 = Math.floor(x * w / nw), sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * w / nw));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) {
        const o = (sy * w + sx) * 4, al = px[o + 3] / 255;
        r += px[o] * al; g += px[o + 1] * al; b += px[o + 2] * al; a += al; n++;
      }
      const o = (y * nw + x) * 4;
      if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
      out[o + 3] = Math.round((a / n) * 255);
    }
  }
  return { w: nw, h: nh, px: out };
}

// ------------------------------------------------------------------ main

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const names = Object.keys(SPEC).filter((n) => only.length === 0 || only.includes(n));
for (const name of names) {
  const file = path.join(SRC, `${name}.png`);
  if (!fs.existsSync(file)) { console.log(`  (falta) ${name}`); continue; }
  const spec = SPEC[name];
  let img = decodePng(fs.readFileSync(file));
  if (!spec.texture) {
    removeCheckerboard(img, !!spec.loose, !!spec.holes);
    img = crop(img);
  }
  img = resize(img, spec.max);
  fs.writeFileSync(path.join(OUT, `${name}.png`), encodePng(img));
  console.log(`  ${name}: ${img.w}x${img.h}`);
}
