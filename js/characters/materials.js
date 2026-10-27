// Shared 3D Material & High-Resolution Organic Geometry Engine for KPop Demon Hunters Repair Workshop 3D
// Enforces MAX_METALNESS <= 0.22 across all materials, provides procedural Korean/K-pop canvas textures,
// high-density organic geometry builders (taperedTube, latheLoft, buildSculptedIdolHead, buildArticulatedHand,
// buildPleatedSkirt), Dual Form ('stage' <-> 'awakened') state engine, and scene-graph stats auditor.

const THREE = window.THREE;

export const MAX_METALNESS = 0.22;

const _textureCache = new Map();

export function clampMetalness(value = 0.08) {
  const num = Number.isFinite(value) ? value : 0.08;
  return Math.min(MAX_METALNESS, Math.max(0, num));
}

function makeSeededRandom(seedInit = 1337) {
  let seed = seedInit >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function enforceMetalnessCap(rootGroup) {
  if (!rootGroup || !rootGroup.traverse) return;
  rootGroup.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (m && typeof m.metalness === 'number') {
        m.metalness = clampMetalness(m.metalness);
      }
    }
  });
}

/* ============================== 1. Procedural Canvas Textures ============================== */

/**
 * Wraps a canvas as a COLOR texture tagged sRGB. Canvas pixels are authored in sRGB; without this tag
 * three.js r161 treats them as linear and every embroidered/satin/fur fabric renders washed-out gray.
 * Data textures (bump maps) must NOT use this helper.
 */
function makeColorCanvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createPlushBumpTexture(size = 128) {
  const key = `plushBump:${size}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const rand = makeSeededRandom(1337);
  for (let i = 0; i < 2000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const shade = Math.floor(92 + rand() * 138);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 4, y + 2.8 + rand() * 3.2);
    ctx.stroke();
  }

  // Bump/data texture: stays linear (no sRGB tag) on purpose
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  _textureCache.set(key, tex);
  return tex;
}

export function createDiamondQuiltTexture(baseHex = '#9f78d9', seamHex = '#563694', size = 256) {
  const key = `quilt:${baseHex}:${seamHex}:${size}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const step = 32;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let y = 0; y <= size; y += step) {
    for (let x = 0; x <= size; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = seamHex;
  ctx.lineWidth = 2.6;
  ctx.setLineDash([5, 3]);
  for (let offset = -size; offset <= size * 2; offset += step) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset, size);
    ctx.lineTo(offset + size, 0);
    ctx.stroke();
  }

  const tex = makeColorCanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  _textureCache.set(key, tex);
  return tex;
}

export function createSatinWeaveTexture(baseHex = '#7c3aed', sheenHex = '#f5d0fe', size = 256) {
  const key = `satin:${baseHex}:${sheenHex}:${size}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(0.5, sheenHex);
  grad.addColorStop(1, baseHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = baseHex;
  ctx.globalAlpha = 0.72;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1.0;

  // Fine diagonal K-pop stage satin twill weave
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.2;
  for (let i = -size; i < size * 2; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size * 0.5, size);
    ctx.stroke();
  }

  const tex = makeColorCanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  _textureCache.set(key, tex);
  return tex;
}

export function createEmbroideryTexture(baseHex = '#2a184c', goldHex = '#fbbf24', size = 256) {
  const key = `embroidery:${baseHex}:${goldHex}:${size}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle silk cross-weave background
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 8) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Korean cloud scroll (운문) & Honmoon lotus medallions
  ctx.strokeStyle = goldHex;
  ctx.lineWidth = 2.4;
  const step = 64;
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.stroke();

      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        const px = x + Math.cos(a) * 9;
        const py = y + Math.sin(a) * 9;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const tex = makeColorCanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  _textureCache.set(key, tex);
  return tex;
}

export function createMinhwaFurTexture(baseHex = '#2b7de9', strokeHex = '#0f2957', size = 256) {
  const key = `minhwaFur:${baseHex}:${strokeHex}:${size}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const rand = makeSeededRandom(2026);
  // Minhwa folk painting fine parallel brush-stroke hair texture
  for (let i = 0; i < 1600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 8 + rand() * 10;
    const curve = (rand() - 0.5) * 4;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255, 250, 235, 0.22)' : strokeHex;
    ctx.globalAlpha = i % 3 === 0 ? 0.35 : 0.42;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + curve, y + len * 0.5, x + curve * 0.6, y + len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  const tex = makeColorCanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  _textureCache.set(key, tex);
  return tex;
}

export function createGatMeshTexture(size = 256) {
  const key = `gatMesh:${size}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#101118';
  ctx.fillRect(0, 0, size, size);

  // Fine hexagonal/woven horsehair lattice
  ctx.strokeStyle = '#2d3142';
  ctx.lineWidth = 1.5;
  const step = 12;
  for (let i = -size; i < size * 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, size);
    ctx.lineTo(i + size, 0);
    ctx.stroke();
  }
  for (let y = 0; y < size; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const tex = makeColorCanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  _textureCache.set(key, tex);
  return tex;
}

export function createPorcelainPeonyTexture(size = 256) {
  const key = `porcelainPeony:${size}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Luminous Joseon/Minhwa white porcelain glaze
  ctx.fillStyle = '#f6f8fc';
  ctx.fillRect(0, 0, size, size);

  // Classic cobalt blue border bands
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 14, size - 8, size - 28);
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 22, size - 20, size - 44);

  // Cobalt Blue Peony & Cloud Scroll motifs (青花缠枝牡丹纹)
  const centers = [
    [64, 128],
    [128, 118],
    [192, 128],
  ];
  ctx.strokeStyle = '#1e40af';
  ctx.fillStyle = '#2563eb';
  for (const [cx, cy] of centers) {
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      const px = cx + Math.cos(a) * 16;
      const py = cy + Math.sin(a) * 16;
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2563eb';
  }

  // Scrolling cobalt vines
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(16, 128);
  ctx.bezierCurveTo(64, 72, 192, 184, 240, 128);
  ctx.stroke();

  const tex = makeColorCanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  _textureCache.set(key, tex);
  return tex;
}

export function createDemonRuneTexture(baseHex = '#2b124c', runeHex = '#d946ef', size = 256) {
  const key = `demonRune:${baseHex}:${runeHex}:${size}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = runeHex;
  ctx.lineWidth = 3.2;
  ctx.shadowColor = runeHex;
  ctx.shadowBlur = 8;

  for (let i = 0; i < 6; i++) {
    const x = 32 + i * 38;
    ctx.beginPath();
    ctx.moveTo(x, 12);
    ctx.lineTo(x + 14, 76);
    ctx.lineTo(x - 10, 148);
    ctx.lineTo(x + 12, 240);
    ctx.stroke();
  }

  const tex = makeColorCanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  _textureCache.set(key, tex);
  return tex;
}

