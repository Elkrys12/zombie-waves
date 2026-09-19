# Arte propio: lista de imágenes y prompts

Objetivo: estilo cartoon (cabezas grandes, contorno grueso, sombreado plano tipo cel, colores saturados), **vista cenital** (desde arriba), como la referencia pero visto desde el cielo.

## Reglas para que todo encaje

1. **Mismo bloque de estilo en todos los prompts** (cópialo tal cual al final de cada uno):

   > `stylized cartoon game sprite, top-down view seen from directly above, chibi proportions with big head, thick dark outline, flat cel shading, saturated colors, clean edges, centered, isolated on a solid flat magenta background (#FF00FF), no ground shadow, no text, no watermark`

   Si tu herramienta exporta **PNG con transparencia**, usa `transparent background` en vez del magenta. Si no, el magenta liso me sirve: yo lo quito.
2. **Orientación**: todo lo que "mira" a algún lado, **mira a la derecha** (personajes, zombies, coches). El juego los gira.
3. **Tamaño**: genera a 1024×1024 (o lo que dé la herramienta). Yo reduzco. El sujeto debe ocupar ~80 % del cuadro y estar centrado.
4. **Sin sombra en el suelo**: la sombra la pone el juego.
5. **Un solo sujeto por imagen** (nada de hojas con varios).
6. Guarda cada archivo con el **nombre exacto** de la tabla en `client/public/assets/custom/`.
7. Genera primero **un zombie y un personaje**, mándamelos, y cuando el estilo te convenza seguimos con el resto en el mismo estilo (misma herramienta, mismo bloque).

---

## 1. Personajes (4)

| Archivo | Descripción | Prompt (añade el bloque de estilo) |
|---|---|---|
| `player_1.png` | Obrero con casco amarillo (como la referencia), chaleco naranja, rifle | `top-down view of a cartoon survivor wearing a yellow hard hat with headlamp, orange safety vest, blue jeans, holding an assault rifle with both hands extended forward, facing right, seen from directly above` |
| `player_2.png` | Policía, camisa azul, gorra | `top-down view of a cartoon police officer with blue shirt and cap, holding a shotgun with both hands extended forward, facing right, seen from directly above` |
| `player_3.png` | Mujer con chaqueta verde y coleta, bandana | `top-down view of a cartoon woman survivor with green jacket, ponytail and red bandana, holding a submachine gun with both hands extended forward, facing right, seen from directly above` |
| `player_4.png` | Tipo con traje negro y gafas de sol | `top-down view of a cartoon man in black suit and sunglasses, holding a pistol with both hands extended forward, facing right, seen from directly above` |

## 2. Zombies (3)

| Archivo | Descripción | Prompt |
|---|---|---|
| `zombie_walker.png` | Normal: verde, camisa rota azul, brazos hacia delante | `top-down view of a cartoon zombie with green skin, torn blue shirt, both arms reaching forward, open mouth, facing right, seen from directly above` |
| `zombie_runner.png` | Corredor: delgado, piel amarillenta, ropa naranja, postura agresiva | `top-down view of a skinny fast cartoon zombie with pale yellow-green skin, torn orange clothes, arms reaching forward in a lunging pose, facing right, seen from directly above` |
| `zombie_tank.png` | Tanque: enorme, piel morada/gris, placa de metal en la espalda | `top-down view of a huge bulky cartoon zombie with purple-gray skin, metal armor plate strapped on its back, massive arms reaching forward, facing right, seen from directly above` |

## 3. Suelos (texturas repetibles, 4)

Aquí el bloque de estilo cambia: **sin fondo magenta**, la imagen entera es la textura.

| Archivo | Prompt |
|---|---|
| `ground_grass.png` | `seamless tileable top-down cartoon grass texture, stylized game art, flat cel shading, subtle blades and patches, no shadows, no objects, repeating pattern` |
| `ground_asphalt.png` | `seamless tileable top-down cartoon dark asphalt texture, stylized game art, subtle grain and small cracks, no road markings, no shadows, repeating pattern` |
| `ground_concrete.png` | `seamless tileable top-down cartoon light gray concrete paving texture, stylized game art, subtle slab joints, no shadows, repeating pattern` |
| `ground_dirt.png` | `seamless tileable top-down cartoon brown dirt texture, stylized game art, small pebbles, no shadows, repeating pattern` |
| `roof_red.png` | `seamless tileable top-down cartoon red roof shingles texture, stylized game art, overlapping rows, no shadows, repeating pattern` |
| `roof_gray.png` | igual con `gray slate roof shingles` |
| `roof_brown.png` | igual con `brown wooden roof shingles` |
| `wall_brick.png` | `seamless tileable top-down cartoon red brick wall texture seen from above, stylized game art, repeating pattern` |

