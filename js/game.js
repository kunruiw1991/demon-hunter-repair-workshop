// js/game.js — KPop Demon Hunters Repair Workshop 3D (猎魔女团与呆萌蓝虎修复工坊 3D)
// Honmoon stage repair clinic for the 3 HUNTR/X girls, the 5 Saja Boys, Derpy the Blue Minhwa Tiger
// and Sussie the Six-Eyed Magpie: randomized 3D damage decals, 16 tools (surface care + KPop Demon
// Hunters specials + eczema cream + 3D diaper + Honmoon balm + 3-point rhythm stethoscope + wake-up),
// Dual Form HUD toggle, 0/10 -> mushroom-cloud mega fart, dress-up, photo card and a persistent
// localStorage Honmoon Showcase Stage. Exposes window.__REPAIR3D__ (= window.__GAME__) for the E2E suite.

import { VOICE_CLIPS, VOICE_BY_KEY } from './voices/manifest.js';
import {
  CHARACTERS,
  CHARACTER_ORDER,
  CATEGORY_TABS,
  buildCharacter,
  auditCharacter as auditCharacterModel,
  getCharactersByCategory,
  normalizeCategoryKey,
} from './characters/index.js';

const THREE = window.THREE;
const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const clamp01 = (x) => clamp(x, 0, 1);
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const MAX_METALNESS = 0.22;
const std = (o) => {
  const m = new THREE.MeshStandardMaterial(o);
  if (m.metalness > MAX_METALNESS) m.metalness = MAX_METALNESS;
  return m;
};

/* ============================== Data: characters, tools, problems ============================== */
const CHAR_IDS = [...CHARACTER_ORDER];
const GROUP_WHO = {
  huntrx: 'HUNTR/X 猎魔女团',
  saja_boys: 'Saja Boys 狮男团',
  minhwa: '民画福虎与喜鹊',
};
// Reverse lookup: voice clip file -> the exact Mandarin line it speaks (so bubbles match the audio).
const LINE_BY_FILE = Object.fromEntries(Object.entries(VOICE_CLIPS).map(([text, file]) => [file, text]));
const lineFor = (key, fallback = '') => LINE_BY_FILE[VOICE_BY_KEY[key]] || fallback;

const TOOLS = [
  { id: 'brush', icon: '🧹', name: '软毛刷', hold: true, tip: '按住轻轻刷掉灰尘和蛛网' },
  { id: 'sponge', icon: '🧽', name: '泡泡海绵', hold: true, tip: '按住搓泡泡，洗掉泥巴点' },
  { id: 'dryer', icon: '💨', name: '吹风机', hold: true, tip: '按住吹干湿湿的水滴' },
  { id: 'tweezers', icon: '🥢', name: '小镊子', tip: '点一下夹走暗影刺球' },
  { id: 'needle', icon: '🪡', name: '金线缝衣针', tip: '点四下缝好开线，也能把长辫和黑笠缝回去' },
  { id: 'comb', icon: '🪮', name: '顺发造型梳', hold: true, tip: '按住把乱糟糟的头发梳顺' },
  { id: 'patch', icon: '🩹', name: '刺绣补丁', tip: '点三下贴牢刺绣补丁' },
  { id: 'moisture', icon: '🧴', name: '保湿霜', hold: true, tip: '按住轻轻涂抹红红的湿疹' },
  { id: 'diaper', icon: '🩲', name: '小尿布', tip: '点一下换上干爽的小尿布' },
  { id: 'honmoon_balm', icon: '✨', name: '魂门金印膏', hold: true, tip: '按住涂抹，把裂纹封成金色魂门印记' },
  { id: 'polish', icon: '🧤', name: '宝石抛光布', hold: true, tip: '按住擦亮法器，或扶正花盆' },
  { id: 'gem_replacer', icon: '🔘', name: '闪亮耳返/宝石', tip: '点一下装回耳返和眼眸宝石' },
  { id: 'cotton', icon: '☁️', name: '云朵蓬蓬棉', tip: '点四下塞进云朵棉花' },
  { id: 'airbrush', icon: '🖌️', name: '舞台焕彩喷笔', hold: true, tip: '按住喷回闪亮的舞台颜色' },
  { id: 'checkup', icon: '🩺', name: '律动听诊器', tip: '点一点三个发光小圈圈' },
  { id: 'heart', icon: '💝', name: '魂门舞台唤醒', tip: '点一下伙伴，唤醒舞台！' },
];
const TOOL = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
const TOOL_ALIAS = { cloth: 'polish', glove: 'polish', button: 'gem_replacer', gem: 'gem_replacer', paint: 'airbrush', spray: 'airbrush', balm: 'honmoon_balm', cream: 'moisture', stethoscope: 'checkup' };
const normTool = (id) => (id == null ? null : (TOOL[id] ? id : TOOL_ALIAS[id] || id));

const DMG = {
  mud: { icon: '🟤', tool: 'sponge', label: '泥巴点' },
  wet: { icon: '💧', tool: 'dryer', label: '湿水水滴' },
  dust: { icon: '🕸️', tool: 'brush', label: '灰尘蛛网' },
  burr: { icon: '🌑', tool: 'tweezers', label: '暗影刺球' },
  tear: { icon: '🧵', tool: 'needle', label: '演出服开线' },
  tangle: { icon: '🪮', tool: 'comb', label: '乱糟糟头发/绒毛' },
  patch: { icon: '🩹', tool: 'patch', label: '衣服破洞' },
  eczema: { icon: '🔴', tool: 'moisture', label: '红红的湿疹' },
  wet_pants: { icon: '🩲', tool: 'diaper', label: '尿湿裤子' },
  demon_mark: { icon: '🔮', tool: 'honmoon_balm', label: '猎魔印记裂纹' },
  braid_gat: { icon: '🎀', tool: 'needle', label: '散乱长辫与黑笠' },
  weapon_prop: { icon: '🗡️', tool: 'polish', label: '暗淡法器' },
  eye_gem: { icon: '🔘', tool: 'gem_replacer', label: '掉落耳返/眼眸宝石' },
  flat_padding: { icon: '☁️', tool: 'cotton', label: '扁塌填充' },
  faded_outfit: { icon: '🎨', tool: 'airbrush', label: '褪色演出服' },
  checkup: { icon: '🩺', tool: 'checkup', label: '律动听诊器' },
};
const DMG_ALIAS = { ear: 'braid_gat', pendant: 'weapon_prop', dull_weapon_flowerpot: 'weapon_prop', dull_weapon: 'weapon_prop', flowerpot: 'weapon_prop', eye: 'eye_gem', missing_earmonitor_gem: 'eye_gem', flat: 'flat_padding', faded: 'faded_outfit' };
const normDmg = (t) => (DMG[t] ? t : DMG_ALIAS[t] || t);
const DMG_ORDER = ['dust', 'mud', 'wet', 'burr', 'tear', 'tangle', 'patch', 'eczema', 'wet_pants', 'demon_mark', 'braid_gat', 'weapon_prop', 'eye_gem', 'flat_padding', 'faded_outfit', 'checkup'];
// Which part comes loose for the `braid_gat` surprise (Rumi's dragon braid, Jinu's Gat, Sussie's mini Gat, Baby's beanie...)
const LOOSE_PART = { rumi: 'tail', derpy_tiger: 'tail' };

const CHEERS = ['啊，好多啦！', '耶，谢谢你！', '这样好舒服呀！', '好开心！', '你是最棒的小修复师！', '哇，亮晶晶！', '魂门之光更亮啦！'];
const TICKLES = ['嘻嘻，好痒呀！', '你好，小修复师！', '啵！', '咯咯咯！', '一起唱歌吧！'];

const DRESS = [
  ['lightstick', '🔦', 'K-pop 应援棒'],
  ['honmoon_crown', '👑', '金色魂门王冠'],
  ['norigae', '🎀', '韩式 Norigae 挂饰'],
  ['headset', '🎧', '舞台耳麦'],
  ['sunglasses', '🕶️', '墨镜'],
  ['flower_crown', '🌸', '花环'],
];
const DRESS_IDS = DRESS.map((d) => d[0]);

/* ============================== Persistence ============================== */
const SAVE_KEY = 'demonHunterRepair3D_v1';
const LEGACY_KEY = 'critterRepair3D_v1';
function loadSave() {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_KEY) || '{}') || {}; } catch (_) { raw = {}; }
  const s = { stars: Number.isFinite(raw.stars) ? Math.max(0, raw.stars | 0) : 0, shelf: [], fixed: {} };
  if (raw.fixed && typeof raw.fixed === 'object') for (const [k, n] of Object.entries(raw.fixed)) if (CHARACTERS[k] && Number.isFinite(n)) s.fixed[k] = n | 0;
  if (Array.isArray(raw.shelf)) {
    s.shelf = raw.shelf
      .filter((e) => e && typeof e === 'object' && CHARACTERS[e.id])
      .map((e) => ({ id: e.id, acc: (Array.isArray(e.acc) ? e.acc : []).filter((k) => DRESS_IDS.includes(k)), diaper: !!e.diaper, form: e.form === 'awakened' ? 'awakened' : 'stage' }))
      .slice(-6);
  }
  return s;
}
const save = loadSave();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { /* storage full or disabled */ } };

/* ============================== Renderer, scene & camera ============================== */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#18112e');
scene.fog = new THREE.Fog('#18112e', 14, 30);
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);
let camMode = 'home';
const camLook = v3(-0.2, 1.0, -0.3);
camera.position.set(0.9, 1.9, 5.2);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 56 : w / h < 1.1 ? 46 : 38;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- procedural textures ---------- */
function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}
const spriteTex = (draw, s = 128) => { const t = canvasTex(s, s, draw); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
function cloudScroll(g, x, y, r, col) {
  g.strokeStyle = col; g.lineWidth = r * 0.16; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y, r, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
  g.beginPath(); g.arc(x - r * 1.1, y + r * 0.6, r * 0.7, Math.PI, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(x + r * 1.1, y + r * 0.6, r * 0.7, Math.PI, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(x - r * 1.8, y + r * 0.6); g.lineTo(x + r * 2.6, y + r * 0.6); g.stroke();
}
const wallTex = canvasTex(2048, 1024, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#120b26'); gr.addColorStop(0.55, '#2a1a4f'); gr.addColorStop(1, '#4a2a6b');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(255,235,200,${rnd(0.15, 0.8)})`; g.beginPath(); g.arc(rnd(0, w), rnd(0, h * 0.75), rnd(0.6, 2.2), 0, 7); g.fill(); }
  for (let y = 120; y < h; y += 190) for (let x = ((y / 190) % 2) * 160; x < w; x += 320) cloudScroll(g, x, y, 34, 'rgba(255,205,120,0.13)');
  const glow = g.createRadialGradient(w / 2, h * 0.62, 40, w / 2, h * 0.62, 520);
  glow.addColorStop(0, 'rgba(255,190,90,0.35)'); glow.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = glow; g.fillRect(0, 0, w, h);
});
const floorTex = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#1b1535'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120,90,220,0.35)'; g.lineWidth = 2;
  for (let i = 0; i <= w; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  g.strokeStyle = 'rgba(255,214,110,0.22)'; g.lineWidth = 4;
  for (let i = 64; i < w; i += 128) for (let j = 64; j < h; j += 128) { g.beginPath(); g.arc(i, j, 18, 0, 7); g.stroke(); }
}, [6, 6]);
const turntableTex = canvasTex(1024, 1024, (g, w, h) => {
  const cx = w / 2, cy = h / 2;
  const gr = g.createRadialGradient(cx, cy, 10, cx, cy, w / 2);
  gr.addColorStop(0, '#5b3b9a'); gr.addColorStop(0.7, '#2c1b56'); gr.addColorStop(1, '#1a1038');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,214,110,0.85)'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, w * 0.46, 0, 7); g.stroke();
  g.lineWidth = 4; g.strokeStyle = 'rgba(255,214,110,0.55)'; g.beginPath(); g.arc(cx, cy, w * 0.33, 0, 7); g.stroke();
  g.beginPath(); g.arc(cx, cy, w * 0.18, 0, 7); g.stroke();
  g.fillStyle = 'rgba(255,214,110,0.8)';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * w * 0.395, cy + Math.sin(a) * w * 0.395, 9, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(190,120,255,0.65)'; g.lineWidth = 6;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; cloudScroll(g, cx + Math.cos(a) * w * 0.25, cy + Math.sin(a) * w * 0.25, 22, 'rgba(255,214,110,0.55)'); }
});
const lanternTex = (base, stripe) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.fillStyle = stripe; g.fillRect(0, 0, w, 24); g.fillRect(0, h - 24, w, 24);
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3;
  for (let x = 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, h - 24); g.stroke(); }
});
const textTex = (text, font, color, glow, w = 1024, h = 160) => {
  const t = canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = glow; g.shadowBlur = 28; g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 0; g.fillText(text, w / 2, h / 2 + 4);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
};
const TEX = {
  soft: spriteTex((g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }),
  bubble: spriteTex((g, w) => { g.strokeStyle = 'rgba(170,210,255,.95)'; g.lineWidth = 6; g.fillStyle = 'rgba(225,242,255,.35)'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 6, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * .35, w * .33, w * .09, 0, 7); g.fill(); }),
  star: spriteTex((g, w) => { g.fillStyle = '#ffd766'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? w * .2 : w * .48; g.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } g.fill(); }),
  sparkle: spriteTex((g, w) => { g.fillStyle = '#fff6c8'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? w * .1 : w * .48; g.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } g.fill(); }),
  heart: spriteTex((g, w) => { g.font = `${w * .8}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💗', w / 2, w / 2 + 6); }),
  note: spriteTex((g, w) => { g.font = `${w * .78}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🎵', w / 2, w / 2 + 6); }),
  puff: spriteTex((g, w) => { g.fillStyle = 'rgba(214,206,194,.9)'; [[.5, .5, .3], [.3, .55, .2], [.7, .55, .2], [.5, .32, .2]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * w, y * w, r * w, 0, 7); g.fill(); }); }),
  cotton: spriteTex((g, w) => { g.fillStyle = '#fffefa'; g.strokeStyle = '#e0d8ca'; g.lineWidth = 3; [[.5, .5, .28], [.28, .58, .2], [.72, .58, .2], [.5, .3, .2]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * w, y * w, r * w, 0, 7); g.fill(); g.stroke(); }); }),
  spray: spriteTex((g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }),
  ring: spriteTex((g, w) => { g.strokeStyle = '#ffd766'; g.lineWidth = w * 0.07; g.beginPath(); g.arc(w / 2, w / 2, w * 0.42, 0, 7); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = w * 0.025; g.beginPath(); g.arc(w / 2, w / 2, w * 0.3, 0, 7); g.stroke(); }),
  glow: spriteTex((g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,220,140,.9)'); gr.addColorStop(.4, 'rgba(255,190,90,.35)'); gr.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }, 256),
};

/* ---------- Honmoon stage room ---------- */
const room = new THREE.Group();
scene.add(room);

const wall = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), std({ map: wallTex, roughness: .95 }));
wall.position.set(0, 4.6, -3.3); wall.receiveShadow = true; room.add(wall);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), std({ map: floorTex, roughness: .42, metalness: .05, color: '#c9c0ff' }));
floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.receiveShadow = true; room.add(floor);

// Giant golden Honmoon ring behind the stage + violet inner ring + soft glow
const honmoonMat = std({ color: '#ffd166', emissive: '#ffb020', emissiveIntensity: 1.1, roughness: .3, metalness: .2 });
const honmoon = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.065, 18, 140), honmoonMat);
honmoon.position.set(0, 2.35, -3.1); room.add(honmoon);
const honmoonInner = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.022, 12, 120), std({ color: '#c084fc', emissive: '#a855f7', emissiveIntensity: 1.3, roughness: .3 }));
honmoonInner.position.copy(honmoon.position); room.add(honmoonInner);
const honmoonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, transparent: true, depthWrite: false, opacity: .75, blending: THREE.AdditiveBlending, color: '#ffc46b' }));
honmoonGlow.position.set(0, 2.35, -3.2); honmoonGlow.scale.set(7.5, 7.5, 1); room.add(honmoonGlow);
for (let i = 0; i < 4; i++) { // four tiger-crest medallions on the ring (Saingeom 四寅)
  const a = i * Math.PI / 2 + Math.PI / 4;
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(.16, 0), honmoonMat);
  m.scale.set(1, 1, .4); m.position.set(Math.cos(a) * 2.25, 2.35 + Math.sin(a) * 2.25, -3.08); room.add(m);
}
// Neon signage
const sign1 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, .72), new THREE.MeshBasicMaterial({ map: textTex('HUNTR/X ✦ SAJA BOYS', '800 104px ui-rounded,system-ui,sans-serif', '#ff7ac8', '#ff2fa0'), transparent: true, depthWrite: false }));
sign1.position.set(-4.6, 4.9, -3.2); room.add(sign1);
const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(4.0, .66), new THREE.MeshBasicMaterial({ map: textTex('魂门修复工坊 3D', '800 110px ui-rounded,system-ui,sans-serif', '#8ff7ff', '#22d3ee'), transparent: true, depthWrite: false }));
sign2.position.set(4.6, 4.9, -3.2); room.add(sign2);

// Round stage riser + LED rim + rotating turntable top
const riser = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.42, .14, 80), std({ color: '#2a1f4f', roughness: .55 }));
riser.position.y = .07; riser.receiveShadow = true; riser.castShadow = true; room.add(riser);
const ledRim = new THREE.Mesh(new THREE.TorusGeometry(1.33, .028, 12, 120), std({ color: '#ffe08a', emissive: '#ffb020', emissiveIntensity: 1.2, roughness: .35 }));
ledRim.rotation.x = Math.PI / 2; ledRim.position.y = .145; room.add(ledRim);
const turntable = new THREE.Group();
room.add(turntable);
const ttTop = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, .05, 80), [std({ color: '#5b3b9a', roughness: .5 }), std({ map: turntableTex, roughness: .45, emissive: '#3b2a6b', emissiveIntensity: .18 }), std({ color: '#5b3b9a' })]);
ttTop.position.y = .165; ttTop.receiveShadow = true; turntable.add(ttTop);
const holder = new THREE.Group(); holder.position.y = .19; turntable.add(holder);
const HOLDER_Y = .19;

