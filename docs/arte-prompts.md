# Zombie Waves — prompts de arte (uno por mensaje)

## Cómo trabajar con el generador (importante)

1. **No le pases este archivo.** Los modelos se pierden con listas largas.
2. Genera primero la **imagen de referencia de estilo** (paso 1). Guárdala como `estilo.png`.
3. Para cada asset abre un mensaje nuevo, **adjunta `estilo.png`** y pega **solo** el prompt de esa fila. Cada prompt ya es completo por sí mismo.
4. Mira el resultado. Si la vista no es cenital, vuelve a pedirlo añadiendo: `orthographic bird's-eye view, camera pointing straight down, only the top of the head and shoulders are visible`.
5. Guarda el PNG con el **nombre exacto** en `client/public/assets/custom/`.
6. Empieza por `zombie_walker.png` y `player_1.png`; cuando te gusten, sigue con el resto.

Si el generador no da fondo transparente, cambia en el prompt `transparent background` por `solid flat magenta background #FF00FF` (yo lo quito).

---

## Paso 1 — Imagen de referencia de estilo (`estilo.png`)

Adjunta `referencia.webp` (la de la raíz del proyecto) y pega:

```
Create a style reference sheet for a 2D top-down zombie game, matching the cartoon look of the attached image (big heads, thick dark outlines, flat cel shading, saturated colors). Show, seen from directly above (bird's-eye view, camera pointing straight down): one survivor with a yellow hard hat holding a rifle, one green zombie with arms reaching forward, one red car, and one round tree canopy. All facing right, evenly spaced on a plain light gray background, no text.
```

---

## Paso 2 — Prompts individuales

Cada línea es un mensaje. Siempre con `estilo.png` adjunto.

### Personajes

**`player_1.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye, camera pointing straight down): a cartoon survivor with a yellow hard hat with headlamp, orange safety vest, blue jeans, holding an assault rifle with both hands extended forward, facing right. Big head, thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

**`player_2.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye, camera pointing straight down): a cartoon police officer with a blue shirt and cap, holding a pump shotgun with both hands extended forward, facing right. Big head, thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

**`player_3.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye, camera pointing straight down): a cartoon woman survivor with a green jacket, ponytail and red bandana, holding a submachine gun with both hands extended forward, facing right. Big head, thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

**`player_4.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye, camera pointing straight down): a cartoon man in a black suit and sunglasses, holding a pistol with both hands extended forward, facing right. Big head, thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

### Zombies

**`zombie_walker.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye, camera pointing straight down): a cartoon zombie with green skin, torn blue shirt, both arms reaching forward, open mouth, facing right. Big head, thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

**`zombie_runner.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye, camera pointing straight down): a skinny fast cartoon zombie with pale yellow-green skin, torn orange clothes, arms reaching forward in a lunging pose, facing right. Big head, thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

**`zombie_tank.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye, camera pointing straight down): a huge bulky cartoon zombie with purple-gray skin, a metal armor plate strapped to its back, massive arms reaching forward, facing right. Big head, thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

### Vehículos, árboles y objetos grandes

**`car_red.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye, camera pointing straight down): a cartoon compact car with red paint, windshield and roof visible, facing right. Thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

**`car_blue.png`** — el mismo prompt cambiando `red paint` por `blue paint`.
**`car_green.png`** — igual con `green paint`.
**`car_white.png`** — igual con `white paint`.

**`tree_big.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye): a big round cartoon tree canopy, lush green leaves with lighter highlights. Thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

**`tree_small.png`** — el mismo prompt con `a smaller, rounder cartoon tree canopy, lighter green`.

**`bush.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye): a small round cartoon bush. Thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

**`fountain.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye): a round cartoon stone fountain with blue water. Thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

### Objetos pequeños

Plantilla (cambia solo la parte en mayúsculas):
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye, camera pointing straight down): OBJETO. Thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```

| Archivo | OBJETO |
|---|---|
| `crate.png` | `a cartoon wooden crate` |
| `barrel.png` | `a cartoon blue metal barrel with rings` |
| `sandbags.png` | `a short horizontal row of cartoon sandbags, facing right` |
| `fence_white.png` | `a straight horizontal segment of white picket fence` |
| `lamp_post.png` | `a cartoon street lamp post: pole base at the center, arm and glowing lamp head extending to the right` |
| `mailbox.png` | `a cartoon American mailbox on a post, facing right` |
| `hydrant.png` | `a red cartoon fire hydrant` |
| `cone.png` | `an orange cartoon traffic cone` |
| `rock.png` | `a cartoon gray rock` |
| `tires.png` | `a small stack of cartoon tires` |

### Efectos

**`blood_splat.png`**
```
Same art style as the attached reference. Single flat game sprite seen from above: a cartoon dark red blood splatter. Thick dark outline. Centered, transparent background, no text.
```

