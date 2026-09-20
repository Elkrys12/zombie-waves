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

En `client/src/scenes/BootScene.ts`:
- añade la hoja a `SHEETS` (`["proto", "obrero"]`),
- asigna el personaje a un jugador en `PLAYER_LOOKS` (`{ image: "player_1_base", sheet: "obrero" }`).

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