/* ============================== 2. Material Factories (All Clamped metalness <= 0.22) ============================== */

export function createStdMaterial(hexColor = '#ffffff', extra = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hexColor),
    roughness: extra.roughness ?? 0.56,
    ...extra,
    metalness: clampMetalness(extra.metalness ?? 0.08),
  });
  mat.metalness = clampMetalness(mat.metalness);
  return mat;
}

export function createSatinMaterial(hexColor = '#7c3aed', extra = {}) {
  const baseCol = new THREE.Color(hexColor);
  // Adaptive sheen: dark fabrics (coats, pants, gat, magpie feathers) get a subtle lift so the
  // satin weave reads as rich fabric instead of a gray checkerboard under studio lights.
  const hsl = { h: 0, s: 0, l: 0 };
  baseCol.getHSL(hsl);
  const sheenLift = hsl.l < 0.18 ? 0.045 : hsl.l < 0.32 ? 0.085 : hsl.l < 0.5 ? 0.14 : 0.2;
  const sheenCol = baseCol.clone().offsetHSL(0, 0.05, sheenLift);
  const map = extra.map ?? createSatinWeaveTexture(`#${baseCol.getHexString()}`, `#${sheenCol.getHexString()}`);
  const bumpMap = extra.bumpMap ?? createPlushBumpTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    map,
    bumpMap,
    bumpScale: extra.bumpScale ?? 0.008,
    roughness: extra.roughness ?? 0.34,
    ...extra,
    metalness: clampMetalness(extra.metalness ?? 0.16),
  });
  mat.metalness = clampMetalness(mat.metalness);
  return mat;
}

export function createEmbroideryMaterial(baseHex = '#2a184c', goldHex = '#fbbf24', extra = {}) {
  const map = extra.map ?? createEmbroideryTexture(baseHex, goldHex);
  const bumpMap = extra.bumpMap ?? createPlushBumpTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    map,
    bumpMap,
    bumpScale: extra.bumpScale ?? 0.014,
    roughness: extra.roughness ?? 0.42,
    ...extra,
    metalness: clampMetalness(extra.metalness ?? 0.18),
  });
  mat.metalness = clampMetalness(mat.metalness);
  return mat;
}

export function createMinhwaFurMaterial(baseHex = '#2b7de9', strokeHex = '#0f2957', extra = {}) {
  const map = extra.map ?? createMinhwaFurTexture(baseHex, strokeHex);
  const bumpMap = extra.bumpMap ?? createPlushBumpTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    map,
    bumpMap,
    bumpScale: extra.bumpScale ?? 0.022,
    roughness: extra.roughness ?? 0.76,
    ...extra,
    metalness: clampMetalness(extra.metalness ?? 0.05),
  });
  mat.metalness = clampMetalness(mat.metalness);
  return mat;
}

export function createGatMeshMaterial(extra = {}) {
  const map = extra.map ?? createGatMeshTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(extra.color ?? '#181a24'),
    map,
    roughness: extra.roughness ?? 0.38,
    transparent: extra.transparent ?? true,
    opacity: extra.opacity ?? 0.90,
    side: extra.side ?? THREE.DoubleSide,
    ...extra,
    metalness: clampMetalness(extra.metalness ?? 0.14),
  });
  mat.metalness = clampMetalness(mat.metalness);
  return mat;
}

export function createPorcelainPeonyMaterial(extra = {}) {
  const map = extra.map ?? createPorcelainPeonyTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    map,
    roughness: extra.roughness ?? 0.18,
    ...extra,
    metalness: clampMetalness(extra.metalness ?? 0.12),
  });
  mat.metalness = clampMetalness(mat.metalness);
  return mat;
}

export function createDemonRuneMaterial(baseHex = '#2b124c', runeHex = '#d946ef', extra = {}) {
  const map = extra.map ?? createDemonRuneTexture(baseHex, runeHex);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    map,
    emissive: new THREE.Color(extra.emissive ?? runeHex),
    emissiveIntensity: extra.emissiveIntensity ?? 0.65,
    roughness: extra.roughness ?? 0.32,
    ...extra,
    metalness: clampMetalness(extra.metalness ?? 0.16),
  });
  mat.metalness = clampMetalness(mat.metalness);
  return mat;
}

export function createPlushMaterial(hexColor = '#ffffff', extra = {}) {
  const bumpMap = createPlushBumpTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hexColor),
    roughness: extra.roughness ?? 0.80,
    bumpMap,
    bumpScale: extra.bumpScale ?? 0.016,
    ...extra,
    metalness: clampMetalness(extra.metalness ?? 0.04),
  });
  mat.metalness = clampMetalness(mat.metalness);
  return mat;
}

export function createQuiltedMaterial(baseHex = '#9f78d9', seamHex = '#563694', extra = {}) {
  const map = createDiamondQuiltTexture(baseHex, seamHex);
  const bumpMap = createPlushBumpTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    map,
    bumpMap,
    bumpScale: extra.bumpScale ?? 0.018,
    roughness: extra.roughness ?? 0.52,
    ...extra,
    metalness: clampMetalness(extra.metalness ?? 0.10),
  });
  mat.metalness = clampMetalness(mat.metalness);
  return mat;
}

export function createStitchSeamStrip(points, colorHex = '#fbbf24', dashCount = 8, name = 'stitchSeam') {
  const group = new THREE.Group();
  group.name = name;
  const vecPts = points.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2])));
  const curve = new THREE.CatmullRomCurve3(vecPts);
  const mat = createStdMaterial(colorHex, { roughness: 0.45, metalness: 0.16 });
  const geom = new THREE.CapsuleGeometry(0.0055, 0.014, 4, 8);

  for (let i = 0; i < dashCount; i++) {
    const u = (i + 0.5) / dashCount;
    const pt = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);
    const stitch = new THREE.Mesh(geom, mat);
    stitch.userData.noDecal = true;
    stitch.position.copy(pt);
    const up = new THREE.Vector3(0, 1, 0);
    stitch.quaternion.setFromUnitVectors(up, tangent.normalize());
    group.add(stitch);
  }
  return group;
}