// Lighting truss + three colored stage spotlights with visible beams
const trussMat = std({ color: '#55506a', roughness: .6, metalness: .2 });
const truss = new THREE.Mesh(new THREE.BoxGeometry(12, .12, .12), trussMat); truss.position.set(0, 5.4, 1.2); room.add(truss);
const beams = [];
function stageSpot(col, x, z, target) {
  const sp = new THREE.SpotLight(col, 20, 16, .42, .55, 1.1);
  sp.position.set(x, 5.3, z); sp.target.position.copy(target); scene.add(sp, sp.target);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(.14, .2, .34, 20), trussMat); housing.position.set(x, 5.15, z); housing.lookAt(target); housing.rotateX(Math.PI / 2); room.add(housing);
  const len = sp.position.distanceTo(target) * .95;
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.25, len, 28, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.position.copy(sp.position).lerp(target, .5); beam.lookAt(target); beam.rotateX(-Math.PI / 2); room.add(beam);
  beams.push({ sp, beam, base: new THREE.Color(col) });
  return sp;
}
stageSpot('#ff6fb5', -2.6, 2.4, v3(0, .9, 0));
stageSpot('#ffd166', 0, 2.8, v3(0, .9, 0));
stageSpot('#6ee7ff', 2.6, 2.4, v3(0, .9, 0));

// Cheongsachorong lanterns + fairy lights
const lanternGroup = new THREE.Group(); room.add(lanternGroup);
[[-3.6, 4.1, -1.2], [-1.6, 4.4, -2.2], [1.7, 4.4, -2.2], [3.7, 4.1, -1.2]].forEach(([x, y, z], i) => {
  const l = new THREE.Group(); l.position.set(x, y, z); l.userData.y0 = y; l.userData.ph = i;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .5, 24, 1, true), std({ map: lanternTex(i % 2 ? '#3b82f6' : '#ef4444', '#1e1b4b'), emissive: i % 2 ? '#60a5fa' : '#fb7185', emissiveIntensity: .55, side: THREE.DoubleSide, roughness: .7 }));
  l.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.08, .24, .1, 24), std({ color: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: .4, roughness: .4, metalness: .2 })); cap.position.y = .3; l.add(cap);
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(.03, .06, .26, 10), std({ color: '#fbbf24', roughness: .9 })); tassel.position.y = -.38; l.add(tassel);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.2, 6), std({ color: '#f5d0a9' })); cord.position.y = .95; l.add(cord);
  lanternGroup.add(l);
});
const fairy = [];
for (let i = 0; i < 30; i++) {
  const t = i / 29, x = -8 + t * 16, y = 5.75 - Math.sin(t * Math.PI * 4) * .2 - .1;
  const m = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 10), new THREE.MeshBasicMaterial({ color: ['#ffd166', '#ff9eb5', '#9ed8ff', '#c9b6ff'][i % 4] }));
  m.position.set(x, y, -2.9); room.add(m); fairy.push(m);
}

// Repair supplies desk (left) : balm pots, cream bottle, spools, gem jar, polishing cloth, tweezers
const desk = new THREE.Group(); desk.position.set(-2.75, 0, 0.55); room.add(desk);
const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.7, .1, 1.0), std({ color: '#f3e3cc', roughness: .6 })); deskTop.position.y = .78; deskTop.castShadow = deskTop.receiveShadow = true; desk.add(deskTop);
[[-.72, -.38], [.72, -.38], [-.72, .38], [.72, .38]].forEach(([x, z]) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .76, 10), std({ color: '#b48a5c', roughness: .7 })); leg.position.set(x, .38, z); desk.add(leg); });
const balm = new THREE.Mesh(new THREE.LatheGeometry([[.0, 0], [.12, 0], [.14, .05], [.13, .14], [.08, .17]].map(([x, y]) => new THREE.Vector2(x, y)), 32), std({ color: '#ffd166', emissive: '#f59e0b', emissiveIntensity: .35, roughness: .3, metalness: .2 }));
balm.position.set(-.5, .83, .1); desk.add(balm);
const cream = new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, .3, 24), std({ color: '#d6f8ec', roughness: .35 })); cream.position.set(-.15, .98, -.2); desk.add(cream);
const creamCap = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .07, 16), std({ color: '#7fd1b9', roughness: .4 })); creamCap.position.set(-.15, 1.16, -.2); desk.add(creamCap);
['#e2394a', '#7b6bd6', '#f2c14e', '#4f9a86'].forEach((c, i) => {
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .14, 20), std({ color: c, roughness: .8 })); s.position.set(.1 + (i % 2) * .2, .9, -.15 + (i > 1 ? .3 : 0)); desk.add(s);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .02, 20), std({ color: '#e7c592' })); top.position.set(s.position.x, .98, s.position.z); desk.add(top);
});
const jar = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .3, 28, 1, true), new THREE.MeshPhysicalMaterial({ color: '#dff4ff', transparent: true, opacity: .35, roughness: .05, metalness: 0, side: THREE.DoubleSide }));
jar.position.set(.55, .98, .1); desk.add(jar);
for (let i = 0; i < 26; i++) { const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.03, 0), std({ color: pick(['#ff6b8a', '#ffd166', '#6bd3ff', '#9b7bff', '#7ed6a8']), emissive: '#ffffff', emissiveIntensity: .08, roughness: .3 })); gem.position.set(.55 + rnd(-.1, .1), .86 + rnd(0, .18), .1 + rnd(-.1, .1)); desk.add(gem); }
const cloth = new THREE.Mesh(new THREE.BoxGeometry(.34, .03, .26), std({ color: '#fbbf24', roughness: .95 })); cloth.position.set(.2, .85, .3); cloth.rotation.y = .3; desk.add(cloth);
desk.traverse((o) => { if (o.isMesh) o.castShadow = true; });

// Honmoon Showcase Stage (魂门星光展台): two golden tiers with six star pedestals (right side)
const showcase = new THREE.Group(); showcase.position.set(3.3, 0, -1.9); room.add(showcase);
const tierMat = std({ color: '#f6c453', emissive: '#b8860b', emissiveIntensity: .22, roughness: .4, metalness: .22 });
const SHELF_Y = [1.25, 2.3];
SHELF_Y.forEach((y, ti) => {
  const tier = new THREE.Mesh(new THREE.BoxGeometry(3.2, .12, .95), tierMat); tier.position.set(0, y, 0); tier.castShadow = tier.receiveShadow = true; showcase.add(tier);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(3.2, .03, .04), std({ color: '#fff3c4', emissive: '#ffd166', emissiveIntensity: 1.1 })); strip.position.set(0, y + .07, .48); showcase.add(strip);
  for (let i = 0; i < 3; i++) { const ped = new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, .06, 32), std({ color: '#fde68a', emissive: '#f59e0b', emissiveIntensity: .35, roughness: .4 })); ped.position.set(-1.0 + i, y + .09, .05); showcase.add(ped); }
  [-1.5, 1.5].forEach((dx) => { const post = new THREE.Mesh(new THREE.BoxGeometry(.1, ti === 0 ? 1.25 : 1.0, .1), tierMat); post.position.set(dx, y - (ti === 0 ? .62 : .5), -.3); showcase.add(post); });
});
const shelfSign = new THREE.Mesh(new THREE.PlaneGeometry(3.0, .5), new THREE.MeshBasicMaterial({ map: textTex('✦ 魂门星光展台 ✦', '800 96px ui-rounded,system-ui,sans-serif', '#fff1b8', '#ffb020'), transparent: true, depthWrite: false }));
shelfSign.position.set(0, 3.05, -.2); showcase.add(shelfSign);
const SHELF_SPOTS = [];
SHELF_Y.forEach((y) => { for (let i = 0; i < 3; i++) SHELF_SPOTS.push(v3(3.3 - 1.0 + i, y + .12, -1.9 + .05)); });

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight('#f6e7ff', '#2a1a3a', 1.05));
const key = new THREE.DirectionalLight('#fff4e2', 2.0);
key.position.set(-2.5, 6.0, 4.5); key.target.position.set(0, .9, 0);
key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = .02;
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -2, near: .5, far: 18 });
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#b9c8ff', 1.0); rim.position.set(3, 3.5, -3); scene.add(rim);
const fill = new THREE.PointLight('#ffd9a0', 10, 9, 1.6); fill.position.set(2.4, 2.4, 2.6); scene.add(fill);
const honmoonLight = new THREE.PointLight('#ffb84a', 8, 9, 1.5); honmoonLight.position.set(0, 2.4, -2.4); scene.add(honmoonLight);

// Star motes drifting in the spotlights
const moteGeo = new THREE.BufferGeometry();
const motePos = new Float32Array(110 * 3);
for (let i = 0; i < 110; i++) { motePos[i * 3] = rnd(-4, 4); motePos[i * 3 + 1] = rnd(.3, 5); motePos[i * 3 + 2] = rnd(-2.5, 2); }
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ map: TEX.sparkle, size: .07, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe9b3' }));
scene.add(motes);

/* ============================== Particles ============================== */
const fx = [];
function spawn(tex, pos, o = {}) {
  if (fx.length > 160) return null;
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: o.color || '#ffffff', opacity: o.opacity ?? 1, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending });
  const s = new THREE.Sprite(m);
  s.position.copy(pos);
  const size = o.size ?? .08; s.scale.set(size, size, 1);
  s.userData = { vel: o.vel || v3(), life: o.life ?? 1.5, t: 0, size, grow: o.grow ?? 0, grav: o.grav ?? 0, op: o.opacity ?? 1, to: o.to || null, onArrive: o.onArrive || null, spin: o.spin ?? 0 };
  scene.add(s); fx.push(s); return s;
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const s = fx[i], u = s.userData; u.t += dt;
    if (u.to) {
      const k = ease(u.t / u.life);
      s.position.lerpVectors(u.from || (u.from = s.position.clone()), u.to, k);
      s.position.y += Math.sin(k * Math.PI) * .5;
    } else {
      u.vel.y -= u.grav * dt; s.position.addScaledVector(u.vel, dt);
    }
    const sz = u.size * (1 + u.grow * u.t); s.scale.set(sz, sz, 1);
    s.material.rotation += u.spin * dt;
    const a = u.t / u.life; s.material.opacity = u.op * (a < .15 ? a / .15 : a > .7 ? (1 - a) / .3 : 1);
    if (u.t >= u.life) {
      if (u.onArrive) { const cb = u.onArrive; u.onArrive = null; try { cb(); } catch (_) { /* never break the frame loop */ } }
      scene.remove(s); s.material.dispose(); fx.splice(i, 1);
    }
  }
}
const burst = (pos, n = 8, tex = TEX.sparkle, spread = .5, color) => {
  for (let i = 0; i < n; i++) spawn(tex, pos.clone().add(v3(rnd(-.1, .1), rnd(-.1, .1), rnd(-.1, .1))), { vel: v3(rnd(-spread, spread), rnd(.2, .8), rnd(-spread, spread)), life: rnd(1.2, 2), size: rnd(.06, .12), add: true, spin: rnd(-2, 2), color });
};

/* ============================== Audio: music, ASMR SFX, bundled Xiaoyi Mandarin voices ============================== */
const music = {
  on: true, vol: .32, cur: null, started: false,
  tracks: { theme: new Audio('music/workshop_theme.mp3'), sew: new Audio('music/sewing_lullaby.mp3'), party: new Audio('music/celebration.mp3') },
  init() {
    Object.entries(this.tracks).forEach(([k, a]) => { a.loop = k !== 'party'; a.volume = 0; a.preload = 'auto'; a._target = 0; });
    this.tracks.party.addEventListener('ended', () => this.play(game.tool === 'needle' ? 'sew' : 'theme'));
  },
  play(name) {
    if (this.cur === name) return;
    this.cur = name;
    Object.entries(this.tracks).forEach(([k, a]) => {
      a._target = k === name && this.on ? this.vol : 0;
      if (k === name && this.on) { if (k === 'party') a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); }
    });
  },
  toggle() {
    this.on = !this.on; $('musicBtn').classList.toggle('off', !this.on);
    const c = this.cur; this.cur = null; this.play(c || 'theme');
  },
  update(dt) {
    Object.values(this.tracks).forEach((a) => {
      const v = a.volume + (a._target - a.volume) * Math.min(1, dt * 1.6);
      a.volume = Math.max(0, Math.min(1, v));
      if (a._target === 0 && a.volume < .01 && !a.paused) a.pause();
    });
  },
};
music.init();

let ac = null, noiseBuf = null, soundOn = true;
function audio() {
  try {
    if (!ac) {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
      ac = new A(); noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); }
    return ac;
  } catch (_) { return null; }
}
function noise(freq, q, gain, dur, type = 'bandpass') {
  if (!soundOn || !audio()) return;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(), t = ac.currentTime;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + dur * .3); g.gain.linearRampToValueAtTime(0, t + dur);
  s.connect(f).connect(g).connect(ac.destination); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}
function tone(f1, f2, dur, gain = .05, type = 'sine', delay = 0) {
  if (!soundOn || !audio()) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .05);
}
const chime = (notes, gap = .13, gain = .045) => notes.forEach((n, i) => tone(n, n * 1.002, 1, gain, 'sine', i * gap));
const loops = {};
function loopNoise(key, on, freq = 700, type = 'lowpass', gain = .045) {
  if (on && soundOn && audio() && !loops[key]) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ac.createGain(); g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(gain, ac.currentTime + .25);
    s.connect(f).connect(g).connect(ac.destination); s.start(); loops[key] = { s, g };
  } else if (!on && loops[key]) {
    const { s, g } = loops[key]; g.gain.linearRampToValueAtTime(0, ac.currentTime + .2); s.stop(ac.currentTime + .25); delete loops[key];
  }
}
let lastRub = 0;
function rubSfx(tool) {
  const now = performance.now(); if (now - lastRub < 140) return; lastRub = now;
  if (tool === 'brush' || tool === 'comb') noise(2600, .9, .04, .13);
  if (tool === 'sponge') { noise(850, 1.3, .05, .16); if (Math.random() < .4) tone(rnd(500, 800), 1000, .08, .03); }
  if (tool === 'polish') { noise(4200, 2, .025, .1); if (Math.random() < .3) tone(1760, 2200, .18, .018); }
  if (tool === 'moisture') { noise(1350, 1.4, .032, .14); if (Math.random() < .45) tone(rnd(760, 1120), 1380, .12, .026, 'sine'); }
  if (tool === 'honmoon_balm') { noise(2200, 1.6, .028, .14); if (Math.random() < .5) tone(rnd(1200, 1800), 2400, .16, .022, 'triangle'); }
}
function playFartSfx(mega = false) {
  if (!soundOn || !audio()) return;
  if (!mega) {
    tone(rnd(165, 225), rnd(62, 88), .26, .08, 'sawtooth');
    tone(rnd(120, 155), rnd(52, 72), .22, .06, 'triangle', .05);
    noise(260, 2.2, .055, .24, 'bandpass');
  } else {
    tone(145, 36, .95, .14, 'sawtooth');
    tone(92, 26, 1.15, .16, 'triangle', .04);
    tone(210, 48, .75, .09, 'square', .08);
    noise(150, 1.1, .14, 1.15, 'lowpass');
    noise(420, 1.8, .085, .8, 'bandpass');
    setTimeout(() => chime([523, 659, 784, 1047], .12, .045), 320);
  }
}
// Bundled zh-CN-XiaoyiNeural clips play on every device; device speech is only a fallback for unbundled lines.
let voiceChoices = [];
function refreshVoices() { if ('speechSynthesis' in window) voiceChoices = speechSynthesis.getVoices(); }
if ('speechSynthesis' in window) { refreshVoices(); speechSynthesis.addEventListener('voiceschanged', refreshVoices); }
function gentleVoice() {
  const mandarin = voiceChoices.filter((v) => /^(zh|cmn)(?:-|_|$)/i.test(v.lang) && !/^zh[-_]HK/i.test(v.lang));
  const preferred = ['Xiaoyi', 'Xiaoxiao', 'HsiaoChen', 'HsiaoYu', 'Google 普通话', 'Tingting', 'Meijia'];
  const score = (v) => {
    const rank = preferred.findIndex((name) => v.name.toLowerCase().includes(name.toLowerCase()));
    return (rank < 0 ? 0 : (preferred.length - rank) * 100) + (/natural|premium|enhanced|neural/i.test(v.name) ? 30 : 0) + (/^(zh[-_]CN|cmn[-_]Hans[-_]CN)$/i.test(v.lang) ? 10 : 0);
  };
  return mandarin.sort((a, b) => score(b) - score(a))[0];
}
let spokenClip = null;
function stopSpeech() {
  if (spokenClip) { spokenClip.pause(); spokenClip = null; }
  if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (_) { /* noop */ } }
}
// say('rumi-hello') plays the bundled clip; say('任意中文') falls back to the clip keyed by text or device TTS.
function say(keyOrText) {
  if (!soundOn || !keyOrText || game.paused) return;
  stopSpeech();
  const clip = VOICE_BY_KEY[keyOrText] || VOICE_CLIPS[keyOrText];
  if (clip) {
    spokenClip = new Audio(clip); spokenClip.volume = .85;
    const current = spokenClip;
    const p = spokenClip.play();
    if (p && p.catch) p.catch(() => { if (spokenClip === current) spokenClip = null; });
    return;
  }
  speakDevice(keyOrText);
}
function speakDevice(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text); u.rate = .95; u.pitch = 1.15; u.volume = .8;
    refreshVoices(); const voice = gentleVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'zh-CN';
    speechSynthesis.speak(u);
  } catch (_) { /* speech unavailable */ }
}

/* ============================== Game state ============================== */
const game = {
  state: 'home', sel: 'rumi', filter: 'all', form: 'stage', critter: null, meta: null, tool: null, paused: false,
  damages: [], total: 0, fixedCount: 0, flat: 1, flatTarget: 1, faded: 1, fadedMats: null, propShine: 1, prop: null,
  loose: null, eye: null, anim: 'idle', t: 0, heartIn: false, accessories: new Set(), before: null, arrive: 1,
  fartCharge: 0, fartBounce: 0, wobble: 0, diaperFitted: false, checkupStarted: false, spinTo: null, visitVersion: 0,
  critterPristine: false, frame: { footY: HOLDER_Y, h: 1.5 }, camOverrideUntil: 0, dance: 0,
};
const raycaster = new THREE.Raycaster();
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpBox = new THREE.Box3(), tmpM = new THREE.Matrix4();

