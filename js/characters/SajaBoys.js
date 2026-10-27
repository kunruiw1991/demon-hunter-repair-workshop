// SajaBoys.js — High-Resolution 3D Character Builders for the 5 Saja Boys (狮男团)
// Characters:
// 1. jinu    — 振宇 · 狮男团队长 (Black woven Gat hat + 28-bead gatkkeun + layered jeogori/trench coat + silver rings + 4-stringed Bipa lute)
// 2. abby    — 艾比 · 力量主舞 (Two-tone spiky hair + sculpted chest/abs/bicep anatomy + cross-strap vest + fingerless gloves + Lion-Crest Chain Mic)
// 3. mystery — 迷斯 · 银发神秘主唱 (26 silver-violet eye-swept bangs + high-collar embroidered silk coat + Glowing Spirit Stand Mic)
// 4. romance — 罗曼 · 玫瑰花美男 (24 wavy rose-pink parted hair locks + velvet lapel suit + 18-petal 3D Rose Brooch & Heart Charm + Rose-Gold Vine Mic)
// 5. baby    — 贝比 · 潮流说唱忙内 (Knitted cat-ear beanie + plush oversized pastel hoodie + chunky high-top sneakers + Sparkling Soda Pop Can & bubbles)

import * as MAT from './materials.js';

const THREE = window.THREE;
export const MAX_METALNESS = 0.22;

function clampMetal(m) {
  return Math.min(MAX_METALNESS, Math.max(0, m ?? 0.08));
}

function getStdMat(hex, extra = {}) {
  if (typeof MAT.createStdMaterial === 'function') {
    return MAT.createStdMaterial(hex, { ...extra, metalness: clampMetal(extra.metalness ?? 0.08) });
  }
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: extra.roughness ?? 0.55,
    metalness: clampMetal(extra.metalness ?? 0.08),
    ...extra,
  });
}

function getSatinMat(hex, extra = {}) {
  if (typeof MAT.createSatinMaterial === 'function') {
    return MAT.createSatinMaterial(hex, { ...extra, metalness: clampMetal(extra.metalness ?? 0.14) });
  }
  return getStdMat(hex, { roughness: 0.34, metalness: 0.14, ...extra });
}

function getEmbroideryMat(baseHex, goldHex = '#ffd45e', extra = {}) {
  if (typeof MAT.createEmbroideryMaterial === 'function') {
    return MAT.createEmbroideryMaterial(baseHex, goldHex, { ...extra, metalness: clampMetal(extra.metalness ?? 0.16) });
  }
  return getStdMat(baseHex, { roughness: 0.42, metalness: 0.16, ...extra });
}

function getGatMat(extra = {}) {
  if (typeof MAT.createGatMeshMaterial === 'function') {
    return MAT.createGatMeshMaterial({ ...extra, metalness: clampMetal(extra.metalness ?? 0.12) });
  }
  return getStdMat('#111218', {
    roughness: 0.32,
    metalness: 0.12,
    transparent: true,
    opacity: extra.opacity ?? 0.88,
    side: THREE.DoubleSide,
    ...extra,
  });
}

function getDemonRuneMat(baseHex, runeHex, extra = {}) {
  if (typeof MAT.createDemonRuneMaterial === 'function') {
    return MAT.createDemonRuneMaterial(baseHex, runeHex, { ...extra, metalness: clampMetal(extra.metalness ?? 0.16) });
  }
  return getStdMat(baseHex, {
    emissive: new THREE.Color(runeHex),
    emissiveIntensity: extra.emissiveIntensity ?? 0.85,
    roughness: 0.28,
    metalness: 0.16,
    ...extra,
  });
}

function markNoDecal(obj) {
  obj.traverse((o) => {
    if (o.isMesh) o.userData.noDecal = true;
  });
  return obj;
}

function makeTaperedTube(points, radii, tubularSegments = 22, radialSegments = 12, mat) {
  const vecs = points.map((p) => (p instanceof THREE.Vector3 ? p : new THREE.Vector3(p[0], p[1], p[2])));
  const curve = new THREE.CatmullRomCurve3(vecs);
  const tSegs = Math.min(22, tubularSegments);
  const rSegs = Math.min(12, radialSegments);
  const geo = new THREE.TubeGeometry(curve, tSegs, 1, rSegs, false);
  const pos = geo.attributes.position;
  const ringStride = rSegs + 1;
  for (let i = 0; i <= tSegs; i++) {
    const t = i / tSegs;
    let r = 0.04;
    if (Array.isArray(radii)) {
      const scaled = t * (radii.length - 1);
      const idx = Math.floor(scaled);
      const frac = scaled - idx;
      const r0 = radii[Math.min(idx, radii.length - 1)];
      const r1 = radii[Math.min(idx + 1, radii.length - 1)];
      r = r0 + (r1 - r0) * frac;
    } else if (typeof radii === 'number') {
      r = radii;
    }
    const center = curve.getPointAt(t);
    for (let j = 0; j < ringStride; j++) {
      const vIdx = i * ringStride + j;
      if (vIdx >= pos.count) continue;
      const vx = pos.getX(vIdx) - center.x;
      const vy = pos.getY(vIdx) - center.y;
      const vz = pos.getZ(vIdx) - center.z;
      pos.setXYZ(vIdx, center.x + vx * r, center.y + vy * r, center.z + vz * r);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeLatheLoft(profilePoints2D, segments = 40, mat, phiStart = 0, phiLength = Math.PI * 2) {
  const pts = profilePoints2D.map((p) => (p instanceof THREE.Vector2 ? p : new THREE.Vector2(p[0], p[1])));
  const geo = new THREE.LatheGeometry(pts, Math.min(42, segments), phiStart, phiLength);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

let _cachedSodaPopTex = null;
function createSodaPopLabelTexture() {
  if (_cachedSodaPopTex) return _cachedSodaPopTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#2af5d6');
  grad.addColorStop(0.5, '#ff6ad5');
  grad.addColorStop(1, '#7a5cff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (let i = 0; i < 42; i++) {
    const x = (i * 73) % 512;
    const y = (i * 47) % 256;
    const r = 4 + (i % 5) * 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#fff59d';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 14, 492, 228);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ SODA POP ★', 256, 115);
  ctx.fillStyle = '#fff36b';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('苏打汽水 · SAJA', 256, 175);

  const tex = new THREE.CanvasTexture(c);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace; // label art is authored in sRGB
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  _cachedSodaPopTex = tex;
  return tex;
}

/**
 * Builds a sculpted high-resolution K-pop male idol head (64x48 cranium, sculpted jaw/cheekbones,
 * nose bridge, upper/lower lips, curved eyebrows, 5 eyelashes per eye, stage ear-monitors,
 * and Dual-Form demon-slit iris/pupil switching).
 */
function buildMaleIdolHead(opts = {}) {
  const {
    skinHex = '#ffe2d1',
    lipHex = '#e07a86',
    irisStageHex = '#3c2e4d',
    irisAwakenedHex = '#ffbe1a',
    browHex = '#1e1928',
    earMonitorHex = '#7cf6ff',
    earStuds = false,
    earHoops = false,
    smirk = 0,
  } = opts;

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.56, 0);

  const skinMat = getStdMat(skinHex, { roughness: 0.58, metalness: 0.04 });
  const blushMat = getStdMat('#ff94ab', { roughness: 0.65, metalness: 0.02, transparent: true, opacity: 0.35 });
  const lipMat = getStdMat(lipHex, { roughness: 0.32, metalness: 0.08 });
  const browMat = getStdMat(browHex, { roughness: 0.48, metalness: 0.06 });

  // Sculpted 64x48 cranium with jawline and cheekbone shaping
  const craniumGeo = new THREE.SphereGeometry(0.35, 64, 48);
  const pos = craniumGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    // Taper lower jaw into a clean V-line idol chin
    if (y < 0) {
      const t = Math.min(1, -y / 0.35);
      x *= 1.0 - t * 0.24;
      z *= 1.0 - t * 0.12;
      if (z > 0.1 && Math.abs(x) < 0.12) {
        z += (1 - t * 0.4) * 0.028; // chin projection
      }
    }
    // Subtle cheekbone contour
    if (y > -0.12 && y < 0.08 && z > 0.15) {
      x *= 1.03;
    }
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  craniumGeo.computeVertexNormals();

  const skullMesh = new THREE.Mesh(craniumGeo, skinMat);
  skullMesh.name = 'skullMesh';
  skullMesh.scale.set(0.96, 1.05, 0.94);
  skullMesh.castShadow = true;
  skullMesh.receiveShadow = true;
  head.add(skullMesh);

  // Sculpted neck
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.132, 0.22, 32, 4), skinMat);
  neckMesh.position.set(0, -0.34, -0.02);
  neckMesh.castShadow = true;
  head.add(neckMesh);

  // Nose bridge & tip
  const noseGroup = new THREE.Group();
  noseGroup.name = 'noseGroup';
  const bridge = makeTaperedTube(
    [
      [0, 0.09, 0.315],
      [0, 0.02, 0.348],
      [0, -0.04, 0.365],
    ],
    [0.018, 0.022, 0.026],
    18,
    14,
    skinMat
  );
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 20, 16), skinMat);
  noseTip.position.set(0, -0.042, 0.366);
  noseTip.scale.set(1.1, 0.88, 1.0);
  noseGroup.add(bridge, noseTip);
  markNoDecal(noseGroup);
  head.add(noseGroup);

  // Sculpted upper & lower lips
  const lipsGroup = new THREE.Group();
  lipsGroup.name = 'lipsGroup';
  const upperLip = makeTaperedTube(
    [
      [-0.072, -0.125 + smirk * -0.008, 0.318],
      [-0.028, -0.112, 0.342],
      [0, -0.118, 0.346],
      [0.028, -0.112, 0.342],
      [0.072, -0.125 + smirk * 0.015, 0.318],
    ],
    [0.007, 0.015, 0.013, 0.015, 0.007],
    24,
    14,
    lipMat
  );
  const lowerLip = makeTaperedTube(
    [
      [-0.066, -0.132 + smirk * -0.006, 0.316],
      [0, -0.146, 0.343],
      [0.066, -0.132 + smirk * 0.012, 0.316],
    ],
    [0.006, 0.017, 0.006],
    22,
    14,
    lipMat
  );
  lipsGroup.add(upperLip, lowerLip);
  markNoDecal(lipsGroup);
  head.add(lipsGroup);

  // Soft cheek blush pads
  [-1, 1].forEach((side) => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 14), blushMat);
    blush.position.set(side * 0.175, -0.045, 0.285);
    blush.scale.set(1.25, 0.72, 0.32);
    blush.userData.noDecal = true;
    head.add(blush);
  });

  // Sculpted human ears + crystal stage In-Ear Monitors (耳返)
  const earMonMat = getStdMat(earMonitorHex, {
    emissive: new THREE.Color(earMonitorHex),
    emissiveIntensity: 0.42,
    roughness: 0.18,
    metalness: 0.2,
  });
  const silverMat = getStdMat('#e2e8f5', { roughness: 0.24, metalness: 0.22 });

  const humanEars = new THREE.Group();
  humanEars.name = 'humanEars';
  [-1, 1].forEach((side) => {
    const earG = new THREE.Group();
    earG.name = side === 1 ? 'leftHumanEar' : 'rightHumanEar';
    earG.position.set(side * 0.335, 0.01, -0.01);
    earG.rotation.y = side * 0.28;

    const helix = makeTaperedTube(
      [
        [0, -0.055, 0],
        [side * 0.02, 0.05, 0.02],
        [side * 0.045, 0.065, -0.01],
        [side * 0.035, -0.04, -0.025],
      ],
      [0.022, 0.026, 0.024, 0.02],
      20,
      12,
      skinMat
    );
    const earMonitor = new THREE.Mesh(new THREE.OctahedronGeometry(0.034, 2), earMonMat);
    earMonitor.name = side === 1 ? 'leftEarMonitor' : 'rightEarMonitor';
    earMonitor.position.set(side * 0.015, -0.005, 0.022);
    earG.add(helix, earMonitor);

    if (earHoops) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0045, 10, 20), silverMat);
      hoop.position.set(side * 0.022, -0.068, 0.005);
      hoop.rotation.y = Math.PI / 2;
      earG.add(hoop);
    }
    if (earStuds) {
      for (let k = 0; k < 2; k++) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), silverMat);
        stud.position.set(side * 0.04, 0.02 - k * 0.028, 0.01);
        earG.add(stud);
      }
    }
    markNoDecal(earG);
    humanEars.add(earG);
  });
  head.add(humanEars);

  // Expressive Eyes with Stage Idol iris & Awakened Golden Demon-Slit pupil
  const eyes = new THREE.Group();
  eyes.name = 'eyes';
  eyes.position.set(0, 0.045, 0.305);

  const scleraMat = getStdMat('#ffffff', { roughness: 0.16, metalness: 0.02 });
  const irisMat = getStdMat(irisStageHex, {
    emissive: new THREE.Color(irisStageHex),
    emissiveIntensity: 0.22,
    roughness: 0.18,
    metalness: 0.12,
  });
  const pupilMat = getStdMat('#0b0914', { roughness: 0.12, metalness: 0.1 });
  const demonSlitMat = getStdMat('#ffea56', {
    emissive: new THREE.Color('#ffaa00'),
    emissiveIntensity: 1.35,
    roughness: 0.14,
    metalness: 0.15,
  });
  const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lashMat = getStdMat('#120e1c', { roughness: 0.3, metalness: 0.08 });

  const awakenedEyeNodes = [];

  [-1, 1].forEach((side) => {
    const eyeG = new THREE.Group();
    eyeG.name = side === 1 ? 'leftEye' : 'rightEye';
    eyeG.position.set(side * 0.125, 0, 0);

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.066, 28, 22), scleraMat);
    sclera.scale.set(1.18, 0.88, 0.56);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.044, 24, 20), irisMat);
    iris.position.set(0, 0, 0.025);
    iris.scale.set(1.0, 1.0, 0.45);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 16), pupilMat);
    pupil.position.set(0, 0, 0.041);
    pupil.scale.set(0.95, 0.95, 0.35);

    // Awakened vertical golden demon-slit pupil + glowing iris ring
    const slitGroup = new THREE.Group();
    slitGroup.name = 'demonSlitGroup';
    slitGroup.visible = false;
    const glowingIris = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.043, 28), demonSlitMat);
    glowingIris.position.set(0, 0, 0.047);
    const verticalSlit = new THREE.Mesh(new THREE.SphereGeometry(0.028, 18, 14), pupilMat);
    verticalSlit.position.set(0, 0, 0.049);
    verticalSlit.scale.set(0.24, 1.15, 0.25);
    slitGroup.add(glowingIris, verticalSlit);
    awakenedEyeNodes.push(slitGroup);

    const catch1 = new THREE.Mesh(new THREE.SphereGeometry(0.013, 14, 12), catchMat);
    catch1.position.set(-0.016, 0.018, 0.048);
    const catch2 = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 10), catchMat);
    catch2.position.set(0.016, -0.014, 0.048);

    // Upper eyelid & 5 individual 3D eyelashes
    const lid = makeTaperedTube(
      [
        [-0.072, 0.01, 0.018],
        [0, 0.048, 0.036],
        [0.072, 0.012, 0.018],
      ],
      [0.006, 0.011, 0.008],
      20,
      10,
      lashMat
    );
    eyeG.add(sclera, iris, pupil, slitGroup, catch1, catch2, lid);

    for (let l = 0; l < 5; l++) {
      const u = (l - 2) / 2.2;
      const lx = u * 0.056;
      const ly = 0.038 - u * u * 0.018;
      const lash = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.026, 8), lashMat);
      lash.position.set(lx, ly + 0.01, 0.034);
      lash.rotation.z = -u * 0.55 - side * 0.15;
      lash.rotation.x = 0.35;
      eyeG.add(lash);
    }

    // Sculpted eyebrow
    const brow = makeTaperedTube(
      [
        [side * 0.055, 0.135, 0.295],
        [side * 0.125, 0.152 + (side === 1 ? smirk * 0.018 : 0), 0.305],
        [side * 0.195, 0.132, 0.278],
      ],
      [0.012, 0.015, 0.008],
      18,
      12,
      browMat
    );
    markNoDecal(brow);
    head.add(brow);

    markNoDecal(eyeG);
    eyes.add(eyeG);
  });

  head.add(eyes);

  const irisMorphSpec = {
    material: irisMat,
    stageColor: irisStageHex,
    awakenedColor: irisAwakenedHex,
    stageEmissive: irisStageHex,
    awakenedEmissive: '#ffaa00',
    stageIntensity: 0.22,
    awakenedIntensity: 1.25,
  };

  return { head, eyes, skullMesh, irisMorphSpec, awakenedEyeNodes, skinMat };
}