/* ============================== 3. High-Density Organic Geometry Builders ============================== */

export function taperedTube(points, radii, tubularSegments = 40, radialSegments = 18, mat = null, closed = false) {
  const vecPts = points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2])));
  const curve = new THREE.CatmullRomCurve3(vecPts, closed);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, 1, radialSegments, closed);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const rArr = Array.isArray(radii) && radii.length > 0 ? radii : [Number(radii) || 0.04];

  for (let i = 0; i < pos.count; i++) {
    const segIdx = Math.min(tubularSegments, Math.floor(i / (radialSegments + 1)));
    const t = segIdx / Math.max(1, tubularSegments);
    const f = t * Math.max(0, rArr.length - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(rArr.length - 1, i0 + 1);
    const r = rArr[i0] + (rArr[i1] - rArr[i0]) * (f - i0);
    curve.getPointAt(t, c);
    v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(r).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const material = mat || createStdMaterial('#ffffff');
  if (material && typeof material.metalness === 'number') {
    material.metalness = clampMetalness(material.metalness);
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function latheLoft(profilePoints2D, segments = 56, mat = null, phiStart = 0, phiLength = Math.PI * 2) {
  const vec2Pts = profilePoints2D.map((p) => (p.isVector2 ? p.clone() : new THREE.Vector2(Math.max(0.0001, p[0]), p[1])));
  const geo = new THREE.LatheGeometry(vec2Pts, segments, phiStart, phiLength);
  geo.computeVertexNormals();
  const material = mat || createStdMaterial('#ffffff');
  if (material && typeof material.metalness === 'number') {
    material.metalness = clampMetalness(material.metalness);
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds a high-resolution sculpted K-pop idol head (64x48 sculpted cranium, jawline, cheekbones,
 * 3D nose bridge, upper/lower lips, eyebrows, 5-lash expressive eyes with dual catchlights,
 * sculpted ears with crystal in-ear monitors, neck, and optional awakened cheek/neck demon veins).
 * Returns a THREE.Group `head` that also attaches `{ head, eyes, leftEye, rightEye, leftEar, rightEar, eyeMaterials }`
 * so both direct group usage and object destructuring work seamlessly.
 */
export function buildSculptedIdolHead(opts = {}) {
  const {
    radius = 0.36,
    skinHex = '#ffe5d9',
    blushHex = '#ff9ebb',
    lipHex = '#e11d74',
    eyeHex = '#7c3aed',
    awakenedEyeHex = '#fbbf24',
    browHex = '#2a183b',
    lashCount = 5,
    earMonitorHex = '#38bdf8',
    earMonitorGemHex = '#fde047',
    female = true,
    cheekRuneHex = '#d946ef',
  } = opts;

  const head = new THREE.Group();
  head.name = 'head';

  const skinMat = opts.skinMat || createStdMaterial(skinHex, { roughness: 0.52, metalness: 0.04 });
  const blushMat = createStdMaterial(blushHex, { roughness: 0.65, metalness: 0.02, transparent: true, opacity: 0.42 });
  const lipMat = createStdMaterial(lipHex, { roughness: 0.26, metalness: 0.10 });
  const browMat = createStdMaterial(browHex, { roughness: 0.48, metalness: 0.08 });
  const scleraMat = createStdMaterial('#ffffff', { roughness: 0.16, metalness: 0.04 });
  const pupilMat = createStdMaterial('#0f091c', { roughness: 0.12, metalness: 0.10 });

  // 1. Sculpted 48x36 Cranium with V-line jaw, soft cheek fullness & forehead contour
  const craniumGeo = new THREE.SphereGeometry(radius, 48, 36);
  const pos = craniumGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const ny = y / radius;
    const nz = z / radius;

    // Taper lower jaw into a refined K-pop V-line chin while keeping soft cheeks
    if (ny < 0) {
      const jawFactor = 1.0 - Math.min(0.32, Math.pow(-ny, 1.35) * (female ? 0.30 : 0.24));
      x *= jawFactor;
      z *= 0.96;
      if (ny < -0.55 && nz > 0.2) {
        z += 0.024 * radius * (1.0 + ny);
      }
    }
    // Subtle cheekbone contour on front-sides
    if (ny > -0.35 && ny < 0.15 && nz > 0.35) {
      const cheekBoost = Math.exp(-Math.pow((ny + 0.10) / 0.22, 2)) * 0.045;
      x *= 1.0 + cheekBoost;
      z *= 1.0 + cheekBoost * 0.6;
    }
    // Slightly elongate vertical proportion
    y *= female ? 1.04 : 1.07;

    pos.setXYZ(i, x, y, z);
  }
  craniumGeo.computeVertexNormals();
  const craniumMesh = new THREE.Mesh(craniumGeo, skinMat);
  craniumMesh.name = 'cranium';
  craniumMesh.castShadow = true;
  craniumMesh.receiveShadow = true;
  head.add(craniumMesh);

  // 2. Sculpted Neck & Collarbone Base
  const neckMesh = latheLoft(
    [
      [radius * 0.34, -radius * 0.72],
      [radius * 0.31, -radius * 0.92],
      [radius * 0.33, -radius * 1.12],
      [radius * 0.40, -radius * 1.24],
    ],
    24,
    skinMat
  );
  neckMesh.name = 'neck';
  head.add(neckMesh);

  // 3. Sculpted 3D Nose Bridge & Tip
  const noseBridge = taperedTube(
    [
      [0, radius * 0.10, radius * 0.94],
      [0, -radius * 0.02, radius * 1.02],
      [0, -radius * 0.11, radius * 1.06],
      [0, -radius * 0.14, radius * 1.01],
    ],
    [radius * 0.034, radius * 0.040, radius * 0.048, radius * 0.034],
    14,
    10,
    skinMat
  );
  noseBridge.userData.noDecal = true;
  head.add(noseBridge);

  // 4. Sculpted Upper & Lower Lips + Cheek Blush Pads
  const lipsGroup = new THREE.Group();
  lipsGroup.name = 'lips';
  const upperLip = taperedTube(
    [
      [-radius * 0.12, -radius * 0.30, radius * 0.92],
      [-radius * 0.045, -radius * 0.275, radius * 0.97],
      [0, -radius * 0.288, radius * 0.98],
      [radius * 0.045, -radius * 0.275, radius * 0.97],
      [radius * 0.12, -radius * 0.30, radius * 0.92],
    ],
    [0.007, 0.017, 0.015, 0.017, 0.007],
    16,
    10,
    lipMat
  );
  upperLip.userData.noDecal = true;
  const lowerLip = taperedTube(
    [
      [-radius * 0.11, -radius * 0.31, radius * 0.92],
      [0, -radius * 0.338, radius * 0.97],
      [radius * 0.11, -radius * 0.31, radius * 0.92],
    ],
    [0.007, 0.020, 0.007],
    14,
    10,
    lipMat
  );
  lowerLip.userData.noDecal = true;
  lipsGroup.add(upperLip, lowerLip);
  head.add(lipsGroup);

  [-1, 1].forEach((s) => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.13, 14, 10), blushMat);
    blush.scale.set(1.25, 0.72, 0.35);
    blush.position.set(s * radius * 0.44, -radius * 0.12, radius * 0.84);
    blush.userData.noDecal = true;
    head.add(blush);
  });

  // 5. Expressive Eyes Group ('leftEye' & 'rightEye' children for blink + eye_gem repair)
  const eyes = new THREE.Group();
  eyes.name = 'eyes';
  const eyeMaterials = [];
  const morphSpecs = [];

  ['leftEye', 'rightEye'].forEach((eyeName, idx) => {
    const s = idx === 0 ? -1 : 1;
    const eyeGroup = new THREE.Group();
    eyeGroup.name = eyeName;
    eyeGroup.position.set(s * radius * 0.36, radius * 0.04, radius * 0.86);

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.155, 20, 16), scleraMat);
    sclera.scale.set(1.18, 0.95, 0.55);
    sclera.userData.noDecal = true;
    eyeGroup.add(sclera);

    const irisMat = createStdMaterial(eyeHex, {
      emissive: new THREE.Color(eyeHex),
      emissiveIntensity: 0.28,
      roughness: 0.16,
      metalness: 0.12,
    });
    irisMat.userData.stageState = {
      color: eyeHex,
      emissive: eyeHex,
      emissiveIntensity: 0.28,
    };
    irisMat.userData.awakenedState = {
      color: awakenedEyeHex,
      emissive: awakenedEyeHex,
      emissiveIntensity: 0.95,
    };
    eyeMaterials.push(irisMat);
    morphSpecs.push({
      material: irisMat,
      stage: irisMat.userData.stageState,
      awakened: irisMat.userData.awakenedState,
    });

    const iris = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.105, 20, 14), irisMat);
    iris.scale.set(1.0, 1.05, 0.45);
    iris.position.set(0, 0, radius * 0.055);
    iris.userData.noDecal = true;
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.058, 16, 12), pupilMat);
    pupil.scale.set(female ? 0.92 : 0.72, 1.08, 0.42);
    pupil.position.set(0, 0, radius * 0.088);
    pupil.userData.noDecal = true;
    eyeGroup.add(pupil);

    // Dual starlight catchlights
    const catch1 = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.030, 10, 8), scleraMat);
    catch1.position.set(s * radius * 0.035, radius * 0.038, radius * 0.108);
    catch1.userData.noDecal = true;
    const catch2 = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.016, 8, 6), scleraMat);
    catch2.position.set(-s * radius * 0.032, -radius * 0.028, radius * 0.105);
    catch2.userData.noDecal = true;
    eyeGroup.add(catch1, catch2);

    // Upper winged eyeliner arch
    const liner = taperedTube(
      [
        [-s * radius * 0.15, -radius * 0.01, radius * 0.06],
        [0, radius * 0.11, radius * 0.09],
        [s * radius * 0.17, radius * 0.03, radius * 0.05],
        [s * radius * 0.22, radius * 0.08, radius * 0.01],
      ],
      [0.007, 0.015, 0.014, 0.005],
      12,
      8,
      pupilMat
    );
    liner.userData.noDecal = true;
    eyeGroup.add(liner);

    // 5 individual 3D eyelashes per eye
    const count = Math.max(5, lashCount);
    for (let l = 0; l < count; l++) {
      const u = l / (count - 1);
      const ang = (u - 0.5) * 1.15;
      const lx = Math.sin(ang) * radius * 0.14;
      const ly = Math.cos(ang) * radius * 0.10 + radius * 0.02;
      const lash = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.038, 6), pupilMat);
      lash.position.set(lx, ly + 0.014, radius * 0.075);
      lash.rotation.z = -ang * 0.75;
      lash.rotation.x = 0.35;
      lash.userData.noDecal = true;
      eyeGroup.add(lash);
    }

    // Sparkling stage star eye-gem / ear-monitor accent inside eye group for eye_gem repair compatibility
    const starGemMat = createStdMaterial(earMonitorGemHex, {
      emissive: new THREE.Color(earMonitorGemHex),
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.20,
    });
    const eyeStarGem = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.032, 1), starGemMat);
    eyeStarGem.name = `${eyeName}Gem`;
    eyeStarGem.position.set(s * radius * 0.19, -radius * 0.06, radius * 0.06);
    eyeStarGem.userData.noDecal = true;
    eyeGroup.add(eyeStarGem);

    eyes.add(eyeGroup);
  });
  head.add(eyes);

  // 6. Sculpted 3D Eyebrows
  [-1, 1].forEach((s) => {
    const brow = taperedTube(
      [
        [s * radius * 0.18, radius * 0.22, radius * 0.89],
        [s * radius * 0.36, radius * 0.26, radius * 0.86],
        [s * radius * 0.52, radius * 0.21, radius * 0.77],
      ],
      [0.014, 0.016, 0.009],
      10,
      8,
      browMat
    );
    brow.userData.noDecal = true;
    head.add(brow);
  });

  // 7. Sculpted Ears + Crystal Stage In-Ear Monitors (IEMs)
  const iemShellMat = createStdMaterial(earMonitorHex, {
    emissive: new THREE.Color(earMonitorHex),
    emissiveIntensity: 0.35,
    roughness: 0.20,
    metalness: 0.20,
  });
  const iemGemMat = createStdMaterial(earMonitorGemHex, {
    emissive: new THREE.Color(earMonitorGemHex),
    emissiveIntensity: 0.55,
    roughness: 0.18,
    metalness: 0.22,
  });

  const buildEarWithMonitor = (s, name) => {
    const earG = new THREE.Group();
    earG.name = name;
    earG.position.set(s * radius * 0.94, -radius * 0.02, -radius * 0.04);

    const pinna = taperedTube(
      [
        [0, -radius * 0.12, 0],
        [s * radius * 0.08, 0, -radius * 0.02],
        [s * radius * 0.05, radius * 0.14, 0.01],
      ],
      [0.028, 0.042, 0.030],
      10,
      8,
      skinMat
    );
    pinna.userData.noDecal = true;
    earG.add(pinna);

    // Crystal In-Ear Monitor (舞台闪亮耳返)
    const iemBody = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.075, 1), iemShellMat);
    iemBody.scale.set(0.75, 1.1, 0.95);
    iemBody.position.set(s * 0.018, -0.005, 0.025);
    iemBody.userData.noDecal = true;
    earG.add(iemBody);

    const iemStar = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.045, 1), iemGemMat);
    iemStar.position.set(s * 0.036, -0.005, 0.032);
    iemStar.userData.noDecal = true;
    earG.add(iemStar);

    return earG;
  };

  const leftEar = buildEarWithMonitor(-1, 'leftEar');
  const rightEar = buildEarWithMonitor(1, 'rightEar');
  head.add(leftEar, rightEar);

  // 8. Awakened Cheek & Neck Demon/Spirit Pattern Veins (hidden in 'stage' mode, visible in 'awakened' mode)
  const facePatternsGroup = new THREE.Group();
  facePatternsGroup.name = 'facePatternsGroup';
  facePatternsGroup.visible = false;
  facePatternsGroup.userData.onlyInForm = 'awakened';

  const veinMat = createStdMaterial(cheekRuneHex, {
    emissive: new THREE.Color(cheekRuneHex),
    emissiveIntensity: 1.15,
    roughness: 0.22,
    metalness: 0.16,
  });
  [-1, 1].forEach((s) => {
    const cheekVein = taperedTube(
      [
        [s * radius * 0.68, -radius * 0.24, radius * 0.56],
        [s * radius * 0.56, -radius * 0.12, radius * 0.76],
        [s * radius * 0.44, -radius * 0.04, radius * 0.87],
      ],
      [0.016, 0.013, 0.007],
      10,
      8,
      veinMat
    );
    cheekVein.userData.noDecal = true;
    // Second, lower demon-mark stroke sweeping along the jaw for a readable awakened face pattern
    const jawVein = taperedTube(
      [
        [s * radius * 0.74, -radius * 0.44, radius * 0.42],
        [s * radius * 0.6, -radius * 0.4, radius * 0.66],
        [s * radius * 0.4, -radius * 0.5, radius * 0.8],
      ],
      [0.012, 0.011, 0.005],
      10,
      8,
      veinMat
    );
    jawVein.userData.noDecal = true;
    const neckVein = taperedTube(
      [
        [s * radius * 0.26, -radius * 1.18, radius * 0.22],
        [s * radius * 0.22, -radius * 0.88, radius * 0.26],
        [s * radius * 0.30, -radius * 0.62, radius * 0.34],
      ],
      [0.016, 0.013, 0.008],
      10,
      8,
      veinMat
    );
    neckVein.userData.noDecal = true;
    facePatternsGroup.add(cheekVein, jawVein, neckVein);
  });
  head.add(facePatternsGroup);

  head.head = head;
  head.craniumMesh = craniumMesh;
  head.neckMesh = neckMesh;
  head.eyes = eyes;
  head.leftEye = eyes.children[0];
  head.rightEye = eyes.children[1];
  head.leftEar = leftEar;
  head.rightEar = rightEar;
  head.eyeMaterials = eyeMaterials;
  head.irisMaterials = eyeMaterials;
  head.morphSpecs = morphSpecs;
  head.facePatternsGroup = facePatternsGroup;

  return head;
}