function whoOf(meta) { return meta.who || meta.title || GROUP_WHO[normalizeCategoryKey(meta.category || meta.group)] || ''; }
function helloOf(meta) { return lineFor(`${meta.id}-hello`, meta.hello || '你好呀！帮我修一修吧！'); }
function thanksOf(meta) { return lineFor(`${meta.id}-thanks`, meta.thanks || '谢谢你，小修复师！'); }

// Bounding box of `obj`'s visible subtree expressed in obj's own local frame.
function localBounds(obj) {
  obj.updateMatrixWorld(true);
  const inv = tmpM.copy(obj.matrixWorld).invert();
  const box = new THREE.Box3();
  const rel = new THREE.Matrix4();
  obj.traverseVisible((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    tmpBox.copy(o.geometry.boundingBox);
    rel.multiplyMatrices(inv, o.matrixWorld);
    tmpBox.applyMatrix4(rel);
    box.union(tmpBox);
  });
  if (box.isEmpty()) box.set(v3(-.1, -.1, -.1), v3(.1, .1, .1));
  return box;
}
function isVisibleChain(o, stopAt) {
  for (let n = o; n && n !== stopAt; n = n.parent) { if (!n.visible || (n.userData && n.userData.onlyInForm)) return false; }
  return true;
}

function buildCritter(id) {
  const root = buildCharacter(id);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const p = root.parts || {};
  [p.eyes, p.signatureProp, p.demonMarkSeal, p.auraGroup].forEach((g) => g && g.traverse((o) => { o.userData.noDecal = true; }));
  root.userData.base = {};
  ['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'leftEar', 'rightEar', 'tail'].forEach((k) => {
    if (p[k]) root.userData.base[k] = { r: p[k].rotation.clone(), p: p[k].position.clone(), s: p[k].scale.clone() };
  });
  if (p.auraGroup) root.userData.auraBase = { r: p.auraGroup.rotation.clone(), s: p.auraGroup.scale.clone() };
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  root.userData.footY = box.min.y;
  root.userData.height = Math.max(.6, box.max.y - box.min.y);
  root.userData.center = box.getCenter(v3());
  root.userData.restY = -box.min.y + .004;
  return root;
}
function placeOnTurntable(c) {
  holder.add(c);
  c.position.set(0, c.userData.restY, 0); c.rotation.set(0, 0, 0); c.scale.setScalar(1);
  game.frame = { footY: HOLDER_Y + .004, h: c.userData.height };
  c.updateMatrixWorld(true);
}
function critterCenterWorld(c) { return c.localToWorld(c.userData.center.clone()); }

/* ---------- damage placement on the character surface ---------- */
function surfaceHits(root, n, minDist, prefer) {
  root.updateMatrixWorld(true);
  const center = critterCenterWorld(root), h = root.userData.height;
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh || o.userData.noDecal || !o.geometry || !isVisibleChain(o, root.parent)) return;
    const bs = o.geometry.boundingSphere || (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere);
    if (!bs || bs.radius < .06) return;
    meshes.push(o);
  });
  const out = [];
  for (let tries = 0; tries < 420 && out.length < n; tries++) {
    const dir = v3(rnd(-1, 1), rnd(-.5, .9), rnd(-1, 1));
    if (prefer === 'front') dir.z = Math.abs(dir.z) + .7;
    if (prefer === 'back') dir.z = -Math.abs(dir.z) - .7;
    dir.normalize();
    const origin = center.clone().addScaledVector(dir, 3.2).add(v3(0, rnd(-.42, .46) * h, 0));
    const aim = center.clone().add(v3(rnd(-.18, .18), rnd(-.46, .46) * h, rnd(-.15, .15)));
    raycaster.set(origin, aim.sub(origin).normalize());
    raycaster.far = 8;
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit || !hit.face) continue;
    if (out.some((q) => q.point.distanceTo(hit.point) < minDist)) continue;
    if (game.damages.some((d) => d.anchor && d.anchor.getWorldPosition(tmpV).distanceTo(hit.point) < minDist)) continue;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    if (normal.y < -.15 || Math.hypot(normal.x, normal.z) < .38) continue; // undersides and steep top/bottom surfaces can never face the horizontal camera cleanly
    out.push({ point: hit.point.clone(), normal, object: hit.object });
  }
  return out;
}
function placeOnSurface(obj, hit, spin = rnd(0, 6.28)) {
  obj.position.copy(hit.point).addScaledVector(hit.normal, .006);
  obj.lookAt(hit.point.clone().add(hit.normal));
  obj.rotateZ(spin);
  scene.add(obj);
  obj.updateMatrixWorld(true);
  hit.object.attach(obj);
  return obj;
}
const M = {
  mud: std({ color: '#6a4629', roughness: 1 }), mud2: std({ color: '#4e321c', roughness: 1 }),
  dust: std({ color: '#d2cbc0', roughness: 1, transparent: true, opacity: .96 }),
  web: new THREE.LineBasicMaterial({ color: '#f4f1ea', transparent: true, opacity: .8 }),
  wet: new THREE.MeshPhysicalMaterial({ color: '#a8dcff', roughness: .04, metalness: 0, transparent: true, opacity: .78, clearcoat: 1, emissive: '#3b7fb3', emissiveIntensity: .25 }),
  peeStain: new THREE.MeshPhysicalMaterial({ color: '#f6d54a', roughness: .06, metalness: 0, transparent: true, opacity: .84, clearcoat: 1, emissive: '#c49214', emissiveIntensity: .24 }),
  eczemaBase: std({ color: '#f26b83', roughness: .88, transparent: true, opacity: .78 }),
  eczemaBump: std({ color: '#e62e4d', emissive: '#9e142b', emissiveIntensity: .25, roughness: .55 }),
  diaperWhite: std({ color: '#ffffff', roughness: .72, metalness: .02 }),
  diaperTrim: std({ color: '#d6eeff', roughness: .62 }),
  tabBlue: std({ color: '#5cb8ff', roughness: .48 }),
  tabYellow: std({ color: '#ffd43b', roughness: .45 }),
  badgePink: std({ color: '#ff8fab', roughness: .48 }),
  slit: std({ color: '#261b2a', roughness: .9 }), cottonM: std({ color: '#fffdf7', roughness: 1 }),
  burr: std({ color: '#2a1838', emissive: '#6d28d9', emissiveIntensity: .35, roughness: .8 }),
  burr2: std({ color: '#4c1d95', emissive: '#a855f7', emissiveIntensity: .55, roughness: .7 }),
  crack: std({ color: '#c026d3', emissive: '#a21caf', emissiveIntensity: 1.3, roughness: .3 }),
  crackGlow: std({ color: '#581c87', emissive: '#7e22ce', emissiveIntensity: .6, roughness: .6, transparent: true, opacity: .55 }),
  gold: std({ color: '#ffd166', emissive: '#f59e0b', emissiveIntensity: .7, roughness: .3, metalness: .2 }),
  socket: std({ color: '#4a2a3a', roughness: .95 }),
  ringPink: std({ color: '#ff96bd', emissive: '#ff5fa2', emissiveIntensity: .6, roughness: .4 }),
};
function makeDecal(type) {
  const g = new THREE.Group();
  const thread = std({ color: game.meta.accent || '#ffd166', roughness: .7 });
  if (type === 'tangle') {
    const mat = std({ color: game.meta.color || '#8b5cf6', roughness: .95 });
    for (let i = 0; i < 6; i++) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(.045, .012, 8, 18, Math.PI * 1.7), mat);
      loop.position.set((i - 2.5) * .03, Math.sin(i * 2) * .025, .02 + i * .004);
      loop.rotation.z = i * 1.3; g.add(loop);
    }
  } else if (type === 'patch') {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.10, 24), M.slit); g.add(hole);
    const backing = new THREE.Mesh(new THREE.CircleGeometry(.085, 24), M.cottonM);
    backing.position.z = .004; g.add(backing); g.userData.presses = 0;
  } else if (type === 'eczema') {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(.095, 24), M.eczemaBase);
    patch.position.z = .003; g.add(patch);
    const ringPos = [[0, 0, .022], [-.036, .024, .019], [.038, .022, .019], [-.042, -.026, .018], [.040, -.028, .018], [0, .048, .017], [0, -.046, .017], [-.064, 0, .015], [.064, 0, .015], [.018, -.012, .021]];
    ringPos.forEach(([bx, by, r], idx) => {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), M.eczemaBump);
      bump.scale.z = .65; bump.position.set(bx, by, .012 + (idx % 3) * .003); g.add(bump);
    });
  } else if (type === 'mud') {
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(rnd(.045, .085), 20, 14), i ? M.mud : M.mud2);
      b.scale.z = .22; b.position.set(rnd(-.06, .06), rnd(-.05, .05), .005 * i); g.add(b);
    }
    for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(rnd(.012, .022), 10, 8), M.mud2); d.scale.z = .3; const a = rnd(0, 6.28); d.position.set(Math.cos(a) * .12, Math.sin(a) * .12, 0); g.add(d); }
  } else if (type === 'dust') {
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(rnd(.025, .045), 14, 10), M.dust); b.position.set(rnd(-.07, .07), rnd(-.05, .05), rnd(.0, .03)); g.add(b); }
    const pts = []; for (let a = 0; a < 6; a++) { pts.push(v3(0, 0, .03), v3(Math.cos(a) * .15, Math.sin(a) * .15, .01)); }
    for (let r = .05; r <= .15; r += .05) for (let a = 0; a < 6; a++) pts.push(v3(Math.cos(a) * r, Math.sin(a) * r, .015), v3(Math.cos(a + 1) * r, Math.sin(a + 1) * r, .015));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), M.web));
  } else if (type === 'wet') {
    for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(rnd(.022, .036), 18, 14), M.wet); d.scale.set(1, 1.3, .55); d.position.set(rnd(-.06, .06), rnd(-.06, .06), .01); g.add(d); }
  } else if (type === 'tear') {
    const slit = new THREE.Mesh(new THREE.CapsuleGeometry(.022, .15, 6, 12), M.slit);
    slit.rotation.z = Math.PI / 2; slit.scale.z = .35; slit.name = 'slit'; g.add(slit);
    const puffs = new THREE.Group(); puffs.name = 'puffs';
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(rnd(.018, .028), 12, 10), M.cottonM); c.position.set(-.06 + i * .04, rnd(-.01, .01), .018); puffs.add(c); }
    g.add(puffs); g.userData.stitches = 0; g.userData.thread = thread;
  } else if (type === 'burr') {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.042, 1), M.burr); core.position.z = .03; g.add(core);
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(.009, .05, 6), M.burr2);
      const v = v3(rnd(-1, 1), rnd(-1, 1), rnd(-.2, 1)).normalize();
      s.position.copy(v.clone().multiplyScalar(.045)).add(v3(0, 0, .03));
      s.quaternion.setFromUnitVectors(v3(0, 1, 0), v); g.add(s);
    }
  }
  if (type === 'mud' || type === 'dust') {
    const inner = new THREE.Group(); inner.scale.setScalar(type === 'mud' ? 1.5 : 1.4);
    while (g.children.length) inner.add(g.children[0]);
    g.add(inner);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.noDecal = true; o.userData.isDecal = true; } });
  return g;
}
function addDamage(type, hit) {
  const g = makeDecal(type);
  placeOnSurface(g, hit);
  const d = { type, anchor: g, hp: 1, done: false, id: game.damages.length, useNormal: true };
  game.damages.push(d);
  return d;
}

/* ---------- lower-body wet_pants decal & 3D white diaper mesh ---------- */
function rootSpacePos(c, obj) { return c.worldToLocal(obj.getWorldPosition(v3())); }
function pelvisSpec(c, meta) {
  const p = c.parts || {}, pel = (meta && meta.pelvis) || {};
  const legs = [p.leftLeg, p.rightLeg].filter(Boolean);
  let halfSpan = .11, legR = .085, hipY = pel.y ?? -.2;
  if (legs.length === 2) {
    const a = rootSpacePos(c, legs[0]), b = rootSpacePos(c, legs[1]);
    halfSpan = Math.abs(a.x - b.x) / 2;
    // Measure the thigh (first child) rather than the whole leg so chunky sneakers / paws don't inflate the fit.
    const thigh = legs[0].children.find((o) => o.isMesh) || legs[0];
    const sz = localBounds(thigh).getSize(v3());
    legR = clamp(Math.max(sz.x, sz.z) / 2 * .9, .05, .16);
    if (pel.y == null) hipY = (a.y + b.y) / 2;
  }
  const frontZ = pel.frontZ ?? .25;
  // Character metadata may pin the exact diaper radii; otherwise derive them from the hip span + thigh radius.
  const rx = pel.rx > 0 ? pel.rx : clamp(halfSpan + legR * .7 + .02, .15, .36);
  const rz = pel.rz > 0 ? pel.rz : clamp(Math.min(frontZ * .9, rx * 1.05), .14, .34);
  const ry = pel.ry > 0 ? pel.ry : clamp(rx * .6, .11, .2);
  return { y: hipY, z: pel.z ?? 0, rx, ry, rz, frontY: pel.frontY ?? hipY, frontZ };
}
function torsoLocal(c, rootPos) {
  c.updateMatrixWorld(true);
  return c.parts.torso.worldToLocal(c.localToWorld(rootPos.clone()));
}
function addWetPantsDamage(c, meta) {
  const spec = pelvisSpec(c, meta);
  const g = new THREE.Group();
  g.name = 'wetPantsDecal';
  g.position.copy(torsoLocal(c, v3(0, spec.frontY, spec.frontZ)));
  const stain = new THREE.Mesh(new THREE.SphereGeometry(.11, 20, 16), M.peeStain);
  stain.scale.set(1.35, .95, .28); g.add(stain);
  const rimM = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 14), M.wet);
  rimM.scale.set(1.45, 1.05, .20); rimM.position.z = -.004; g.add(rimM);
  [[-.09, -.05, .02], [.09, -.04, .02], [0, -.09, .025], [-.05, .04, .025], [.06, .03, .025]].forEach(([dx, dy, dz]) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(.025, 14, 10), M.peeStain);
    drop.scale.set(1, 1.35, .55); drop.position.set(dx, dy, dz); g.add(drop);
  });
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.noDecal = true; o.userData.isDecal = true; } });
  c.parts.torso.add(g);
  const d = { type: 'wet_pants', anchor: g, hp: 1, done: false, id: game.damages.length, useNormal: true };
  game.damages.push(d);
  return d;
}
function buildDiaperMesh(c, meta) {
  const spec = pelvisSpec(c, meta);
  const g = new THREE.Group();
  g.name = 'critterDiaper';
  g.position.copy(torsoLocal(c, v3(0, spec.y, spec.z)));

  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), M.diaperWhite);
  shell.name = 'diaperShell';
  shell.scale.set(spec.rx * 1.14, spec.ry * 1.10, spec.rz * 1.18);
  g.add(shell);

  const waist = new THREE.Mesh(new THREE.TorusGeometry(1, .14, 14, 36), M.diaperTrim);
  waist.name = 'diaperWaistband';
  waist.rotation.x = Math.PI / 2;
  waist.position.set(0, spec.ry * .62, 0);
  waist.scale.set(spec.rx * 1.08, spec.rz * 1.12, spec.ry * .78);
  g.add(waist);

  const frontPad = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), M.diaperWhite);
  frontPad.name = 'diaperFrontPad';
  frontPad.position.set(0, -spec.ry * .04, spec.rz * .88);
  frontPad.scale.set(spec.rx * .74, spec.ry * .84, spec.rz * .40);
  g.add(frontPad);

  [-1, 1].forEach((s) => {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(.48, .11, 10, 24), M.diaperTrim);
    cuff.name = s < 0 ? 'leftLegCuff' : 'rightLegCuff';
    cuff.position.set(s * spec.rx * .58, -spec.ry * .55, spec.rz * .12);
    cuff.rotation.set(Math.PI * .38, s * .42, 0);
    cuff.scale.set(spec.rx, spec.rz, spec.ry);
    g.add(cuff);

    const tabScale = Math.max(.72, spec.rx * 2.8);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(.055 * tabScale, .085 * tabScale, .11 * tabScale), M.tabBlue);
    tab.name = s < 0 ? 'leftFastenerTab' : 'rightFastenerTab';
    tab.position.set(s * spec.rx * 1.04, spec.ry * .22, spec.rz * .32);
    tab.rotation.y = s * .35;
    g.add(tab);

    const btn = new THREE.Mesh(new THREE.SphereGeometry(.032 * tabScale, 12, 10), M.tabYellow);
    btn.position.set(s * spec.rx * .86, spec.ry * .22, spec.rz * .68);
    g.add(btn);
  });

  const badge = new THREE.Mesh(new THREE.OctahedronGeometry(Math.max(.038, spec.rx * .16), 0), M.badgePink);
  badge.name = 'diaperFrontBadge';
  badge.scale.set(1, 1, .45);
  badge.position.set(0, spec.ry * .16, spec.rz * 1.20);
  g.add(badge);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.noDecal = true; o.userData.isDecal = true; } });
  return g;
}
function attachDiaperMesh(c, meta, animate = true) {
  if (!c || !c.parts || !c.parts.torso) return null;
  const old = c.parts.torso.getObjectByName('critterDiaper');
  if (old) c.parts.torso.remove(old);
  const diaper = buildDiaperMesh(c, meta);
  c.parts.torso.add(diaper);
  if (c === game.critter) game.diaperFitted = true;
  if (animate) {
    diaper.scale.setScalar(.05);
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 480);
      const s = k < .75 ? (k / .75) * 1.14 : 1.14 - ((k - .75) / .25) * .14;
      diaper.scale.setScalar(Math.max(.05, s));
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }
  return diaper;
}

