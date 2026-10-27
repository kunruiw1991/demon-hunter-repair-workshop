# KPop Demon Hunters Repair Workshop 3D

**Live Demo (GitHub Pages)**: [https://kunruiw1991.github.io/demon-hunter-repair-workshop/](https://kunruiw1991.github.io/demon-hunter-repair-workshop/)

![KPop Demon Hunters Repair Workshop 3D Screenshot](screenshot.jpg)

A standalone, zero-bundler 3D WebGL repair and idol restoration game built with **Three.js r161** (`js/vendor/three.min.js`) for a 5-year-old player. Featuring intricate, high-resolution 3D character models (`34,000–63,600` vertices and `55,000–102,000` triangles per character) of all **10 KPop Demon Hunters characters** — the **3 HUNTR/X Girls**, the **5 Saja Boys**, **Derpy the Blue Minhwa Tiger**, and **Sussie the Six-Eyed Magpie** — complete with an interactive **Stage Idol ↔ Awakened Demon/Spirit Dual Form Toggle**, a 16-tool 3D repair and K-pop restoration clinic, a floating `Toot! 0/10` → `🍄 MEGA Mushroom Toot!` 3D Mushroom-Cloud Mega Fart button, 31 bundled English `edge-tts` voice lines (`en-US-AnaNeural`, `en-US-GuyNeural`, `en-US-ChristopherNeural`), and persistent `localStorage` Honmoon Showcase Stage.

---

## ✨ Key Features

### 1. 10 High-Resolution 3D Characters Across 4 Category Filter Tabs
Every character is procedurally sculpted from high-density organic surfaces (`LatheGeometry` profile lofts, Catmull-Rom tube/ribbon skinning, articulated 5-finger hands, sculpted facial anatomy, and sRGB procedural canvas textures for K-pop satin weave, Korean gold brocade embroidery, woven horsehair *Gat*, cobalt-and-white peony porcelain, and Minhwa folk brush-stroke fur) with `metalness <= 0.22` for vibrant studio lighting:

| Category Tab | ID | Character | Vertices | Triangles | Signature 3D Features & Props |
|---|---|---|---:|---:|---|
| `🎤 HUNTR/X Girls (3)` | `rumi` | **Rumi · Lead Vocal** | 36,672 | 55,340 | Half-demon lead vocalist, 26-segment articulated purple dragon-braid curving to boots, iridescent K-pop crop jacket with gold epaulets, pleated skirt, and **Saingeom** four-tiger sword |
| `🎤 HUNTR/X Girls (3)` | `mira` | **Mira · Main Dancer** | 34,465 | 55,828 | Main dancer with twin-swept hot-pink hair strands, asymmetric K-pop corset with gold waist chains, thigh-high boots, and **Gokdo** crescent polearm |
| `🎤 HUNTR/X Girls (3)` | `zoey` | **Zoey · Maknae Rapper** | 34,392 | 55,256 | Energetic maknae rapper with twin space-buns + fluttering hair ribbons, street-idol bomber jacket, cargo skirt, sneakers, and twin **Shin-kal** spirit throwing knives with tassels |
| `🕺 Saja Boys (5)` | `jinu` | **Jinu · Saja Boys Leader** | 57,407 | 98,124 | Charismatic leader wearing a finely woven translucent black Korean **Gat** horsehair hat with beaded *gatkkeun* chin strap, layered *jeogori* robe & stage coat, silver rings, and 4-stringed **Bipa** lute |
| `🕺 Saja Boys (5)` | `abby` | **Abby · Power Dancer** | 55,727 | 95,016 | Athletic main dancer with sculpted two-tone spiky hair, sleeveless stage vest with metallic cross-straps, sculpted torso/arm anatomy, and fingerless dance gloves |
| `🕺 Saja Boys (5)` | `mystery` | **Mystery · Silver-Haired Vocalist** | 48,989 | 85,024 | Enigmatic vocalist with layered silver-violet bangs sweeping over his eyes, high-collar embroidered silk stage coat, and glowing spirit stand microphone |
| `🕺 Saja Boys (5)` | `romance` | **Romance · Rose Prince** | 52,478 | 87,492 | Wavy rose-pink parted hair, velvet lapel suit with a sculpted 3D rose brooch + floating heart charm, and rose-gold handheld mic |
| `🕺 Saja Boys (5)` | `baby` | **Baby · Street Maknae** | 51,531 | 87,832 | Cute maknae in a plush oversized pastel hoodie, knitted cat-ear beanie, chunky high-top sneakers, and sparkling **Soda Pop** can prop |
| `🐯 Derpy Tiger & Sussie (2)` | `derpy_tiger` | **Derpy · Blue Minhwa Tiger** | 63,640 | 102,076 | Chubby Korean *Minhwa* (`민화`) blue tiger with cerulean/indigo tufted fur, black folk-art stripe reliefs, golden saucer eyes, wide grin with white fangs & curled pink tongue, pink toe-bean paws, ringed tail, and **Blue-and-White Porcelain Peony Flowerpot** |
| `🐯 Derpy Tiger & Sussie (2)` | `sussie_magpie` | **Sussie · Six-Eyed Magpie** | 41,947 | 69,936 | Korean folk magpie with layered black, white, and iridescent-blue feathers, **six glowing golden eyes** (three on each side), sculpted beak & talons, and miniature black **Gat** hat |

### 2. Interactive Dual Form Toggle (`✨ Stage Idol Form` ↔ `🔮 Awakened Form`)
Switch any character on the turntable between their **Golden Honmoon Stage Idol Look** and their **Awakened Demon-Mark / Underworld Saja / Minhwa Spirit Look** at any time — illuminating Rumi's glowing purple demon veins & horns, the Saja Boys' golden demon-slit eyes & underworld soul-flame crown, and Derpy's golden Minhwa spirit cloud nimbus.

### 3. Full 15+ Problem Repair Clinic & 16 Tools
Each visit rolls randomized problems visible as 3D decals/meshes on the character and as clickable chips in `#chips` (clicking any chip smoothly rotates the 3D turntable so the problem spot faces the camera):
- **Mud Splatters** → **Bubble Sponge (`🧽`)** followed by **Warm Dryer (`💨`)** on the Wet Spots
- **Dust & Cobwebs** → **Soft Brush (`🧹`)**
- **Shadow Burrs** → **Tweezers (`🥢`)**
- **Torn Seams** → **Gold-Thread Needle (`🪡`, 4 stitches)**
- **Frizzy Hair & Fur** → **Styling Comb (`🪮`)**
- **Costume Hole** → **Embroidered Patch (`🩹`, 3 presses)**
- **Red Eczema Rash (`🔴`)** → **Moisture Cream (`🧴`)**
- **Wet Pants (`🩲`)** → **Cozy Diaper (`🩲`)** (cleans the wet stain and attaches a tailored 3D white diaper mesh with waistband, front pad, leg cuffs, and side fastener tabs onto the character's pelvis)
- **Cracked Demon Mark (`🔮`)** → **Golden Honmoon Balm (`✨`)** (seals glowing purple cracks into a shimmering golden Honmoon crest)
- **Loose Braid & Gat Hat (`🎀`)** → **Gold-Thread Needle (`🪡`)**
- **Dull Weapon & Tipped Flowerpot (`🗡️` / `🪴`)** → **Polishing Cloth (`🧤`)** (polishes Rumi's Saingeom, Mira's Gokdo, Zoey's Shin-kal, Jinu's Bipa, Baby's Soda Pop, or rights Derpy Tiger's tipped porcelain peony flowerpot with blooming peonies!)
- **Lost Ear-Monitor & Eye Gem (`🔘`)** → **Gem Replacer (`🔘`)**
- **Flat Padding (`☁️`)** → **Cloud Cotton (`☁️`, 4 puffs)**
- **Faded Stage Colors (`🎨`)** → **Idol Airbrush (`🖌️`)**
- **3-Point Rhythm Stethoscope Checkup (`🩺`)** + **Honmoon Heart Wake-Up (`💝`)** triggering joyful K-pop choreography and Derpy's blooming peony celebration.

### 4. Floating `Toot! 0/10` → `🍄 MEGA Mushroom Toot!` 3D Mushroom-Cloud Mega Fart Button
Available throughout repair and dress-up:
- Presses `1..10` emit small 3D green gas puffs, comedic WebAudio fart toots, cute character bounce, and increment the charge bar from `1/10` to `10/10`.
- At `10/10`, the button glows (`🍄 MEGA Mushroom Toot!`), and the **11th press** unleashes a rising 3D mushroom cloud (`stem` column + billowing `cap` dome + expanding ground `shockwave` ring) before resetting to `0/10`.

### 5. Idol Dress-Up, Before/After Photo Card & Persistent Showcase Stage
- Equip 6 K-pop & Korean accessories: **K-pop Lightstick (`🔦`)**, **Golden Honmoon Crown (`👑`)**, **Norigae Charm (`🎀`)**, **Stage Headset (`🎧`)**, **Sunglasses (`🕶️`)**, and **Flower Crown (`🌸`)**.
- View and download the **Before/After Idol Photo Card (`Before / After · Honmoon Star Idol Card`)** and save repaired characters onto the persistent `localStorage` **Honmoon Showcase Stage (`✦ HONMOON SHOWCASE ✦`)**.

### 6. Bundled English `edge-tts` Voices & K-Pop Fusion Audio
- 31 pre-generated English MP3 voice lines (`voices/*.mp3`, indexed in `js/voices/manifest.js`; `en-US-AnaNeural` child narrator for the girls, Baby, Derpy and Sussie, `en-US-GuyNeural` for Jinu and Abby, `en-US-ChristopherNeural` for Mystery and Romance; script in `js/voices/script.json`) for every character greeting, tool milestone, eczema healing, diaper fitting, Honmoon sealing, flowerpot restoration, fart giggle, and celebration — working 100% offline across desktop, iPad, and mobile browsers.
- Paired with procedural WebAudio ASMR tool effects and bundled K-pop / Korean fusion background tracks (`music/*.mp3`).

---

## 🚀 Local Development & Automated E2E Verification

### Run Locally
```bash
python3 -m http.server 8080
# Open http://localhost:8080 in any modern browser
```

### Automated Headless Chrome (`gbrowser`) E2E Suite
```bash
# 1. Run 3D Scene-Graph, Vertex/Triangle, Metalness, Dual Form & Voice Asset Audit
python3 tests/audit_scene.py

# 2. Run Master E2E Suite (Tiers 1–4 across all 10 characters + iPad 1024x768 & Mobile 390x844 layouts)
python3 tests/verify_all.py
```