/**
 * Builds an articulated 5-finger hand with sculpted palm, wrist, 5 3-segment fingers,
 * fingernails/rings (`accentMat`), and optional fingerless glove cuff.
 */
export function buildArticulatedHand(side = 1, skinMat = null, accentMat = null, scale = 1.0, opts = {}) {
  const s = side === 'left' ? -1 : side === 'right' ? 1 : (Number(side) || 1);
  const hand = new THREE.Group();
  hand.name = s < 0 ? 'leftHand' : 'rightHand';

  const sMat = skinMat || createStdMaterial('#ffe5d9', { roughness: 0.52, metalness: 0.04 });
  const aMat = accentMat || createStdMaterial('#f472b6', { roughness: 0.28, metalness: 0.18 });

  // Sculpted palm
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.064 * scale, 16, 12), opts.gloveMat || sMat);
  palm.scale.set(1.08, 0.56, 1.24);
  palm.castShadow = true;
  palm.userData.noDecal = true;
  hand.add(palm);

  // 4 fingers (index, middle, ring, pinky) with 3 phalanges each
  const fingerLengths = [0.095, 0.106, 0.098, 0.082];
  const fingers = [];
  for (let i = 0; i < 4; i++) {
    const xOff = (i - 1.5) * 0.028 * scale * s;
    const len = fingerLengths[i] * scale;
    const curl = (opts.curl ?? 0.22) + i * 0.03;
    const fTube = taperedTube(
      [
        [xOff * 0.85, -0.006 * scale, 0.055 * scale],
        [xOff * 0.96, -0.022 * scale - curl * 0.03, (0.055 + len * 0.45) * scale],
        [xOff * 1.02, -0.046 * scale - curl * 0.06, (0.055 + len * 0.82) * scale],
        [xOff * 1.04, -0.068 * scale - curl * 0.08, (0.055 + len) * scale],
      ],
      [0.015 * scale, 0.0135 * scale, 0.012 * scale, 0.0095 * scale],
      10,
      8,
      sMat
    );
    fTube.userData.noDecal = true;
    hand.add(fTube);

    // Sculpted fingernail
    const nail = new THREE.Mesh(new THREE.SphereGeometry(0.009 * scale, 8, 6), aMat);
    nail.scale.set(0.85, 0.45, 1.35);
    nail.position.set(xOff * 1.04, -0.065 * scale - curl * 0.08, (0.058 + len) * scale);
    nail.userData.noDecal = true;
    hand.add(nail);

    // Optional finger ring (for Jinu / idols)
    if (opts.withRings && (i === 0 || i === 2)) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0145 * scale, 0.0032 * scale, 8, 14), aMat);
      ring.position.set(xOff * 0.92, -0.015 * scale, (0.055 + len * 0.28) * scale);
      ring.rotation.x = Math.PI * 0.42;
      ring.userData.noDecal = true;
      hand.add(ring);
    }
    fingers.push(fTube);
  }

  // Opposable articulated thumb
  const thumbX = -s * 0.056 * scale;
  const thumb = taperedTube(
    [
      [thumbX * 0.72, -0.008 * scale, 0.012 * scale],
      [thumbX * 1.12, -0.024 * scale, 0.052 * scale],
      [thumbX * 1.24, -0.042 * scale, 0.088 * scale],
    ],
    [0.017 * scale, 0.014 * scale, 0.011 * scale],
    10,
    8,
    sMat
  );
  thumb.userData.noDecal = true;
  hand.add(thumb);
  fingers.push(thumb);

  hand.hand = hand;
  hand.palm = palm;
  hand.fingers = fingers;
  return hand;
}