/* ---------- 3D small farts & 3D mushroom-cloud mega fart ---------- */
const fartClouds = [];
function clearFartClouds() {
  while (fartClouds.length) { const c = fartClouds.pop(); if (c.parent) c.parent.remove(c); }
}
function critterRearWorldPos() {
  if (!game.critter) return v3(0, .9, -.25);
  const p = critterCenterWorld(game.critter);
  const h = game.frame.h;
  const back = v3(0, -.15 * h, -.28 * Math.max(.8, h * .7)).applyAxisAngle(v3(0, 1, 0), turntable.rotation.y);
  return p.add(back);
}
function spawnSmallFart3D() {
  const pos = critterRearWorldPos();
  for (let i = 0; i < 9; i++) {
    spawn(TEX.puff, pos.clone().add(v3(rnd(-.08, .08), rnd(-.06, .06), rnd(-.08, .08))), {
      vel: v3(rnd(-.45, .45), rnd(.18, .65), rnd(-.55, -.12)), life: rnd(1.0, 1.6), size: rnd(.11, .20), grow: 1.3, opacity: .85,
      color: pick(['#a9e34b', '#c0eb75', '#82c91e', '#d8f5a2']),
    });
  }
  const g = new THREE.Group();
  g.name = 'smallFartCloud';
  g.position.copy(pos);
  const puffMat = std({ color: '#a9e34b', emissive: '#5c940d', emissiveIntensity: .35, roughness: .7, transparent: true, opacity: .85 });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(rnd(.07, .12), 14, 10), puffMat);
    m.position.set(rnd(-.09, .09), rnd(-.05, .08), rnd(-.09, .05));
    g.add(m);
  }
  g.userData = { isMega: false, t: 0, life: 1.15, mat: puffMat };
  scene.add(g);
  fartClouds.push(g);
  return g;
}
function spawnMushroomCloudMegaFart() {
  const cloud = new THREE.Group();
  cloud.name = 'mushroomCloudMegaFart';
  const h = game.frame.h, s = clamp(h / 1.5, .8, 1.35);
  cloud.position.set(0, HOLDER_Y + .1, -.55);
  cloud.scale.setScalar(s);

  const stemMat = std({ color: '#9fd62e', emissive: '#5c940d', emissiveIntensity: .5, roughness: .6, transparent: true, opacity: .94 });
  const capMat = std({ color: '#74b816', emissive: '#3f7d0a', emissiveIntensity: .5, roughness: .5, transparent: true, opacity: .96 });
  const rimMat = std({ color: '#5c940d', emissive: '#2b8a3e', emissiveIntensity: .35, roughness: .55, transparent: true, opacity: .92 });
  const emberMat = std({ color: '#8fbf1f', emissive: '#e8590c', emissiveIntensity: .15, roughness: .55, transparent: true, opacity: .92 });
  const waveMat = std({ color: '#d8f5a2', emissive: '#82c91e', emissiveIntensity: .7, roughness: .4, transparent: true, opacity: .9, side: THREE.DoubleSide });

  // 1. Rising 3D stem column with billowing rings
  const stem = new THREE.Group(); stem.name = 'stem';
  const col = new THREE.Mesh(new THREE.CylinderGeometry(.26, .42, 1.85, 24), stemMat); col.position.y = .92; stem.add(col);
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.30 - i * .015, .10, 12, 22), rimMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = .28 + i * .27; stem.add(ring);
  }
  cloud.add(stem);

  // 2. Expanding glowing mushroom cap
  const cap = new THREE.Group(); cap.name = 'cap'; cap.position.y = 1.92;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.88, 32, 24), capMat); dome.scale.set(1.22, .72, 1.22); cap.add(dome);
  const underRim = new THREE.Mesh(new THREE.TorusGeometry(.78, .25, 16, 32), emberMat); underRim.rotation.x = Math.PI / 2; underRim.position.y = -.18; cap.add(underRim);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(.32, 16, 12), i % 2 ? capMat : rimMat);
    lobe.position.set(Math.cos(a) * .76, -.05 + (i % 2) * .12, Math.sin(a) * .76); cap.add(lobe);
  }
  const glowLight = new THREE.PointLight('#b9f06a', 3.2, 6, 1.4); glowLight.position.set(0, .2, .4); cap.add(glowLight);
  cloud.add(cap);

  // 3. Ground shockwave ring
  const shockwave = new THREE.Group(); shockwave.name = 'shockwave'; shockwave.position.y = .04 - .1 / s; // stays on the turntable surface
  const torusWave = new THREE.Mesh(new THREE.TorusGeometry(.68, .065, 12, 48), waveMat); torusWave.rotation.x = Math.PI / 2; shockwave.add(torusWave);
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(.42, .62, 36), waveMat); innerRing.rotation.x = -Math.PI / 2; shockwave.add(innerRing);
  cloud.add(shockwave);

  cloud.userData = { isMega: true, t: 0, life: 4.2, stem, cap, shockwave, mats: [stemMat, capMat, rimMat, waveMat, emberMat], light: glowLight, s };
  scene.add(cloud);
  fartClouds.push(cloud);

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    spawn(TEX.puff, v3(Math.cos(a) * .4, HOLDER_Y + .3 + (i % 4) * .45, -.2 + Math.sin(a) * .4), {
      vel: v3(Math.cos(a) * rnd(.4, .9), rnd(.35, 1.1), Math.sin(a) * rnd(.4, .9)), life: rnd(1.8, 2.8), size: rnd(.18, .32), grow: 1.4, opacity: .9,
      color: pick(['#d8f5a2', '#a9e34b', '#69db7c', '#b2f2bb']),
    });
  }
  return cloud;
}
function updateFartClouds(dt) {
  for (let i = fartClouds.length - 1; i >= 0; i--) {
    const c = fartClouds[i], u = c.userData;
    u.t += dt;
    const p = u.t / u.life;
    if (u.isMega) {
      const rise = ease(Math.min(1, u.t / .45));
      u.stem.scale.set(1 + u.t * .08, rise * (1 + u.t * .06), 1 + u.t * .08);
      u.cap.position.y = .5 + rise * 1.2 + u.t * .08;
      const capScale = (.35 + .65 * rise) * (1 + u.t * .06);
      u.cap.scale.setScalar(capScale);
      u.cap.rotation.y += dt * .45;
      const waveScale = .55 + ease(Math.min(1, u.t / 1.4)) * 2.15;
      u.shockwave.scale.set(waveScale, 1, waveScale);
      const fade = p > .74 ? Math.max(0, 1 - (p - .74) / .26) : 1;
      u.mats.forEach((m, idx) => { m.opacity = (idx === 3 ? Math.max(0, 1 - p * 1.1) : .94) * fade; });
      // (index 3 is the shockwave material, which fades out first)
      if (u.light) u.light.intensity = 4.5 * fade;
    } else {
      c.position.y += dt * .38;
      c.scale.setScalar(1 + u.t * 1.1);
      if (u.mat) u.mat.opacity = .85 * Math.max(0, 1 - p);
    }
    if (u.t >= u.life) { if (c.parent) c.parent.remove(c); fartClouds.splice(i, 1); }
  }
}
function renderFartBtn() {
  const btn = $('fartBtn'); if (!btn) return;
  const mega = game.fartCharge >= 10;
  $('fartCount').textContent = `${game.fartCharge}/10`;
  $('fartFill').style.width = `${Math.min(100, (game.fartCharge / 10) * 100)}%`;
  $('fartIcon').textContent = mega ? '🍄' : '💨';
  $('fartLabel').textContent = mega ? '蘑菇云大屁!' : '放小屁';
  btn.classList.toggle('mega', mega);
}
function triggerFart() {
  audio();
  if (game.paused || !game.critter) return null;
  if (game.fartCharge < 10) {
    game.fartCharge++;
    playFartSfx(false);
    spawnSmallFart3D();
    game.wobble = .11;
    renderFartBtn();
    if (game.fartCharge === 10) { bubble('⚡ ' + lineFor('fart-ready', '十个小屁蓄满啦！再按一下发射超级蘑菇云大屁！'), 3200); say('fart-ready'); }
    else bubble(`💨 噗噗~ 放了个小屁！(${game.fartCharge}/10)` + pick(['', ' 嘻嘻！', ' 好臭呀！', ' 咯咯咯！']), 1800);
    return { type: 'small', charge: game.fartCharge, activeMushroomClouds: fartClouds.filter((c) => c.userData.isMega).length };
  }
  game.fartCharge = 0;
  playFartSfx(true);
  const cloud = spawnMushroomCloudMegaFart();
  game.wobble = .20; game.fartBounce = .48;
  game.camOverrideUntil = performance.now() + 3600; // wall-clock so slow software GL doesn't stretch the pull-back
  renderFartBtn();
  addStars(1, cloud.position.clone().add(v3(0, 1.8, 0)));
  bubble('🍄 ' + lineFor('fart-mega', '轰隆隆！超级蘑菇云大屁发射啦！太搞笑啦！'), 3800); say('fart-mega');
  return { type: 'mega', charge: game.fartCharge, activeMushroomClouds: fartClouds.filter((c) => c.userData.isMega).length };
}

/* ---------- special damages: faded colors, dull prop / tipped flowerpot, lost eye gem, loose braid/gat, demon-mark cracks ---------- */
function collectBodyMats(root) {
  const mats = new Set();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.noDecal || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    list.forEach((m) => { if (m && m.isMeshStandardMaterial && m.color) mats.add(m); });
  });
  return [...mats];
}
function applyFaded(root, on) {
  const mats = collectBodyMats(root);
  mats.forEach((m) => { m.userData.orig = m.color.clone(); });
  game.fadedMats = mats;
  game.faded = on ? 0 : 1;
}
function updateFadedColors() {
  if (!game.fadedMats) return;
  const k = ease(game.faded);
  game.fadedMats.forEach((m) => {
    const o = m.userData.orig; if (!o) return;
    const l = o.r * .3 + o.g * .59 + o.b * .11;
    const grey = new THREE.Color(l * .78 + .16, l * .76 + .15, l * .74 + .15);
    m.color.copy(grey).lerp(o, k);
  });
}
function propParts(root) {
  const g = root.parts.signatureProp || root.parts.flowerpot;
  const mats = [];
  if (g) {
    const seen = new Set();
    g.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => {
        if (!m || !m.isMeshStandardMaterial || seen.has(m)) return;
        seen.add(m);
        m.userData.c0 = m.color.clone();
        m.userData.e0 = m.emissiveIntensity || 0;
        mats.push(m);
      });
    });
  }
  const light = root.pendantLight || null;
  return { g, mats, light, l0: light ? (light.userData.l0 ?? (light.userData.l0 = light.intensity)) : 0, isFlowerpot: !!(g && g.userData && g.userData.isFlowerpot) };
}
function updateProp() {
  if (!game.prop || !game.prop.g) return;
  const k = ease(game.propShine);
  if (game.prop.isFlowerpot && typeof game.prop.g.userData.onPolishProgress === 'function') {
    game.prop.g.userData.onPolishProgress(game.propShine);
  } else {
    game.prop.mats.forEach((m) => {
      const o = m.userData.c0, l = o.r * .3 + o.g * .59 + o.b * .11;
      m.emissiveIntensity = m.userData.e0 * k;
      m.color.copy(new THREE.Color(l * .55 + .18, l * .55 + .17, l * .55 + .16)).lerp(o, k);
    });
  }
  if (game.prop.light) game.prop.light.intensity = game.prop.l0 * (.15 + .85 * k);
}
function makeSocket(eg) {
  const b = localBounds(eg);
  const size = b.getSize(v3()), center = b.getCenter(v3());
  const s = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M.socket);
  s.name = 'emptyEyeSocket';
  s.scale.set(Math.max(.02, size.x * .52), Math.max(.02, size.y * .52), Math.max(.012, size.z * .3));
  s.position.copy(eg.position).add(center.applyQuaternion(eg.quaternion).multiply(eg.scale));
  s.quaternion.copy(eg.quaternion);
  s.userData.noDecal = true; s.userData.isDecal = true;
  eg.parent.add(s);
  return s;
}
function addEyeGemDamage(c) {
  const eyes = c.parts.eyes; if (!eyes || !eyes.children.length) return null;
  const side = pick(['leftEye', 'rightEye']);
  const eg = eyes.children.find((o) => o.name === side) || eyes.children.find((o) => /eye/i.test(o.name || '')) || eyes.children[0];
  eg.visible = false;
  const socket = makeSocket(eg);
  game.eye = { group: eg, socket };
  const d = { type: 'eye_gem', anchor: socket, hp: 1, done: false, id: game.damages.length, noFacing: true };
  game.damages.push(d);
  return d;
}
function loosePartKey(id, meta) {
  const p = game.critter.parts;
  const pref = LOOSE_PART[id];
  if (pref && p[pref]) return pref;
  if (p[meta.earSide]) return meta.earSide;
  return ['leftEar', 'rightEar', 'tail'].find((k) => p[k]) || null;
}
function addLooseDamage(c, id, meta) {
  const key = loosePartKey(id, meta); if (!key) return null;
  const part = c.parts[key];
  part.traverse((o) => { o.userData.noDecal = true; });
  const info = { key, obj: part, parent: part.parent, p: part.position.clone(), q: part.quaternion.clone(), s: part.scale.clone(), t: -1 };
  scene.attach(part);
  const size = localBounds(part).getSize(v3());
  const big = Math.max(size.x, size.y, size.z);
  const sc = big > .9 ? .55 : .8;
  part.position.set(1.55, HOLDER_Y + .06 + big * sc * .18, .55);
  part.rotation.set(-Math.PI / 2 + .35, 0, .7);
  part.scale.multiplyScalar(sc);
  game.loose = info;
  const d = { type: 'braid_gat', anchor: part, hp: 1, done: false, id: game.damages.length, loose: true, noFacing: true };
  game.damages.push(d);
  return d;
}
function addDemonMarkDamage(c) {
  const seal = c.parts.demonMarkSeal;
  const g = new THREE.Group();
  g.name = 'demonMarkCracks';
  const glow = new THREE.Mesh(new THREE.CircleGeometry(.11, 28), M.crackGlow); glow.position.z = .002; g.add(glow);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rnd(-.2, .2);
    const pts = [v3(0, 0, .012)];
    let r = 0, ang = a;
    for (let k = 1; k <= 4; k++) { r += rnd(.022, .036); ang += rnd(-.45, .45); pts.push(v3(Math.cos(ang) * r, Math.sin(ang) * r, .012 + k * .002)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const crack = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, .0065, 6, false), M.crack);
    crack.scale.setScalar(1);
    g.add(crack);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(.009, 8, 6), M.crack); tip.position.copy(pts[pts.length - 1]); g.add(tip);
  }
  g.traverse((o) => { if (o.isMesh) { o.userData.noDecal = true; o.userData.isDecal = true; } });
  if (seal) {
    seal.updateMatrixWorld(true);
    const wp = seal.getWorldPosition(v3()), wq = seal.getWorldQuaternion(new THREE.Quaternion());
    const n = v3(0, 0, 1).applyQuaternion(wq);
    g.position.copy(wp).addScaledVector(n, .03); g.quaternion.copy(wq);
    scene.add(g); g.updateMatrixWorld(true);
    (seal.parent || c.parts.torso).attach(g);
    if (seal.userData.cracksGroup) seal.userData.cracksGroup.visible = true;
  } else {
    const hit = surfaceHits(c, 1, .2, 'front')[0];
    if (hit) placeOnSurface(g, hit, 0); else { g.position.set(0, .2, .26); c.parts.torso.add(g); }
  }
  const d = { type: 'demon_mark', anchor: g, hp: 1, done: false, id: game.damages.length, useNormal: true, seal };
  game.damages.push(d);
  return d;
}
function sealHonmoonCrest(d) {
  const g = d.anchor, seal = d.seal;
  const p = g.getWorldPosition(v3());
  const t0 = performance.now(), s0 = g.scale.clone();
  const step = () => { const k = Math.min(1, (performance.now() - t0) / 500); g.scale.copy(s0).multiplyScalar(1 - k); if (k < 1) requestAnimationFrame(step); else if (g.parent) g.parent.remove(g); };
  step();
  if (seal) {
    const base = seal.scale.clone(), t1 = performance.now();
    const pulse = () => { const k = Math.min(1, (performance.now() - t1) / 700); seal.scale.copy(base).multiplyScalar(1 + Math.sin(k * Math.PI) * .45); if (k < 1) requestAnimationFrame(pulse); else seal.scale.copy(base); };
    pulse();
    if (seal.userData.cracksGroup) seal.userData.cracksGroup.visible = game.form === 'awakened';
    if (seal.userData.goldMat) { const gm = seal.userData.goldMat, e0 = gm.emissiveIntensity; gm.emissiveIntensity = e0 * 2.2; setTimeout(() => { gm.emissiveIntensity = e0; }, 900); }
  }
  spawn(TEX.ring, p.clone(), { life: 1.1, size: .16, grow: 4.2, opacity: .95, add: true, color: '#ffd166' });
  burst(p, 16, TEX.sparkle, .6, '#ffe08a');
  spawn(TEX.glow, p.clone(), { life: .9, size: .5, grow: 1.5, opacity: .8, add: true, color: '#ffc86b' });
}

