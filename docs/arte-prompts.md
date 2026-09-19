# Zombie Waves — Art Generation Brief

You are generating the complete sprite set for a top-down (seen from directly above) co-op zombie survival browser game. Work through the asset list below **one image at a time**, in the order given. For every image, output a single file with the exact filename shown.

## Global rules (apply to every image)

1. **Visual style (mandatory):** stylized cartoon game art, chibi proportions with big heads, thick dark outlines, flat cel shading, saturated colors, clean edges. Think "cartoon 3D zombie game" rendered as clean 2D sprites. Keep the style identical across all assets so they look like they belong to the same game.
2. **Camera:** top-down, seen from **directly above** (90°). Not isometric, not 3/4 view.
3. **Facing direction:** anything with a front (characters, zombies, cars, weapons, effects) must **face right** (+X). The game rotates sprites in code.
4. **Background:** transparent PNG. If transparency is not available, use a solid flat magenta background `#FF00FF` with no gradients (it will be keyed out).
5. **Framing:** one subject per image, centered, filling about 80% of a square 1024×1024 canvas (unless a different size is specified). No cropping of the subject.
6. **No ground shadow, no text, no watermark, no borders, no extra objects.** The game adds shadows itself.
7. **Textures** (section 3) are the exception: no magenta background, the whole image is the texture, and it must be **seamless / tileable** (edges match when repeated).

Style block to append to every sprite prompt:

> `stylized cartoon game sprite, top-down view seen from directly above, chibi proportions with big head, thick dark outline, flat cel shading, saturated colors, clean edges, centered, isolated on a transparent background (or solid flat magenta #FF00FF), no ground shadow, no text, no watermark`

Style block for textures:

> `seamless tileable texture, top-down view, stylized cartoon game art, flat cel shading, no shadows, no objects, no text, repeating pattern that matches at all edges`

Style block for UI icons:

> `flat cartoon game icon, thick dark outline, cel shading, centered, isolated on a transparent background (or solid flat magenta #FF00FF), no text`

---

## 1. Player characters (4 images)

| Filename | Prompt |
|---|---|
| `player_1.png` | Top-down view of a cartoon survivor wearing a yellow hard hat with a headlamp, orange safety vest, blue jeans, holding an assault rifle with both hands extended forward, facing right, seen from directly above. + style block |
| `player_2.png` | Top-down view of a cartoon police officer with a blue shirt and cap, holding a pump shotgun with both hands extended forward, facing right, seen from directly above. + style block |
| `player_3.png` | Top-down view of a cartoon woman survivor with a green jacket, ponytail and red bandana, holding a submachine gun with both hands extended forward, facing right, seen from directly above. + style block |
| `player_4.png` | Top-down view of a cartoon man in a black suit and sunglasses, holding a pistol with both hands extended forward, facing right, seen from directly above. + style block |

## 2. Zombies (3 images)

| Filename | Prompt |
|---|---|
| `zombie_walker.png` | Top-down view of a cartoon zombie with green skin, torn blue shirt, both arms reaching forward, open mouth, facing right, seen from directly above. + style block |
| `zombie_runner.png` | Top-down view of a skinny, fast cartoon zombie with pale yellow-green skin, torn orange clothes, arms reaching forward in a lunging pose, facing right, seen from directly above. + style block |
| `zombie_tank.png` | Top-down view of a huge, bulky cartoon zombie with purple-gray skin, a metal armor plate strapped to its back, massive arms reaching forward, facing right, seen from directly above. + style block |

## 3. Ground and surface textures (seamless, 1024×1024, no magenta)

| Filename | Prompt |
|---|---|
| `ground_grass.png` | Seamless tileable top-down cartoon grass texture, medium green, subtle blades and lighter patches. + texture style block |
| `ground_asphalt.png` | Seamless tileable top-down cartoon dark asphalt texture, subtle grain and small cracks, no road markings. + texture style block |
| `ground_concrete.png` | Seamless tileable top-down cartoon light gray concrete paving texture, subtle slab joints. + texture style block |
| `ground_dirt.png` | Seamless tileable top-down cartoon brown dirt texture with small pebbles. + texture style block |
| `roof_red.png` | Seamless tileable top-down cartoon red roof shingles texture, overlapping rows. + texture style block |
| `roof_gray.png` | Seamless tileable top-down cartoon gray slate roof shingles texture, overlapping rows. + texture style block |
| `roof_brown.png` | Seamless tileable top-down cartoon brown wooden roof shingles texture, overlapping rows. + texture style block |
| `wall_brick.png` | Seamless tileable top-down cartoon red brick texture (top of a brick wall seen from above). + texture style block |