/**
 * Builds a high-density pleated K-pop stage skirt with inner satin lining, `pleatCount`
 * individual 3D sculpted box/loft pleats flaring outward from waist (`radiusTop`) to hem (`radiusBottom`),
 * waist belt band, and metallic/embroidered hem trim.
 */
export function buildPleatedSkirt(
  radiusTop = 0.20,
  radiusBottom = 0.35,
  height = 0.32,
  pleatCount = 24,
  mat = null,
  trimMat = null
) {
  const skirt = new THREE.Group();
  skirt.name = 'pleatedSkirt';

  const mainMat = mat || createSatinMaterial('#6d28d9');
  const accentMat = trimMat || createStdMaterial('#fbbf24', { roughness: 0.25, metalness: 0.20 });

  // High-res inner skirt loft flaring downward from waist (y=0) to hem (y=-height)
  const profile = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const flare = Math.pow(t, 1.12);
    const r = radiusTop + (radiusBottom - radiusTop) * flare + Math.sin(t * Math.PI) * 0.010;
    const y = -t * height;
    profile.push([r * 0.96, y]);
  }
  const liner = latheLoft(profile, 44, mainMat);
  skirt.add(liner);

  // Individual 3D box pleats arranged around the skirt, tilted outward at the bottom (-tiltAngle)
  const count = Math.max(16, pleatCount);
  const tiltAngle = Math.atan2(radiusBottom - radiusTop, height);
  const pleatLen = Math.hypot(radiusBottom - radiusTop, height);

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const midR = (radiusTop + radiusBottom) * 0.49;
    const pleatGeo = new THREE.BoxGeometry(0.052, pleatLen, 0.022, 2, 6, 1);
    const pleatMesh = new THREE.Mesh(pleatGeo, mainMat);
    pleatMesh.castShadow = true;
    pleatMesh.receiveShadow = true;

    const pivot = new THREE.Group();
    pivot.rotation.y = a;
    pleatMesh.position.set(0, -height * 0.5, midR);
    // Negative rotation.x tilts top (+Y) inward to waist radiusTop and bottom (-Y) outward to hem radiusBottom
    pleatMesh.rotation.x = -tiltAngle;
    pleatMesh.rotation.y = 0.16;
    pivot.add(pleatMesh);
    skirt.add(pivot);
  }

  // Waistband & Hem Trim Rings
  const waistBand = new THREE.Mesh(new THREE.TorusGeometry(radiusTop * 1.01, 0.016, 12, 44), accentMat);
  waistBand.rotation.x = Math.PI / 2;
  waistBand.position.y = 0;
  waistBand.userData.noDecal = true;
  skirt.add(waistBand);

  const hemRing = new THREE.Mesh(new THREE.TorusGeometry(radiusBottom * 0.99, 0.010, 12, 44), accentMat);
  hemRing.rotation.x = Math.PI / 2;
  hemRing.position.y = -height + 0.014;
  hemRing.userData.noDecal = true;
  skirt.add(hemRing);

  skirt.skirt = skirt;
  return skirt;
}