/**
 * Builds an articulated 5-finger idol hand with optional silver finger rings or fingerless dance gloves.
 */
function buildSajaHand(side, skinMat, opts = {}) {
  const {
    scale = 1.0,
    silverRings = false,
    fingerlessGlove = false,
    gloveHex = '#1a1626',
    studHex = '#e6c15a',
  } = opts;

  const hand = new THREE.Group();
  hand.name = side === 1 ? 'leftHand' : 'rightHand';
  const gloveMat = fingerlessGlove ? getSatinMat(gloveHex, { roughness: 0.42, metalness: 0.16 }) : skinMat;
  const ringMat = getStdMat(studHex, { roughness: 0.22, metalness: 0.22, emissive: new THREE.Color(studHex), emissiveIntensity: 0.18 });

  // Sculpted palm
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.054 * scale, 22, 18), gloveMat);
  palm.scale.set(0.95, 1.12, 0.55);
  hand.add(palm);

  if (fingerlessGlove) {
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052 * scale, 0.056 * scale, 0.045 * scale, 20), gloveMat);
    cuff.position.set(0, 0.048 * scale, 0);
    hand.add(cuff);
    for (let s = 0; s < 4; s++) {
      const stud = new THREE.Mesh(new THREE.OctahedronGeometry(0.0085 * scale, 1), ringMat);
      stud.position.set((s - 1.5) * 0.022 * scale, -0.022 * scale, 0.032 * scale);
      hand.add(stud);
    }
  }

  // 5 articulated 3-segment fingers (thumb + 4 fingers)
  const fingerSpecs = [
    { x: side * 0.046, y: -0.01, z: 0.018, len: 0.046, r: 0.012, rotZ: side * 0.52 },
    { x: side * 0.028, y: -0.052, z: 0.008, len: 0.058, r: 0.011, rotZ: side * 0.1 },
    { x: side * 0.008, y: -0.056, z: 0.01, len: 0.064, r: 0.0115, rotZ: 0 },
    { x: -side * 0.012, y: -0.054, z: 0.008, len: 0.058, r: 0.011, rotZ: -side * 0.08 },
    { x: -side * 0.031, y: -0.046, z: 0.004, len: 0.048, r: 0.0095, rotZ: -side * 0.18 },
  ];

  fingerSpecs.forEach((f, idx) => {
    const fg = new THREE.Group();
    fg.position.set(f.x * scale, f.y * scale, f.z * scale);
    fg.rotation.z = f.rotZ;

    const segLen = (f.len * scale) / 3;
    for (let seg = 0; seg < 3; seg++) {
      const rSeg = f.r * scale * (1 - seg * 0.12);
      const segMat = fingerlessGlove && seg === 0 && idx > 0 ? gloveMat : skinMat;
      const phalanx = new THREE.Mesh(new THREE.CapsuleGeometry(rSeg, segLen, 8, 14), segMat);
      phalanx.position.set(0, -seg * segLen * 1.05 - segLen * 0.5, seg * 0.003);
      fg.add(phalanx);
    }

    if (silverRings && (idx === 1 || idx === 2 || idx === 3)) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(f.r * scale * 1.12, 0.0035 * scale, 10, 20), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, -segLen * 0.65, 0.002);
      fg.add(ring);
    }
    hand.add(fg);
  });

  markNoDecal(hand);
  return hand;
}

/**
 * Builds the front-facing Cracked Demon-Mark / Golden Honmoon Seal target (`parts.demonMarkSeal`)
 * for the `demon_mark` (`🔮 猎魔印记裂纹`) repair.
 */
function buildDemonMarkSeal(stageColorHex = '#ffd45e', crackColorHex = '#b53cff') {
  const seal = new THREE.Group();
  seal.name = 'demonMarkSeal';
  seal.position.set(0, 0.14, 0.255);

  const discMat = getStdMat(stageColorHex, {
    emissive: new THREE.Color(crackColorHex),
    emissiveIntensity: 0.55,
    roughness: 0.24,
    metalness: 0.2,
  });
  const ringMat = getStdMat('#ffe27a', {
    emissive: new THREE.Color('#ffaa22'),
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.22,
  });

  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.012, 32), discMat);
  baseDisc.rotation.x = Math.PI / 2;
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.008, 12, 32), ringMat);
  const innerStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 1), ringMat);
  innerStar.scale.set(1, 1, 0.35);
  innerStar.position.z = 0.008;

  seal.add(baseDisc, outerRing, innerStar);
  markNoDecal(seal);
  return { seal, discMat, ringMat };
}

/**
 * Builds the 3D Stage / Awakened Aura Group (`parts.auraGroup`) + awakened underworld flame wisps.
 */
