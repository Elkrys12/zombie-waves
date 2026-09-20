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
  // nombre: { model, yaw (grados para mirar a +X), actions, anims (carpeta Mixamo), height (m), texture, split, layers,
  //           render: { size, ppm, lines, gamma, outline } (mallas densas: 512 px sin Freestyle + contorno al empaquetar) }
  proto: {
    model: "assets3d/models/proto.glb", yaw: 90, extras: "blocky",
    actions: "idle,walk,sprint,holding-right,holding-right-shoot,holding-both,holding-both-shoot,die",
    // Capas para personalización: nombre=objetos[:white]. Las ":white" se tintan en el juego.
    layers: "pants=leg-left,leg-right:white;shirt=torso:white;skin=head,arm-left,arm-right:white;hair=hair:white;hat_cap=hat_cap,hat_cap_brim:white:optional;glasses=glasses,glasses_l,glasses_r:optional",
  },
  // Soldado (Sketchfab, malla única con textura, riggeado en Mixamo): se separa por huesos y se
  // tintan chaqueta y pantalón conservando los detalles de la textura.
  soldado: {
    model: "assets3d/models/personaje.fbx", anims: "assets3d/anims/personaje", yaw: 90, height: 1.5,
    actions: "idle,walk,sprint,holding-right,holding-right-shoot,holding-both,holding-both-shoot,die",
    texture: "assets3d/models/personaje_tex/personaje_color_2k.png", normals: "recalc",
    render: { size: 512, ppm: 220, lines: "none", gamma: 0.6, outline: 1.3 },
    split: "head=Head,HeadTop_End,Neck;hands=LeftHand*,RightHand*;feet=LeftFoot,LeftToeBase,RightFoot,RightToeBase;shirt=Spine*,LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm;pants=Hips,LeftUpLeg,LeftLeg,RightUpLeg,RightLeg",
    layers: "feet=feet;pants=pants:tint;shirt=shirt:tint;hands=hands;head=head",
  },
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
  if (c.layers) args.push("--layers", c.layers);
  if (c.extras) args.push("--extras", c.extras);
  if (c.height) args.push("--height", String(c.height));
  if (c.texture) args.push("--texture", path.resolve(c.texture));
  if (c.split) args.push("--split", c.split);
  if (c.normals) args.push("--normals", c.normals);
  const r = c.render ?? {};
  if (r.size) args.push("--size", String(r.size));
  if (r.ppm) args.push("--ppm", String(r.ppm));
  if (r.lines) args.push("--lines", r.lines);
  if (r.gamma) args.push("--gamma", String(r.gamma));
  if (process.env.ONLY_ACTIONS) { const i = args.indexOf("--actions"); if (i >= 0) args[i + 1] = process.env.ONLY_ACTIONS; else args.push("--actions", process.env.ONLY_ACTIONS); }
  console.log(`== ${name}`);
  execFileSync(blender, args, { stdio: ["ignore", "inherit", "inherit"] });
  execFileSync("node", ["tools/pack-sheet.mjs", out, name, "--frame", "128", ...(r.outline ? ["--outline", String(r.outline)] : [])], { stdio: "inherit" });
}