/**
 * Builds the front-facing Demon-Mark / Honmoon Crest group (`parts.demonMarkSeal`)
 * targeted by the `demon_mark` (`🔮 猎魔印记裂纹`) -> `honmoon_balm` (`✨ 魂门金印膏`) repair.
 */
export function buildDemonMarkSealGroup(stageGoldHex = '#fbbf24', crackHex = '#d946ef', opts = {}) {
  const seal = new THREE.Group();
  seal.name = 'demonMarkSeal';
  seal.position.set(opts.x ?? 0, opts.y ?? 0.26, opts.z ?? 0.27);

  const goldMat = createStdMaterial(stageGoldHex, {
    emissive: new THREE.Color(stageGoldHex),
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.20,
  });
  const crackMat = createStdMaterial(crackHex, {
    emissive: new THREE.Color(crackHex),
    emissiveIntensity: 0.95,
    roughness: 0.20,
    metalness: 0.16,
  });

  // Golden Honmoon Lotus/Star Medallion
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.008, 12, 28), goldMat);
  ring.userData.noDecal = true;
  seal.add(ring);

  const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.034, 1), goldMat);
  coreGem.scale.set(1.0, 1.0, 0.45);
  coreGem.userData.noDecal = true;
  seal.add(coreGem);

  // Jagged Demon-Mark Crack veins (visible when damaged or in awakened state)
  const cracksGroup = new THREE.Group();
  cracksGroup.name = 'demonMarkCracks';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.35;
    const crack = taperedTube(
      [
        [0, 0, 0.008],
        [Math.cos(a) * 0.042, Math.sin(a) * 0.042, 0.012],
        [Math.cos(a + 0.28) * 0.082, Math.sin(a + 0.28) * 0.082, 0.006],
      ],
      [0.006, 0.004, 0.002],
      8,
      6,
      crackMat
    );
    crack.userData.noDecal = true;
    cracksGroup.add(crack);
  }
  seal.add(cracksGroup);

  seal.userData.goldMat = goldMat;
  seal.userData.crackMat = crackMat;
  seal.userData.cracksGroup = cracksGroup;
  return seal;
}