/* ============================== Visit lifecycle ============================== */
function clearCritter(keepRoot = false) {
  game.visitVersion = (game.visitVersion || 0) + 1;
  clearFartClouds();
  if (game.loose && game.loose.obj.parent === scene) scene.remove(game.loose.obj);
  if (game.critter && !keepRoot) { game.critter.parent && game.critter.parent.remove(game.critter); game.critter = null; }
  game.damages = []; game.loose = null; game.eye = null; game.prop = null; game.fadedMats = null;
  game.diaperFitted = false; game.fartBounce = 0; game.wobble = 0; game.flat = 1; game.flatTarget = 1; game.faded = 1; game.propShine = 1;
  game.checkupStarted = false; game.heartIn = false; game.accessories = new Set(); game.spinTo = null; game.critterPristine = false;
  Object.keys(loops).forEach((k) => loopNoise(k, false));
}
function previewCritter(id) {
  if (!CHARACTERS[id]) id = 'rumi';
  clearCritter();
  game.meta = CHARACTERS[id]; game.sel = id;
  const c = buildCritter(id);
  placeOnTurntable(c);
  if (c.setForm) c.setForm(game.form);
  game.critter = c; game.anim = 'awake'; game.arrive = 1; game.critterPristine = true;
  renderFormBtn();
  return c;
}
function startVisit(opts = {}) {
  const force = !!(opts && (opts.forceAllDamages || opts.forceAll || opts.all));
  audio();
  music.play('theme');
  const id = CHARACTERS[game.sel] ? game.sel : 'rumi';
  game.meta = CHARACTERS[id];
  let c;
  if (game.critter && game.critter.characterId === id && game.critterPristine) {
    c = game.critter; clearCritter(true);
    c.position.set(0, c.userData.restY, 0); c.rotation.set(0, 0, 0); c.scale.setScalar(1);
  } else {
    clearCritter();
    c = buildCritter(id);
    placeOnTurntable(c);
  }
  if (c.setForm) c.setForm(game.form);
  holder.rotation.y = 0; turntable.rotation.y = 0;
  game.critter = c; game.anim = 'asleep'; game.heartIn = false; game.accessories = new Set(); game.fixedCount = 0; game.checkupStarted = false;
  game.fartCharge = 0; renderFartBtn();
  c.updateMatrixWorld(true);

  // Roll this visit's problems (every visit is different unless the test harness forces all of them).
  const specials = ['eye_gem', 'braid_gat', 'flat_padding', 'faded_outfit', 'weapon_prop'];
  const optional = force ? specials : specials.sort(() => Math.random() - .5).slice(0, 2 + (Math.random() < .5 ? 1 : 0));
  const counts = force
    ? { mud: 2, dust: 2, burr: 2, tear: 1, wet: 1, tangle: 1, patch: 1, eczema: 1 }
    : { mud: 1 + (Math.random() < .6 ? 1 : 0), dust: 1 + (Math.random() < .5 ? 1 : 0), burr: 1 + (Math.random() < .4 ? 1 : 0), tear: 1, wet: Math.random() < .4 ? 1 : 0, tangle: 1, patch: Math.random() < .85 ? 1 : 0, eczema: Math.random() < .85 ? 1 : 0 };
  const withWetPants = force || Math.random() < .85;
  const withDemonMark = force || Math.random() < .85;

  // Loose part first so surface decals never land on a part that is waiting on the table.
  if (optional.includes('braid_gat')) addLooseDamage(c, id, game.meta);
  if (optional.includes('eye_gem')) addEyeGemDamage(c);
  if (withDemonMark) addDemonMarkDamage(c);
  surfaceHits(c, counts.tangle, .25, 'front').forEach((h) => addDamage('tangle', h));
  surfaceHits(c, counts.patch, .25, 'front').forEach((h) => addDamage('patch', h));
  surfaceHits(c, counts.tear, .3, 'front').forEach((h) => addDamage('tear', h));
  surfaceHits(c, counts.mud, .28).forEach((h) => addDamage('mud', h));
  surfaceHits(c, counts.dust, .28).forEach((h) => addDamage('dust', h));
  surfaceHits(c, counts.burr, .26).forEach((h) => addDamage('burr', h));
  if (counts.wet) surfaceHits(c, counts.wet, .24).forEach((h) => addDamage('wet', h));
  if (counts.eczema) {
    let hits = surfaceHits(c, 1, .2, 'front');
    if (!hits.length) hits = surfaceHits(c, 1, .1);
    hits.forEach((h) => addDamage('eczema', h));
  }
  if (withWetPants) addWetPantsDamage(c, game.meta);

  if (optional.includes('flat_padding')) { game.flat = 0; game.flatTarget = 0; game.damages.push({ type: 'flat_padding', anchor: c.parts.torso, hp: 4, done: false, id: game.damages.length, body: true }); }
  else { game.flat = 1; game.flatTarget = 1; }
  applyFaded(c, optional.includes('faded_outfit'));
  if (optional.includes('faded_outfit')) game.damages.push({ type: 'faded_outfit', anchor: c.parts.head, hp: 1, done: false, id: game.damages.length, body: true });
  game.prop = propParts(c);
  game.propShine = optional.includes('weapon_prop') && game.prop.g ? 0 : 1;
  if (optional.includes('weapon_prop') && game.prop.g) game.damages.push({ type: 'weapon_prop', anchor: game.prop.g, hp: 1, done: false, id: game.damages.length, noFacing: true });
  updateFadedColors(); updateProp();

  game.total = game.damages.length;
  game.state = 'repair'; game.arrive = 0; game.tool = null;
  setCam('near');
  $('home').classList.add('hidden');
  ['ticket', 'toolbox', 'turn', 'fartBtn', 'pauseBtn', 'stopBtn'].forEach((k) => $(k).classList.remove('hidden'));
  $('dress').classList.add('hidden'); $('endVeil').classList.add('hidden');
  $('tkIcon').src = thumbFor(id); $('tkName').textContent = game.meta.name; $('tkWho').textContent = whoOf(game.meta);
  selectTool(null);
  renderTools(); renderTicket(); renderFormBtn();
  const visitVersion = game.visitVersion;
  setTimeout(() => { if (game.visitVersion !== visitVersion || game.state !== 'repair') return; bubble(helloOf(game.meta), 4600); say(`${id}-hello`); }, 1200);
  game.before = null; game.needBefore = true; // captured by the frame loop once the arrival drop has landed
  return game.damages.length;
}

/* ============================== HUD ============================== */
function renderTools() {
  const allFixed = game.state === 'repair' && game.damages.length > 0 && game.damages.every((d) => d.done);
  $('tools').innerHTML = TOOLS.filter((t) => (t.id !== 'heart' || allFixed) && (t.id !== 'checkup' || game.checkupStarted)).map((t) =>
    `<button type="button" class="tool ${game.tool === t.id ? 'sel' : ''} ${t.id === 'heart' ? 'heart glow' : ''}" data-t="${t.id}" title="${t.tip || t.name}"><div class="face">${t.icon}</div><span>${t.name}</span></button>`).join('');
  $('tools').querySelectorAll('.tool').forEach((el) => { el.onclick = () => { const next = game.tool === el.dataset.t ? null : el.dataset.t; selectTool(next); tone(620, 780, .1, .03); if (next && TOOL[next].tip) bubble(`${TOOL[next].icon} ${TOOL[next].name}：${TOOL[next].tip}`, 2400); }; });
}
function selectTool(id) {
  id = normTool(id);
  if (id && !TOOL[id]) id = null;
  game.tool = id;
  document.querySelectorAll('#tools .tool').forEach((el) => el.classList.toggle('sel', el.dataset.t === id));
  $('cursor').textContent = id ? TOOL[id].icon : '';
  canvas.classList.toggle('tool', !!id);
  if (game.state === 'repair' && music.cur !== 'party') music.play(id === 'needle' ? 'sew' : 'theme');
}
function dmgIcon(type) {
  if (type === 'weapon_prop' && game.prop && game.prop.isFlowerpot) return '🪴';
  return DMG[type].icon;
}
function dmgLabel(type) {
  if (type === 'weapon_prop' && game.prop && game.prop.isFlowerpot) return '翻倒花盆';
  return DMG[type].label;
}
function renderTicket() {
  const byType = {};
  game.damages.forEach((d) => { (byType[d.type] = byType[d.type] || { left: 0, all: 0 }); byType[d.type].all++; if (!d.done) byType[d.type].left++; });
  $('chips').innerHTML = DMG_ORDER.filter((k) => byType[k]).map((k) => {
    const b = byType[k];
    return `<div class="chip ${b.left ? '' : 'done'}" data-k="${k}" role="button" tabindex="0"><i>${dmgIcon(k)}</i>${dmgLabel(k)}<span class="n">${b.left ? b.left : '✓'}</span></div>`;
  }).join('');
  $('chips').querySelectorAll('.chip').forEach((el) => { el.onclick = () => findDamage(el.dataset.k); });
  const done = game.damages.filter((d) => d.done).length;
  $('heartFill').style.width = `${(done / Math.max(1, game.damages.length)) * 100}%`;
}
// Turntable angle that brings a damage spot to face the camera (normal-based for decals, position-based otherwise).
function damageTargetAngle(d) {
  if (!d || !d.anchor || d.loose || d.body) return null;
  d.anchor.updateMatrixWorld(true);
  const ttInv = turntable.getWorldQuaternion(new THREE.Quaternion()).invert();
  let local;
  if (d.useNormal) {
    local = v3(0, 0, 1).applyQuaternion(d.anchor.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(ttInv);
    if (Math.hypot(local.x, local.z) < .08) local = turntable.worldToLocal(d.anchor.getWorldPosition(v3()));
  } else {
    local = turntable.worldToLocal(d.anchor.getWorldPosition(v3()));
  }
  if (Math.hypot(local.x, local.z) < .02) return null;
  const target = -Math.atan2(local.x, local.z);
  let delta = target - turntable.rotation.y; delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  return turntable.rotation.y + delta;
}
function findDamage(type, instant = false) {
  type = normDmg(type);
  const d = game.damages.find((x) => x.type === type && !x.done);
  if (!d) return false;
  const toolId = DMG[type].tool;
  const toolEl = document.querySelector(`#tools .tool[data-t="${toolId}"]`);
  if (toolEl) { toolEl.classList.remove('wiggle'); void toolEl.offsetWidth; toolEl.classList.add('wiggle'); }
  const chip = document.querySelector(`#chips .chip[data-k="${type}"]`);
  if (chip) { chip.classList.remove('flash'); void chip.offsetWidth; chip.classList.add('flash'); }
  const target = damageTargetAngle(d);
  if (target != null) {
    if (instant) { turntable.rotation.y = target; game.spinTo = target; turntable.updateMatrixWorld(true); }
    else game.spinTo = target;
    setTimeout(() => { if (d.anchor) burst(d.anchor.getWorldPosition(v3()), 6); }, instant ? 50 : 900);
  } else if (d.anchor) {
    burst(d.anchor.getWorldPosition(v3()), 6);
  }
  bubble(`试试 ${TOOL[toolId].icon} ${TOOL[toolId].name} 吧！`, 2200);
  return true;
}
let bubbleTimer = 0;
function bubble(text, ms = 2400) {
  const b = $('bubble'); b.textContent = text; b.classList.remove('hidden'); b.style.opacity = 1;
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { b.style.opacity = 0; setTimeout(() => b.classList.add('hidden'), 400); }, ms);
}
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.remove('hidden'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), 2200); }
function addStars(n, from) {
  save.stars += n; persist(); $('stars').textContent = save.stars;
  const pill = $('starPill'); pill.classList.remove('pop'); void pill.offsetWidth; pill.classList.add('pop');
  if (from) spawn(TEX.star, from.clone(), { to: camera.position.clone().add(v3(2.2, 1.4, -2.5)), life: 1.1, size: .16 });
}

