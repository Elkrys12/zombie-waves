#!/usr/bin/env node
/**
 * Empaqueta los frames renderizados por Blender (tools/blender/render_sprites.py) en una hoja de
 * sprites uniforme + JSON de animaciones para Phaser.
 *
 * Uso: node tools/pack-sheet.mjs <carpeta-frames> <nombre> [--frame 128] [--outline 1.3]
 *   carpeta-frames: salida del render (contiene <accion>_0001.png ... y meta.json)
 *   nombre:         nombre del personaje; escribe client/public/assets/sprites/<nombre>.png y .json
 *   --frame         lado del frame en la hoja (los frames se reducen a este tamaño)
 *   --outline       añade un contorno oscuro de ese grosor (px) alrededor de cada frame (para renders sin Freestyle)
 *
 * JSON: { frameWidth, frameHeight, ppm, fps, extent, anims: { walk: { start, end, loop } } }
 *   extent: radio (px) del píxel opaco más lejano del centro en cualquier frame (para encajar vistas previas)
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [,, srcDir, name, ...rest] = process.argv;
if (!srcDir || !name) { console.error("uso: node tools/pack-sheet.mjs <carpeta> <nombre> [--frame 128]"); process.exit(1); }
const frameSize = Number(rest[rest.indexOf("--frame") + 1]) || 128;
const outlinePx = rest.includes("--outline") ? Number(rest[rest.indexOf("--outline") + 1]) || 0 : 0;
const OUT = path.resolve("client/public/assets/sprites");

// ---- PNG mínimo (igual que process-art) ----
const CRC_TABLE = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function decodePng(buf) {
  let off = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct], raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch;
  const px = new Uint8Array(w * h * 4); let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], line = new Uint8Array(raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride));
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0; let v = line[i];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (ch === 4) { px[o] = line[x * 4]; px[o + 1] = line[x * 4 + 1]; px[o + 2] = line[x * 4 + 2]; px[o + 3] = line[x * 4 + 3]; }
      else if (ch === 3) { px[o] = line[x * 3]; px[o + 1] = line[x * 3 + 1]; px[o + 2] = line[x * 3 + 2]; px[o + 3] = 255; }
      else { px[o] = px[o + 1] = px[o + 2] = line[x * ch]; px[o + 3] = ch === 2 ? line[x * 2 + 1] : 255; }
    }
    prev = line;
  }
  return { w, h, px };
}
function encodePng({ w, h, px }) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, "ascii"), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) raw.set(px.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
/** Reducción por promedio de área con alfa premultiplicado. */
function resize(img, nw, nh) {
  const { w, h, px } = img; const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const sy0 = Math.floor(y * h / nh), sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * h / nh));
    for (let x = 0; x < nw; x++) {
      const sx0 = Math.floor(x * w / nw), sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * w / nw));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) { const o = (sy * w + sx) * 4, al = px[o + 3] / 255; r += px[o] * al; g += px[o + 1] * al; b += px[o + 2] * al; a += al; n++; }
      const o = (y * nw + x) * 4;
      if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
      out[o + 3] = Math.round((a / n) * 255);
    }
  }
  return { w: nw, h: nh, px: out };
}

/** Contorno oscuro: dilata el alfa `r` píxeles y pone ese borde debajo del sprite. */
function outline(img, r) {
  const { w, h, px } = img; const R = Math.ceil(r); const out = new Uint8Array(px);
  const line = [10, 8, 13];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4; if (px[o + 3] === 255) continue;
    let m = 0;
    for (let dy = -R; dy <= R && m < 255; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const sx = x + dx, sy = y + dy; if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const a = px[(sy * w + sx) * 4 + 3]; if (a > m) m = a;
    }
    if (m === 0) continue;
    // sprite sobre borde (composición normal)
    const sa = px[o + 3] / 255, ba = (m / 255) * (1 - sa), a = sa + ba;
    for (let c = 0; c < 3; c++) out[o + c] = Math.round((px[o + c] * sa + line[c] * ba) / a);
    out[o + 3] = Math.round(a * 255);
  }
  return { w, h, px: out };
}

// ---- empaquetado ----
/** Empaqueta una carpeta de frames en una hoja; devuelve la info de animaciones. */
let extent = 0;
function packFolder(dir, outName) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const frames = [];
  const anims = {};
  for (const action of Object.keys(meta.actions)) {
    const start = frames.length;
    for (let i = 1; i <= meta.actions[action].frames; i++) frames.push(path.join(dir, `${action}_${String(i).padStart(4, "0")}.png`));
    anims[action] = { start, end: frames.length - 1, loop: meta.actions[action].loop !== false };
  }
  const cols = Math.ceil(Math.sqrt(frames.length));
  const rows = Math.ceil(frames.length / cols);
  const sheet = { w: cols * frameSize, h: rows * frameSize, px: new Uint8Array(cols * rows * frameSize * frameSize * 4) };
  frames.forEach((file, i) => {
    let img = resize(decodePng(fs.readFileSync(file)), frameSize, frameSize);
    if (outlinePx > 0) img = outline(img, outlinePx);
    for (let y = 0; y < frameSize; y++) for (let x = 0; x < frameSize; x++) {
      if (img.px[(y * frameSize + x) * 4 + 3] > 40) extent = Math.max(extent, Math.hypot(x + 0.5 - frameSize / 2, y + 0.5 - frameSize / 2));
    }
    const ox = (i % cols) * frameSize, oy = Math.floor(i / cols) * frameSize;
    for (let y = 0; y < frameSize; y++) sheet.px.set(img.px.subarray(y * frameSize * 4, (y + 1) * frameSize * 4), ((oy + y) * sheet.w + ox) * 4);
  });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${outName}.png`), encodePng(sheet));
  console.log(`  ${outName}.png: ${frames.length} frames en ${cols}x${rows} (${sheet.w}x${sheet.h})`);
  return { meta, anims, cols };
}

const layersFile = path.join(srcDir, "layers.json");
let info;
let layers = null;
if (fs.existsSync(layersFile)) {
  // Personaje por capas (personalizable): una hoja por capa, mismas animaciones en todas
  layers = JSON.parse(fs.readFileSync(layersFile, "utf8"));
  for (const l of layers) info = packFolder(path.join(srcDir, l.name), `${name}_${l.name}`);
} else {
  info = packFolder(srcDir, name);
}
fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({
  frameWidth: frameSize, frameHeight: frameSize, columns: info.cols,
  ppm: info.meta.ppm * (frameSize / info.meta.size), fps: info.meta.fps, extent: Math.ceil(extent), anims: info.anims,
  layers: layers ?? undefined,
}, null, 2));
console.log(`${name}.json listo · anims: ${Object.entries(info.anims).map(([k, v]) => `${k}[${v.start}-${v.end}]`).join(" ")}`);