function buildSajaAuraAndFlames(stageHex = '#ffd45e', awakenedHex = '#a855f7', flameAccentHex = '#ff2a85') {
  const auraGroup = new THREE.Group();
  auraGroup.name = 'auraGroup';
  auraGroup.position.set(0, 0.05, -0.18);

  const ringMat = getStdMat(stageHex, {
    emissive: new THREE.Color(stageHex),
    emissiveIntensity: 0.48,
    roughness: 0.22,
    metalness: 0.18,
    transparent: true,
    opacity: 0.86,
  });

  const haloOuter = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.014, 16, 64), ringMat);
  const haloInner = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.01, 14, 48), ringMat);
  auraGroup.add(haloOuter, haloInner);

  // Awakened-only underworld soul-fire: a fan of broad flame petals rising BEHIND the halo
  // (never crossing the face or torso), plus 5 small rune wisps riding the upper halo arc.
  const awakenedFlames = new THREE.Group();
  awakenedFlames.name = 'awakenedUnderworldFlames';
  awakenedFlames.visible = false;

  if (typeof MAT.buildSpiritFlamePetals === 'function') {
    const petals = MAT.buildSpiritFlamePetals(awakenedHex, {
      count: 7,
      radius: 0.5,
      yBase: -0.46,
      height: 1.1,
      spreadAngle: Math.PI * 1.0,
      zBack: -0.06,
      hex2: flameAccentHex,
      opacity: 0.68,
    });
    awakenedFlames.add(petals);
  }

  const flameMat = getDemonRuneMat(awakenedHex, flameAccentHex, {
    emissiveIntensity: 1.15,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  for (let i = 0; i < 5; i++) {
    // Upper halo arc only: from ~35deg to ~145deg so wisps crown the head instead of poking the body
    const a = Math.PI * (0.2 + (i / 4) * 0.6);
    const rx = Math.cos(a) * 0.62;
    const ry = Math.sin(a) * 0.62;
    const wisp = makeTaperedTube(
      [
        [rx * 0.96, ry * 0.96, -0.02],
        [rx * 1.08, ry * 1.08 + 0.05, -0.04],
        [rx * 1.12, ry * 1.12 + 0.16, -0.06],
      ],
      [0.03, 0.024, 0.004],
      16,
      10,
      flameMat
    );
    wisp.scale.z = 0.5;
    awakenedFlames.add(wisp);
  }
  auraGroup.add(awakenedFlames);
  markNoDecal(auraGroup);

  const auraMorphSpec = {
    material: ringMat,
    stageColor: stageHex,
    awakenedColor: awakenedHex,
    stageEmissive: stageHex,
    awakenedEmissive: flameAccentHex,
    stageIntensity: 0.48,
    awakenedIntensity: 1.3,
  };

  return { auraGroup, awakenedFlames, auraMorphSpec };
}

/**
 * Registers Dual Form switching on `root` and attaches `root.setForm(mode)`.
 */
function attachSajaDualForm(root, { stageNodes = [], awakenedNodes = [], morphSpecs = [], auraGroup = null }) {
  morphSpecs.forEach((s) => {
    if (!s || !s.material) return;
    s.material.userData.stageState = {
      color: new THREE.Color(s.stageColor ?? s.material.color),
      emissive: new THREE.Color(s.stageEmissive ?? s.stageColor ?? '#000000'),
      emissiveIntensity: s.stageIntensity ?? 0.25,
    };
    s.material.userData.awakenedState = {
      color: new THREE.Color(s.awakenedColor ?? s.material.color),
      emissive: new THREE.Color(s.awakenedEmissive ?? s.awakenedColor ?? '#a855f7'),
      emissiveIntensity: s.awakenedIntensity ?? 1.15,
    };
  });

  if (typeof MAT.registerDualForm === 'function') {
    MAT.registerDualForm(root, { stageNodes, awakenedNodes, morphSpecs, auraGroup });
  }

  root.userData.formNodes = {
    stageOnly: stageNodes,
    awakenedOnly: awakenedNodes,
    morphMaterials: morphSpecs.map((s) => s.material).filter(Boolean),
    morphSpecs,
    auraGroup,
  };
  root.userData.form = 'stage';

  root.setForm = (mode = 'stage') => {
    const normalized = mode === 'awakened' ? 'awakened' : 'stage';
    if (typeof MAT.applyCharacterForm === 'function') {
      MAT.applyCharacterForm(root, normalized);
    }
    const isAwakened = normalized === 'awakened';
    root.userData.form = normalized;
    stageNodes.forEach((n) => {
      if (n) n.visible = !isAwakened;
    });
    awakenedNodes.forEach((n) => {
      if (n) n.visible = isAwakened;
    });
    morphSpecs.forEach((s) => {
      if (!s || !s.material) return;
      const st = isAwakened ? s.material.userData.awakenedState : s.material.userData.stageState;
      if (st) {
        s.material.color.copy(st.color);
        if (s.material.emissive) s.material.emissive.copy(st.emissive);
        s.material.emissiveIntensity = st.emissiveIntensity;
        s.material.metalness = clampMetal(s.material.metalness);
        s.material.needsUpdate = true;
      }
    });
    return root.userData.form;
  };
}

// ============================================================================
// 1. JINU (振宇 · 狮男团队长) — Gat Hat + 28-Bead Gatkkeun + Jeogori/Trench Coat + 4-String Bipa
// ============================================================================
export function buildJinu() {
  const root = new THREE.Group();
  root.name = 'jinu';
  root.characterId = 'jinu';
  root.displayName = '振宇 · 狮男团队长';
  root.group = root;
  root.userData.baseScale = 1.04;

  const parts = { root };
  const awakenedNodes = [];
  const morphSpecs = [];

  // Head & Face
  const { head, eyes, irisMorphSpec, awakenedEyeNodes, skinMat } = buildMaleIdolHead({
    skinHex: '#ffe3d3',
    lipHex: '#d96b7b',
    irisStageHex: '#2f2846',
    irisAwakenedHex: '#ffc400',
    browHex: '#15121f',
    earMonitorHex: '#9d7bff',
    earHoops: true,
    smirk: 0.25,
  });
  parts.head = head;
  parts.eyes = eyes;
  morphSpecs.push(irisMorphSpec);
  awakenedNodes.push(...awakenedEyeNodes);
  root.add(head);

  // Jinu's Sleek Raven-Indigo Hair Locks under his Gat
  const hairMat = getSatinMat('#171526', { roughness: 0.34, metalness: 0.14 });
  const hairGroup = new THREE.Group();
  hairGroup.name = 'jinuHair';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const isFront = Math.sin(a) > 0.25;
    const x0 = Math.cos(a) * 0.18;
    const z0 = Math.sin(a) * 0.18;
    const x1 = Math.cos(a) * 0.35;
    const z1 = Math.sin(a) * 0.34;
    const yEnd = isFront ? 0.04 : -0.14;
    const lock = makeTaperedTube(
      [
        [x0, 0.34, z0],
        [x1 * 0.96, 0.22, z1 * 0.96],
        [x1 * 1.03, yEnd, z1 * 1.02],
      ],
      [0.036, 0.048, 0.012],
      28,
      14,
      hairMat
    );
    hairGroup.add(lock);
  }
  markNoDecal(hairGroup);
  head.add(hairGroup);

  // Finely Woven Translucent Black Korean Gat (黑笠) with 28-Bead Gatkkeun Chin Strap (`parts.leftEar`)
  const gatGroup = new THREE.Group();
  gatGroup.name = 'leftEar';
  gatGroup.position.set(0, 0.32, 0.01);

  const gatMeshMat = getGatMat({ opacity: 0.9 });
  const gatRimMat = getStdMat('#221b33', {
    emissive: new THREE.Color('#221b33'),
    emissiveIntensity: 0.15,
    roughness: 0.28,
    metalness: 0.18,
  });
  morphSpecs.push({
    material: gatRimMat,
    stageColor: '#221b33',
    awakenedColor: '#6d28d9',
    stageEmissive: '#1a1228',
    awakenedEmissive: '#c026d3',
    stageIntensity: 0.15,
    awakenedIntensity: 1.05,
  });

  // Wide curved horsehair brim (양태)
  const brimLoft = makeLatheLoft(
    [
      [0.19, 0.02],
      [0.34, 0.018],
      [0.52, 0.005],
      [0.68, -0.018],
      [0.72, -0.026],
    ],
    64,
    gatMeshMat
  );
  const brimOuterRing = new THREE.Mesh(new THREE.TorusGeometry(0.715, 0.012, 14, 64), gatRimMat);
  brimOuterRing.rotation.x = Math.PI / 2;
  brimOuterRing.position.y = -0.024;

  // Cylindrical horsehair crown (총모자) with indented flat top
  const crownLoft = makeLatheLoft(
    [
      [0.21, 0.01],
      [0.205, 0.16],
      [0.195, 0.32],
      [0.185, 0.36],
      [0.01, 0.362],
    ],
    56,
    gatMeshMat
  );
  const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.208, 0.011, 12, 48), gatRimMat);
  crownBand.rotation.x = Math.PI / 2;
  crownBand.position.y = 0.03;

  // 28-Bead Gatkkeun (갓끈) black-and-amber chin strap hanging down past cheeks
  const beadBlackMat = getStdMat('#14121d', { roughness: 0.2, metalness: 0.18 });
  const beadAmberMat = getStdMat('#f59e0b', {
    emissive: new THREE.Color('#d97706'),
    emissiveIntensity: 0.35,
    roughness: 0.18,
    metalness: 0.18,
  });
  const gatkkeunGroup = new THREE.Group();
  gatkkeunGroup.name = 'gatkkeunBeadStrap';
  for (let i = 0; i < 28; i++) {
    const u = i / 27;
    const angle = (u - 0.5) * Math.PI;
    const bx = Math.sin(angle) * 0.33;
    const by = -0.02 - Math.cos(angle) * 0.49;
    const bz = 0.16 + Math.cos(angle) * 0.16;
    const isAmber = i % 4 === 0;
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(isAmber ? 0.019 : 0.014, 16, 14),
      isAmber ? beadAmberMat : beadBlackMat
    );
    bead.position.set(bx, by, bz);
    gatkkeunGroup.add(bead);
  }

  gatGroup.add(brimLoft, brimOuterRing, crownLoft, crownBand, gatkkeunGroup);
  markNoDecal(gatGroup);
  head.add(gatGroup);
  parts.leftEar = gatGroup;

  // Right ear ornament pivot (`parts.rightEar`)
  const rightEarGroup = new THREE.Group();
  rightEarGroup.name = 'rightEar';
  rightEarGroup.position.set(0.34, 0.02, 0);
  const earTassel = makeTaperedTube(
    [
      [0, 0, 0],
      [0.02, -0.08, 0.01],
      [0.01, -0.16, 0.02],
    ],
    [0.008, 0.012, 0.004],
    18,
    12,
    beadAmberMat
  );
  markNoDecal(earTassel);
  rightEarGroup.add(earTassel);
  head.add(rightEarGroup);
  parts.rightEar = rightEarGroup;

  // Torso: Layered Dark Indigo-Black Jeogori Robe + Tailored Stage Trench Coat
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, -0.08, 0);
  parts.torso = torso;
  root.add(torso);

  // Rich deep-indigo stage fabrics (lifted from near-black so the layered robe/coat silhouette
  // reads under studio lights instead of merging into one dark mass)
  const jeogoriMat = getEmbroideryMat('#2a2260', '#e9c46a', { roughness: 0.42, metalness: 0.16 });
  const coatMat = getSatinMat('#241b4a', { roughness: 0.36, metalness: 0.16 });
  const lapelMat = getSatinMat('#4c2a8c', {
    emissive: new THREE.Color('#2a1660'),
    emissiveIntensity: 0.22,
    roughness: 0.3,
    metalness: 0.18,
  });
  morphSpecs.push({
    material: lapelMat,
    stageColor: '#4c2a8c',
    awakenedColor: '#7e22ce',
    stageEmissive: '#2a1660',
    awakenedEmissive: '#d946ef',
    stageIntensity: 0.22,
    awakenedIntensity: 1.15,
  });

  // Inner Jeogori torso loft (surface-decal target!)
  const torsoLoft = makeLatheLoft(
    [
      [0.14, 0.36],
      [0.28, 0.28],
      [0.27, 0.12],
      [0.23, -0.06],
      [0.26, -0.24],
      [0.29, -0.36],
    ],
    56,
    jeogoriMat
  );
  torsoLoft.scale.set(1.06, 1.0, 0.78);
  torso.add(torsoLoft);

  // Outer Stage Trench Coat shell & dramatic flared coat-tails
  const coatShell = makeLatheLoft(
    [
      [0.29, 0.29],
      [0.31, 0.1],
      [0.27, -0.08],
      [0.33, -0.28],
      [0.41, -0.52],
    ],
    56,
    coatMat,
    Math.PI * 0.18,
    Math.PI * 1.64
  );
  coatShell.scale.set(1.08, 1.0, 0.82);
  torso.add(coatShell);

  // Silver-embroidered Dongjeong collar & coat lapels
  [-1, 1].forEach((side) => {
    const lapel = makeTaperedTube(
      [
        [side * 0.11, 0.34, 0.16],
        [side * 0.17, 0.16, 0.22],
        [side * 0.08, -0.06, 0.21],
      ],
      [0.028, 0.042, 0.022],
      24,
      14,
      lapelMat
    );
    torso.add(lapel);
  });

  // Awakened-only underworld demon patterns along Jinu's chest & coat
  const jinuDemonPatterns = new THREE.Group();
  jinuDemonPatterns.name = 'jinuDemonPatterns';
  jinuDemonPatterns.visible = false;
  const runeMat = getDemonRuneMat('#9333ea', '#f43f5e', { emissiveIntensity: 1.25 });
  [-1, 1].forEach((side) => {
    const vein = makeTaperedTube(
      [
        [side * 0.08, 0.28, 0.22],
        [side * 0.2, 0.08, 0.23],
        [side * 0.26, -0.18, 0.22],
        [side * 0.32, -0.42, 0.18],
      ],
      [0.01, 0.018, 0.016, 0.008],
      28,
      12,
      runeMat
    );
    jinuDemonPatterns.add(vein);
  });
  markNoDecal(jinuDemonPatterns);
  torso.add(jinuDemonPatterns);
  awakenedNodes.push(jinuDemonPatterns);

  // Demon-Mark / Honmoon Seal on chest
  const { seal } = buildDemonMarkSeal('#ffd45e', '#a855f7');
  torso.add(seal);
  parts.demonMarkSeal = seal;

  // Coat-Tail Pivot (`parts.tail`)
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, -0.34, -0.18);
  for (let t = -1; t <= 1; t += 2) {
    const panel = makeTaperedTube(
      [
        [t * 0.12, 0, 0],
        [t * 0.18, -0.18, -0.05],
        [t * 0.22, -0.36, -0.09],
      ],
      [0.065, 0.085, 0.045],
      22,
      14,
      coatMat
    );
    tail.add(panel);
  }
  root.add(tail);
  parts.tail = tail;

  // Arms & Articulated 5-Finger Hands with Silver Finger Rings
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.name = side === 1 ? 'leftArm' : 'rightArm';
    arm.position.set(side * 0.33, 0.18, 0);

    const sleeve = makeTaperedTube(
      [
        [0, 0, 0],
        [side * 0.06, -0.18, 0.04],
        [side * 0.04, -0.36, 0.11],
      ],
      [0.085, 0.076, 0.068],
      28,
      18,
      coatMat
    );
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.012, 12, 28), lapelMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(side * 0.04, -0.36, 0.11);

    const hand = buildSajaHand(side, skinMat, { scale: 0.95, silverRings: true });
    hand.position.set(side * 0.04, -0.43, 0.13);

    arm.add(sleeve, cuff, hand);
    root.add(arm);
    parts[arm.name] = arm;
  });

  // Legs & Polished Stage Boots (deep indigo trousers + glossy aubergine boots, not flat black)
  const pantsMat = getSatinMat('#262050', { roughness: 0.44, metalness: 0.12 });
  const bootMat = getStdMat('#2a1a3d', { roughness: 0.22, metalness: 0.2 });
  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.name = side === 1 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * 0.15, -0.42, 0);

    const thighCalf = makeTaperedTube(
      [
        [0, 0, 0],
        [side * 0.01, -0.18, 0.01],
        [0, -0.35, 0],
      ],
      [0.105, 0.088, 0.074],
      28,
      18,
      pantsMat
    );
    const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.084, 0.16, 24), bootMat);
    bootShaft.position.set(0, -0.34, 0.01);
    const bootFoot = new THREE.Mesh(new THREE.SphereGeometry(0.092, 24, 18), bootMat);
    bootFoot.position.set(0, -0.42, 0.055);
    bootFoot.scale.set(0.92, 0.62, 1.48);

    leg.add(thighCalf, bootShaft, bootFoot);
    root.add(leg);
    parts[leg.name] = leg;
  });

  // Signature Prop (`parts.signatureProp`): 4-Stringed Bipa (四弦琵琶) Lute
  const bipaGroup = new THREE.Group();
  bipaGroup.name = 'signatureProp';
  bipaGroup.position.set(-0.24, -0.05, 0.29);
  bipaGroup.rotation.set(0.18, 0.28, -0.52);

  const woodMat = getSatinMat('#3b1d38', { roughness: 0.28, metalness: 0.18 });
  const soundboardMat = getEmbroideryMat('#f3d5a5', '#c084fc', { roughness: 0.35, metalness: 0.14 });
  const bipaGlowMat = getStdMat('#ffbe3b', {
    emissive: new THREE.Color('#ff9d00'),
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.2,
  });
  morphSpecs.push({
    material: bipaGlowMat,
    stageColor: '#ffbe3b',
    awakenedColor: '#d946ef',
    stageEmissive: '#ff9d00',
    awakenedEmissive: '#a855f7',
    stageIntensity: 0.65,
    awakenedIntensity: 1.45,
  });

  // Pear-shaped Bipa soundbox
  const bipaBody = makeLatheLoft(
    [
      [0.01, -0.22],
      [0.12, -0.18],
      [0.175, -0.06],
      [0.14, 0.08],
      [0.065, 0.2],
      [0.035, 0.28],
    ],
    48,
    woodMat
  );
  bipaBody.scale.set(1.0, 1.0, 0.42);
  const soundHoleCrest = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.01, 14, 32), bipaGlowMat);
  soundHoleCrest.position.set(0, -0.03, 0.072);

  // Neck, pegbox, 4 tuning pegs, and 4 glowing strings
  const bipaNeck = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.26, 0.032), woodMat);
  bipaNeck.position.set(0, 0.36, 0);
  for (let p = 0; p < 4; p++) {
    const side = p < 2 ? -1 : 1;
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, 0.065, 12), bipaGlowMat);
    peg.rotation.z = Math.PI / 2;
    peg.position.set(side * 0.042, 0.39 + (p % 2) * 0.055, 0);
    bipaGroup.add(peg);

    const sx = (p - 1.5) * 0.012;
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.58, 10), bipaGlowMat);
    str.position.set(sx, 0.14, 0.076);
    bipaGroup.add(str);
  }

  const propLight = new THREE.PointLight(0xffb733, 0.85, 1.4);
  propLight.position.set(0, 0, 0.15);
  bipaGroup.add(bipaBody, soundHoleCrest, bipaNeck, propLight);
  markNoDecal(bipaGroup);
  torso.add(bipaGroup);

  parts.signatureProp = bipaGroup;
  root.pendantLight = propLight;
  root.pendantEmissiveMesh = soundHoleCrest;

  // Aura & Dual Form
  const { auraGroup, awakenedFlames, auraMorphSpec } = buildSajaAuraAndFlames('#ffd45e', '#a855f7', '#ec4899');
  awakenedNodes.push(awakenedFlames);
  morphSpecs.push(auraMorphSpec);
  root.add(auraGroup);
  parts.auraGroup = auraGroup;

  root.parts = parts;
  attachSajaDualForm(root, { stageNodes: [], awakenedNodes, morphSpecs, auraGroup });
  return root;
}