/* ============================== Repair actions ============================== */
function screenOf(obj, out = new THREE.Vector2()) {
  obj.getWorldPosition(tmpV); tmpV.project(camera);
  const r = canvas.getBoundingClientRect();
  out.set((tmpV.x + 1) / 2 * r.width + r.left, (1 - tmpV.y) / 2 * r.height + r.top);
  return out;
}
function facing(d) {
  if (d.noFacing || d.loose) return true;
  const obj = d.anchor;
  obj.getWorldPosition(tmpV); obj.getWorldQuaternion(tmpQ);
  const n = tmpV2.set(0, 0, 1).applyQuaternion(tmpQ);
  return n.dot(camera.position.clone().sub(tmpV).normalize()) > -.05;
}
function nearestDamage(x, y, types, radius = 78) {
  let best = null, bd = radius;
  const sp = new THREE.Vector2();
  game.damages.forEach((d) => {
    if (d.done || d.body || (types && !types.includes(d.type))) return;
    if (!facing(d)) return;
    screenOf(d.anchor, sp);
    const dist = Math.hypot(sp.x - x, sp.y - y);
    if (dist < bd) { bd = dist; best = d; }
  });
  return best;
}
function hitCritter(x, y) {
  if (!game.critter) return null;
  const r = canvas.getBoundingClientRect();
  raycaster.far = Infinity;
  raycaster.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
  const hit = raycaster.intersectObject(game.critter, true)[0];
  if (hit) return hit;
  const ts = screenOf(game.critter.parts.torso), hs = screenOf(game.critter.parts.head);
  if (Math.hypot(ts.x - x, ts.y - y) < 110 || Math.hypot(hs.x - x, hs.y - y) < 110) {
    return { point: game.critter.parts.torso.getWorldPosition(v3()), object: game.critter.parts.torso };
  }
  return null;
}
function fixed(d, where) {
  if (d.done) return;
  d.done = true; game.fixedCount++;
  addStars(1, where);
  chime([659, 784, 988]);
  if (Math.random() < .6) bubble(pick(CHEERS), 1800);
  renderTicket();
  if (game.damages.every((x) => x.done)) {
    if (!game.checkupStarted) {
      game.checkupStarted = true;
      ['head', 'torso', 'leftLeg'].forEach((part) => {
        const host = game.critter.parts[part] || game.critter.parts.torso;
        const b = localBounds(host);
        const marker = new THREE.Group(); marker.name = 'checkupRing';
        marker.position.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, b.max.z + .03);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.07, .014, 8, 28), M.ringPink);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(.105, .008, 8, 32), M.ringPink); ring2.position.z = -.004;
        marker.add(ring, ring2);
        marker.traverse((o) => { o.userData.noDecal = true; o.userData.isDecal = true; });
        host.add(marker);
        game.damages.push({ type: 'checkup', anchor: marker, hp: 1, done: false, id: game.damages.length, noFacing: true });
      });
      game.spinTo = Math.round(turntable.rotation.y / (Math.PI * 2)) * Math.PI * 2;
      renderTicket(); renderTools(); selectTool('checkup');
      bubble('🩺 ' + lineFor('checkup-start', '最后做个律动听诊检查吧！用听诊器点一点三个发光小圈圈。'), 5000);
      say('checkup-start');
      return;
    }
    renderTools();
    const visitVersion = game.visitVersion;
    setTimeout(() => { if (game.visitVersion !== visitVersion || game.state !== 'repair') return; bubble('💝 ' + lineFor('heart-ready', '全部修好啦！现在点一点魂门舞台唤醒爱心，让我们重返闪耀舞台吧！'), 4600); say('heart-ready'); }, 700);
  }
}
function removeDecal(d, flyTo) {
  const g = d.anchor, start = g.getWorldPosition(v3());
  if (flyTo) {
    scene.attach(g);
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 900);
      g.position.lerpVectors(start, flyTo, ease(k)); g.position.y += Math.sin(k * Math.PI) * .6;
      g.scale.setScalar(1 - k * .6); g.rotation.z += .08;
      if (k < 1) requestAnimationFrame(step); else scene.remove(g);
    };
    step();
  } else {
    const t0 = performance.now(), s0 = g.scale.clone();
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 450); g.scale.copy(s0).multiplyScalar(1 - k); if (k < 1) requestAnimationFrame(step); else g.parent && g.parent.remove(g); };
    step();
  }
}
function restoreLoosePart(d) {
  const e = game.loose; if (!e || e.t >= 0) return false;
  e.t = 0;
  e.from = { p: e.obj.position.clone(), q: e.obj.quaternion.clone(), s: e.obj.scale.clone() };
  tone(700, 1100, .2, .04, 'triangle'); noise(3000, 3, .03, .12);
  for (let i = 0; i < 4; i++) tone(880 + i * 120, 1320 + i * 120, .1, .03, 'triangle', .12 + i * .14);
  bubble(game.sel === 'rumi' ? '🎀 紫龙长辫编回去啦，闪闪发光！' : game.sel === 'jinu' || game.sel === 'sussie_magpie' ? '🎩 黑笠端端正正戴好啦！' : '🎀 缝回去啦，又神气又帅气！', 2400);
  fixed(d, e.obj.getWorldPosition(v3()));
  return true;
}
function updateLoose(dt) {
  const e = game.loose; if (!e || e.t < 0 || e.t >= 1.5) return;
  e.t = Math.min(1, e.t + dt / 1.1);
  const target = new THREE.Matrix4().compose(e.p, e.q, e.s).premultiply(e.parent.matrixWorld);
  const tp = v3(), tq = new THREE.Quaternion(), ts = v3();
  target.decompose(tp, tq, ts);
  const k = ease(e.t);
  e.obj.position.lerpVectors(e.from.p, tp, k); e.obj.position.y += Math.sin(k * Math.PI) * .5;
  e.obj.quaternion.slerpQuaternions(e.from.q, tq, k); e.obj.scale.lerpVectors(e.from.s, ts, k);
  if (Math.random() < .35) spawn(TEX.sparkle, e.obj.getWorldPosition(v3()), { vel: v3(0, .1, 0), life: .8, size: .06, add: true, color: '#ffe08a' });
  if (e.t >= 1) {
    e.parent.add(e.obj); e.obj.position.copy(e.p); e.obj.quaternion.copy(e.q); e.obj.scale.copy(e.s);
    e.t = 2; burst(e.obj.getWorldPosition(v3()), 10, TEX.sparkle, .5, '#ffe08a');
  }
}
// Hold tools: called every frame while pressed (and directly by the test harness with a dt).
function holdTool(x, y, dt) {
  const t = game.tool;
  if (!t || game.state !== 'repair') return;
  if (t === 'airbrush') {
    const d = game.damages.find((q) => q.type === 'faded_outfit' && !q.done);
    const hit = hitCritter(x, y);
    if (hit) {
      loopNoise('spray', true, 3200, 'highpass', .03);
      if (Math.random() < .5) spawn(TEX.spray, hit.point.clone().add(v3(rnd(-.05, .05), rnd(-.05, .05), .05)), { vel: v3(rnd(-.1, .1), rnd(-.05, .1), rnd(-.1, .1)), life: 1, size: .12, grow: 1.2, opacity: .5, color: pick(['#ffd1e8', '#d6c8ff', '#fff1b8', '#b8f5ff']) });
      if (d) { game.faded = Math.min(1, game.faded + dt / 2.4); updateFadedColors(); if (game.faded >= 1) { fixed(d, hit.point); if (game.critter.setForm) game.critter.setForm(game.form); bubble('🎨 舞台颜色又闪亮啦，像新的一样！', 2200); } }
    } else loopNoise('spray', false);
    return;
  }
  if (t === 'polish') {
    const d = game.damages.find((q) => q.type === 'weapon_prop' && !q.done);
    if (d) {
      const sp = screenOf(d.anchor);
      const hit = Math.hypot(sp.x - x, sp.y - y) < 120 ? true : (() => { const h = hitCritter(x, y); let on = false; if (h && h.object) { for (let n = h.object; n; n = n.parent) if (n === d.anchor) { on = true; break; } } return on; })();
      if (hit) {
        rubSfx('polish');
        game.propShine = Math.min(1, game.propShine + dt / 2.0); updateProp();
        const wp = d.anchor.getWorldPosition(v3());
        if (Math.random() < .25) burst(wp, 1, TEX.sparkle, .3, '#ffe08a');
        if (game.propShine >= 1) {
          burst(wp, 14, TEX.sparkle, .6, '#ffe08a'); spawn(TEX.ring, wp.clone(), { life: 1, size: .14, grow: 3.5, opacity: .9, add: true, color: '#ffd166' });
          if (game.prop.isFlowerpot) { bubble('🪴 ' + lineFor('flowerpot-fixed', '哇，青花瓷牡丹花盆扶正啦，大牡丹花开得好漂亮呀！'), 3000); say('flowerpot-fixed'); }
          else bubble('🗡️ 法器擦得亮晶晶，闪耀魂门金光！', 2200);
          fixed(d, wp);
          if (game.critter.setForm) game.critter.setForm(game.form);
        }
      }
    }
    return;
  }
  if (t === 'honmoon_balm') {
    const d = nearestDamage(x, y, ['demon_mark'], 110);
    if (!d) return;
    rubSfx('honmoon_balm');
    d.hp -= dt / 1.8;
    const p = d.anchor.getWorldPosition(v3());
    d.anchor.scale.setScalar(.3 + .7 * Math.max(0, d.hp));
    if (Math.random() < .45) spawn(TEX.sparkle, p.clone().add(v3(rnd(-.08, .08), rnd(-.06, .08), .06)), { vel: v3(rnd(-.12, .12), rnd(.1, .25), .06), life: .9, size: .07, add: true, color: pick(['#ffd166', '#fff1b8', '#f0abfc']) });
    if (Math.random() < .3) spawn(TEX.soft, p.clone(), { vel: v3(rnd(-.05, .05), rnd(.05, .15), .05), life: 1, size: .1, grow: .6, opacity: .6, color: '#ffe8a3' });
    if (d.hp <= 0) {
      sealHonmoonCrest(d);
      chime([784, 988, 1175, 1568], .1, .05);
      bubble('✨ ' + lineFor('honmoon-sealed', '涂上魂门金印膏，猎魔印记变成闪闪发光的金色魂门徽章啦！'), 3000); say('honmoon-sealed');
      fixed(d, p);
    }
    return;
  }
  const type = { brush: 'dust', sponge: 'mud', dryer: 'wet', comb: 'tangle', moisture: 'eczema' }[t];
  if (!type) return;
  if (t === 'dryer') loopNoise('dryer', true, 650, 'lowpass', .045); else rubSfx(t);
  const d = nearestDamage(x, y, [type], 95);
  if (!d) return;
  d.hp -= dt / (t === 'dryer' ? 1.3 : t === 'moisture' ? 1.35 : 1.6);
  const p = d.anchor.getWorldPosition(v3());
  d.anchor.scale.setScalar(.35 + .65 * Math.max(0, d.hp));
  if (t === 'sponge' && Math.random() < .25) spawn(TEX.bubble, p.clone().add(v3(rnd(-.08, .08), rnd(-.02, .06), .06)), { vel: v3(rnd(-.05, .05), rnd(.12, .25), rnd(-.02, .05)), life: rnd(1.8, 2.8), size: rnd(.05, .09), grow: .3 });
  if ((t === 'brush' || t === 'comb') && Math.random() < .18) spawn(TEX.puff, p.clone(), { vel: v3(rnd(-.25, .25), rnd(.05, .2), .15), life: 1.6, size: .1, grow: .8, opacity: .8 });
  if (t === 'dryer' && Math.random() < .2) spawn(TEX.soft, p.clone(), { vel: v3(rnd(-.1, .1), .3, .1), life: 1.2, size: .08, grow: 1.5, opacity: .35 });
  if (t === 'moisture' && Math.random() < .38) {
    spawn(TEX.soft, p.clone().add(v3(rnd(-.07, .07), rnd(-.05, .05), .05)), { vel: v3(rnd(-.08, .08), rnd(.05, .16), rnd(.02, .08)), life: rnd(.9, 1.4), size: rnd(.06, .1), grow: .5, opacity: .85, color: pick(['#fffef8', '#d6f8ec', '#e3f4ff']) });
    if (Math.random() < .45) spawn(TEX.sparkle, p.clone().add(v3(rnd(-.08, .08), rnd(-.06, .08), .06)), { vel: v3(rnd(-.12, .12), rnd(.08, .22), .06), life: .85, size: .065, add: true, color: '#9ef2d2' });
  }
  if (d.hp <= 0) {
    removeDecal(d);
    if (type === 'mud') {
      // Washing leaves the costume wet: a water drop appears to dry (a tiny chain reaction).
      const hit = { point: p, normal: tmpV2.set(0, 0, 1).applyQuaternion(d.anchor.getWorldQuaternion(tmpQ)).clone(), object: d.anchor.parent || game.critter };
      if (hit.object && hit.object !== scene) { const w = addDamage('wet', hit); w.anchor.scale.setScalar(.9); game.total++; renderTicket(); }
    }
    if (type === 'eczema') { burst(p, 8, TEX.sparkle, .5, '#9ef2d2'); bubble('🧴 ' + lineFor('eczema-healed', '涂上凉凉的保湿霜，红红的湿疹消退啦，小皮肤滑溜溜！'), 2600); say('eczema-healed'); }
    if (type === 'tangle') bubble('🪮 头发顺滑又蓬松，舞台造型完成！', 2000);
    fixed(d, p);
  }
}
// Tap tools (one press = one action). Returns true when the tap did something.
function tapTool(x, y) {
  const t = game.tool;
  if (!t) return false;
  const hit = hitCritter(x, y);
  if (t === 'heart') {
    if (game.state === 'repair' && hit && game.damages.length && game.damages.every((d) => d.done) && !game.heartIn) wakeUp(hit.point);
    return true;
  }
  if (game.state !== 'repair') return false;
  if (t === 'checkup') {
    const d = nearestDamage(x, y, ['checkup'], 80);
    if (d) {
      const pos = d.anchor.getWorldPosition(v3());
      burst(pos, 8, TEX.heart); removeDecal(d);
      tone(440, 440, .12, .05, 'sine'); tone(440, 440, .12, .05, 'sine', .18);
      fixed(d, pos);
      if (game.damages.some((q) => q.type === 'checkup' && !q.done)) bubble(pick(['💓 咚咚、咚咚，节拍很有力！', '💗 律动满分，再听一处！', '🎵 心跳跟着节奏跳舞啦！']), 1800);
      return true;
    }
  }
  if (t === 'diaper') {
    const d = nearestDamage(x, y, ['wet_pants'], 125) || (hit ? game.damages.find((q) => q.type === 'wet_pants' && !q.done) : null);
    if (d) {
      const p = d.anchor.getWorldPosition(v3());
      removeDecal(d);
      attachDiaperMesh(game.critter, game.meta, true);
      tone(520, 780, .14, .05, 'triangle'); tone(780, 1040, .16, .045, 'sine', .1);
      burst(p, 10, TEX.sparkle);
      bubble('🩲 ' + lineFor('diaper-fitted', '擦干小屁股，换上干爽洁白的小尿布啦！软乎乎真舒服！'), 2800); say('diaper-fitted');
      fixed(d, p);
      return true;
    }
  }
  if (t === 'patch') {
    const d = nearestDamage(x, y, ['patch'], 85);
    if (d) {
      const g = d.anchor, n = ++g.userData.presses;
      if (n === 1) {
        const patch = new THREE.Mesh(new THREE.CircleGeometry(.105, 6), std({ color: game.meta.color || '#8b5cf6', roughness: .85 }));
        patch.position.z = .012; patch.userData.noDecal = true; g.add(patch);
        const crest = new THREE.Mesh(new THREE.OctahedronGeometry(.035, 0), M.gold); crest.scale.set(1, 1, .3); crest.position.z = .02; crest.userData.noDecal = true; g.add(crest);
        bubble('🩹 刺绣补丁贴上啦！再按两下缝牢金线。', 2400);
      }
      const stitch = new THREE.Mesh(new THREE.TorusGeometry(.088, .006, 6, 24, Math.PI * 2 / 3), M.gold);
      stitch.position.z = .018; stitch.rotation.z = (n - 1) * Math.PI * 2 / 3; stitch.userData.noDecal = true; g.add(stitch);
      tone(520 + n * 110, 760 + n * 110, .12, .04);
      if (n >= 3) fixed(d, g.getWorldPosition(v3()));
      return true;
    }
  }
  if (t === 'tweezers') {
    const d = nearestDamage(x, y, ['burr'], 85);
    if (d) { const p = d.anchor.getWorldPosition(v3()); tone(900, 300, .18, .05, 'triangle'); tone(300, 600, .12, .04, 'sine', .12); burst(p, 6, TEX.sparkle, .4, '#c084fc'); removeDecal(d, v3(-2.3, 1.0, .6)); fixed(d, p); return true; }
  }
  if (t === 'needle') {
    const ld = game.damages.find((q) => q.type === 'braid_gat' && !q.done);
    if (ld && game.loose && game.loose.t < 0) {
      const sp = screenOf(game.loose.obj);
      if (Math.hypot(sp.x - x, sp.y - y) < 140) { restoreLoosePart(ld); return true; }
    }
    const d = nearestDamage(x, y, ['tear'], 85);
    if (d) {
      const g = d.anchor, i = g.userData.stitches++;
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(.007, .07, 4, 8), M.gold);
      st.position.set(-.066 + i * .044, 0, .03); st.rotation.z = i % 2 ? .55 : -.55; st.userData.noDecal = true; g.add(st);
      const st2 = st.clone(); st2.rotation.z = -st.rotation.z; g.add(st2);
      tone(880, 1320, .09, .04, 'triangle'); noise(3200, 3, .03, .08);
      const p = g.getWorldPosition(v3()); burst(p, 2, TEX.sparkle, .3, '#ffe08a');
      if (g.userData.stitches >= 4) {
        const slit = g.getObjectByName('slit'), puffs = g.getObjectByName('puffs');
        const t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / 600); if (slit) slit.scale.set(1 - k, 1 - k, .35 * (1 - k) + .001); if (puffs) puffs.scale.setScalar(1 - k); if (k < 1) requestAnimationFrame(step); };
        step(); bubble('🪡 金线缝好啦，演出服完美如新！', 2000); fixed(d, p);
      }
      return true;
    }
    if (ld && game.loose && game.loose.t < 0 && hit) { restoreLoosePart(ld); return true; }
  }
  if (t === 'gem_replacer') {
    const d = nearestDamage(x, y, ['eye_gem'], 110) || (hit ? game.damages.find((q) => q.type === 'eye_gem' && !q.done) : null);
    if (d && game.eye) {
      const eg = game.eye.group, sock = game.eye.socket; eg.visible = true; eg.scale.setScalar(.01);
      const s0 = game.eye.scale0 || (game.eye.scale0 = 1);
      const t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / 500); const s = k < .7 ? k / .7 * 1.2 : 1.2 - (k - .7) / .3 * .2; eg.scale.setScalar(Math.max(.01, s * s0)); sock.scale.multiplyScalar(.8); if (k < 1) requestAnimationFrame(step); else { eg.scale.setScalar(s0); sock.visible = false; } };
      step(); tone(500, 250, .14, .06); tone(1200, 1400, .08, .03, 'sine', .1);
      const p = d.anchor.getWorldPosition(v3()); burst(p, 8, TEX.sparkle, .4, '#fff1b8');
      bubble('🔘 闪亮的眼眸宝石装回去啦，眼睛亮晶晶！', 2200);
      fixed(d, p); return true;
    }
  }
  if (t === 'cotton') {
    const d = game.damages.find((q) => q.type === 'flat_padding' && !q.done);
    if (d && hit) {
      const from = camera.position.clone().add(v3(0, -1.2, -1.2));
      const target = hit.point.clone();
      d.hp = Math.max(0, d.hp - 1); game.flatTarget = 1 - d.hp / 4;
      spawn(TEX.cotton, from, { to: target, life: .7, size: .22, onArrive: () => { burst(target, 4, TEX.soft, .3, '#fffdf7'); game.wobble = .08; } });
      tone(300 + (4 - d.hp) * 70, 520 + (4 - d.hp) * 70, .25, .04); noise(500, .7, .04, .3, 'lowpass');
      if (d.hp <= 0) { bubble('☁️ 云朵棉花塞满啦，又蓬又软！', 2000); fixed(d, hit.point); }
      return true;
    }
  }
  return false;
}
function wrongToolHint(x, y) {
  const d = nearestDamage(x, y, null, 90);
  const needFlat = game.damages.find((q) => q.type === 'flat_padding' && !q.done);
  const needFade = game.damages.find((q) => q.type === 'faded_outfit' && !q.done);
  let need = d ? DMG[d.type].tool : null;
  if (!need && hitCritter(x, y)) need = needFlat ? 'cotton' : needFade ? 'airbrush' : null;
  if (need && need !== game.tool) {
    const el = document.querySelector(`#tools .tool[data-t="${need}"]`);
    if (el) { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); }
    bubble(`嗯，试试 ${TOOL[need].icon} ${TOOL[need].name} 好吗？`, 2000); tone(330, 300, .15, .03);
    return true;
  }
  return false;
}

/* ---------- finale: Golden Honmoon wake-up & K-pop choreography ---------- */
function wakeUp(point) {
  game.heartIn = true; game.state = 'waking';
  game.spinTo = Math.round(turntable.rotation.y / (Math.PI * 2)) * Math.PI * 2; // face the child
  selectTool(null); renderTools();
  const chest = critterCenterWorld(game.critter).add(v3(0, .05, .3));
  spawn(TEX.heart, camera.position.clone().add(v3(0, -1, -1.3)), { to: chest, life: .6, size: .3 });
  for (let i = 0; i < 6; i++) tone(1400, 1300, .05, .03, 'square', .1 + i * .1);
  const visitVersion = game.visitVersion;
  setTimeout(() => {
    if (game.visitVersion !== visitVersion || game.state !== 'waking' || !game.critter) return;
    burst(chest, 14, TEX.heart, .6);
    spawn(TEX.ring, chest.clone(), { life: 1.2, size: .3, grow: 4, opacity: .9, add: true, color: '#ffd166' });
    game.anim = 'awake'; game.state = 'awake'; game.dance = 0;
    music.play('party');
    chime([523, 659, 784, 1047], .18, .05);
    for (let i = 0; i < 36; i++) setTimeout(() => { if (game.visitVersion === visitVersion) spawn(pick([TEX.soft, TEX.star, TEX.note]), v3(rnd(-1.8, 1.8), rnd(2.8, 3.8), rnd(-.4, .8)), { vel: v3(rnd(-.1, .1), -rnd(.25, .45), 0), life: 4, size: rnd(.07, .12), color: pick(['#ffd166', '#ff9eb5', '#9ed8ff', '#c9b6ff', '#8fe0c0']) }); }, i * 70);
    bubble(thanksOf(game.meta), 5200); say(`${game.sel}-thanks`);
    addStars(3, chest);
    save.fixed[game.sel] = (save.fixed[game.sel] || 0) + 1; persist();
    showDress();
  }, 650);
}