## 4. Vehículos y objetos grandes

| Archivo | Prompt |
|---|---|
| `car_red.png` | `top-down view of a cartoon compact car, red, seen from directly above, facing right, windshield and roof visible` |
| `car_blue.png` / `car_green.png` / `car_white.png` | igual cambiando el color |
| `tree_big.png` | `top-down view of a round cartoon tree canopy seen from directly above, lush green leaves, stylized` |
| `tree_small.png` | igual, `smaller rounder canopy, lighter green` |
| `bush.png` | `top-down view of a small round cartoon bush seen from directly above` |
| `fountain.png` | `top-down view of a round cartoon stone fountain with blue water seen from directly above` |

## 5. Objetos pequeños / decoración

| Archivo | Prompt |
|---|---|
| `crate.png` | `top-down view of a cartoon wooden crate seen from directly above` |
| `barrel.png` | `top-down view of a cartoon metal barrel seen from directly above, blue with rings` |
| `sandbags.png` | `top-down view of a short row of cartoon sandbags seen from directly above, horizontal, facing right` |
| `fence_white.png` | `top-down view of a straight segment of white picket fence seen from directly above, horizontal` |
| `lamp_post.png` | `top-down view of a cartoon street lamp post seen from directly above, pole base at center and lamp head extending to the right` |
| `mailbox.png` | `top-down view of a cartoon american mailbox seen from directly above, facing right` |
| `hydrant.png` | `top-down view of a red cartoon fire hydrant seen from directly above` |
| `cone.png` | `top-down view of an orange traffic cone seen from directly above` |
| `rock.png` | `top-down view of a cartoon gray rock seen from directly above` |
| `tires.png` | `top-down view of a small stack of cartoon tires seen from directly above` |

## 6. Efectos

| Archivo | Prompt |
|---|---|
| `blood_splat.png` | `cartoon dark red blood splatter seen from above, stylized, flat` |
| `muzzle_flash.png` | `cartoon muzzle flash, yellow and white, pointing right, stylized flat game sprite` |
| `bullet.png` | `small cartoon bullet tracer, yellow glowing capsule, pointing right, stylized flat game sprite` |

## 7. Interfaz (iconos planos, aquí sí puede haber ligero contorno)

Bloque de estilo para iconos: `flat cartoon game icon, thick dark outline, cel shading, centered, isolated on a solid flat magenta background (#FF00FF), no text`

| Archivo | Prompt |
|---|---|
| `icon_heart.png` | `red heart icon` |
| `icon_money.png` | `stack of green dollar bills icon` |
| `icon_skull.png` | `white cartoon skull icon` |
| `icon_pistol.png` / `icon_smg.png` / `icon_shotgun.png` / `icon_rifle.png` | `pistol icon side view` / `submachine gun icon side view` / `pump shotgun icon side view` / `assault rifle icon side view` |
| `icon_vest.png` | `bulletproof vest icon` |
| `icon_speed.png` | `running boots with speed lines icon` |
| `icon_damage.png` | `bullet with impact star icon` |
| `icon_firerate.png` | `three bullets in a row with motion lines icon` |
| `icon_hp.png` | `heart with plus sign icon` |

## 8. Menú (opcional pero luce mucho)

| Archivo | Prompt |
|---|---|
| `logo.png` | `game logo text "ZOMBIE WAVES", cartoon horror style lettering, green slime dripping, thick outline, isolated on solid flat magenta background` (si el texto sale mal, dímelo y lo hago yo con tipografía) |
| `menu_bg.png` | `night suburban street after a zombie outbreak, cartoon 3D style, rain, glowing street lamps, abandoned car, wooden houses, 16:9 illustration, no characters, no text` |

---

## Orden recomendado

1. `zombie_walker.png` + `player_1.png` → me los pasas y validamos estilo.
2. Resto de zombies y personajes.
3. Coches, árboles, arbustos, fuente.
4. Suelos y tejados.
5. Objetos pequeños, efectos e iconos.
6. Logo y fondo del menú.