// ============================================================================
// 2. ABBY (艾比 · 力量主舞) — Two-Tone Spiky Hair + Sculpted Muscle Anatomy + Cross-Strap Vest + Fingerless Gloves
// ============================================================================
export function buildAbby() {
  const root = new THREE.Group();
  root.name = 'abby';
  root.characterId = 'abby';
  root.displayName = '艾比 · 力量主舞';
  root.group = root;
  root.userData.baseScale = 1.07;

  const parts = { root };
  const awakenedNodes = [];
  const morphSpecs = [];

  const { head, eyes, irisMorphSpec, awakenedEyeNodes, skinMat } = buildMaleIdolHead({
    skinHex: '#f5ccb4',
    lipHex: '#c9656f',
    irisStageHex: '#4a2b1d',
    irisAwakenedHex: '#ffaa00',
    browHex: '#1c1218',
    earMonitorHex: '#ff5277',
    earStuds: true,
    smirk: 0.45,
  });
  parts.head = head;
  parts.eyes = eyes;
  morphSpecs.push(irisMorphSpec);
  awakenedNodes.push(...awakenedEyeNodes);
  root.add(head);

  // Sculpted Two-Tone Spiky Hair (24 swept locks in platinum-silver & obsidian-crimson)
  const hairSilverMat = getSatinMat('#e5e9f5', { roughness: 0.28, metalness: 0.18 });
  const hairCrimsonMat = getSatinMat('#9e1b3b', {
    emissive: new THREE.Color('#4c0519'),
    emissiveIntensity: 0.2,
    roughness: 0.32,
    metalness: 0.16,
  });
  morphSpecs.push({
    material: hairCrimsonMat,
    stageColor: '#9e1b3b',
    awakenedColor: '#ff1e56',
    stageEmissive: '#4c0519',
    awakenedEmissive: '#ff2a85',
    stageIntensity: 0.2,
    awakenedIntensity: 1.1,
  });

  const crownSpikes = new THREE.Group();
  crownSpikes.name = 'leftEar'; // Repairable crown spike crest pivot
  crownSpikes.position.set(0, 0.28, 0);

  // Sculpted undercut hair cap so the spikes grow from a hairline instead of a bare scalp
  const hairCapMat = getSatinMat('#3b0f1f', { roughness: 0.36, metalness: 0.12 });
  morphSpecs.push({
    material: hairCapMat,
    stageColor: '#3b0f1f',
    awakenedColor: '#7f1d3a',
    stageEmissive: '#1a060c',
    awakenedEmissive: '#ff2a85',
    stageIntensity: 0.08,
    awakenedIntensity: 0.55,
  });
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.352, 56, 32, 0, Math.PI * 2, 0, Math.PI * 0.36), hairCapMat);
  hairCap.scale.set(0.985, 1.07, 0.965);
  hairCap.position.set(0, -0.27, -0.012); // in crownSpikes space => head-centred
  hairCap.rotation.x = -0.1; // hairline higher at the front, lower at the nape
  crownSpikes.add(hairCap);
  // Tapered sideburn/temple fades (2 per side)
  [-1, 1].forEach((side) => {
    for (let k = 0; k < 2; k++) {
      const fade = makeTaperedTube(
        [
          [side * 0.285, -0.12 - k * 0.02, 0.09 - k * 0.1],
          [side * 0.315, -0.25 - k * 0.03, 0.05 - k * 0.1],
        ],
        [0.036, 0.018],
        12,
        10,
        hairCapMat
      );
      crownSpikes.add(fade);
    }
  });

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const ring = i % 3;
    const r0 = 0.14 + ring * 0.06;
    const x0 = Math.cos(a) * r0;
    const z0 = Math.sin(a) * r0;
    const flare = 0.34 + ring * 0.08;
    const x2 = Math.cos(a + 0.18) * flare;
    const z2 = Math.sin(a + 0.18) * flare;
    const y2 = 0.22 - ring * 0.12 + Math.cos(i * 1.7) * 0.06;
    const spikeMat = i % 2 === 0 ? hairSilverMat : hairCrimsonMat;
    const spike = makeTaperedTube(
      [
        [x0 * 0.6, 0.04, z0 * 0.6],
        [x0 * 1.25, 0.16, z0 * 1.25],
        [x2, y2, z2],
      ],
      [0.048, 0.056, 0.008],
      28,
      14,
      spikeMat
    );
    crownSpikes.add(spike);
  }
  markNoDecal(crownSpikes);
  head.add(crownSpikes);
  parts.leftEar = crownSpikes;

  const rightEarOrn = new THREE.Group();
  rightEarOrn.name = 'rightEar';
  rightEarOrn.position.set(0.32, 0.08, 0.05);
  const browStud = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), hairSilverMat);
  browStud.position.set(-0.12, 0.11, 0.24);
  rightEarOrn.add(browStud);
  markNoDecal(rightEarOrn);
  head.add(rightEarOrn);
  parts.rightEar = rightEarOrn;

  // Torso: Broad-Shouldered Sculpted Pectoral/Abdomen Muscle Anatomy + Sleeveless Stage Vest with Metallic Cross-Straps
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, -0.08, 0);
  parts.torso = torso;
  root.add(torso);

  // Vivid cobalt stage vest (reads as a garment against the skin instead of gray armour blocks)
  const vestMat = getSatinMat('#2451d8', {
    emissive: new THREE.Color('#1e3a8a'),
    emissiveIntensity: 0.12,
    roughness: 0.34,
    metalness: 0.16,
  });
  morphSpecs.push({
    material: vestMat,
    stageColor: '#2451d8',
    awakenedColor: '#6d28d9',
    stageEmissive: '#1e3a8a',
    awakenedEmissive: '#a855f7',
    stageIntensity: 0.12,
    awakenedIntensity: 0.6,
  });
  const strapMat = getStdMat('#d4af37', {
    emissive: new THREE.Color('#92400e'),
    emissiveIntensity: 0.22,
    roughness: 0.25,
    metalness: 0.22,
  });

  // Base muscular torso loft
  const torsoLoft = makeLatheLoft(
    [
      [0.15, 0.36],
      [0.32, 0.28],
      [0.30, 0.12],
      [0.25, -0.06],
      [0.27, -0.24],
      [0.29, -0.35],
    ],
    56,
    skinMat
  );
  torsoLoft.scale.set(1.12, 1.0, 0.8);
  torso.add(torsoLoft);

  // Sculpted pectoral & 6-pack abdominal muscle relief ellipsoids
  [-1, 1].forEach((side) => {
    const pec = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 18), skinMat);
    pec.position.set(side * 0.105, 0.17, 0.165);
    pec.scale.set(1.15, 0.82, 0.55);
    torso.add(pec);
    for (let row = 0; row < 3; row++) {
      const ab = new THREE.Mesh(new THREE.SphereGeometry(0.058, 18, 14), skinMat);
      ab.position.set(side * 0.055, 0.02 - row * 0.072, 0.185 - row * 0.008);
      ab.scale.set(1.05, 0.72, 0.45);
      torso.add(ab);
    }
  });

  // Cropped sleeveless leather/satin stage vest panels
  [-1, 1].forEach((side) => {
    const vestPanel = makeTaperedTube(
      [
        [side * 0.22, 0.32, 0.04],
        [side * 0.27, 0.14, 0.14],
        [side * 0.23, -0.05, 0.13],
      ],
      [0.095, 0.11, 0.085],
      24,
      16,
      vestMat
    );
    torso.add(vestPanel);
  });

  // Metallic Cross-Straps (`金属交叉胸带`, metalness <= 0.22)
  [-1, 1].forEach((dir) => {
    const crossStrap = makeTaperedTube(
      [
        [-dir * 0.22, 0.3, 0.15],
        [0, 0.11, 0.245],
        [dir * 0.22, -0.08, 0.17],
      ],
      [0.018, 0.022, 0.018],
      24,
      12,
      strapMat
    );
    markNoDecal(crossStrap);
    torso.add(crossStrap);
  });

  const { seal } = buildDemonMarkSeal('#ffbe3b', '#ff2a85');
  torso.add(seal);
  parts.demonMarkSeal = seal;

  // Muscular Arms (sculpted deltoid, bicep, forearm) + Fingerless Dance Gloves
  const tattooMat = getDemonRuneMat('#ff2a55', '#a855f7', { emissiveIntensity: 1.3 });
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.name = side === 1 ? 'leftArm' : 'rightArm';
    arm.position.set(side * 0.36, 0.2, 0);

    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), skinMat);
    deltoid.scale.set(1.0, 1.15, 0.92);
    const bicep = new THREE.Mesh(new THREE.SphereGeometry(0.092, 24, 18), skinMat);
    bicep.position.set(side * 0.04, -0.15, 0.02);
    bicep.scale.set(0.95, 1.35, 0.92);
    const forearm = makeTaperedTube(
      [
        [side * 0.04, -0.22, 0.03],
        [side * 0.05, -0.38, 0.1],
      ],
      [0.082, 0.062],
      22,
      16,
      skinMat
    );

    // Awakened fiery magma-crimson & violet tiger-lion tattoo markings
    const tattoo = makeTaperedTube(
      [
        [side * 0.03, -0.02, 0.08],
        [side * 0.09, -0.16, 0.09],
        [side * 0.06, -0.33, 0.14],
      ],
      [0.012, 0.018, 0.01],
      24,
      12,
      tattooMat
    );
    tattoo.visible = false;
    markNoDecal(tattoo);
    awakenedNodes.push(tattoo);

    const hand = buildSajaHand(side, skinMat, {
      scale: 1.04,
      fingerlessGlove: true,
      gloveHex: '#1a1528',
      studHex: '#f5b942',
    });
    hand.position.set(side * 0.05, -0.43, 0.12);

    arm.add(deltoid, bicep, forearm, tattoo, hand);
    root.add(arm);
    parts[arm.name] = arm;
  });

  // Cargo Dance Pants & Heavy Combat Dance Boots (rich navy, glossy aubergine boots)
  const cargoMat = getSatinMat('#1f2a5e', { roughness: 0.5, metalness: 0.12 });
  const bootMat = getStdMat('#2a1a3d', { roughness: 0.26, metalness: 0.18 });
  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.name = side === 1 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * 0.16, -0.42, 0);

    const cargoLeg = makeTaperedTube(
      [
        [0, 0, 0],
        [side * 0.02, -0.18, 0.02],
        [0, -0.35, 0],
      ],
      [0.118, 0.112, 0.086],
      28,
      18,
      cargoMat
    );
    const boot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), bootMat);
    boot.position.set(0, -0.42, 0.055);
    boot.scale.set(0.98, 0.68, 1.5);
    leg.add(cargoLeg, boot);
    root.add(leg);
    parts[leg.name] = leg;
  });

  // Belt chain tail pivot (`parts.tail`)
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, -0.32, -0.16);
  const beltSash = makeTaperedTube(
    [
      [0, 0, 0],
      [0.14, -0.14, -0.04],
      [0.2, -0.28, -0.06],
    ],
    [0.035, 0.042, 0.02],
    18,
    12,
    strapMat
  );
  tail.add(beltSash);
  root.add(tail);
  parts.tail = tail;

  // Signature Prop (`parts.signatureProp`): Lion-Crest Chain Mic & Knuckle Emblem
  const lionProp = new THREE.Group();
  lionProp.name = 'signatureProp';
  lionProp.position.set(-0.28, -0.18, 0.25);

  const lionGoldMat = getStdMat('#ffbe2e', {
    emissive: new THREE.Color('#f59e0b'),
    emissiveIntensity: 0.65,
    roughness: 0.22,
    metalness: 0.22,
  });
  morphSpecs.push({
    material: lionGoldMat,
    stageColor: '#ffbe2e',
    awakenedColor: '#ff2a55',
    stageEmissive: '#f59e0b',
    awakenedEmissive: '#a855f7',
    stageIntensity: 0.65,
    awakenedIntensity: 1.4,
  });

  const crestDisc = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 2), lionGoldMat);
  crestDisc.scale.set(1.1, 1.1, 0.55);
  const maneRing = new THREE.Mesh(new THREE.TorusKnotGeometry(0.078, 0.016, 48, 12, 3, 4), lionGoldMat);
  const micBody = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.18, 20), vestMat);
  micBody.position.set(-0.1, 0.08, 0.05);
  micBody.rotation.z = 0.45;
  const micCapsule = new THREE.Mesh(new THREE.SphereGeometry(0.036, 22, 18), lionGoldMat);
  micCapsule.position.set(-0.14, 0.16, 0.05);

  const propLight = new THREE.PointLight(0xffaa22, 0.85, 1.4);
  propLight.position.set(0, 0, 0.12);
  lionProp.add(crestDisc, maneRing, micBody, micCapsule, propLight);
  markNoDecal(lionProp);
  torso.add(lionProp);

  parts.signatureProp = lionProp;
  root.pendantLight = propLight;
  root.pendantEmissiveMesh = crestDisc;

  const { auraGroup, awakenedFlames, auraMorphSpec } = buildSajaAuraAndFlames('#ffbe2e', '#ff2a55', '#a855f7');
  awakenedNodes.push(awakenedFlames);
  morphSpecs.push(auraMorphSpec);
  root.add(auraGroup);
  parts.auraGroup = auraGroup;

  root.parts = parts;
  attachSajaDualForm(root, { stageNodes: [], awakenedNodes, morphSpecs, auraGroup });
  return root;
}

