"""
Renderiza un personaje 3D animado a sprites cenitales con look cartoon (toon + contornos).

Uso (modo consola de Blender):
  blender -b --python tools/blender/render_sprites.py -- --model ruta/modelo.glb --out salida/nombre \
      [--actions idle,walk,die] [--yaw 0] [--ppm 110] [--size 256] [--step 1] [--fps 12] [--outline 2.5]

  --model   .glb/.gltf/.fbx/.blend
  --actions animaciones a renderizar (por defecto todas las que tenga el modelo)
  --yaw     giro en grados del modelo para que MIRE A LA DERECHA (+X) en la imagen
  --ppm     píxeles por metro (mismo valor para todos los personajes = misma escala en el juego)
  --size    lado del frame en píxeles (el personaje se centra en el frame)
  --step    renderizar 1 de cada N frames de la animación
  --fps     fps de reproducción que se escribe en meta.json
  --outline grosor del contorno negro (Freestyle) en píxeles
  --anims   carpeta con un FBX por animación (flujo Mixamo: "sin piel"); cada archivo se convierte
            en una acción con el nombre del archivo (walk.fbx -> walk) aplicada a la armadura del modelo
  --layers  render por capas para personalización: "capa=obj1,obj2[:white];capa2=..."; cada capa se
            renderiza sola (el resto oculto) en <out>/<capa>/. Con ":white" el material pasa a blanco
            para poder tintarla en el juego (piel, camiseta, pantalón, pelo).
  --extras  "blocky": añade pelo, gorra y gafas de primitivas al modelo (para el prototipo de Kenney)

Salida: <out>/<accion>_0001.png ... y <out>/meta.json con frames por acción, fps y escala.
"""
import bpy
import json
import math
import os
import sys

# ------------------------------------------------------------------ argumentos

def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opts = {"actions": None, "yaw": 0.0, "ppm": 110.0, "size": 256, "step": 1, "fps": 12, "outline": 2.5, "light_yaw": -35.0}
    i = 0
    while i < len(argv):
        k = argv[i].lstrip("-")
        v = argv[i + 1] if i + 1 < len(argv) else None
        if k == "actions":
            opts["actions"] = [a.strip() for a in v.split(",") if a.strip()]
        elif k in ("yaw", "ppm", "outline", "light_yaw"):
            opts[k] = float(v)
        elif k in ("size", "step", "fps"):
            opts[k] = int(v)
        elif k == "layers":
            opts["layers"] = []
            for part in v.split(";"):
                if not part.strip():
                    continue
                lname, rest = part.split("=", 1)
                white = rest.endswith(":white")
                objs = [o.strip() for o in rest.replace(":white", "").split(",") if o.strip()]
                opts["layers"].append({"name": lname.strip(), "objects": objs, "white": white})
        else:
            opts[k] = v
        i += 2
    if "model" not in opts or "out" not in opts:
        raise SystemExit("faltan --model y --out")
    return opts

# ------------------------------------------------------------------ importar