## 4. Vehicles and large props

| Filename | Prompt |
|---|---|
| `car_red.png` | Top-down view of a cartoon compact car, red paint, windshield and roof visible, facing right, seen from directly above. + style block |
| `car_blue.png` | Same as above, blue paint. + style block |
| `car_green.png` | Same as above, green paint. + style block |
| `car_white.png` | Same as above, white paint. + style block |
| `tree_big.png` | Top-down view of a big round cartoon tree canopy seen from directly above, lush green leaves with lighter highlights. + style block |
| `tree_small.png` | Top-down view of a smaller, rounder cartoon tree canopy seen from directly above, lighter green. + style block |
| `bush.png` | Top-down view of a small round cartoon bush seen from directly above. + style block |
| `fountain.png` | Top-down view of a round cartoon stone fountain with blue water, seen from directly above. + style block |

## 5. Small props and decoration

| Filename | Prompt |
|---|---|
| `crate.png` | Top-down view of a cartoon wooden crate seen from directly above. + style block |
| `barrel.png` | Top-down view of a cartoon blue metal barrel with rings, seen from directly above. + style block |
| `sandbags.png` | Top-down view of a short horizontal row of cartoon sandbags seen from directly above, facing right. + style block |
| `fence_white.png` | Top-down view of a straight horizontal segment of white picket fence seen from directly above. + style block |
| `lamp_post.png` | Top-down view of a cartoon street lamp post seen from directly above: pole base at the center, arm and glowing lamp head extending to the right. + style block |
| `mailbox.png` | Top-down view of a cartoon American mailbox on a post, seen from directly above, facing right. + style block |
| `hydrant.png` | Top-down view of a red cartoon fire hydrant seen from directly above. + style block |
| `cone.png` | Top-down view of an orange cartoon traffic cone seen from directly above. + style block |
| `rock.png` | Top-down view of a cartoon gray rock seen from directly above. + style block |
| `tires.png` | Top-down view of a small stack of cartoon tires seen from directly above. + style block |

## 6. Effects

| Filename | Prompt |
|---|---|
| `blood_splat.png` | Cartoon dark red blood splatter seen from above, stylized and flat. + style block |
| `muzzle_flash.png` | Cartoon muzzle flash, yellow and white, pointing right, stylized flat game sprite. + style block |
| `bullet.png` | Small cartoon bullet tracer, glowing yellow capsule, pointing right, stylized flat game sprite. + style block |

## 7. UI icons (512×512)

| Filename | Prompt |
|---|---|
| `icon_heart.png` | Red heart icon. + icon style block |
| `icon_money.png` | Stack of green dollar bills icon. + icon style block |
| `icon_skull.png` | White cartoon skull icon. + icon style block |
| `icon_pistol.png` | Pistol icon, side view, pointing right. + icon style block |
| `icon_smg.png` | Submachine gun icon, side view, pointing right. + icon style block |
| `icon_shotgun.png` | Pump shotgun icon, side view, pointing right. + icon style block |
| `icon_rifle.png` | Assault rifle icon, side view, pointing right. + icon style block |
| `icon_vest.png` | Bulletproof vest icon. + icon style block |
| `icon_speed.png` | Running boots with speed lines icon. + icon style block |
| `icon_damage.png` | Bullet with impact star icon. + icon style block |
| `icon_firerate.png` | Three bullets in a row with motion lines icon. + icon style block |
| `icon_hp.png` | Heart with a plus sign icon. + icon style block |

## 8. Menu art

| Filename | Prompt |
|---|---|
| `logo.png` | Game logo with the text "ZOMBIE WAVES" in cartoon horror lettering, green slime dripping from the letters, thick outline, isolated on a transparent (or solid magenta #FF00FF) background, 1536×512. |
| `menu_bg.png` | Night suburban street after a zombie outbreak, cartoon 3D style, rain, glowing street lamps, an abandoned car, wooden houses with lit windows, wide 16:9 illustration (1920×1080), no characters, no text. |

---

## Generation order

1. `zombie_walker.png` and `player_1.png` first (style validation).
2. Remaining zombies and player characters.
3. Vehicles, trees, bush, fountain.
4. Ground, roof and wall textures.
5. Small props, effects, UI icons.
6. Logo and menu background.

Output every file as PNG with the exact filename listed. Do not merge several assets into one image.