/* ---------- dress-up: 6 K-pop / Korean accessories ---------- */
function makeAccessory(kind, c) {
  const g = new THREE.Group(); g.name = 'acc_' + kind;
  const head = c.parts.head, hb = localBounds(head);
  const top = hb.max.y, cy = (hb.min.y + hb.max.y) / 2, frontZ = hb.max.z;
  const hw = clamp((hb.max.x - hb.min.x) / 2 * .82, .14, .3);
  const gold = std({ color: '#ffd166', emissive: '#f59e0b', emissiveIntensity: .6, roughness: .3, metalness: .22 });
  let attach = 'head';
  if (kind === 'honmoon_crown') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(hw * .92, .022, 12, 48), gold); ring.rotation.x = Math.PI / 2; g.add(ring);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * .5 + (i - 2) * .5;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(.03, .12 + (i === 2 ? .06 : 0), 12), gold); spike.position.set(Math.cos(a) * hw * .9, .07, Math.sin(a) * hw * .9 + hw * .9); g.add(spike);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.024, 0), std({ color: i % 2 ? '#c084fc' : '#ff6fb5', emissive: i % 2 ? '#a855f7' : '#ff2fa0', emissiveIntensity: .8, roughness: .3 })); gem.position.copy(spike.position).add(v3(0, .11, 0)); g.add(gem);
    }
    g.position.set(0, top - .02, 0);
  } else if (kind === 'flower_crown') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(hw * .95, .02, 10, 48), std({ color: '#7ccf7a', roughness: .7 })); ring.rotation.x = Math.PI / 2; g.add(ring);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, f = new THREE.Group(); f.position.set(Math.cos(a) * hw * .95, .02, Math.sin(a) * hw * .95);
      const col = pick(['#ffd166', '#ff9eb5', '#ffffff', '#c9b6ff', '#ff7ac8']);
      for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.028, 10, 8), std({ color: col, roughness: .6 })); p.position.set(Math.cos(k * 1.26) * .032, .02, Math.sin(k * 1.26) * .032); f.add(p); }
      f.add(new THREE.Mesh(new THREE.SphereGeometry(.02, 10, 8), std({ color: '#f4a340' })));
      g.add(f);
    }
    g.position.set(0, top - .05, 0);
  } else if (kind === 'headset') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(hw * 1.02, .018, 10, 40, Math.PI), std({ color: '#2a2438', roughness: .4 })); band.position.y = cy + hw * .25; g.add(band);
    [-1, 1].forEach((s) => { const cup = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 12), std({ color: '#ff6fb5', emissive: '#ff2fa0', emissiveIntensity: .35, roughness: .4 })); cup.scale.set(.6, 1, 1); cup.position.set(s * hw * 1.02, cy + hw * .25, 0); g.add(cup); });
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, hw * 1.2, 8), std({ color: '#2a2438' })); boom.position.set(hw * .6, cy - hw * .25, frontZ * .75); boom.rotation.z = Math.PI / 2 + .35; boom.rotation.y = -.5; g.add(boom);
    const mic = new THREE.Mesh(new THREE.SphereGeometry(.028, 12, 10), std({ color: '#ffd166', emissive: '#f59e0b', emissiveIntensity: .5 })); mic.position.set(hw * .18, cy - hw * .55, frontZ * 1.02); g.add(mic);
    g.position.set(0, 0, 0);
  } else if (kind === 'sunglasses') {
    const eb = c.parts.eyes ? localBounds(c.parts.eyes) : null;
    const ey = eb ? (eb.min.y + eb.max.y) / 2 : cy + hw * .15, ez = eb ? eb.max.z + .012 : frontZ + .01, ex = eb ? Math.max(.06, (eb.max.x - eb.min.x) / 4) : hw * .42;
    const lensMat = new THREE.MeshPhysicalMaterial({ color: '#2b1b4a', roughness: .1, metalness: .1, transparent: true, opacity: .82, clearcoat: 1 });
    const frame = std({ color: '#ffd166', roughness: .35, metalness: .22 });
    [-1, 1].forEach((s) => {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(ex * .95, 20, 14), lensMat); lens.scale.set(1.15, .8, .25); lens.position.set(s * ex * 1.15, ey, ez); g.add(lens);
      const rimL = new THREE.Mesh(new THREE.TorusGeometry(ex * 1.0, .008, 8, 28), frame); rimL.scale.set(1.15, .8, 1); rimL.position.copy(lens.position); g.add(rimL);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, hw * 1.0, 6), frame); arm.rotation.x = Math.PI / 2; arm.position.set(s * ex * 2.2, ey + .01, ez - hw * .5); g.add(arm);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(ex * .5, .012, .012), frame); bridge.position.set(0, ey + .005, ez); g.add(bridge);
  } else if (kind === 'norigae') {
    attach = 'torso';
    const tb = localBounds(c.parts.torso);
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(.035, .011, 48, 8, 2, 3), std({ color: '#e11d48', roughness: .6 })); g.add(knot);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(.028, 14, 12), std({ color: '#10b981', emissive: '#059669', emissiveIntensity: .3, roughness: .3 })); bead.position.y = -.07; g.add(bead);
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(.012, .03, .16, 12), std({ color: '#f43f5e', roughness: .9 })); tassel.position.y = -.17; g.add(tassel);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .14, 6), gold); cord.position.y = .08; g.add(cord);
    g.position.set((tb.max.x) * .55, tb.min.y + (tb.max.y - tb.min.y) * .42, tb.max.z * .92);
  } else if (kind === 'lightstick') {
    attach = c.parts.rightArm ? 'rightArm' : 'torso';
    const host = c.parts[attach], ab = localBounds(host);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.022, .026, .26, 14), std({ color: '#f8fafc', roughness: .4 })); g.add(handle);
    const grip = new THREE.Mesh(new THREE.TorusGeometry(.03, .01, 8, 20), gold); grip.rotation.x = Math.PI / 2; grip.position.y = -.08; g.add(grip);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.075, 1), std({ color: '#ff9ed2', emissive: '#ff3fa4', emissiveIntensity: 1.2, roughness: .25, transparent: true, opacity: .92 })); orb.position.y = .2; g.add(orb);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.1, .012, 8, 32), gold); halo.position.y = .2; halo.rotation.x = Math.PI / 2; g.add(halo);
    const light = new THREE.PointLight('#ff6fb5', 1.4, 1.6); light.position.y = .22; g.add(light);
    g.position.set(attach === 'rightArm' ? (ab.max.x + ab.min.x) / 2 : ab.max.x + .1, attach === 'rightArm' ? ab.min.y + .1 : (ab.min.y + ab.max.y) / 2, ab.max.z * .6 + .06);
    g.rotation.x = -.35;
  }
  g.userData.attach = attach;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.noDecal = true; o.userData.isDecal = true; } });
  return g;
}
function showDress() {
  $('toolbox').classList.add('hidden'); $('dress').classList.remove('hidden');
  $('dressItems').innerHTML = DRESS.map(([k, i, n]) => `<button type="button" class="tool ${game.accessories.has(k) ? 'sel' : ''}" data-k="${k}"><div class="face">${i}</div><span>${n}</span></button>`).join('');
  $('dressItems').querySelectorAll('.tool').forEach((el) => { el.onclick = () => toggleAccessory(game.critter, el.dataset.k, el); });
}
function toggleAccessory(critter, k, el) {
  if (!critter || !DRESS_IDS.includes(k)) return;
  const existing = critter.getObjectByName('acc_' + k);
  if (existing) {
    existing.parent.remove(existing);
    if (critter === game.critter) game.accessories.delete(k);
    el && el.classList.remove('sel'); tone(500, 400, .1, .03); return;
  }
  const acc = makeAccessory(k, critter);
  const parent = critter.parts[acc.userData.attach] || critter.parts.torso;
  parent.add(acc);
  if (critter === game.critter) { game.accessories.add(k); tone(660, 990, .18, .04); burst(acc.getWorldPosition(v3()).add(v3(0, .1, .1)), 6); }
  el && el.classList.add('sel');
}

/* ---------- Honmoon Showcase Stage (persistent localStorage shelf) ---------- */
const shelfMinis = [];
const MINI_SCALE = .3;
function shelfSpot(i) { return SHELF_SPOTS[i % SHELF_SPOTS.length].clone(); }
function parkMini(c, i) {
  const spot = shelfSpot(i);
  c.scale.setScalar(MINI_SCALE);
  c.position.set(spot.x, spot.y - c.userData.footY * MINI_SCALE, spot.z);
  c.rotation.set(0, rnd(-.35, .35), 0);
  c.userData.spot = i;
}
function makeMini(entry, i) {
  const c = buildCritter(entry.id);
  c.traverse((o) => { if (o.isLight) o.visible = false; if (o.isMesh) o.castShadow = false; });
  if (c.setForm) c.setForm(entry.form === 'awakened' ? 'awakened' : 'stage');
  if (entry.diaper) attachDiaperMesh(c, CHARACTERS[entry.id], false);
  (entry.acc || []).forEach((k) => toggleAccessory(c, k));
  parkMini(c, i);
  scene.add(c); shelfMinis.push(c); return c;
}
function restoreShelfProgressively() {
  const entries = save.shelf.slice(-6);
  let i = 0;
  const next = () => {
    if (i >= entries.length) return;
    const e = entries[i], idx = i; i++;
    try { makeMini(e, idx); } catch (_) { /* skip a broken entry */ }
    setTimeout(next, 180);
  };
  setTimeout(next, 900);
}
function goToShelf() {
  if (!game.critter || game.state === 'leaving') return;
  $('dress').classList.add('hidden');
  $('fartBtn').classList.add('hidden');
  clearFartClouds();
  game.state = 'leaving'; game.anim = 'idle';
  renderer.render(scene, camera);
  let after = null; try { after = canvas.toDataURL('image/jpeg', .85); } catch (_) { after = null; }
  const c = game.critter;
  const entry = { id: game.sel, acc: [...game.accessories], diaper: !!game.diaperFitted, form: game.form };
  save.shelf.push(entry); save.shelf = save.shelf.slice(-6); persist();
  if (shelfMinis.length >= 6) { const old = shelfMinis.shift(); scene.remove(old); shelfMinis.forEach((m, i) => parkMini(m, i)); }
  const idx = shelfMinis.length;
  if (game.loose && game.loose.obj.parent === scene) { const e = game.loose; e.parent.add(e.obj); e.obj.position.copy(e.p); e.obj.quaternion.copy(e.q); e.obj.scale.copy(e.s); }
  scene.attach(c);
  c.traverse((o) => { if (o.isLight) o.visible = false; if (o.isMesh) o.castShadow = false; });
  const start = c.position.clone(), s0 = c.scale.x, spot = shelfSpot(idx), end = v3(spot.x, spot.y - c.userData.footY * MINI_SCALE, spot.z), t0 = performance.now();
  const r0 = c.rotation.y;
  setCam('far');
  shelfMinis.push(c); c.userData.spot = idx;
  game.critter = null;
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / 2200);
    c.position.lerpVectors(start, end, ease(k)); c.position.y += Math.abs(Math.sin(k * Math.PI * 3)) * .35 * (1 - k);
    c.scale.setScalar(s0 + (MINI_SCALE - s0) * ease(k));
    c.rotation.y = r0 + (Math.PI * 2 - r0) * ease(k);
    if (k < 1) requestAnimationFrame(step); else { c.rotation.y = rnd(-.3, .3); burst(c.position.clone().add(v3(0, .3, .2)), 10, TEX.star, .5); }
  };
  step(); tone(400, 800, .3, .04);
  const meta = game.meta;
  setTimeout(() => showCard(after, meta), 850);
}
function showCard(after, meta) {
  const v = $('endVeil');
  const before = game.before || after;
  v.innerHTML = `<div class="card glass"><h2>${meta.name} 修好啦！✨</h2><p>${thanksOf(meta)}</p>
    <div class="ba"><figure>${before ? `<img src="${before}" alt="修理前">` : ''}<figcaption>修理前</figcaption></figure><figure>${after ? `<img src="${after}" alt="修理后">` : ''}<figcaption>修理后 · 魂门星光偶像卡</figcaption></figure></div>
    <div class="btnrow"><button type="button" class="cta small" id="nextBtn">🎤 再帮一位舞台伙伴</button><button type="button" class="ghost" id="saveBtn">📸 保存偶像照片卡</button></div></div>`;
  v.classList.remove('hidden');
  $('nextBtn').onclick = () => { v.classList.add('hidden'); goHome(); };
  $('saveBtn').onclick = () => { if (!after) return; const a = document.createElement('a'); a.download = `${meta.enName || meta.id}-repaired.jpg`; a.href = after; a.click(); };
}

/* ============================== Home: category tabs, patient cards, thumbnails ============================== */
const THUMB = {};
function badgeThumb(meta) {
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 160, 160); gr.addColorStop(0, meta.color || '#8b5cf6'); gr.addColorStop(1, meta.accent || '#fbbf24');
  g.fillStyle = gr; g.fillRect(0, 0, 160, 160);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(80, 80, 62, 0, 7); g.fill();
  g.font = '86px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(meta.icon || '✨', 80, 86);
  return c.toDataURL('image/png');
}
function thumbFor(id) { const meta = CHARACTERS[id]; if (!THUMB[id]) THUMB[id] = badgeThumb(meta); return THUMB[id]; }
// Progressive 3D portrait thumbnails rendered off-screen after startup (never blocks the first frame).
const thumbScene = new THREE.Scene();
thumbScene.add(new THREE.HemisphereLight('#fff4e6', '#3a2a4a', 1.3));
const thumbKey = new THREE.DirectionalLight('#fff4e2', 2.2); thumbKey.position.set(-1.5, 3, 3); thumbScene.add(thumbKey);
const thumbRim = new THREE.DirectionalLight('#b9c8ff', 1.2); thumbRim.position.set(2, 2, -2); thumbScene.add(thumbRim);
const thumbCam = new THREE.PerspectiveCamera(30, 1, .05, 20);
const thumbRT = new THREE.WebGLRenderTarget(192, 192, { samples: 0 });
const thumbCanvas = document.createElement('canvas'); thumbCanvas.width = thumbCanvas.height = 192;
function renderThumb(id) {
  const c = buildCharacter(id);
  c.traverse((o) => { if (o.isLight) o.visible = false; });
  if (c.setForm) c.setForm('stage');
  thumbScene.add(c); c.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(c);
  const h = Math.max(.6, box.max.y - box.min.y), headY = box.max.y - h * .22, cx = (box.min.x + box.max.x) / 2;
  const bg = new THREE.Color(CHARACTERS[id].color || '#6d28d9').lerp(new THREE.Color('#1a1033'), .55);
  thumbScene.background = bg;
  thumbCam.position.set(cx + h * .42, headY + h * .08, h * 1.15);
  thumbCam.lookAt(cx, headY - h * .06, 0);
  const prevRT = renderer.getRenderTarget();
  renderer.setRenderTarget(thumbRT); renderer.render(thumbScene, thumbCam); renderer.setRenderTarget(prevRT);
  const px = new Uint8Array(192 * 192 * 4);
  renderer.readRenderTargetPixels(thumbRT, 0, 0, 192, 192, px);
  const g = thumbCanvas.getContext('2d'), img = g.createImageData(192, 192);
  for (let y = 0; y < 192; y++) img.data.set(px.subarray((191 - y) * 192 * 4, (192 - y) * 192 * 4), y * 192 * 4);
  g.putImageData(img, 0, 0);
  thumbScene.remove(c);
  c.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  return thumbCanvas.toDataURL('image/jpeg', .86);
}
function renderThumbsProgressively() {
  let i = 0;
  const next = () => {
    if (i >= CHAR_IDS.length) return;
    const id = CHAR_IDS[i++];
    try {
      THUMB[id] = renderThumb(id);
      document.querySelectorAll(`.patient[data-k="${id}"] img`).forEach((img) => { img.src = THUMB[id]; });
      if (game.sel === id && game.state !== 'home') $('tkIcon').src = THUMB[id];
    } catch (_) { /* keep the badge thumbnail */ }
    setTimeout(next, 120);
  };
  setTimeout(next, 1400);
}
function renderPatients() {
  const ids = getCharactersByCategory(game.filter);
  $('patients').innerHTML = ids.map((k) => {
    const c = CHARACTERS[k];
    return `<button type="button" class="patient ${k === game.sel ? 'sel' : ''}" data-k="${k}" data-cat="${normalizeCategoryKey(c.category || c.group)}">
    <img src="${thumbFor(k)}" alt="${c.name}"><b>${c.name}</b><span>${whoOf(c)}</span><div class="st">${save.fixed[k] ? '★'.repeat(Math.min(5, save.fixed[k])) : ''}</div></button>`;
  }).join('');
  $('patients').querySelectorAll('.patient').forEach((el) => { el.onclick = () => { game.sel = el.dataset.k; tone(600, 760, .12, .03); renderPatients(); previewCritter(game.sel); bubble(helloOf(CHARACTERS[game.sel]).split(/[，,！!。]/)[0] + '！', 2200); }; });
  document.querySelectorAll('#catTabs .cat-tab').forEach((btn) => {
    const key = normalizeCategoryKey(btn.dataset.cat);
    btn.classList.toggle('sel', key === normalizeCategoryKey(game.filter));
    btn.onclick = () => {
      game.filter = key;
      tone(540, 700, .1, .03);
      renderPatients();
      const visible = getCharactersByCategory(key);
      if (!visible.includes(game.sel) && visible.length) { game.sel = visible[0]; renderPatients(); previewCritter(game.sel); }
    };
  });
}
function goHome() {
  stopSpeech();
  clearFartClouds();
  game.state = 'home'; game.paused = false;
  ['ticket', 'toolbox', 'turn', 'fartBtn', 'dress', 'pauseBtn', 'stopBtn', 'pauseVeil', 'endVeil', 'bubble'].forEach((id) => $(id).classList.add('hidden'));
  $('pauseBtn').textContent = '⏸';
  $('home').classList.remove('hidden');
  Object.keys(loops).forEach((k) => loopNoise(k, false));
  selectTool(null); setCam('home'); renderPatients(); previewCritter(game.sel);
  if (music.started) music.play('theme');
}
function setCam(mode) { camMode = mode; }
function camTargets(mode) {
  const f = game.frame, h = clamp(f.h, .8, 2.2), y0 = f.footY;
  if (mode === 'near') return { pos: v3(0, y0 + h * .66, Math.max(2.7, h * 2.05)), look: v3(0, y0 + h * .46, 0) };
  if (mode === 'far') return { pos: v3(0, y0 + h * 1.1, Math.max(5.0, h * 3.9)), look: v3(0, y0 + h * .62, -.3) };
  if (mode === 'mega') return { pos: v3(0, y0 + h * 1.35, Math.max(5.6, h * 4.1)), look: v3(0, y0 + h * 1.05, -.4) };
  return { pos: v3(.9, y0 + h * .95, Math.max(3.9, h * 3.0)), look: v3(-.15, y0 + h * .5, -.3) };
}

/* ---------- Dual Form toggle (✨ 舞台金光形态 ↔ 🔮 猎魔/冥界觉醒形态) ---------- */
const normForm = (m) => { const r = String(m || 'stage').toLowerCase(); return r === 'awakened' || r === 'demon' || r === 'spirit' || r === 'saja' || r === 'underworld' ? 'awakened' : 'stage'; };
function renderFormBtn() {
  const awakened = game.form === 'awakened';
  const wrap = $('formBtn'), btn = $('formToggleBtn');
  if (wrap) wrap.classList.toggle('awakened', awakened);
  if (btn) { btn.classList.toggle('awakened', awakened); btn.setAttribute('aria-pressed', awakened ? 'true' : 'false'); btn.dataset.form = game.form; }
  if ($('formIcon')) $('formIcon').textContent = awakened ? '🔮' : '✨';
  if ($('formLabel')) $('formLabel').textContent = awakened ? '猎魔/冥界觉醒形态' : '舞台金光形态';
}
function setForm(mode, opts = {}) {
  const norm = normForm(mode);
  const changed = norm !== game.form;
  game.form = norm;
  if (game.critter && game.critter.setForm) game.critter.setForm(norm);
  renderFormBtn();
  if (changed && !opts.silent) {
    audio();
    if (game.critter) {
      const c = critterCenterWorld(game.critter);
      burst(c, 18, TEX.sparkle, .9, norm === 'awakened' ? '#c084fc' : '#ffd166');
      spawn(TEX.ring, c.clone(), { life: 1.1, size: .4, grow: 4.5, opacity: .9, add: true, color: norm === 'awakened' ? '#a855f7' : '#ffd166' });
      spawn(TEX.glow, c.clone(), { life: .8, size: 1.2, grow: 1.6, opacity: .7, add: true, color: norm === 'awakened' ? '#7c3aed' : '#ffb84a' });
    }
    if (norm === 'awakened') { chime([392, 311, 466, 622], .09, .05); } else { chime([523, 659, 784, 1047], .09, .045); }
    bubble((norm === 'awakened' ? '🔮 ' : '✨ ') + lineFor(norm === 'awakened' ? 'form-awakened' : 'form-stage', norm === 'awakened' ? '猎魔与冥界觉醒形态开启！' : '切换回舞台金光形态！'), 3000);
    say(norm === 'awakened' ? 'form-awakened' : 'form-stage');
  }
  return norm;
}
function toggleForm(force) { return setForm(force ? force : game.form === 'awakened' ? 'stage' : 'awakened'); }