/**
 * Builds a fan of broad, leaf-shaped spirit-flame petals arranged on an arc BEHIND the character
 * (never crossing the face/torso), so Awakened auras read as a fiery nimbus instead of a cage of straws.
 * `opts`: { count, radius, yBase, height, spreadAngle, zBack, hex2 (tip tint), opacity, flatten }
 */
export function buildSpiritFlamePetals(hex = '#a855f7', opts = {}) {
  const {
    count = 7,
    radius = 0.56,
    yBase = -0.42,
    height = 1.05,
    spreadAngle = Math.PI * 1.1,
    zBack = -0.22,
    hex2 = null,
    opacity = 0.72,
    flatten = 0.5,
    tiltOut = 0.22,
  } = opts;
  const group = new THREE.Group();
  group.name = 'spiritFlamePetals';

  const baseMat = createStdMaterial(hex, {
    emissive: new THREE.Color(hex),
    emissiveIntensity: 1.05,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const tipMat = createStdMaterial(hex2 || hex, {
    emissive: new THREE.Color(hex2 || hex),
    emissiveIntensity: 1.5,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: Math.min(1, opacity + 0.12),
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < count; i++) {
    const u = count > 1 ? i / (count - 1) : 0.5;
    const a = (u - 0.5) * spreadAngle; // 0 = straight behind (-Z)
    const fx = Math.sin(a) * radius;
    const fz = zBack - Math.cos(a) * radius * 0.45;
    const centerBias = 1 - Math.abs(u - 0.5) * 1.1; // middle petals tallest
    const h = height * (0.62 + 0.38 * centerBias);
    const sway = (i % 2 === 0 ? 1 : -1) * 0.07;
    const petal = taperedTube(
      [
        [fx, yBase, fz],
        [fx * (1 + tiltOut * 0.5) + sway, yBase + h * 0.36, fz - 0.02],
        [fx * (1 + tiltOut) - sway * 0.6, yBase + h * 0.72, fz - 0.05],
        [fx * (1 + tiltOut * 1.3) + sway * 0.3, yBase + h, fz - 0.07],
      ],
      [0.075 * (0.8 + 0.4 * centerBias), 0.095 * (0.8 + 0.4 * centerBias), 0.05, 0.004],
      18,
      10,
      i % 2 === 0 ? baseMat : tipMat
    );
    petal.scale.z = flatten; // leaf-like flame, not a pipe
    petal.userData.noDecal = true;
    petal.renderOrder = 2;
    group.add(petal);

    // Small inner flame tongue for a layered, flickering look
    const inner = taperedTube(
      [
        [fx * 0.98, yBase + 0.02, fz + 0.01],
        [fx * 1.02 - sway * 0.5, yBase + h * 0.3, fz - 0.01],
        [fx * (1 + tiltOut * 0.8), yBase + h * 0.58, fz - 0.03],
      ],
      [0.034, 0.03, 0.003],
      12,
      8,
      tipMat
    );
    inner.scale.z = flatten;
    inner.userData.noDecal = true;
    inner.renderOrder = 3;
    group.add(inner);
  }

  group.userData.flameMaterials = [baseMat, tipMat];
  return group;
}

/**
 * Builds a 3D Stage Honmoon / Awakened Spirit Halo & Aura group (`parts.auraGroup`).
 */
export function buildHonmoonAuraGroup(stageHex = '#ffd447', awakenedHex = '#a855f7', opts = {}) {
  const auraGroup = new THREE.Group();
  auraGroup.name = 'auraGroup';

  const stageMat = createStdMaterial(stageHex, {
    emissive: new THREE.Color(stageHex),
    emissiveIntensity: 0.65,
    roughness: 0.22,
    metalness: 0.18,
    transparent: true,
    opacity: 0.86,
  });
  const awakenedMat = createStdMaterial(awakenedHex, {
    emissive: new THREE.Color(awakenedHex),
    emissiveIntensity: 1.25,
    roughness: 0.18,
    metalness: 0.18,
    transparent: true,
    opacity: 0.94,
  });

  // 1. Stage Golden Honmoon Halo Ring (visible in 'stage' mode)
  const stageAura = new THREE.Group();
  stageAura.name = 'stageAura';
  const floorRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.011, 12, 48), stageMat);
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = -0.56;
  floorRing.userData.noDecal = true;
  stageAura.add(floorRing);

  const backHalo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.009, 12, 48), stageMat);
  backHalo.position.set(0, 0.52, -0.32);
  backHalo.userData.noDecal = true;
  stageAura.add(backHalo);
  auraGroup.add(stageAura);

  // 2. Awakened Demon/Spirit Flame & Rune Halo (visible in 'awakened' mode)
  const awakenedAura = new THREE.Group();
  awakenedAura.name = 'awakenedAura';
  awakenedAura.visible = false;

  const spiritRingOuter = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.015, 14, 56), awakenedMat);
  spiritRingOuter.rotation.x = Math.PI / 2;
  spiritRingOuter.position.y = -0.55;
  spiritRingOuter.userData.noDecal = true;
  awakenedAura.add(spiritRingOuter);

  const crestHalo = new THREE.Mesh(new THREE.TorusGeometry(0.50, 0.013, 14, 52), awakenedMat);
  crestHalo.position.set(0, 0.54, -0.35);
  crestHalo.userData.noDecal = true;
  awakenedAura.add(crestHalo);

  // Fan of broad spirit-flame petals framing the character strictly from BEHIND (the previous
  // straw ring was offset by -PI/2 and wrapped in front of the face, reading as a bird cage).
  const flameCount = opts.flameCount ?? 7;
  const flameTip = opts.flameTipHex || `#${new THREE.Color(awakenedHex).offsetHSL(0, 0.05, 0.18).getHexString()}`;
  const flames = buildSpiritFlamePetals(awakenedHex, {
    count: flameCount,
    radius: 0.5,
    yBase: -0.5,
    height: 1.12,
    spreadAngle: Math.PI * 1.05,
    zBack: -0.2,
    hex2: flameTip,
    opacity: 0.7,
  });
  awakenedAura.add(flames);
  auraGroup.add(awakenedAura);

  const auraLight = new THREE.PointLight(stageHex, 0.30, 3.5);
  auraLight.position.set(0, 0.35, 0.95);
  auraGroup.add(auraLight);

  auraGroup.userData.stageAura = stageAura;
  auraGroup.userData.awakenedAura = awakenedAura;
  auraGroup.userData.auraLight = auraLight;
  auraGroup.userData.stageHex = stageHex;
  auraGroup.userData.awakenedHex = awakenedHex;

  return auraGroup;
}