// ============================================================================
// 3. MYSTERY (迷斯 · 银发神秘主唱) — 26 Silver-Violet Bangs + High-Collar Embroidered Silk Coat + Glowing Spirit Stand Mic
// ============================================================================
export function buildMystery() {
  const root = new THREE.Group();
  root.name = 'mystery';
  root.characterId = 'mystery';
  root.displayName = '迷斯 · 银发神秘主唱';
  root.group = root;
  root.userData.baseScale = 1.03;

  const parts = { root };
  const awakenedNodes = [];
  const morphSpecs = [];

  const { head, eyes, irisMorphSpec, awakenedEyeNodes, skinMat } = buildMaleIdolHead({
    skinHex: '#f9e8f2',
    lipHex: '#b8769e',
    irisStageHex: '#5b4b8a',
    irisAwakenedHex: '#00f5d4',
    browHex: '#4c3f6e',
    earMonitorHex: '#c084fc',
    earHoops: true,
    smirk: 0.1,
  });
  parts.head = head;
  parts.eyes = eyes;
  morphSpecs.push(irisMorphSpec);
  awakenedNodes.push(...awakenedEyeNodes);
  root.add(head);

  // 26 Layered Silver-Violet Bangs sweeping over his eyes (`parts.leftEar` detachable/repairable bangs crown)
  const silverBangMat = getSatinMat('#d8d4f2', {
    emissive: new THREE.Color('#6d5cae'),
    emissiveIntensity: 0.18,
    roughness: 0.26,
    metalness: 0.18,
    transparent: true,
    opacity: 0.96,
  });
  morphSpecs.push({
    material: silverBangMat,
    stageColor: '#d8d4f2',
    awakenedColor: '#a5f3fc',
    stageEmissive: '#6d5cae',
    awakenedEmissive: '#6366f1',
    stageIntensity: 0.18,
    awakenedIntensity: 0.95,
  });

  const bangsGroup = new THREE.Group();
  bangsGroup.name = 'leftEar';
  bangsGroup.position.set(0, 0.24, 0.04);

  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const isFrontVeil = Math.sin(a) > 0.05;
    const x0 = Math.cos(a) * 0.16;
    const z0 = Math.sin(a) * 0.16;
    const sweep = isFrontVeil ? 0.09 : 0.0;
    const x1 = Math.cos(a + sweep) * 0.34;
    const z1 = Math.sin(a + sweep) * 0.35;
    const yEnd = isFrontVeil ? -0.24 - (i % 3) * 0.03 : -0.32;
    const strand = makeTaperedTube(
      [
        [x0, 0.14, z0],
        [x1 * 0.95, -0.02, z1 * 0.98],
        [x1 * 0.88 + (isFrontVeil ? 0.04 : 0), yEnd, z1 * 1.02],
      ],
      [0.038, 0.048, 0.01],
      30,
      14,
      silverBangMat
    );
    bangsGroup.add(strand);
  }
  markNoDecal(bangsGroup);
  head.add(bangsGroup);
  parts.leftEar = bangsGroup;

  const rightEarGroup = new THREE.Group();
  rightEarGroup.name = 'rightEar';
  rightEarGroup.position.set(0.33, 0.04, 0);
  const silverClip = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 1), silverBangMat);
  rightEarGroup.add(silverClip);
  markNoDecal(rightEarGroup);
  head.add(rightEarGroup);
  parts.rightEar = rightEarGroup;

  // Torso: Aristocratic High-Collar Embroidered Silk Stage Coat
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, -0.08, 0);
  parts.torso = torso;
  root.add(torso);

  const silkCoatMat = getEmbroideryMat('#2b234d', '#d8b4fe', { roughness: 0.34, metalness: 0.18 });
  const capeletMat = getSatinMat('#433878', {
    emissive: new THREE.Color('#312e81'),
    emissiveIntensity: 0.22,
    roughness: 0.3,
    metalness: 0.18,
  });
  morphSpecs.push({
    material: capeletMat,
    stageColor: '#433878',
    awakenedColor: '#38bdf8',
    stageEmissive: '#312e81',
    awakenedEmissive: '#818cf8',
    stageIntensity: 0.22,
    awakenedIntensity: 1.15,
  });

  const coatLoft = makeLatheLoft(
    [
      [0.16, 0.42],
      [0.15, 0.34],
      [0.29, 0.26],
      [0.26, 0.08],
      [0.23, -0.08],
      [0.31, -0.32],
      [0.37, -0.48],
    ],
    56,
    silkCoatMat
  );
  coatLoft.scale.set(1.04, 1.0, 0.8);
  torso.add(coatLoft);

  // Layered aristocratic capelet shoulders & silver frog-buttons
  const capelet = makeLatheLoft(
    [
      [0.17, 0.36],
      [0.35, 0.24],
      [0.41, 0.08],
    ],
    48,
    capeletMat
  );
  capelet.scale.set(1.06, 1.0, 0.82);
  torso.add(capelet);

  for (let b = 0; b < 5; b++) {
    const frog = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 10, 20), silverBangMat);
    frog.position.set(0, 0.24 - b * 0.075, 0.22);
    frog.userData.noDecal = true;
    torso.add(frog);
  }

  const { seal } = buildDemonMarkSeal('#c084fc', '#38bdf8');
  torso.add(seal);
  parts.demonMarkSeal = seal;

  // Tail coat-panel pivot
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, -0.34, -0.18);
  const mistRibbon = makeTaperedTube(
    [
      [0, 0, 0],
      [0, -0.2, -0.08],
      [0.06, -0.38, -0.14],
    ],
    [0.08, 0.1, 0.04],
    22,
    14,
    capeletMat
  );
  tail.add(mistRibbon);
  root.add(tail);
  parts.tail = tail;

  // Arms & Articulated 5-Finger Hands
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.name = side === 1 ? 'leftArm' : 'rightArm';
    arm.position.set(side * 0.32, 0.18, 0);

    const sleeve = makeTaperedTube(
      [
        [0, 0, 0],
        [side * 0.05, -0.18, 0.04],
        [side * 0.03, -0.36, 0.12],
      ],
      [0.082, 0.078, 0.072],
      28,
      18,
      silkCoatMat
    );
    const hand = buildSajaHand(side, skinMat, { scale: 0.94, silverRings: true, studHex: '#c4b5fd' });
    hand.position.set(side * 0.03, -0.43, 0.14);

    arm.add(sleeve, hand);
    root.add(arm);
    parts[arm.name] = arm;
  });

  // Legs & Sleek Ankle Boots (slate-indigo satin, not flat black)
  const pantsMat = getSatinMat('#2c2a66', { roughness: 0.4, metalness: 0.14 });
  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.name = side === 1 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * 0.145, -0.42, 0);

    const legTube = makeTaperedTube(
      [
        [0, 0, 0],
        [0, -0.18, 0.01],
        [0, -0.36, 0],
      ],
      [0.1, 0.084, 0.068],
      26,
      18,
      pantsMat
    );
    const boot = new THREE.Mesh(new THREE.SphereGeometry(0.088, 22, 16), silkCoatMat);
    boot.position.set(0, -0.42, 0.05);
    boot.scale.set(0.9, 0.62, 1.45);
    leg.add(legTube, boot);
    root.add(leg);
    parts[leg.name] = leg;
  });

  // Signature Prop (`parts.signatureProp`): Glowing Spirit Stand Microphone (幽光灵体立麦)
  const standMic = new THREE.Group();
  standMic.name = 'signatureProp';
  standMic.position.set(-0.26, -0.12, 0.31);

  const spiritOrbMat = getStdMat('#67e8f9', {
    emissive: new THREE.Color('#38bdf8'),
    emissiveIntensity: 0.78,
    roughness: 0.16,
    metalness: 0.2,
  });
  morphSpecs.push({
    material: spiritOrbMat,
    stageColor: '#67e8f9',
    awakenedColor: '#c084fc',
    stageEmissive: '#38bdf8',
    awakenedEmissive: '#00f5d4',
    stageIntensity: 0.78,
    awakenedIntensity: 1.5,
  });

  const standShaft = makeTaperedTube(
    [
      [0, -0.58, 0],
      [0.02, -0.25, 0.02],
      [-0.02, 0.08, 0],
      [0, 0.34, 0.02],
    ],
    [0.028, 0.016, 0.015, 0.018],
    32,
    14,
    silverBangMat
  );
  const lanternCage = new THREE.Mesh(new THREE.TorusKnotGeometry(0.062, 0.01, 48, 12, 2, 3), silverBangMat);
  lanternCage.position.set(0, 0.38, 0.02);
  const soulOrb = new THREE.Mesh(new THREE.SphereGeometry(0.044, 24, 20), spiritOrbMat);
  soulOrb.position.set(0, 0.38, 0.02);

  const propLight = new THREE.PointLight(0x38bdf8, 0.9, 1.5);
  propLight.position.set(0, 0.38, 0.12);
  standMic.add(standShaft, lanternCage, soulOrb, propLight);
  markNoDecal(standMic);
  torso.add(standMic);

  parts.signatureProp = standMic;
  root.pendantLight = propLight;
  root.pendantEmissiveMesh = soulOrb;

  const { auraGroup, awakenedFlames, auraMorphSpec } = buildSajaAuraAndFlames('#a5b4fc', '#00f5d4', '#818cf8');
  awakenedNodes.push(awakenedFlames);
  morphSpecs.push(auraMorphSpec);
  root.add(auraGroup);
  parts.auraGroup = auraGroup;

  root.parts = parts;
  attachSajaDualForm(root, { stageNodes: [], awakenedNodes, morphSpecs, auraGroup });
  return root;
}