/* ============================== Input ============================== */
const pointer = { down: false, x: 0, y: 0, lastX: 0, mode: null };
canvas.addEventListener('pointerdown', (e) => {
  audio();
  if (game.paused) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
  Object.assign(pointer, { down: true, x: e.clientX, y: e.clientY, lastX: e.clientX, mode: 'rotate' });
  moveCursor(e);
  if (game.state !== 'repair' && game.state !== 'awake' && game.state !== 'waking') return;
  const t = game.tool;
  const onCritter = hitCritter(e.clientX, e.clientY);
  const onLoose = game.loose && game.loose.t < 0 && Math.hypot(screenOf(game.loose.obj).x - e.clientX, screenOf(game.loose.obj).y - e.clientY) < 140;
  const nearDamage = nearestDamage(e.clientX, e.clientY, null, 90);
  if (game.state === 'repair' && t && (onCritter || onLoose || nearDamage)) {
    if (TOOL[t].hold) {
      pointer.mode = 'hold';
      const matches = { brush: 'dust', sponge: 'mud', dryer: 'wet', polish: 'weapon_prop', airbrush: 'faded_outfit', comb: 'tangle', moisture: 'eczema', honmoon_balm: 'demon_mark' }[t];
      const any = game.damages.some((d) => !d.done && d.type === matches);
      if (!any || (nearDamage && DMG[nearDamage.type].tool !== t && t !== 'airbrush')) wrongToolHint(e.clientX, e.clientY);
    } else {
      pointer.mode = 'tap';
      if (!tapTool(e.clientX, e.clientY)) wrongToolHint(e.clientX, e.clientY);
    }
  } else if (onCritter && !t) {
    pointer.mode = 'tickle';
    game.wobble = .06; bubble(pick(TICKLES), 1500); tone(700, 900, .12, .035); tone(900, 1200, .1, .03, 'sine', .1);
  }
});
window.addEventListener('pointermove', (e) => {
  moveCursor(e);
  if (!pointer.down) return;
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (pointer.mode === 'rotate' || pointer.mode === 'tickle') {
    turntable.rotation.y += (e.clientX - pointer.lastX) * .008; game.spinTo = null;
  }
  pointer.lastX = e.clientX;
});
const endPointer = () => { pointer.down = false; pointer.mode = null; loopNoise('dryer', false); loopNoise('spray', false); };
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);
function moveCursor(e) {
  const c = $('cursor');
  c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px';
  c.style.opacity = game.tool && e.target === canvas ? 1 : 0;
}
$('rotL').onclick = () => { game.spinTo = (game.spinTo ?? turntable.rotation.y) - Math.PI / 3; tone(500, 600, .1, .03); };
$('rotR').onclick = () => { game.spinTo = (game.spinTo ?? turntable.rotation.y) + Math.PI / 3; tone(500, 600, .1, .03); };
$('zoomBtn').onclick = () => setCam(camMode === 'near' ? 'far' : 'near');
$('fartBtn').onclick = () => triggerFart();
$('voicePreviewBtn').onclick = () => { audio(); say('preview'); bubble('🎀 ' + lineFor('preview', '你好呀！欢迎来到猎魔女团与呆萌蓝虎修复工坊！'), 4200); };
$('startBtn').onclick = () => { music.started = true; startVisit(); };
$('stopBtn').onclick = goHome;
$('pauseBtn').onclick = () => setPaused(!game.paused);
$('resumeBtn').onclick = () => setPaused(false);
$('shelfBtn').onclick = goToShelf;
$('musicBtn').onclick = () => { music.started = true; audio(); music.toggle(); };
$('soundBtn').onclick = () => { soundOn = !soundOn; $('soundBtn').classList.toggle('off', !soundOn); if (!soundOn) { Object.keys(loops).forEach((k) => loopNoise(k, false)); stopSpeech(); } };
$('formToggleBtn').onclick = () => { audio(); toggleForm(); };
function setPaused(p) {
  if (game.state === 'home') p = false;
  game.paused = p; $('pauseVeil').classList.toggle('hidden', !p); $('pauseBtn').textContent = p ? '▶' : '⏸';
  if (p) { if (spokenClip) spokenClip.pause(); if ('speechSynthesis' in window) { try { speechSynthesis.pause(); } catch (_) { /* noop */ } } endPointer(); Object.values(music.tracks).forEach((a) => a.pause()); }
  else { if (spokenClip) { const pr = spokenClip.play(); if (pr && pr.catch) pr.catch(() => {}); } if ('speechSynthesis' in window) { try { speechSynthesis.resume(); } catch (_) { /* noop */ } } const c = music.cur; music.cur = null; music.play(c || 'theme'); }
}

/* ============================== Animation loop ============================== */
function animateCritter(c, dt, t) {
  const p = c.parts, base = c.userData.base;
  Object.keys(base).forEach((k) => { if (p[k] && base[k] && p[k] !== (game.loose && game.loose.obj)) { p[k].rotation.copy(base[k].r); } });
  game.flat += (game.flatTarget - game.flat) * Math.min(1, dt * 2.5);
  game.wobble = (game.wobble || 0) * Math.pow(.05, dt);
  game.fartBounce = (game.fartBounce || 0) * Math.pow(.06, dt);
  const f = ease(game.flat), w = Math.sin(t * 14) * (game.wobble || 0);
  let sy = 1 - .12 * (1 - f) - w, sxz = 1 + .07 * (1 - f) + w;
  let y = c.userData.restY - .06 * (1 - f) + Math.abs(Math.sin(t * 11)) * (game.fartBounce || 0);
  const isBird = c.characterId === 'sussie_magpie', isTiger = c.characterId === 'derpy_tiger';
  if (game.anim === 'asleep') {
    const br = Math.sin(t * 1.3) * .01;
    sy += br;
    if (p.head && base.head) { p.head.rotation.z = base.head.r.z + .16; p.head.rotation.x = base.head.r.x + .12; }
    if (!isBird && !isTiger) { if (p.leftArm && base.leftArm) p.leftArm.rotation.z = base.leftArm.r.z + .25; if (p.rightArm && base.rightArm) p.rightArm.rotation.z = base.rightArm.r.z - .25; }
  } else if (game.anim === 'awake') {
    const dancing = game.state === 'awake';
    if (dancing) game.dance += dt;
    const beat = dancing ? Math.sin(t * 6.3) : 0;
    y += dancing ? Math.abs(Math.sin(t * 3.15)) * .07 : 0;
    if (p.head && base.head) { p.head.rotation.z = base.head.r.z + Math.sin(t * 1.2) * .06 + beat * (dancing ? .08 : 0); p.head.rotation.y = base.head.r.y + Math.sin(t * .7) * .14; }
    const armWave = dancing ? Math.sin(t * 6.3) * .55 - .5 : Math.sin(t * 1.5) * .07;
    if (p.leftArm && base.leftArm) p.leftArm.rotation.z = base.leftArm.r.z + (isBird ? Math.abs(armWave) * .6 : armWave);
    if (p.rightArm && base.rightArm) p.rightArm.rotation.z = base.rightArm.r.z - (isBird ? Math.abs(armWave) * .6 : (dancing ? Math.sin(t * 6.3 + 1.5) * .55 - .5 : Math.sin(t * 1.5 + 1) * .07));
    if (dancing && !isTiger) { if (p.leftLeg && base.leftLeg) p.leftLeg.rotation.x = base.leftLeg.r.x + Math.max(0, beat) * .35; if (p.rightLeg && base.rightLeg) p.rightLeg.rotation.x = base.rightLeg.r.x + Math.max(0, -beat) * .35; }
    if (p.tail && base.tail && p.tail !== (game.loose && game.loose.obj)) p.tail.rotation.y = base.tail.r.y + Math.sin(t * 2.2) * .18;
    if (p.eyes) { const b = (t % 3.6) < .12 ? .15 : 1; p.eyes.scale.y = b; }
    if (dancing && c === game.critter) {
      c.rotation.y = Math.sin(t * 1.6) * .35;
      if (Math.random() < dt * 2.2) spawn(TEX.note, critterCenterWorld(c).add(v3(rnd(-.5, .5), rnd(.2, .6), .3)), { vel: v3(rnd(-.2, .2), rnd(.4, .7), 0), life: 1.6, size: .14, opacity: .95, spin: rnd(-1, 1) });
      if (isTiger && p.signatureProp) { p.signatureProp.rotation.y = Math.sin(t * 3.15) * .12; const blooms = p.signatureProp.getObjectByName('peonyBloomsGroup'); if (blooms) blooms.scale.setScalar(1 + Math.abs(Math.sin(t * 3.15)) * .12); }
    } else if (c === game.critter) c.rotation.y = 0;
  }
  if (p.auraGroup && c.userData.auraBase) p.auraGroup.rotation.z = c.userData.auraBase.r.z + t * .25;
  c.scale.set(sxz, sy, sxz);
  if (game.state === 'repair' && game.arrive < 1 && c === game.critter) {
    game.arrive = Math.min(1, game.arrive + dt / 1.2);
    const k = game.arrive, bounce = k < .7 ? 1 - ease(k / .7) : Math.sin((k - .7) / .3 * Math.PI) * .08;
    y += bounce * 2.6;
    if (k >= 1) { noise(300, .6, .05, .3, 'lowpass'); burst(critterCenterWorld(c).add(v3(0, -.5, 0)), 10, TEX.sparkle, .9, '#ffe08a'); }
  }
  c.position.y = y;
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  music.update(dt);
  if (!game.paused) {
    game.t += dt;
    const t = game.t;
    const megaCam = game.camOverrideUntil > performance.now() && camMode !== 'home';
    const cm = camTargets(megaCam ? 'mega' : camMode);
    const camK = Math.min(1, dt * (megaCam ? 4.5 : 1.8));
    camera.position.lerp(cm.pos, camK);
    camLook.lerp(cm.look, camK);
    camera.lookAt(camLook);
    if (game.spinTo != null) { turntable.rotation.y += (game.spinTo - turntable.rotation.y) * Math.min(1, dt * 3); if (Math.abs(game.spinTo - turntable.rotation.y) < .002) { turntable.rotation.y = game.spinTo; game.spinTo = null; } }
    if (game.state === 'home') turntable.rotation.y += dt * .25;
    if (game.critter) animateCritter(game.critter, dt, t);
    updateLoose(dt);
    shelfMinis.forEach((m, i) => { const spot = shelfSpot(m.userData.spot ?? i); if (game.state !== 'leaving' || m !== shelfMinis[shelfMinis.length - 1]) { m.position.y = spot.y - m.userData.footY * MINI_SCALE + Math.abs(Math.sin(t * 1.5 + i)) * .02; } });
    fairy.forEach((m, i) => m.material.color.setHSL(((i * 0.13 + t * .05) % 1), .75, .62 + Math.sin(t * .8 + i) * .12));
    beams.forEach((b, i) => { b.sp.intensity = 18 + Math.sin(t * 1.3 + i * 2.1) * 5; b.beam.material.opacity = .055 + Math.sin(t * 1.3 + i * 2.1) * .02; b.sp.position.x += Math.sin(t * .4 + i) * dt * .25; });
    lanternGroup.children.forEach((l) => { l.position.y = l.userData.y0 + Math.sin(t * .9 + l.userData.ph) * .05; l.rotation.z = Math.sin(t * .7 + l.userData.ph) * .05; });
    honmoon.rotation.z = t * .06; honmoonInner.rotation.z = -t * .09; honmoonGlow.material.opacity = .6 + Math.sin(t * 1.1) * .15;
    const mp = moteGeo.attributes.position; for (let i = 0; i < mp.count; i++) { let yv = mp.getY(i) + dt * .04; if (yv > 5.2) yv = .2; mp.setY(i, yv); mp.setX(i, mp.getX(i) + Math.sin(t * .3 + i) * dt * .02); } mp.needsUpdate = true;
    if (pointer.down && pointer.mode === 'hold' && game.state === 'repair') holdTool(pointer.x, pointer.y, dt);
    updateFx(dt);
    updateFartClouds(dt);
    if (game.critter && !$('bubble').classList.contains('hidden')) {
      const hp = game.critter.parts.head.getWorldPosition(v3()).add(v3(0, .55, 0)).project(camera);
      $('bubble').style.left = `${clamp((hp.x + 1) / 2 * window.innerWidth, 150, window.innerWidth - 150)}px`; $('bubble').style.top = `${Math.max(118, (1 - hp.y) / 2 * window.innerHeight)}px`;
    }
  }
  renderer.render(scene, camera);
  if (game.needBefore && game.state === 'repair' && game.arrive >= 1 && game.critter) {
    game.needBefore = false;
    try { game.before = canvas.toDataURL('image/jpeg', .85); } catch (_) { game.before = null; }
  }
  requestAnimationFrame(frame);
}

/* ============================== Boot ============================== */
$('stars').textContent = save.stars;
renderFormBtn();
renderPatients();
previewCritter(game.sel);
renderFartBtn();
requestAnimationFrame(frame);
restoreShelfProgressively();
renderThumbsProgressively();

/* ============================== Test hooks (window.__REPAIR3D__ = window.__GAME__) ============================== */
const screenInfo = (i) => {
  const d = game.damages[i];
  if (!d) return { x: 0, y: 0, facing: false, type: null, done: true };
  const s = screenOf(d.anchor);
  return { x: s.x, y: s.y, facing: facing(d), type: d.type, done: d.done };
};
const countVerts = (root, tri = false) => {
  let n = 0;
  if (root) root.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position && !o.userData.isDecal) { const pos = o.geometry.attributes.position; n += tri ? (o.geometry.index ? o.geometry.index.count / 3 : pos.count / 3) : pos.count; } });
  return Math.floor(n);
};
const API = {
  characters: () => [...CHAR_IDS],
  categories: () => CATEGORY_TABS.map((t) => ({ id: t.id, label: t.label, count: t.count })),
  get state() { return game.state; },
  get tool() { return game.tool; },
  get paused() { return game.paused; },
  game,
  scene, camera, renderer, holder, turntable,
  form: () => game.form,
  setForm: (mode) => setForm(mode),
  toggleForm: (mode) => toggleForm(mode),
  previewCritter,
  previewCharacter: previewCritter,
  select: (id) => { if (CHARACTERS[id]) { game.sel = id; renderPatients(); previewCritter(id); } return game.sel; },
  setFilter: (cat) => { game.filter = normalizeCategoryKey(cat); renderPatients(); return getCharactersByCategory(game.filter); },
  startVisit,
  auditCharacter: (id) => auditCharacterModel(id, game.critter && game.critter.characterId === id ? game.critter : null),
  vertexCount: () => countVerts(game.critter),
  triangleCount: () => countVerts(game.critter, true),
  damages: () => game.damages.map((d) => ({ type: d.type, done: d.done, tool: DMG[d.type].tool, body: !!d.body, loose: !!d.loose })),
  toolFor: (type) => (DMG[normDmg(type)] ? DMG[normDmg(type)].tool : null),
  isHoldTool: (id) => !!(TOOL[normTool(id)] && TOOL[normTool(id)].hold),
  tools: () => TOOLS.map((t) => t.id),
  remaining: () => game.damages.filter((d) => !d.done).length,
  screen: screenInfo,
  critterScreen: () => { if (!game.critter) return { x: 0, y: 0 }; const s = screenOf(game.critter.parts.torso); return { x: s.x, y: s.y }; },
  characterScreen: () => API.critterScreen(),
  spinToDamage: (i) => { const d = game.damages[i]; return d ? findDamage(d.type) : false; },
  snapToDamage: (i) => {
    const d = game.damages[i];
    if (!d) return false;
    const target = damageTargetAngle(d);
    if (target != null) {
      turntable.rotation.y = target;
      game.spinTo = target;
      turntable.updateMatrixWorld(true);
    }
    if (!facing(d) && d.anchor) {
      d.anchor.updateMatrixWorld(true);
      const local = turntable.worldToLocal(d.anchor.getWorldPosition(v3()));
      if (Math.hypot(local.x, local.z) > .01) {
        const posAngle = -Math.atan2(local.x, local.z);
        turntable.rotation.y = posAngle;
        game.spinTo = posAngle;
        turntable.updateMatrixWorld(true);
      }
      if (!facing(d)) d.noFacing = true;
    }
    return true;
  },
  findDamage,
  selectTool,
  holdTool,
  tapTool,
  fixed,
  triggerFart,
  fartCharge: () => game.fartCharge,
  fartClouds: () => fartClouds,
  mushroomClouds: () => fartClouds.filter((c) => c.userData.isMega),
  hasDiaper: () => !!(game.critter && game.critter.parts.torso.getObjectByName('critterDiaper')),
  flowerpotState: () => {
    const g = game.critter && (game.critter.parts.flowerpot || (game.critter.parts.signatureProp && game.critter.parts.signatureProp.userData.isFlowerpot ? game.critter.parts.signatureProp : null));
    if (!g) return { present: false, upright: null, tipped: null, rotationZ: 0, progress: 1 };
    const rotZ = g.userData.rotationZ ?? 0;
    const tipped = typeof g.userData.isTipped === 'boolean' ? g.userData.isTipped : rotZ > .05;
    return { present: true, upright: !tipped, tipped, rotationZ: Number(rotZ.toFixed(3)), progress: Number(game.propShine.toFixed(3)) };
  },
  accessories: () => [...game.accessories],
  toggleAccessory: (k) => toggleAccessory(game.critter, k, document.querySelector(`#dressItems .tool[data-k="${k}"]`)),
  goToShelf,
  goHome,
  setPaused,
  save: () => save,
  voiceClips: () => VOICE_CLIPS,
  voiceByKey: () => VOICE_BY_KEY,
  say,
  bubble,
};
window.__REPAIR3D__ = API;
window.__GAME__ = API;
