#!/usr/bin/env node
/**
 * Renderiza y empaqueta todos los personajes definidos abajo en un solo paso.
 * Uso: node assets3d/render.mjs [nombre ...]
 * Requiere Blender (portable o instalado); ruta en la variable BLENDER o en la lista de abajo.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHARACTERS = {
  // nombre: { model, yaw (grados para mirar a +X), actions (opcional), anims (carpeta Mixamo, opcional) }
  proto: { model: "assets3d/models/proto.glb", yaw: 90, actions: "idle,walk,sprint,holding-right,holding-right-shoot,holding-both,holding-both-shoot,die" },
};

const candidates = [process.env.BLENDER, "C:/Users/yarie/tools/blender-5.2.2-windows-x64/blender.exe", "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe", "blender"].filter(Boolean);
const blender = candidates.find((c) => c === "blender" || fs.existsSync(c));
if (!blender) { console.error("No encuentro Blender: define la variable BLENDER con la ruta a blender.exe"); process.exit(1); }

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CHARACTERS);
for (const name of names) {
  const c = CHARACTERS[name];
  if (!c) { console.error(`personaje desconocido: ${name}`); continue; }
  const out = path.resolve("assets3d/renders", name);
  fs.rmSync(out, { recursive: true, force: true });
  const args = ["-b", "--python", "tools/blender/render_sprites.py", "--", "--model", path.resolve(c.model), "--out", out, "--yaw", String(c.yaw ?? 0), "--step", "2"];
  if (c.actions) args.push("--actions", c.actions);
  if (c.anims) args.push("--anims", path.resolve(c.anims));
  console.log(`== ${name}`);
  execFileSync(blender, args, { stdio: ["ignore", "inherit", "inherit"] });
  execFileSync("node", ["tools/pack-sheet.mjs", out, name, "--frame", "128"], { stdio: "inherit" });
}