// ============================================================================
// 4. ROMANCE (罗曼 · 玫瑰花美男) — 24 Wavy Rose-Pink Hair Locks + Velvet Suit + 3D Rose Brooch & Heart Charm + Rose-Gold Vine Mic
// ============================================================================
export function buildRomance() {
  const root = new THREE.Group();
  root.name = 'romance';
  root.characterId = 'romance';
  root.displayName = '罗曼 · 玫瑰花美男';
  root.group = root;
  root.userData.baseScale = 1.03;

  const parts = { root };
  const awakenedNodes = [];
  const morphSpecs = [];

  const { head, eyes, irisMorphSpec, awakenedEyeNodes, skinMat } = buildMaleIdolHead({
    skinHex: '#ffe6dc',
    lipHex: '#e85d88',
    irisStageHex: '#832b56',
    irisAwakenedHex: '#ffbe0b',
    browHex: '#6b2146',
    earMonitorHex: '#ff85b3',
    earHoops: true,
    smirk: 0.3,
  });
  parts.head = head;
  parts.eyes = eyes;
  morphSpecs.push(irisMorphSpec);
  awakenedNodes.push(...awakenedEyeNodes);
  root.add(head);

  // 24 Wavy Rose-Pink S-Curved Parted Hair Locks (`parts.leftEar` detachable hair wave group)
  const roseHairMat = getSatinMat('#ff82b2', {
    emissive: new THREE.Color('#9d174d'),
    emissiveIntensity: 0.16,
    roughness: 0.3,
    metalness: 0.15,
  });
  morphSpecs.push({
    material: roseHairMat,
    stageColor: '#ff82b2',
    awakenedColor: '#fb7185',
    stageEmissive: '#9d174d',
    awakenedEmissive: '#e11d48',
    stageIntensity: 0.16,
    awakenedIntensity: 0.85,
  });

  const wavyHair = new THREE.Group();
  wavyHair.name = 'leftEar';
  wavyHair.position.set(0, 0.25, 0.02);

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const sWave = Math.sin(i * 1.4) * 0.045;
    const x0 = Math.cos(a) * 0.16;
    const z0 = Math.sin(a) * 0.16;
    const x1 = Math.cos(a + 0.14) * 0.35 + sWave;
    const z1 = Math.sin(a + 0.14) * 0.34;
    const x2 = Math.cos(a - 0.12) * 0.37 - sWave;
    const z2 = Math.sin(a - 0.12) * 0.35;
    const waveLock = makeTaperedTube(
      [
        [x0, 0.14, z0],
        [x1, 0.0, z1],
        [x2, -0.22, z2],
      ],
      [0.04, 0.052, 0.014],
      28,
      14,
      roseHairMat
    );
    wavyHair.add(waveLock);
  }
  markNoDecal(wavyHair);
  head.add(wavyHair);
  parts.leftEar = wavyHair;

  const rightEarGroup = new THREE.Group();
  rightEarGroup.name = 'rightEar';
  rightEarGroup.position.set(0.33, 0.04, 0.02);
  const roseEarPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.026, 2), roseHairMat);
  rightEarGroup.add(roseEarPin);
  markNoDecal(rightEarGroup);
  head.add(rightEarGroup);
  parts.rightEar = rightEarGroup;

  // Torso: Burgundy-and-Blush Velvet Lapel Suit + 18-Petal 3D Rose Brooch + Floating Heart Charm
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, -0.08, 0);
  parts.torso = torso;
  root.add(torso);

  const velvetSuitMat = getEmbroideryMat('#5e1639', '#fda4af', { roughness: 0.45, metalness: 0.14 });
  const silkShirtMat = getSatinMat('#fff0f5', { roughness: 0.28, metalness: 0.1 });
  const rosePetalMat = getStdMat('#ff2a6d', {
    emissive: new THREE.Color('#be123c'),
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.18,
  });
  morphSpecs.push({
    material: rosePetalMat,
    stageColor: '#ff2a6d',
    awakenedColor: '#e11d48',
    stageEmissive: '#be123c',
    awakenedEmissive: '#ff0055',
    stageIntensity: 0.55,
    awakenedIntensity: 1.45,
  });

  const suitLoft = makeLatheLoft(
    [
      [0.14, 0.36],
      [0.29, 0.28],
      [0.26, 0.1],
      [0.23, -0.08],
      [0.28, -0.28],
      [0.31, -0.38],
    ],
    56,
    velvetSuitMat
  );
  suitLoft.scale.set(1.05, 1.0, 0.8);
  torso.add(suitLoft);

  // Ruffled silk shirt cravat
  const cravat = new THREE.Mesh(new THREE.SphereGeometry(0.085, 22, 18), silkShirtMat);
  cravat.position.set(0, 0.24, 0.19);
  cravat.scale.set(0.85, 1.25, 0.45);
  torso.add(cravat);

  // 18-Petal Sculpted 3D Rose Brooch + Floating Heart Charm on Left Lapel
  const broochGroup = new THREE.Group();
  broochGroup.name = 'roseBroochGroup';
  broochGroup.position.set(0.13, 0.21, 0.225);

  for (let p = 0; p < 18; p++) {
    const goldenAngle = p * 2.39996;
    const rad = 0.012 + Math.sqrt(p) * 0.011;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 12), rosePetalMat);
    petal.position.set(Math.cos(goldenAngle) * rad, Math.sin(goldenAngle) * rad, (18 - p) * 0.0018);
    petal.scale.set(1.25, 0.85, 0.42);
    petal.rotation.z = goldenAngle;
    broochGroup.add(petal);
  }

  // Floating translucent Heart Charm next to lapel
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.035);
  heartShape.bezierCurveTo(-0.065, 0.01, -0.028, 0.055, 0, 0.024);
  heartShape.bezierCurveTo(0.028, 0.055, 0.065, 0.01, 0, -0.035);
  const heartMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelSize: 0.004,
      bevelThickness: 0.004,
      bevelSegments: 3,
      curveSegments: 20,
    }),
    rosePetalMat
  );
  heartMesh.position.set(0.065, 0.045, 0.025);
  broochGroup.add(heartMesh);
  markNoDecal(broochGroup);
  torso.add(broochGroup);

  const { seal } = buildDemonMarkSeal('#ff85b3', '#e11d48');
  torso.add(seal);
  parts.demonMarkSeal = seal;

  // Tail coat-tails
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, -0.34, -0.18);
  const roseCoatTail = makeTaperedTube(
    [
      [0, 0, 0],
      [0, -0.18, -0.06],
      [0, -0.34, -0.1],
    ],
    [0.09, 0.11, 0.05],
    20,
    14,
    velvetSuitMat
  );
  tail.add(roseCoatTail);
  root.add(tail);
  parts.tail = tail;

  // Arms & Articulated 5-Finger Hands
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.name = side === 1 ? 'leftArm' : 'rightArm';
    arm.position.set(side * 0.32, 0.18, 0);

    const sleeve = makeTaperedTube(
      [
        [0, 0, 0],
        [side * 0.05, -0.18, 0.04],
        [side * 0.04, -0.36, 0.12],
      ],
      [0.082, 0.075, 0.066],
      28,
      18,
      velvetSuitMat
    );
    const hand = buildSajaHand(side, skinMat, { scale: 0.95, silverRings: true, studHex: '#fda4af' });
    hand.position.set(side * 0.04, -0.43, 0.14);
    arm.add(sleeve, hand);
    root.add(arm);
    parts[arm.name] = arm;
  });

  // Legs & White-and-Rose Dress Shoes
  const trousersMat = getSatinMat('#6b1d46', { roughness: 0.4, metalness: 0.12 });
  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.name = side === 1 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * 0.15, -0.42, 0);

    const legTube = makeTaperedTube(
      [
        [0, 0, 0],
        [0, -0.18, 0.01],
        [0, -0.35, 0],
      ],
      [0.102, 0.086, 0.072],
      26,
      18,
      trousersMat
    );
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.09, 22, 16), silkShirtMat);
    shoe.position.set(0, -0.42, 0.055);
    shoe.scale.set(0.9, 0.6, 1.48);
    leg.add(legTube, shoe);
    root.add(leg);
    parts[leg.name] = leg;
  });

  // Signature Prop (`parts.signatureProp`): Rose-Gold Handheld Mic wrapped in Thorny Rose Vine
  const roseMic = new THREE.Group();
  roseMic.name = 'signatureProp';
  roseMic.position.set(-0.24, -0.02, 0.28);
  roseMic.rotation.set(0.25, 0.15, -0.35);

  const roseGoldMat = getStdMat('#f4a2b8', {
    emissive: new THREE.Color('#ec4899'),
    emissiveIntensity: 0.58,
    roughness: 0.2,
    metalness: 0.22,
  });
  const vineMat = getStdMat('#14532d', { roughness: 0.45, metalness: 0.1 });

  const micHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.017, 0.22, 24), roseGoldMat);
  const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.042, 24, 20), rosePetalMat);
  micHead.position.y = 0.13;

  // Spiraled thorny vine around mic handle
  const vinePts = [];
  for (let k = 0; k <= 20; k++) {
    const u = k / 20;
    const ang = u * Math.PI * 4;
    vinePts.push([Math.cos(ang) * 0.026, (u - 0.5) * 0.18, Math.sin(ang) * 0.026]);
  }
  const vineTube = makeTaperedTube(vinePts, [0.005, 0.007, 0.005], 32, 10, vineMat);

  const propLight = new THREE.PointLight(0xff4d94, 0.88, 1.4);
  propLight.position.set(0, 0.13, 0.1);
  roseMic.add(micHandle, micHead, vineTube, propLight);
  markNoDecal(roseMic);
  torso.add(roseMic);

  parts.signatureProp = roseMic;
  root.pendantLight = propLight;
  root.pendantEmissiveMesh = micHead;

  const { auraGroup, awakenedFlames, auraMorphSpec } = buildSajaAuraAndFlames('#fda4af', '#e11d48', '#f43f5e');
  awakenedNodes.push(awakenedFlames);
  morphSpecs.push(auraMorphSpec);
  root.add(auraGroup);
  parts.auraGroup = auraGroup;

  root.parts = parts;
  attachSajaDualForm(root, { stageNodes: [], awakenedNodes, morphSpecs, auraGroup });
  return root;
}