**`muzzle_flash.png`**
```
Same art style as the attached reference. Single flat game sprite: a cartoon muzzle flash, yellow and white, pointing right. Thick dark outline. Centered, transparent background, no text.
```

**`bullet.png`**
```
Same art style as the attached reference. Single flat game sprite: a small cartoon bullet tracer, glowing yellow capsule, pointing right. Thick dark outline. Centered, transparent background, no text.
```

### Texturas de suelo (repetibles, sin fondo: la imagen entera es la textura)

Plantilla:
```
Same art style as the attached reference. Seamless tileable texture seen from directly above, edges must match when repeated: SUPERFICIE. Stylized cartoon game art, flat cel shading, no shadows, no objects, no text. Square image.
```

| Archivo | SUPERFICIE |
|---|---|
| `ground_grass.png` | `medium green cartoon grass with subtle blades and lighter patches` |
| `ground_asphalt.png` | `dark cartoon asphalt with subtle grain and small cracks, no road markings` |
| `ground_concrete.png` | `light gray cartoon concrete paving with subtle slab joints` |
| `ground_dirt.png` | `brown cartoon dirt with small pebbles` |
| `roof_red.png` | `red cartoon roof shingles in overlapping rows` |
| `roof_gray.png` | `gray slate cartoon roof shingles in overlapping rows` |
| `roof_brown.png` | `brown wooden cartoon roof shingles in overlapping rows` |
| `wall_brick.png` | `red cartoon bricks, the top of a brick wall seen from above` |

### Iconos de interfaz

Plantilla:
```
Same art style as the attached reference. Single flat cartoon game icon: ICONO. Thick dark outline, cel shading. Centered, transparent background, no text.
```

| Archivo | ICONO |
|---|---|
| `icon_heart.png` | `a red heart` |
| `icon_money.png` | `a stack of green dollar bills` |
| `icon_skull.png` | `a white cartoon skull` |
| `icon_pistol.png` | `a pistol, side view, pointing right` |
| `icon_smg.png` | `a submachine gun, side view, pointing right` |
| `icon_shotgun.png` | `a pump shotgun, side view, pointing right` |
| `icon_rifle.png` | `an assault rifle, side view, pointing right` |
| `icon_vest.png` | `a bulletproof vest` |
| `icon_speed.png` | `running boots with speed lines` |
| `icon_damage.png` | `a bullet with an impact star` |
| `icon_firerate.png` | `three bullets in a row with motion lines` |
| `icon_hp.png` | `a heart with a plus sign` |

### Menú

**`logo.png`**
```
Same art style as the attached reference. Game logo with the text "ZOMBIE WAVES" in cartoon horror lettering, green slime dripping from the letters, thick dark outline. Wide image, transparent background, nothing else.
```

**`menu_bg.png`**
```
Same art style as the attached reference. Wide 16:9 illustration: a night suburban street after a zombie outbreak, rain, glowing street lamps, an abandoned car, wooden houses with lit windows. Cartoon style, no characters, no text.
```

---

## Orden recomendado

1. `estilo.png` → 2. `zombie_walker.png`, `player_1.png` (validar) → 3. resto de zombies y personajes → 4. coches, árboles, arbusto, fuente → 5. suelos y tejados → 6. objetos, efectos, iconos → 7. logo y fondo.

---

## Fase 2 — arma intercambiable y cadáveres

### Personajes sin arma (`player_1_base.png` … `player_4_base.png`)
Usa el prompt de cada personaje sustituyendo la parte del arma por:
`both arms extended forward with empty open hands as if holding an invisible rifle, facing right`

### Armas (`weapon_pistol.png`, `weapon_smg.png`, `weapon_shotgun.png`, `weapon_rifle.png`)
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above (bird's-eye): a cartoon ARMA, barrel pointing right, horizontal. Thick dark outline, flat cel shading. Centered, filling the frame, transparent background, no ground shadow, no text.
```
ARMA = `pistol` / `submachine gun` / `pump shotgun` / `assault rifle`.

### Cadáveres

**`zombie_walker_dead.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above: a dead cartoon zombie with green skin and torn blue shirt lying face down on the ground, arms spread, facing right. Thick dark outline, flat cel shading. Centered, transparent background, no text.
```

**`zombie_runner_dead.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above: a dead skinny cartoon zombie with pale yellow-green skin and torn orange clothes lying face down on the ground, arms spread, facing right. Thick dark outline, flat cel shading. Centered, transparent background, no text.
```

**`zombie_tank_dead.png`**
```
Same art style as the attached reference. Single game sprite, top-down view seen from directly above: a dead huge bulky cartoon zombie with purple-gray skin and a metal armor plate on its back lying face down on the ground, massive arms spread, facing right. Thick dark outline, flat cel shading. Centered, transparent background, no text.
```
