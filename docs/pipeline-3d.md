# Pipeline 3D → sprites animados

Los personajes y zombies se modelan/animan en 3D y se convierten automáticamente en hojas de sprites
cenitales con look cartoon (sombreado por pasos + contornos negros). El juego los reproduce con
animaciones reales (reposo, andar, apuntar, disparar, morir) y los gira hacia donde apuntas, así que
**solo hace falta renderizar una dirección** (mirando a la derecha).

```
modelo.glb / .fbx  ──►  tools/blender/render_sprites.py  ──►  frames PNG  ──►  tools/pack-sheet.mjs  ──►  client/public/assets/sprites/<nombre>.png + .json
```

Todo en un paso: `node assets3d/render.mjs <nombre>` (usa Blender en modo consola; no hace falta abrirlo).

## Requisitos
- **Blender** (gratis). Ya hay una copia portable en `C:\Users\yarie\tools\blender-5.2.2-windows-x64\`.
  Si lo instalas en otro sitio, define la variable de entorno `BLENDER` con la ruta a `blender.exe`.
- Node (ya lo tienes).

## Cómo conseguir un personaje

Tres caminos, de más rápido a más artesanal:

1. **Modelos ya animados (gratis, CC0)**: Kenney *Blocky Characters* (el `proto` actual), Kenney *Mini
   Characters*, Quaternius *Ultimate Animated Character Pack*. Descargas el `.glb`, lo dejas en
   `assets3d/models/` y ya está.
2. **Modelo + Mixamo** (recomendado para el look cartoon de la referencia):
   - Consigue un humanoide cartoon en T-pose (Sketchfab / CGTrader / itch.io, o modelado por ti en Blender).
   - Súbelo a <https://www.mixamo.com> (gratis con cuenta Adobe) → *Auto-Rigger* → coloca los marcadores.
   - Descarga el personaje: **Format FBX, Pose T-pose, With Skin** → `assets3d/models/<nombre>.fbx`.
   - Para cada animación: búscala, ajústala si quieres, y descarga **FBX, Without Skin, 30 fps** con el
     nombre de la animación en `assets3d/anims/<nombre>/`:

     | Archivo | Animación de Mixamo sugerida |
     |---|---|
     | `idle.fbx` | *Idle* / *Standing Idle* |
     | `walk.fbx` | *Walking* (marca **In Place**) |
     | `sprint.fbx` | *Running* (**In Place**) |
     | `holding-right.fbx` | *Pistol Idle* |
     | `holding-right-shoot.fbx` | *Shooting* (pistola) |
     | `holding-both.fbx` | *Rifle Idle* / *Rifle Aiming Idle* |
     | `holding-both-shoot.fbx` | *Firing Rifle* |
     | `die.fbx` | *Dying* / *Death From Front* |
     | Zombies: `walk.fbx`, `sprint.fbx`, `attack.fbx`, `die.fbx` | *Zombie Walk*, *Zombie Running*, *Zombie Attack*, *Zombie Death* |

   - Añade el personaje en `assets3d/render.mjs`:
     ```js
     obrero: { model: "assets3d/models/obrero.fbx", anims: "assets3d/anims/obrero", yaw: 90 },
     ```
   - Formato del FBX: **binario, 7.4 o superior** (lo que saca Mixamo por defecto). Blender no abre FBX
     ASCII ni 6.1. Si la escala llega mal (modelos de 1 cm), `height: 1.5` lo corrige.
3. **Modelado propio en Blender**: cualquier `.blend` con armadura y acciones nombradas como arriba.

> **Consejo de estilo**: modelos con colores planos (sin texturas fotográficas), cabeza grande y
> proporciones chibi. El sombreado por pasos y el contorno negro los pone el script.

## Renderizar

```bash
node assets3d/render.mjs obrero        # renderiza + empaqueta un personaje
node assets3d/render.mjs               # todos los de la lista
```

Parámetros útiles (en `assets3d/render.mjs` o directamente en `render_sprites.py`):
- `yaw`: giro para que el modelo **mire a la derecha**. Kenney/Mixamo suelen necesitar `90`.
- `--ppm 110`: píxeles por metro (mismo para todos: misma escala en el juego).
- `--step 2`: 1 de cada 2 frames (animaciones a 30 fps → 15 fps; a 24 → 12).
- `--outline 2.5`: grosor del contorno.

Los frames intermedios quedan en `assets3d/renders/<nombre>/` (fuera de git); el resultado en
`client/public/assets/sprites/<nombre>.png` + `.json`.

## Conectar al juego

Añade el personaje a `MODELS` en `shared/src/index.ts`: id (nombre de la hoja), nombre visible en el
lobby y `hand` (dónde sujeta el arma, en px del mundo: `x` hacia delante, `pistolY`/`rifleY` hacia su
derecha). El cliente carga todas las hojas de `MODELS` y el jugador elige el suyo en el lobby.

El juego elige la animación por estado (`die`, `holding-*-shoot` al disparar, `walk` al moverse,
`holding-right`/`holding-both` según el arma, `idle`). Los nombres de acción anteriores son los que espera.

## Personalización (capas)

Para que el jugador pueda elegir colores y accesorios, el personaje se renderiza **por capas**: cada
capa es un grupo de objetos del modelo que se renderiza solo, y las marcadas `:white` se renderizan en
blanco para tintarlas en el juego. Ejemplo (prototipo):

```js
layers: "pants=leg-left,leg-right:white;shirt=torso:white;skin=head,arm-left,arm-right:white;hair=hair:white;hat_cap=hat_cap,hat_cap_brim:white;glasses=glasses,glasses_l,glasses_r",
```

Nombres que entiende el juego: `skin`, `shirt`, `pants`, `hair` (tintables), `hat_<nombre>` (visible
si el jugador eligió esa gorra; los nombres válidos están en `HATS` de `shared`), `glasses` o
`glasses_<nombre>`. El orden de la lista es el orden de dibujo (de abajo arriba).

En tus modelos de Blender basta con nombrar los objetos por pieza (`torso`, `leg_left`, `hat_cap`…) y
listar las capas en `assets3d/render.mjs`. Para añadir una gorra nueva: objeto `hat_beanie` en el
modelo, capa `hat_beanie=hat_beanie:white` y el nombre `"beanie"` en `HATS`.

## Malla única con textura (Sketchfab, IA): el soldado

Muchos modelos descargados vienen como **una sola malla con la textura horneada** (sin piezas ni
materiales). Aun así se pueden separar por capas usando los pesos de los huesos, y el resultado
sirve para tintar chaqueta y pantalón. Receta del `soldado` en `assets3d/render.mjs`:

```js
soldado: {
  model: "assets3d/models/personaje.fbx", anims: "assets3d/anims/personaje", yaw: 90, height: 1.5,
  texture: "assets3d/models/personaje_tex/personaje_color_2k.png", normals: "recalc",
  split: "head=Head,HeadTop_End,Neck;hands=LeftHand*,RightHand*;feet=LeftFoot,LeftToeBase,RightFoot,RightToeBase;shirt=Spine*,LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm;pants=Hips,LeftUpLeg,LeftLeg,RightUpLeg,RightLeg",
  layers: "feet=feet;pants=pants:tint;shirt=shirt:tint;hands=hands;head=head",
  render: { size: 512, ppm: 220, lines: "none", gamma: 0.6, outline: 1.3 },
},
```

- `texture`: el FBX de Mixamo pierde la textura; se vuelve a aplicar la del zip original (a 2K basta).
- `normals: "recalc"`: por si el modelo llega con normales rotas.
- `split`: cada cara va a la parte del hueso que más pesa en sus vértices (nombres de Mixamo sin el
  prefijo `mixamorig:`, con `*` al final como comodín). Las partes son objetos nuevos para `layers`.
- `:tint` en una capa: la textura se convierte a gris claro conservando costuras y pliegues, y el
  juego la colorea. Lo que no es tintable (casco, guantes, botas) conserva su textura.
- `render`: las mallas densas (30k+ vértices) no se llevan bien con las líneas de Freestyle (a 256 px
  las aristas lo ennegrecen todo). Se renderiza a 512 px sin líneas y el contorno lo añade
  `pack-sheet` por dilatación del alfa (`outline`, px a tamaño final). `gamma: 0.6` aclara texturas
  muy oscuras para que el toon tenga bandas visibles.

Las capas se renderizan con el resto del personaje como *holdout* (recorta pero no se ve), así cada
capa sale ya tapada por lo que tiene encima (casco sobre hombros, manos sobre el torso) y encajan
como el render completo. Los accesorios `:optional` (gorra, gafas) no recortan a las demás capas,
porque el jugador puede quitarlos.

Limitaciones de este tipo de modelo: no hay piel/pelo que tintar si va tapado, y lo que está
modelado (casco, máscara) no se puede quitar. El panel del lobby solo muestra las opciones que
existen como capas en la hoja (`skin`, `shirt`, `pants`, `hair`, `hat_*`, `glasses`).

Licencia: apunta autor y licencia del modelo de Sketchfab en el README (créditos).