// ============================================================================
// 5. BABY (贝比 · 潮流说唱忙内) — Knitted Cat-Ear Beanie + Oversized Pastel Hoodie + Chunky High-Tops + Soda Pop Can
// ============================================================================
export function buildBaby() {
  const root = new THREE.Group();
  root.name = 'baby';
  root.characterId = 'baby';
  root.displayName = '贝比 · 潮流说唱忙内';
  root.group = root;
  root.userData.baseScale = 0.96;

  const parts = { root };
  const awakenedNodes = [];
  const morphSpecs = [];

  const { head, eyes, irisMorphSpec, awakenedEyeNodes, skinMat } = buildMaleIdolHead({
    skinHex: '#ffeadb',
    lipHex: '#f2849e',
    irisStageHex: '#2563eb',
    irisAwakenedHex: '#fde047',
    browHex: '#38bdf8',
    earMonitorHex: '#2dd4bf',
    earStuds: true,
    smirk: 0.35,
  });
  parts.head = head;
  parts.eyes = eyes;
  morphSpecs.push(irisMorphSpec);
  awakenedNodes.push(...awakenedEyeNodes);
  root.add(head);

  // Pastel-Mint Bangs peeking under beanie + Knitted Cat-Ear Beanie (`parts.leftEar`)
  const mintHairMat = getSatinMat('#5eead4', { roughness: 0.34, metalness: 0.12 });
  const beanieMat = getEmbroideryMat('#a78bfa', '#5eead4', { roughness: 0.62, metalness: 0.08 });
  const hornFlameMat = getDemonRuneMat('#38bdf8', '#c084fc', { emissiveIntensity: 1.35 });

  const beanieGroup = new THREE.Group();
  beanieGroup.name = 'leftEar';
  beanieGroup.position.set(0, 0.14, 0);

  // Ribbed beanie dome & folded cuff
  const beanieDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.375, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.58),
    beanieMat
  );
  const beanieCuff = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.048, 18, 48), beanieMat);
  beanieCuff.rotation.x = Math.PI / 2;
  beanieCuff.position.y = 0.04;
  beanieGroup.add(beanieDome, beanieCuff);

  // Twin pointed plush cat ears on beanie + Awakened Dokkaebi devil-horn flames
  [-1, 1].forEach((side) => {
    const catEar = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 24), beanieMat);
    catEar.position.set(side * 0.24, 0.31, 0.02);
    catEar.rotation.z = -side * 0.32;
    beanieGroup.add(catEar);

    const impHornFlame = makeTaperedTube(
      [
        [side * 0.24, 0.36, 0.02],
        [side * 0.31, 0.5, -0.02],
        [side * 0.26, 0.62, 0.04],
      ],
      [0.032, 0.022, 0.004],
      20,
      12,
      hornFlameMat
    );
    impHornFlame.visible = false;
    awakenedNodes.push(impHornFlame);
    beanieGroup.add(impHornFlame);
  });

  // Pastel-mint bangs peeking out in front
  for (let b = 0; b < 12; b++) {
    const u = (b - 5.5) / 5.5;
    const bang = makeTaperedTube(
      [
        [u * 0.24, 0.04, 0.31],
        [u * 0.26, -0.05, 0.35],
        [u * 0.24 + 0.02, -0.12, 0.34],
      ],
      [0.026, 0.032, 0.008],
      20,
      12,
      mintHairMat
    );
    beanieGroup.add(bang);
  }

  markNoDecal(beanieGroup);
  head.add(beanieGroup);
  parts.leftEar = beanieGroup;

  const rightEarGroup = new THREE.Group();
  rightEarGroup.name = 'rightEar';
  rightEarGroup.position.set(0.35, 0.16, 0.12);
  const safetyPin = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.005, 10, 20), mintHairMat);
  rightEarGroup.add(safetyPin);
  markNoDecal(rightEarGroup);
  head.add(rightEarGroup);
  parts.rightEar = rightEarGroup;

  // Torso: Plush Oversized Pastel Hoodie in Mint-Blue, Lilac & Cream
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, -0.08, 0);
  parts.torso = torso;
  root.add(torso);

  const hoodieMat = getSatinMat('#7dd3fc', {
    emissive: new THREE.Color('#0284c7'),
    emissiveIntensity: 0.14,
    roughness: 0.48,
    metalness: 0.1,
  });
  // Pocket/hood in a slightly deeper hoodie blue so they read as fabric panels, not a white egg
  const pocketMat = getSatinMat('#58b4ea', { roughness: 0.5, metalness: 0.1 });
  morphSpecs.push({
    material: pocketMat,
    stageColor: '#58b4ea',
    awakenedColor: '#6b6fe3',
    stageEmissive: '#0369a1',
    awakenedEmissive: '#7c3aed',
    stageIntensity: 0.08,
    awakenedIntensity: 0.55,
  });
  morphSpecs.push({
    material: hoodieMat,
    stageColor: '#7dd3fc',
    awakenedColor: '#818cf8',
    stageEmissive: '#0284c7',
    awakenedEmissive: '#a855f7',
    stageIntensity: 0.14,
    awakenedIntensity: 0.85,
  });

  const hoodieLoft = makeLatheLoft(
    [
      [0.16, 0.36],
      [0.32, 0.26],
      [0.35, 0.06],
      [0.36, -0.16],
      [0.33, -0.34],
    ],
    56,
    hoodieMat
  );
  hoodieLoft.scale.set(1.08, 1.0, 0.88);
  torso.add(hoodieLoft);

  // Kangaroo pocket (flattened pouch hugging the belly) & pom-pom drawstrings
  const pocket = new THREE.Mesh(new THREE.SphereGeometry(0.18, 28, 20), pocketMat);
  pocket.position.set(0, -0.14, 0.265);
  pocket.scale.set(1.3, 0.5, 0.34);
  torso.add(pocket);
  // Stitched pocket mouth piping along the pocket's top edge
  const pocketSeam = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 10), hoodieMat);
  pocketSeam.position.set(0, -0.055, 0.318);
  pocketSeam.rotation.z = Math.PI / 2;
  pocketSeam.userData.noDecal = true;
  torso.add(pocketSeam);

  [-1, 1].forEach((side) => {
    const cord = makeTaperedTube(
      [
        [side * 0.07, 0.28, 0.24],
        [side * 0.08, 0.12, 0.29],
      ],
      [0.008, 0.01],
      16,
      10,
      pocketMat
    );
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 14), mintHairMat);
    pom.position.set(side * 0.08, 0.1, 0.295);
    cord.userData.noDecal = true;
    pom.userData.noDecal = true;
    torso.add(cord, pom);
  });

  const { seal } = buildDemonMarkSeal('#5eead4', '#a855f7');
  torso.add(seal);
  parts.demonMarkSeal = seal;

  // Hoodie back hood pivot (`parts.tail`)
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, 0.22, -0.22);
  const backHood = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 18), pocketMat);
  backHood.scale.set(1.2, 0.85, 0.75);
  tail.add(backHood);
  root.add(tail);
  parts.tail = tail;

  // Arms & Articulated 5-Finger Hands
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.name = side === 1 ? 'leftArm' : 'rightArm';
    arm.position.set(side * 0.34, 0.18, 0);

    const puffySleeve = makeTaperedTube(
      [
        [0, 0, 0],
        [side * 0.06, -0.18, 0.04],
        [side * 0.04, -0.35, 0.11],
      ],
      [0.095, 0.105, 0.078],
      28,
      18,
      hoodieMat
    );
    const hand = buildSajaHand(side, skinMat, { scale: 0.92, silverRings: false });
    hand.position.set(side * 0.04, -0.42, 0.13);
    arm.add(puffySleeve, hand);
    root.add(arm);
    parts[arm.name] = arm;
  });

  // Legs & Chunky High-Top Sneakers
  const shortsMat = getSatinMat('#312e81', { roughness: 0.48, metalness: 0.1 });
  const sneakerMat = getStdMat('#ffffff', { roughness: 0.32, metalness: 0.12 });
  const neonSoleMat = getStdMat('#2dd4bf', {
    emissive: new THREE.Color('#14b8a6'),
    emissiveIntensity: 0.38,
    roughness: 0.25,
    metalness: 0.16,
  });

  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.name = side === 1 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * 0.15, -0.4, 0);

    const legTube = makeTaperedTube(
      [
        [0, 0, 0],
        [0, -0.16, 0.01],
        [0, -0.32, 0],
      ],
      [0.105, 0.088, 0.074],
      26,
      18,
      shortsMat
    );
    const highTop = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.092, 0.14, 24), sneakerMat);
    highTop.position.set(0, -0.32, 0.02);
    const shoeBody = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), sneakerMat);
    shoeBody.position.set(0, -0.39, 0.06);
    shoeBody.scale.set(1.02, 0.68, 1.52);
    const chunkySole = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.112, 0.042, 24), neonSoleMat);
    chunkySole.position.set(0, -0.435, 0.06);
    chunkySole.scale.set(1.0, 1.0, 1.48);

    leg.add(legTube, highTop, shoeBody, chunkySole);
    root.add(leg);
    parts[leg.name] = leg;
  });

  // Signature Prop (`parts.signatureProp`): Sparkling "Soda Pop" Can (`闪亮苏打汽水罐`) + Rising 3D Fizzy Bubbles
  const sodaGroup = new THREE.Group();
  sodaGroup.name = 'signatureProp';
  sodaGroup.position.set(-0.3, -0.02, 0.33);
  sodaGroup.rotation.set(0.12, 0.35, -0.2);

  // Low emissive so the teal/pink "SODA POP" label stays legible instead of blowing out to white
  const canBodyMat = new THREE.MeshStandardMaterial({
    map: createSodaPopLabelTexture(),
    emissive: new THREE.Color('#ff6ad5'),
    emissiveIntensity: 0.1,
    roughness: 0.28,
    metalness: 0.18,
  });
  const canRimMat = getStdMat('#dbe4f3', { roughness: 0.22, metalness: MAX_METALNESS });
  const bubbleMat = getStdMat('#67e8f9', {
    emissive: new THREE.Color('#38bdf8'),
    emissiveIntensity: 0.75,
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.85,
  });
  morphSpecs.push({
    material: bubbleMat,
    stageColor: '#67e8f9',
    awakenedColor: '#d8b4fe',
    stageEmissive: '#38bdf8',
    awakenedEmissive: '#a855f7',
    stageIntensity: 0.75,
    awakenedIntensity: 1.5,
  });

  const canCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.24, 40), canBodyMat);
  const topRim = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.009, 12, 36), canRimMat);
  topRim.rotation.x = Math.PI / 2;
  topRim.position.y = 0.12;
  const bottomRim = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.009, 12, 36), canRimMat);
  bottomRim.rotation.x = Math.PI / 2;
  bottomRim.position.y = -0.12;
  const canLid = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.01, 36), canRimMat);
  canLid.position.y = 0.12;
  const pullTab = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 10, 20), canRimMat);
  pullTab.rotation.x = Math.PI / 2;
  pullTab.position.set(0.02, 0.13, 0);

  // 14 rising 3D fizzy bubbles above the Soda Pop can
  for (let b = 0; b < 14; b++) {
    const ang = b * 1.1;
    const rad = 0.015 + (b % 4) * 0.016;
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.013 + (b % 3) * 0.006, 16, 14), bubbleMat);
    bubble.position.set(Math.cos(ang) * rad, 0.15 + b * 0.019, Math.sin(ang) * rad);
    sodaGroup.add(bubble);
  }

  const propLight = new THREE.PointLight(0x38bdf8, 0.55, 1.2);
  propLight.position.set(0, 0.22, 0.12);
  sodaGroup.add(canCylinder, topRim, bottomRim, canLid, pullTab, propLight);
  markNoDecal(sodaGroup);
  torso.add(sodaGroup);

  parts.signatureProp = sodaGroup;
  root.pendantLight = propLight;
  root.pendantEmissiveMesh = canCylinder;

  const { auraGroup, awakenedFlames, auraMorphSpec } = buildSajaAuraAndFlames('#5eead4', '#a855f7', '#38bdf8');
  awakenedNodes.push(awakenedFlames);
  morphSpecs.push(auraMorphSpec);
  root.add(auraGroup);
  parts.auraGroup = auraGroup;

  root.parts = parts;
  attachSajaDualForm(root, { stageNodes: [], awakenedNodes, morphSpecs, auraGroup });
  return root;
}