def load_model(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".blend":
        bpy.ops.wm.open_mainfile(filepath=path)
        return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        raise SystemExit(f"formato no soportado: {ext}")


def import_anim_folder(dirpath):
    """Flujo Mixamo: el modelo base trae la armadura; cada FBX de la carpeta aporta una animación."""
    base = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    if base is None:
        raise SystemExit("--anims requiere que el modelo tenga armadura")
    if base.animation_data is None:
        base.animation_data_create()
    for f in sorted(os.listdir(dirpath)):
        if not f.lower().endswith(".fbx"):
            continue
        name = os.path.splitext(f)[0]
        before_objs = set(bpy.data.objects)
        before_acts = set(bpy.data.actions)
        bpy.ops.import_scene.fbx(filepath=os.path.join(dirpath, f), use_anim=True)
        new_acts = [a for a in bpy.data.actions if a not in before_acts]
        for a in new_acts:
            a.name = name
            a.use_fake_user = True
        for o in [o for o in bpy.data.objects if o not in before_objs]:
            bpy.data.objects.remove(o, do_unlink=True)
        print(f"[anims] {name}: {len(new_acts)} acción(es)")


def animated_objects():
    return [o for o in bpy.data.objects if o.animation_data]


def available_actions():
    """Nombres de animación: pistas NLA (glTF) o acciones de armadura (FBX)."""
    names = []
    for o in animated_objects():
        for t in o.animation_data.nla_tracks:
            if t.name not in names:
                names.append(t.name)
    if not names:
        names = [a.name for a in bpy.data.actions]
    return names


def activate_action(name):
    """Deja sonando solo la animación `name` y devuelve (frame_ini, frame_fin)."""
    start, end = None, None
    for o in animated_objects():
        ad = o.animation_data
        found = False
        for t in ad.nla_tracks:
            t.mute = t.name != name
            if t.name == name:
                found = True
                for s in t.strips:
                    start = s.frame_start if start is None else min(start, s.frame_start)
                    end = s.frame_end if end is None else max(end, s.frame_end)
        if ad.nla_tracks:
            ad.action = None  # que mande el NLA, no una acción activa
        elif not found:
            # Sin NLA: asignar la acción por nombre (típico de FBX / Mixamo)
            act = bpy.data.actions.get(name)
            if act is not None:
                ad.action = act
                start, end = act.frame_range
    if start is None:
        act = bpy.data.actions.get(name)
        if act is None:
            return None
        start, end = act.frame_range
    return int(round(start)), int(round(end))

# ------------------------------------------------------------------ escena

def setup_scene(opts):
    scene = bpy.context.scene
    # Motor y fondo transparente
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = opts["size"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.compression = 50
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 16

    # Cámara cenital ortográfica centrada en el origen; el frame abarca size/ppm metros
    cam_data = bpy.data.cameras.new("SpriteCam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = opts["size"] / opts["ppm"]
    cam_data.clip_start = 0.1
    cam_data.clip_end = 100
    cam = bpy.data.objects.new("SpriteCam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (0, 0, 20)
    cam.rotation_euler = (0, 0, 0)  # mira hacia -Z; arriba de la imagen = +Y, derecha = +X
    scene.camera = cam

    # Luz principal (sol) inclinada para que el toon tenga zonas de luz y sombra, y relleno suave
    sun_data = bpy.data.lights.new("Sun", type="SUN")
    sun_data.energy = 4.0
    sun_data.angle = math.radians(2)
    sun = bpy.data.objects.new("Sun", sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(38), 0, math.radians(opts["light_yaw"]))
    scene.world = bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (1, 1, 1, 1)
        bg.inputs[1].default_value = 0.35

    # Contornos negros
    scene.render.use_freestyle = True
    scene.render.line_thickness_mode = "ABSOLUTE"
    scene.render.line_thickness = opts["outline"]
    vl = bpy.context.view_layer
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    fs.crease_angle = math.radians(120)
    for ls in list(fs.linesets):
        fs.linesets.remove(ls)
    ls = fs.linesets.new("outline")
    ls.select_silhouette = True
    ls.select_border = True
    ls.select_crease = True
    ls.select_material_boundary = True
    ls.linestyle.color = (0.04, 0.03, 0.05)
    ls.linestyle.thickness = opts["outline"]


def add_blocky_extras():
    """Pelo, gorra y gafas hechos con primitivas y emparentados a la cabeza del personaje de Kenney."""
    head = bpy.data.objects.get("head")
    if head is None:
        print("[extras] no hay objeto 'head'; se omiten los accesorios")
        return
    # Cabeza algo más pequeña para que desde arriba asomen hombros (camiseta) y pies (pantalón)
    head.scale = tuple(head.scale[i] * f for i, f in enumerate((0.68, 0.68, 0.85)))
    bpy.context.view_layer.update()
    d = head.dimensions
    hc = head.matrix_world.translation
    top = hc.z + d.z / 2
    front = hc.y - d.y / 2  # el modelo mira a -Y
    hw = d.x / 2

    def make(name, primitive, color, **kw):
        primitive(**kw)
        o = bpy.context.active_object
        o.name = name
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = color
        o.data.materials.append(mat)
        o.parent = head
        o.matrix_parent_inverse = head.matrix_world.inverted()
        return o

    # Pelo: disco plano sobre la cabeza
    make("hair", bpy.ops.mesh.primitive_cylinder_add, (1, 1, 1, 1), radius=hw * 0.92, depth=0.06, location=(hc.x, hc.y, top + 0.03))
    # Gorra: copa + visera hacia delante
    make("hat_cap", bpy.ops.mesh.primitive_cylinder_add, (1, 1, 1, 1), radius=hw * 1.08, depth=0.1, location=(hc.x, hc.y, top + 0.08))
    make("hat_cap_brim", bpy.ops.mesh.primitive_cube_add, (1, 1, 1, 1), size=1, location=(hc.x, front - 0.16, top + 0.06), scale=(hw * 1.8, 0.32, 0.04))
    # Gafas: montura frontal + patillas
    make("glasses", bpy.ops.mesh.primitive_cube_add, (0.08, 0.08, 0.1, 1), size=1, location=(hc.x, front - 0.03, hc.z + 0.1), scale=(hw * 1.9, 0.06, 0.1))
    make("glasses_l", bpy.ops.mesh.primitive_cube_add, (0.08, 0.08, 0.1, 1), size=1, location=(hc.x - hw - 0.02, front + hw * 0.5, hc.z + 0.1), scale=(0.04, hw * 1.1, 0.05))
    make("glasses_r", bpy.ops.mesh.primitive_cube_add, (0.08, 0.08, 0.1, 1), size=1, location=(hc.x + hw + 0.02, front + hw * 0.5, hc.z + 0.1), scale=(0.04, hw * 1.1, 0.05))
    print("[extras] pelo, gorra y gafas añadidos")


def whiten_objects(names):
    """Sustituye los materiales de esos objetos por blanco liso (base tintable en el juego)."""
    white = bpy.data.materials.new("LayerWhite")
    white.use_nodes = True
    white.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (1, 1, 1, 1)
    for n in names:
        o = bpy.data.objects.get(n)
        if o is None or o.type != "MESH":
            continue
        o.data.materials.clear()
        o.data.materials.append(white)


def toonify_materials():
    """Convierte cada material en sombreado plano por pasos (cel shading) conservando su color base."""
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            mat.use_nodes = True
        nt = mat.node_tree
        principled = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        output = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
        if output is None:
            continue
        # Color base: Principled > Emisión > cualquier textura de imagen; enlace (textura) o valor fijo
        base_link, base_value = None, (0.8, 0.8, 0.8, 1)
        source = principled.inputs["Base Color"] if principled is not None else None
        if source is None:
            emis = next((n for n in nt.nodes if n.type == "EMISSION"), None)
            source = emis.inputs["Color"] if emis is not None else None
        if source is not None:
            base_value = tuple(source.default_value)
            if source.is_linked:
                base_link = source.links[0].from_socket
        if base_link is None:
            tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image is not None), None)
            if tex is not None:
                base_link = tex.outputs["Color"]

        diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
        diffuse.inputs["Color"].default_value = (1, 1, 1, 1)
        to_rgb = nt.nodes.new("ShaderNodeShaderToRGB")
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.interpolation = "CONSTANT"
        el = ramp.color_ramp.elements
        el[0].position, el[0].color = 0.0, (0.52, 0.5, 0.58, 1)   # sombra (ligeramente fría)
        el[1].position, el[1].color = 0.42, (0.82, 0.82, 0.84, 1)  # medio
        e2 = el.new(0.68)
        e2.color = (1.0, 1.0, 1.0, 1)                              # luz
        mult = nt.nodes.new("ShaderNodeMix")
        mult.data_type = "RGBA"
        mult.blend_type = "MULTIPLY"
        mult.inputs["Factor"].default_value = 1.0
        emission = nt.nodes.new("ShaderNodeEmission")
        emission.inputs["Strength"].default_value = 1.0

        nt.links.new(diffuse.outputs["BSDF"], to_rgb.inputs["Shader"])
        nt.links.new(to_rgb.outputs["Color"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], mult.inputs[6])  # A
        if base_link is not None:
            nt.links.new(base_link, mult.inputs[7])  # B
        else:
            mult.inputs[7].default_value = base_value
        nt.links.new(mult.outputs[2], emission.inputs["Color"])
        for l in list(output.inputs["Surface"].links):
            nt.links.remove(l)
        nt.links.new(emission.outputs["Emission"], output.inputs["Surface"])


RIG_NAME = "SpriteRig"
FOLLOW = {"target": None}


def root_object():
    """Objeto cuya posición sigue la cámara: el hijo animado del soporte (o el soporte)."""
    return FOLLOW["target"]


def orient_model(yaw_deg):
    """Cuelga el modelo de un vacío y gira ese vacío: así la rotación no la pisa ninguna animación."""
    scene = bpy.context.scene
    rig = bpy.data.objects.new(RIG_NAME, None)
    scene.collection.objects.link(rig)
    tops = [o for o in bpy.data.objects if o.parent is None and o.name not in ("SpriteCam", "Sun", RIG_NAME)]
    for o in tops:
        o.parent = rig
        o.matrix_parent_inverse = rig.matrix_world.inverted()
    rig.rotation_euler = (0, 0, math.radians(yaw_deg))

    # Objetivo de seguimiento: el objeto animado con más pistas (raíz de la animación) o el soporte
    animated = [o for o in bpy.data.objects if o.animation_data and o.name != RIG_NAME]
    animated.sort(key=lambda o: -len(o.animation_data.nla_tracks))
    FOLLOW["target"] = animated[0] if animated else rig

# ------------------------------------------------------------------ render

def set_layer_visibility(layer):
    """Deja visibles para el render solo los objetos de la capa (None = todos)."""
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        o.hide_render = layer is not None and o.name not in layer["objects"]


def render_all(opts):
    layers = opts.get("layers")
    if not layers:
        render_pass(opts, opts["out"], None)
        return
    for layer in layers:
        set_layer_visibility(layer)
        render_pass(opts, os.path.join(opts["out"], layer["name"]), layer)
    with open(os.path.join(opts["out"], "layers.json"), "w", encoding="utf-8") as fh:
        json.dump([{"name": l["name"], "tintable": l["white"]} for l in layers], fh, indent=2)


def render_pass(opts, out, layer):
    scene = bpy.context.scene
    os.makedirs(out, exist_ok=True)
    names = opts["actions"] or available_actions()
    meta = {"size": opts["size"], "ppm": opts["ppm"], "fps": opts["fps"], "actions": {}}
    tag = f" [{layer['name']}]" if layer else ""

    for name in names:
        rng = activate_action(name)
        if rng is None:
            print(f"[render] acción no encontrada: {name}")
            continue
        start, end = rng
        frames = list(range(start, end + 1, opts["step"]))
        # Evitar frame duplicado al cerrar el ciclo (el último suele igualar al primero)
        if len(frames) > 2 and end - start >= 4 and (end - start) % opts["step"] == 0:
            frames = frames[:-1]
        print(f"[render]{tag} {name}: frames {start}-{end} -> {len(frames)} imágenes")
        root = root_object()
        for i, f in enumerate(frames):
            scene.frame_set(f)
            # La cámara sigue a la raíz: las animaciones con desplazamiento (andar) quedan centradas
            if root is not None:
                loc = root.matrix_world.translation
                scene.camera.location = (loc.x, loc.y, 20)
            scene.render.filepath = os.path.join(out, f"{name}_{i + 1:04d}.png")
            bpy.ops.render.render(write_still=True)
        meta["actions"][name] = {"frames": len(frames), "loop": name not in ("die", "death", "hit")}

    with open(os.path.join(out, "meta.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2)
    print("[render] listo:", out)


if __name__ == "__main__":
    opts = parse_args()
    load_model(opts["model"])
    if opts.get("anims"):
        import_anim_folder(opts["anims"])
    if opts.get("extras") == "blocky":
        add_blocky_extras()
    for layer in opts.get("layers") or []:
        if layer["white"]:
            whiten_objects(layer["objects"])
    setup_scene(opts)
    toonify_materials()
    orient_model(opts["yaw"])
    render_all(opts)