/* ============================== 4. Dual Form Registration & Switching ============================== */

export function registerDualForm(
  root,
  {
    stageNodes = [],
    awakenedNodes = [],
    stageOnly = [],
    awakenedOnly = [],
    morphSpecs = [],
    morphMaterials = [],
    auraGroup = null,
    onFormChange = null,
  } = {}
) {
  if (!root) return root;
  const existing = root.userData.dualFormConfig || {
    stageNodes: [],
    awakenedNodes: [],
    morphSpecs: [],
    auraGroup: null,
    callbacks: [],
  };

  existing.stageNodes.push(...stageNodes, ...stageOnly);
  existing.awakenedNodes.push(...awakenedNodes, ...awakenedOnly);
  existing.morphSpecs.push(...morphSpecs, ...morphMaterials);
  if (auraGroup) existing.auraGroup = auraGroup;
  if (typeof onFormChange === 'function') existing.callbacks.push(onFormChange);

  root.userData.dualFormConfig = existing;
  if (!root.userData.form) root.userData.form = 'stage';

  if (root.parts) {
    root.parts.formNodes = existing;
    if (auraGroup && !root.parts.auraGroup) {
      root.parts.auraGroup = auraGroup;
    }
  }

  root.setForm = (form) => applyCharacterForm(root, form);
  root.getForm = () => root.userData.form || 'stage';
  root.toggleForm = () => {
    const next = root.userData.form === 'awakened' ? 'stage' : 'awakened';
    return applyCharacterForm(root, next);
  };

  enforceMetalnessCap(root);
  return root;
}

export function applyCharacterForm(root, form = 'stage') {
  if (!root) return 'stage';
  const raw = String(form || 'stage').toLowerCase();
  const isAwakened = raw === 'awakened' || raw === 'demon' || raw === 'spirit' || raw === 'saja';
  const normalized = isAwakened ? 'awakened' : 'stage';
  root.userData.form = normalized;

  const cfg = root.userData.dualFormConfig;
  if (cfg) {
    for (const node of cfg.stageNodes) {
      if (node) node.visible = !isAwakened;
    }
    for (const node of cfg.awakenedNodes) {
      if (node) node.visible = isAwakened;
    }
    for (const spec of cfg.morphSpecs) {
      if (!spec) continue;
      const mat = spec.material || (spec.isMaterial ? spec : null);
      const state = isAwakened
        ? spec.awakened || (mat && mat.userData && mat.userData.awakenedState)
        : spec.stage || (mat && mat.userData && mat.userData.stageState);
      if (mat && state) {
        if (state.color !== undefined && mat.color) mat.color.set(state.color);
        if (state.emissive !== undefined && mat.emissive) mat.emissive.set(state.emissive);
        if (state.emissiveIntensity !== undefined) mat.emissiveIntensity = state.emissiveIntensity;
        if (state.roughness !== undefined) mat.roughness = state.roughness;
        if (state.opacity !== undefined) mat.opacity = state.opacity;
        if (typeof mat.metalness === 'number') mat.metalness = clampMetalness(mat.metalness);
        mat.needsUpdate = true;
      }
    }
    const aura = cfg.auraGroup || (root.parts && root.parts.auraGroup);
    if (aura) {
      if (aura.userData.stageAura) aura.userData.stageAura.visible = !isAwakened;
      if (aura.userData.awakenedAura) aura.userData.awakenedAura.visible = isAwakened;
      if (aura.userData.auraLight) {
        aura.userData.auraLight.color.set(
          isAwakened ? aura.userData.awakenedHex || '#a855f7' : aura.userData.stageHex || '#ffd447'
        );
        aura.userData.auraLight.intensity = isAwakened ? 1.15 : 0.55;
      }
    }
    if (Array.isArray(cfg.callbacks)) {
      for (const cb of cfg.callbacks) {
        cb(normalized, isAwakened, root);
      }
    }
  }

  // Also traverse scene graph for any declarative `userData.onlyInForm` or `mat.userData.stageState`
  root.traverse((obj) => {
    if (obj.userData && obj.userData.onlyInForm) {
      obj.visible = obj.userData.onlyInForm === normalized;
    }
    if (obj.isMesh && obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.userData && (m.userData.stageState || m.userData.awakenedState)) {
          const st = isAwakened ? m.userData.awakenedState : m.userData.stageState;
          if (st) {
            if (st.color !== undefined && m.color) m.color.set(st.color);
            if (st.emissive !== undefined && m.emissive) m.emissive.set(st.emissive);
            if (st.emissiveIntensity !== undefined) m.emissiveIntensity = st.emissiveIntensity;
            if (st.opacity !== undefined) m.opacity = st.opacity;
          }
        }
        if (typeof m.metalness === 'number') {
          m.metalness = clampMetalness(m.metalness);
        }
      }
    }
  });

  return normalized;
}

/* ============================== 5. Scene-Graph Vertex, Triangle & Metalness Auditor ============================== */

export function countCharacterStats(rootGroup) {
  let vertexCount = 0;
  let triangleCount = 0;
  let meshCount = 0;
  let maxMetalness = 0;

  if (rootGroup && rootGroup.traverse) {
    rootGroup.traverse((obj) => {
      if (obj.isMesh && obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position) {
        meshCount += 1;
        const vCount = obj.geometry.attributes.position.count;
        vertexCount += vCount;
        const tCount = obj.geometry.index ? obj.geometry.index.count / 3 : vCount / 3;
        triangleCount += tCount;

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m && typeof m.metalness === 'number') {
            if (m.metalness > MAX_METALNESS) {
              m.metalness = clampMetalness(m.metalness);
            }
            maxMetalness = Math.max(maxMetalness, m.metalness);
          }
        }
      }
    });
  }

  return {
    vertexCount,
    triangleCount: Math.round(triangleCount),
    meshCount,
    maxMetalness: Number(maxMetalness.toFixed(4)),
  };
}

export const countGroupStats = countCharacterStats;