export const SAJA_BOYS_META = {
  jinu: {
    id: 'jinu',
    name: '振宇 · 狮男团队长',
    shortName: '振宇 Jinu',
    title: 'Saja Boys 狮男团队长 · 黑笠琵琶冥使',
    who: '黑笠琵琶队长',
    category: 'saja_boys',
    group: 'saja_boys',
    icon: '🎩',
    color: '#2e1f5e',
    accent: '#c084fc',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.39, z: 0.01, rx: 0.25, ry: 0.16, rz: 0.22, frontY: -0.36, frontZ: 0.24 },
    hello: '你好！我是 Saja Boys 队长振宇，快帮我把黑笠帽、演出服和四弦琵琶整理闪亮吧！',
    thanks: '太帅啦！黑笠和四弦琵琶重现冥界金光，听我为你弹奏一曲！',
    build: buildJinu,
  },
  abby: {
    id: 'abby',
    name: '艾比 · 力量主舞',
    shortName: '艾比 Abby',
    title: 'Saja Boys 力量主舞 · 狂野肌肉舞担',
    who: '狂野力量主舞',
    category: 'saja_boys',
    group: 'saja_boys',
    icon: '🦁',
    color: '#9e1b3b',
    accent: '#ffbe2e',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.39, z: 0.01, rx: 0.26, ry: 0.16, rz: 0.22, frontY: -0.36, frontZ: 0.23 },
    hello: '嗨！我是 Saja Boys 力量主舞艾比，高难度街舞把我的刺猬头和狮王徽章弄乱啦！',
    thanks: '充满力量！双色刺猬头和狮王金链又闪闪发光啦，看我来一段空翻热舞！',
    build: buildAbby,
  },
  mystery: {
    id: 'mystery',
    name: '迷斯 · 银发神秘主唱',
    shortName: '迷斯 Mystery',
    title: 'Saja Boys 神秘主唱 · 银紫遮眼魅影',
    who: '银发神秘主唱',
    category: 'saja_boys',
    group: 'saja_boys',
    icon: '🎙️',
    color: '#433878',
    accent: '#67e8f9',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.39, z: 0.01, rx: 0.25, ry: 0.16, rz: 0.22, frontY: -0.36, frontZ: 0.23 },
    hello: '嘘……我是神秘主唱迷斯，银紫色刘海和幽光立麦沾上了暗影灰尘，帮我清理一下吧。',
    thanks: '真动听……幽光立麦和刺绣礼服焕然一新，让我的歌声伴你闪耀舞台！',
    build: buildMystery,
  },
  romance: {
    id: 'romance',
    name: '罗曼 · 玫瑰花美男',
    shortName: '罗曼 Romance',
    title: 'Saja Boys 玫瑰视觉 · 丝绒浪漫贵公子',
    who: '玫瑰丝绒贵公子',
    category: 'saja_boys',
    group: 'saja_boys',
    icon: '🌹',
    color: '#831843',
    accent: '#ff82b2',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.39, z: 0.01, rx: 0.25, ry: 0.16, rz: 0.22, frontY: -0.36, frontZ: 0.23 },
    hello: '嗨，小可爱！我是玫瑰贵公子罗曼，帮我把波浪粉发、立体玫瑰胸针和玫瑰金麦修好吧！',
    thanks: '太浪漫啦！丝绒西装和玫瑰胸针闪着粉金光芒，送你一朵盛开的红玫瑰！',
    build: buildRomance,
  },
  baby: {
    id: 'baby',
    name: '贝比 · 潮流说唱忙内',
    shortName: '贝比 Baby',
    title: 'Saja Boys 说唱忙内 · 猫耳帽苏打少年',
    who: '猫耳帽苏打忙内',
    category: 'saja_boys',
    group: 'saja_boys',
    icon: '🥤',
    color: '#0284c7',
    accent: '#5eead4',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.37, z: 0.02, rx: 0.27, ry: 0.17, rz: 0.26, frontY: -0.34, frontZ: 0.3 },
    hello: '耶！我是说唱忙内贝比，跳得太嗨把猫耳冷帽、宽松卫衣和苏打汽水罐弄脏啦！',
    thanks: '咕噜咕噜噗！猫耳帽和闪亮苏打汽水罐满血复活，我们一起快乐冒泡吧！',
    build: buildBaby,
  },
};
