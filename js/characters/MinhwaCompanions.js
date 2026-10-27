// MinhwaCompanions.js — High-Resolution 3D Character Builders for Korean Minhwa Companions (Derpy Tiger & Sussie)
// Characters:
// 1. derpy_tiger   — Derpy · Blue Minhwa Tiger (Chubby Korean Minhwa blue tiger with 36+ cerulean/indigo tufted fur clusters,
//                    28 black folk-art stripe reliefs including the Chinese 'king' forehead mark, huge golden saucer eyes, goofy grin
//                    with 12 white fangs & curled pink tongue, plump paws with pink toe beans, ringed tail, and
//                    Tipped-to-Upright Blue-and-White Porcelain Peony Flowerpot `parts.signatureProp` & `parts.flowerpot`)
// 2. sussie_magpie — Sussie · Six-Eyed Magpie (Korean folk magpie with 32+ layered flight feathers & 14 tail feathers,
//                    6 glowing golden eyes — 3 inside `leftEye` and 3 inside `rightEye`, sculpted beak & 4-toed talons,
//                    miniature black Gat hat `parts.leftEar`, and Golden Honmoon Bell & Plum Blossom Branch `parts.signatureProp`)

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

function getMinhwaFurMat(baseHex, strokeHex = '#0f2957', extra = {}) {
  if (typeof MAT.createMinhwaFurMaterial === 'function') {
    return MAT.createMinhwaFurMaterial(baseHex, strokeHex, { ...extra, metalness: clampMetal(extra.metalness ?? 0.06) });
  }
  return getStdMat(baseHex, { roughness: 0.72, metalness: 0.06, ...extra });
}

function getPorcelainMat(extra = {}) {
  if (typeof MAT.createPorcelainPeonyMaterial === 'function') {
    return MAT.createPorcelainPeonyMaterial({ ...extra, metalness: clampMetal(extra.metalness ?? 0.12) });
  }
  return getStdMat('#f0f6ff', { roughness: 0.18, metalness: 0.12, ...extra });
}

function getGatMat(extra = {}) {
  if (typeof MAT.createGatMeshMaterial === 'function') {
    return MAT.createGatMeshMaterial({ ...extra, metalness: clampMetal(extra.metalness ?? 0.12) });
  }
  return getStdMat('#12131c', {
    roughness: 0.3,
    metalness: 0.12,
    transparent: true,
    opacity: extra.opacity ?? 0.9,
    side: THREE.DoubleSide,
    ...extra,
  });
}

function markNoDecal(obj) {
  obj.traverse((o) => {
    if (o.isMesh) o.userData.noDecal = true;
  });
  return obj;
}

function makeTaperedTube(points, radii, tubularSegments = 18, radialSegments = 10, mat) {
  const vecs = points.map((p) => (p instanceof THREE.Vector3 ? p : new THREE.Vector3(p[0], p[1], p[2])));
  const curve = new THREE.CatmullRomCurve3(vecs);
  const tSegs = Math.min(18, tubularSegments);
  const rSegs = Math.min(10, radialSegments);
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
  const geo = new THREE.LatheGeometry(pts, Math.min(40, segments), phiStart, phiLength);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function attachMinhwaDualForm(root, { stageNodes = [], awakenedNodes = [], morphSpecs = [], auraGroup = null }) {
  morphSpecs.forEach((s) => {
    if (!s || !s.material) return;
    s.material.userData.stageState = {
      color: new THREE.Color(s.stageColor ?? s.material.color),
      emissive: new THREE.Color(s.stageEmissive ?? s.stageColor ?? '#000000'),
      emissiveIntensity: s.stageIntensity ?? 0.2,
    };
    s.material.userData.awakenedState = {
      color: new THREE.Color(s.awakenedColor ?? s.material.color),
      emissive: new THREE.Color(s.awakenedEmissive ?? s.awakenedColor ?? '#ffbe0b'),
      emissiveIntensity: s.awakenedIntensity ?? 1.25,
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
// 1. DERPY TIGER (Derpy · Blue Minhwa Tiger)
// ============================================================================
export function buildDerpyTiger() {
  const root = new THREE.Group();
  root.name = 'derpy_tiger';
  root.characterId = 'derpy_tiger';
  root.displayName = 'Derpy · Blue Minhwa Tiger';
  root.group = root;
  root.userData.baseScale = 1.02;

  const parts = { root };
  const awakenedNodes = [];
  const morphSpecs = [];

  // Minhwa Folk-Painting Palette
  const ceruleanFurMat = getMinhwaFurMat('#2b7de9', '#123e85', { roughness: 0.68, metalness: 0.06 });
  const cobaltFurMat = getMinhwaFurMat('#1b4fa8', '#0c2759', { roughness: 0.72, metalness: 0.06 });
  const creamFurMat = getMinhwaFurMat('#f7f3e8', '#d6cbb5', { roughness: 0.65, metalness: 0.04 });
  const pinkMat = getStdMat('#ff82a9', { roughness: 0.45, metalness: 0.06 });
  const fangMat = getStdMat('#ffffff', { roughness: 0.18, metalness: 0.08 });
  const mouthCavMat = getStdMat('#260f1e', { roughness: 0.85, metalness: 0.02 });

  // Sculptural Black Folk-Art Stripe Material (morphs to glowing celestial gold/cyan in Awakened Form!)
  const stripeMat = getStdMat('#141624', {
    emissive: new THREE.Color('#090d16'),
    emissiveIntensity: 0.08,
    roughness: 0.42,
    metalness: 0.14,
  });
  morphSpecs.push({
    material: stripeMat,
    stageColor: '#141624',
    awakenedColor: '#ffbe0b',
    stageEmissive: '#090d16',
    awakenedEmissive: '#00f5d4',
    stageIntensity: 0.08,
    awakenedIntensity: 1.35,
  });

  // HEAD: Wide Chubby Korean Minhwa Blue Tiger Head (`SphereGeometry(0.48, 64, 48)`)
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.45, 0.02);
  parts.head = head;
  root.add(head);

  const headGeo = new THREE.SphereGeometry(0.48, 64, 48);
  const hPos = headGeo.attributes.position;
  for (let i = 0; i < hPos.count; i++) {
    let x = hPos.getX(i);
    let y = hPos.getY(i);
    let z = hPos.getZ(i);
    // Wide round Minhwa cheek ruffs
    if (y < 0.08 && y > -0.32) {
      x *= 1.18;
    }
    // Slightly flattened folk-painting face front
    if (z > 0.25) {
      z = 0.25 + (z - 0.25) * 0.72;
    }
    hPos.setXYZ(i, x, y, z);
  }
  hPos.needsUpdate = true;
  headGeo.computeVertexNormals();

  const skullMesh = new THREE.Mesh(headGeo, ceruleanFurMat);
  skullMesh.name = 'skullMesh';
  skullMesh.castShadow = true;
  skullMesh.receiveShadow = true;
  head.add(skullMesh);

  // Cream muzzle/cheek mask
  const muzzleMask = new THREE.Mesh(new THREE.SphereGeometry(0.38, 36, 28), creamFurMat);
  muzzleMask.position.set(0, -0.1, 0.22);
  muzzleMask.scale.set(1.25, 0.78, 0.58);
  head.add(muzzleMask);

  // Rounded Tiger Ears (`parts.leftEar`, `parts.rightEar`) with Cream Inner Fur Tufts
  [-1, 1].forEach((side) => {
    const ear = new THREE.Group();
    ear.name = side === 1 ? 'leftEar' : 'rightEar';
    ear.position.set(side * 0.38, 0.36, -0.04);
    ear.rotation.z = -side * 0.32;

    const outerEar = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 22), cobaltFurMat);
    outerEar.scale.set(1.05, 1.12, 0.55);
    const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.095, 22, 18), creamFurMat);
    innerEar.position.set(0, -0.01, 0.055);
    innerEar.scale.set(1.0, 1.05, 0.38);

    // 3 fluffy ear fur tufts per ear
    for (let t = 0; t < 3; t++) {
      const tuft = makeTaperedTube(
        [
          [0, 0.02, 0.06],
          [side * (0.04 + t * 0.025), 0.06 - t * 0.02, 0.09],
        ],
        [0.022, 0.005],
        14,
        10,
        creamFurMat
      );
      ear.add(tuft);
    }

    ear.add(outerEar, innerEar);
    markNoDecal(ear);
    head.add(ear);
    parts[ear.name] = ear;
  });

  // Huge Golden Saucer Eyes with Concentric Folk-Art Rings
  const eyes = new THREE.Group();
  eyes.name = 'eyes';
  eyes.position.set(0, 0.12, 0.37);
  parts.eyes = eyes;
  head.add(eyes);

  const saucerGoldMat = getStdMat('#ffd026', {
    emissive: new THREE.Color('#f59e0b'),
    emissiveIntensity: 0.48,
    roughness: 0.16,
    metalness: 0.16,
  });
  morphSpecs.push({
    material: saucerGoldMat,
    stageColor: '#ffd026',
    awakenedColor: '#fffbeb',
    stageEmissive: '#f59e0b',
    awakenedEmissive: '#ffbe0b',
    stageIntensity: 0.48,
    awakenedIntensity: 1.55,
  });
  const pupilMat = getStdMat('#0b0c14', { roughness: 0.14, metalness: 0.1 });
  const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  [-1, 1].forEach((side) => {
    const eyeG = new THREE.Group();
    eyeG.name = side === 1 ? 'leftEye' : 'rightEye';
    eyeG.position.set(side * 0.195, 0, 0);

    // Derpy's signature huge round golden saucer iris
    const outerRim = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.015, 16, 36), pupilMat);
    const goldenSaucer = new THREE.Mesh(new THREE.SphereGeometry(0.115, 32, 24), saucerGoldMat);
    goldenSaucer.scale.set(1.0, 1.0, 0.42);
    const concentricRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.007, 12, 32), pupilMat);
    concentricRing.position.z = 0.045;
    // Slightly cross-eyed/goofy folk pupil
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.046, 22, 18), pupilMat);
    pupil.position.set(-side * 0.012, 0.008, 0.042);
    pupil.scale.set(1.0, 1.0, 0.4);

    const catch1 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 14), catchMat);
    catch1.position.set(-0.032, 0.035, 0.056);
    const catch2 = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 10), catchMat);
    catch2.position.set(0.028, -0.024, 0.056);

    // Expressive Minhwa cloud-scroll eyebrow above each eye
    const folkBrow = makeTaperedTube(
      [
        [-side * 0.08, 0.14, 0.02],
        [0, 0.175, 0.035],
        [side * 0.11, 0.135, 0.015],
      ],
      [0.018, 0.028, 0.014],
      20,
      12,
      creamFurMat
    );

    eyeG.add(outerRim, goldenSaucer, concentricRing, pupil, catch1, catch2, folkBrow);
    markNoDecal(eyeG);
    eyes.add(eyeG);
  });

  // Flat Pink Folk-Art Nose + Wide Goofy Grin with 12 Individual Sculpted White Fangs + Curled Pink Tongue
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.062, 24, 18), pinkMat);
  nose.position.set(0, -0.01, 0.435);
  nose.scale.set(1.28, 0.78, 0.55);
  nose.userData.noDecal = true;
  head.add(nose);

  const grinGroup = new THREE.Group();
  grinGroup.name = 'derpyGoofyGrin';
  grinGroup.position.set(0, -0.15, 0.38);

  const mouthCavity = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), mouthCavMat);
  mouthCavity.scale.set(1.38, 0.65, 0.35);
  grinGroup.add(mouthCavity);

  // 12 Individual Sculpted White Fangs (6 upper, 6 lower, corner tusks larger)
  for (let f = 0; f < 12; f++) {
    const isUpper = f < 6;
    const idx = f % 6;
    const u = (idx - 2.5) / 2.5; // -1 .. 1
    const isCornerFang = idx === 0 || idx === 5;
    const fangRadius = isCornerFang ? 0.028 : 0.019;
    const fangHeight = isCornerFang ? 0.075 : 0.046;
    const fang = new THREE.Mesh(new THREE.ConeGeometry(fangRadius, fangHeight, 16), fangMat);
    const fx = u * 0.23;
    const fy = isUpper ? 0.065 - u * u * 0.025 : -0.075 + u * u * 0.025;
    const fz = 0.055 - u * u * 0.02;
    fang.position.set(fx, fy, fz);
    fang.rotation.x = isUpper ? Math.PI : 0;
    grinGroup.add(fang);
  }

  // Curled Pink Tongue
  const tongue = makeTaperedTube(
    [
      [0, -0.04, 0.02],
      [0.02, -0.08, 0.08],
      [0.035, -0.13, 0.135],
      [0.02, -0.1, 0.165],
    ],
    [0.065, 0.072, 0.058, 0.032],
    26,
    16,
    pinkMat
  );
  grinGroup.add(tongue);
  markNoDecal(grinGroup);
  head.add(grinGroup);

  // Forehead 'King' Mark + Facial Stripe Reliefs (part of 28 total 3D stripe reliefs)
  const wangGroup = new THREE.Group();
  wangGroup.name = 'wangForeheadMark';
  const wangStrokes = [
    [[-0.11, 0.36, 0.31], [0, 0.37, 0.33], [0.11, 0.36, 0.31]],
    [[-0.085, 0.30, 0.34], [0, 0.31, 0.36], [0.085, 0.30, 0.34]],
    [[-0.10, 0.24, 0.36], [0, 0.25, 0.38], [0.10, 0.24, 0.36]],
    [[0, 0.37, 0.33], [0, 0.31, 0.36], [0, 0.25, 0.38]],
  ];
  wangStrokes.forEach((pts) => {
    wangGroup.add(makeTaperedTube(pts, [0.012, 0.016, 0.012], 18, 12, stripeMat));
  });
  // 8 cheek & brow folk stripes (total 12 on head), projected onto the sculpted head surface
  // (radius 0.48, cheeks widened x1.18, face front compressed) so they sit proud of the fur.
  const headSurfacePoint = (side, theta, y, lift = 0.014) => {
    const ry = Math.sqrt(Math.max(0.01, 0.48 * 0.48 - y * y)) + lift;
    const widen = y < 0.08 && y > -0.32 ? 1.18 : 1.0;
    let z = ry * Math.cos(theta);
    if (z > 0.25) z = 0.25 + (z - 0.25) * 0.72 + lift * 0.5;
    return [side * ry * Math.sin(theta) * widen, y, z];
  };
  [-1, 1].forEach((side) => {
    for (let s = 0; s < 4; s++) {
      const yOff = 0.1 - s * 0.085;
      const cheekStripe = makeTaperedTube(
        [
          headSurfacePoint(side, 0.82, yOff),
          headSurfacePoint(side, 1.16, yOff - 0.02),
          headSurfacePoint(side, 1.52, yOff - 0.05),
        ],
        [0.01, 0.022, 0.01],
        18,
        12,
        stripeMat
      );
      wangGroup.add(cheekStripe);
    }
  });
  markNoDecal(wangGroup);
  head.add(wangGroup);

  // TORSO: Chubby Minhwa Blue Tiger Body + Cream Belly + 36+ Layered Tufted Fur Clusters + 16 Body Stripes
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, -0.18, 0);
  parts.torso = torso;
  root.add(torso);

  const bodyLoft = makeLatheLoft(
    [
      [0.24, 0.38],
      [0.38, 0.22],
      [0.44, 0.02],
      [0.45, -0.18],
      [0.39, -0.34],
      [0.24, -0.42],
    ],
    56,
    ceruleanFurMat
  );
  bodyLoft.scale.set(1.06, 1.0, 0.92);
  torso.add(bodyLoft);

  const creamBelly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 36, 28), creamFurMat);
  creamBelly.position.set(0, -0.05, 0.16);
  creamBelly.scale.set(0.95, 1.08, 0.68);
  torso.add(creamBelly);

  // 36+ Sculpted Cerulean/Indigo/Cream Tufted Fur Clusters around cheeks, chest ruff, shoulders, and haunches.
  // Tufts flow DOWN along the body like fur locks (not radial spikes), and the cream belly stays clean
  // so the blue tufts can never be mistaken for the "Shadow Burrs" thorn-burr damage.
  const furTuftGroup = new THREE.Group();
  furTuftGroup.name = 'minhwaTuftedFurClusters';
  for (let i = 0; i < 38; i++) {
    const a = (i / 38) * Math.PI * 2;
    const tier = i % 3;
    const yBase = 0.26 - tier * 0.22;
    const rad = 0.38 + (tier === 1 ? 0.06 : 0.02);
    const x0 = Math.cos(a) * rad;
    const z0 = Math.sin(a) * rad * 0.88;
    const isFront = z0 > 0.12;
    if (isFront) continue; // keep the cream chest/belly clean (front tufts read as fangs/claws)
    const mat = i % 5 === 0 ? creamFurMat : i % 2 === 0 ? ceruleanFurMat : cobaltFurMat;
    const tuft = makeTaperedTube(
      [
        [x0 * 0.96, yBase + 0.02, z0 * 0.96],
        [x0 * 1.06, yBase - 0.05, z0 * 1.06],
        [x0 * 1.09, yBase - 0.13, z0 * 1.09],
      ],
      [0.042, 0.036, 0.008],
      18,
      12,
      mat
    );
    furTuftGroup.add(tuft);
  }
  markNoDecal(furTuftGroup);
  torso.add(furTuftGroup);

  // 16 Sculptural Black Folk-Art Stripe Reliefs on Back, Sides & Haunches (12 head + 16 body = 28 stripes!)
  // Each stripe is projected onto the actual body-loft surface (profile radius + 0.012) so the
  // reliefs sit proud of the fur instead of being buried inside the torso.
  const bodyProfile = [
    [0.38, 0.24],
    [0.22, 0.38],
    [0.02, 0.44],
    [-0.18, 0.45],
    [-0.34, 0.39],
    [-0.42, 0.24],
  ];
  const bodyRadiusAt = (y) => {
    for (let k = 0; k < bodyProfile.length - 1; k++) {
      const [y0, r0] = bodyProfile[k];
      const [y1, r1] = bodyProfile[k + 1];
      if (y <= y0 && y >= y1) {
        const t = (y0 - y) / (y0 - y1 || 1);
        return r0 + (r1 - r0) * t;
      }
    }
    return y > bodyProfile[0][0] ? bodyProfile[0][1] : bodyProfile[bodyProfile.length - 1][1];
  };
  const bodySurfacePoint = (side, theta, y, lift = 0.012) => {
    // theta: 0 = pure side (+/-X), PI/2 = centre of the back (-Z)
    const r = bodyRadiusAt(y) + lift;
    return [side * r * 1.06 * Math.cos(theta), y, -r * 0.92 * Math.sin(theta)];
  };
  const bodyStripes = new THREE.Group();
  bodyStripes.name = 'minhwaBodyStripeReliefs';
  [-1, 1].forEach((side) => {
    for (let s = 0; s < 8; s++) {
      const yPos = 0.3 - s * 0.082;
      const wobble = (s % 2 === 0 ? 1 : -1) * 0.03;
      const stripe = makeTaperedTube(
        [
          bodySurfacePoint(side, 0.08, yPos - 0.03 + wobble),
          bodySurfacePoint(side, 0.42, yPos + 0.01),
          bodySurfacePoint(side, 0.78, yPos + 0.03 - wobble),
          bodySurfacePoint(side, 1.12, yPos + 0.02),
        ],
        [0.01, 0.024, 0.02, 0.008],
        22,
        12,
        stripeMat
      );
      bodyStripes.add(stripe);
    }
    // 3 bold folk stripes on each shoulder/front flank, visible from the front view
    for (let s = 0; s < 3; s++) {
      const yPos = 0.2 - s * 0.14;
      const flank = makeTaperedTube(
        [
          bodySurfacePoint(side, -0.55, yPos + 0.02), // wraps toward the front flank (+Z)
          bodySurfacePoint(side, -0.2, yPos + 0.045),
          bodySurfacePoint(side, 0.18, yPos + 0.02),
        ],
        [0.008, 0.022, 0.008],
        18,
        12,
        stripeMat
      );
      bodyStripes.add(flank);
    }
  });
  markNoDecal(bodyStripes);
  torso.add(bodyStripes);

  // Demon-Mark / Honmoon Seal on chest ruff
  const seal = new THREE.Group();
  seal.name = 'demonMarkSeal';
  seal.position.set(0, 0.18, 0.38);
  const sealMat = getStdMat('#ffd026', {
    emissive: new THREE.Color('#00f5d4'),
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.18,
  });
  const sealDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.014, 32), sealMat);
  sealDisc.rotation.x = Math.PI / 2;
  const sealRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.009, 12, 32), sealMat);
  seal.add(sealDisc, sealRing);
  markNoDecal(seal);
  torso.add(seal);
  parts.demonMarkSeal = seal;

  // Helper to build a Plump Tiger Paw with 4 Pink Toe Beans + 1 Central Palm Pad
  function buildTigerPawWithToeBeans(side, isFront = true) {
    const pawG = new THREE.Group();
    const pawBall = new THREE.Mesh(new THREE.SphereGeometry(0.115, 26, 20), creamFurMat);
    pawBall.scale.set(1.15, 0.78, 1.22);
    pawG.add(pawBall);

    // Central heart-shaped pink palm pad
    const palmPad = new THREE.Mesh(new THREE.SphereGeometry(0.048, 18, 14), pinkMat);
    palmPad.position.set(0, isFront ? -0.02 : -0.045, 0.11);
    palmPad.scale.set(1.2, 0.85, 0.45);
    pawG.add(palmPad);

    // 4 pink toe beans
    for (let b = 0; b < 4; b++) {
      const u = (b - 1.5) / 1.5;
      const bean = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 12), pinkMat);
      bean.position.set(u * 0.068, (isFront ? 0.035 : 0.01) - u * u * 0.018, 0.125);
      bean.scale.set(0.9, 1.15, 0.45);
      pawG.add(bean);
    }
    markNoDecal(pawG);
    return pawG;
  }

  // Arms & Plump Front Paws with Pink Toe Beans
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.name = side === 1 ? 'leftArm' : 'rightArm';
    arm.position.set(side * 0.38, 0.04, 0.06);

    const armTube = makeTaperedTube(
      [
        [0, 0, 0],
        [side * 0.06, -0.16, 0.08],
        [side * 0.02, -0.32, 0.16],
      ],
      [0.125, 0.115, 0.098],
      28,
      18,
      ceruleanFurMat
    );
    const paw = buildTigerPawWithToeBeans(side, true);
    paw.position.set(side * 0.02, -0.36, 0.2);

    arm.add(armTube, paw);
    root.add(arm);
    parts[arm.name] = arm;
  });

  // Legs & Plump Rear Paws with Pink Toe Beans
  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.name = side === 1 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * 0.24, -0.48, 0.04);

    const haunch = makeTaperedTube(
      [
        [0, 0.04, 0],
        [side * 0.02, -0.14, 0.04],
        [0, -0.28, 0.08],
      ],
      [0.145, 0.12, 0.098],
      26,
      18,
      cobaltFurMat
    );
    const paw = buildTigerPawWithToeBeans(side, false);
    paw.position.set(0, -0.32, 0.14);

    leg.add(haunch, paw);
    root.add(leg);
    parts[leg.name] = leg;
  });

  // Long Curling Black/White/Blue Ringed Tiger Tail (`parts.tail`)
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, -0.42, -0.34);

  const tailCurvePts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.18, 0.06, -0.22),
    new THREE.Vector3(0.38, 0.28, -0.28),
    new THREE.Vector3(0.46, 0.56, -0.14),
    new THREE.Vector3(0.32, 0.72, 0.02),
  ];
  const tailTube = makeTaperedTube(tailCurvePts, [0.095, 0.088, 0.082, 0.076, 0.068], 40, 18, ceruleanFurMat);
  tail.add(tailTube);

  const tailCurve = new THREE.CatmullRomCurve3(tailCurvePts);
  for (let r = 1; r <= 9; r++) {
    const u = r / 10;
    const pt = tailCurve.getPointAt(u);
    const tan = tailCurve.getTangentAt(u).normalize();
    const ringBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.082 - u * 0.012, 0.018, 12, 24),
      r % 2 === 0 ? stripeMat : creamFurMat
    );
    ringBand.position.copy(pt);
    ringBand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    ringBand.userData.noDecal = true;
    tail.add(ringBand);
  }
  root.add(tail);
  parts.tail = tail;

  // ==========================================================================
  // SIGNATURE PROP (`parts.signatureProp` & `parts.flowerpot`):
  // Blue-and-White Porcelain Peony Flowerpot with `onPolishProgress(k)`
  // ==========================================================================
  const flowerpotAnchor = new THREE.Group();
  flowerpotAnchor.name = 'signatureProp';
  flowerpotAnchor.position.set(0.52, -0.56, 0.34);

  const potPivot = new THREE.Group();
  potPivot.name = 'porcelainFlowerpotVessel';
  flowerpotAnchor.add(potPivot);

  const porcelainMat = getPorcelainMat({
    emissive: new THREE.Color('#1d4ed8'),
    emissiveIntensity: 0.22,
    roughness: 0.16,
    metalness: 0.12,
  });
  const soilMat = getStdMat('#3e2723', { roughness: 0.88, metalness: 0.02 });
  const peonyPinkMat = getStdMat('#ff3b8b', {
    emissive: new THREE.Color('#ec4899'),
    emissiveIntensity: 0.48,
    roughness: 0.26,
    metalness: 0.1,
  });
  const peonyGoldCenterMat = getStdMat('#ffd026', {
    emissive: new THREE.Color('#f59e0b'),
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.16,
  });
  const leafMat = getStdMat('#16a34a', { roughness: 0.42, metalness: 0.08 });

  // High-res LatheGeometry porcelain vessel
  const vesselLoft = makeLatheLoft(
    [
      [0.01, 0.0],
      [0.12, 0.0],
      [0.14, 0.04],
      [0.19, 0.15],
      [0.17, 0.26],
      [0.21, 0.31],
      [0.18, 0.32],
    ],
    56,
    porcelainMat
  );
  const soilMound = new THREE.Mesh(new THREE.SphereGeometry(0.168, 28, 18), soilMat);
  soilMound.position.set(0, 0.27, 0);
  soilMound.scale.set(1.0, 0.35, 1.0);
  potPivot.add(vesselLoft, soilMound);

  // 3 Lush 3D Multi-Petal Blooming Peony Flowers + Green Leaves inside `peonyBloomsGroup`
  const peonyBloomsGroup = new THREE.Group();
  peonyBloomsGroup.name = 'peonyBloomsGroup';
  peonyBloomsGroup.position.set(0, 0.3, 0);

  const peonyPositions = [
    [0, 0.12, 0, 1.08],
    [-0.095, 0.07, 0.05, 0.86],
    [0.095, 0.08, -0.04, 0.9],
  ];
  peonyPositions.forEach(([px, py, pz, sc]) => {
    const flowerG = new THREE.Group();
    flowerG.position.set(px, py, pz);
    flowerG.scale.setScalar(sc);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.14, 12), leafMat);
    stem.position.y = -0.06;
    flowerG.add(stem);

    const stamen = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 14), peonyGoldCenterMat);
    stamen.position.y = 0.02;
    flowerG.add(stamen);

    for (let p = 0; p < 14; p++) {
      const ang = p * 2.39996;
      const r = 0.02 + Math.sqrt(p) * 0.014;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 12), peonyPinkMat);
      petal.position.set(Math.cos(ang) * r, 0.01 + (14 - p) * 0.002, Math.sin(ang) * r);
      petal.scale.set(1.25, 0.55, 0.9);
      petal.rotation.y = -ang;
      flowerG.add(petal);
    }
    peonyBloomsGroup.add(flowerG);
  });

  // 6 green peony leaves around rim
  for (let l = 0; l < 6; l++) {
    const la = (l / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), leafMat);
    leaf.position.set(Math.cos(la) * 0.13, 0.02, Math.sin(la) * 0.13);
    leaf.scale.set(1.4, 0.28, 0.75);
    leaf.rotation.y = -la;
    leaf.rotation.z = 0.35;
    peonyBloomsGroup.add(leaf);
  }
  potPivot.add(peonyBloomsGroup);

  // Spilled soil pebbles shown when the flowerpot is tipped over (`k < 1`)
  const spilledSoilGroup = new THREE.Group();
  spilledSoilGroup.name = 'spilledSoilPebbles';
  spilledSoilGroup.visible = false;
  for (let s = 0; s < 9; s++) {
    const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.022 + (s % 3) * 0.008, 1), soilMat);
    pebble.position.set(-0.24 - s * 0.028, 0.02 + (s % 2) * 0.01, (s - 4) * 0.032);
    spilledSoilGroup.add(pebble);
  }
  flowerpotAnchor.add(spilledSoilGroup);

  const propLight = new THREE.PointLight(0xff66b2, 0.85, 1.5);
  propLight.position.set(0, 0.42, 0.12);
  flowerpotAnchor.add(propLight);
  markNoDecal(flowerpotAnchor);
  root.add(flowerpotAnchor);

  // Tipped-to-Upright Restoration Contract (`onPolishProgress(k)`)
  flowerpotAnchor.userData.isFlowerpot = true;
  flowerpotAnchor.userData.isTipped = false;
  flowerpotAnchor.userData.rotationZ = 0;
  flowerpotAnchor.userData.onPolishProgress = (rawK = 1) => {
    const k = Math.max(0, Math.min(1, Number(rawK) || 0));
    const tippedAngle = 1.38; // ~79 degrees tipped on its side
    const rotZ = (1 - k) * tippedAngle;
    potPivot.rotation.z = rotZ;
    potPivot.position.y = (1 - k) * 0.12;
    flowerpotAnchor.rotation.z = 0;
    flowerpotAnchor.userData.rotationZ = rotZ;
    flowerpotAnchor.userData.isTipped = k < 0.96;

    const bloomScale = 0.38 + 0.62 * k;
    peonyBloomsGroup.scale.setScalar(bloomScale);
    spilledSoilGroup.visible = k < 0.92;
    spilledSoilGroup.scale.setScalar(Math.max(0.001, 1 - k));
    peonyPinkMat.emissiveIntensity = 0.12 + 0.55 * k;
    peonyGoldCenterMat.emissiveIntensity = 0.15 + 0.65 * k;
  };

  parts.signatureProp = flowerpotAnchor;
  parts.flowerpot = flowerpotAnchor;
  root.pendantLight = propLight;
  root.pendantEmissiveMesh = vesselLoft;

  // Korean Cloud-Scroll (`운문`) Golden Spirit Halo Aura
  const auraGroup = new THREE.Group();
  auraGroup.name = 'auraGroup';
  auraGroup.position.set(0, -0.05, -0.24);
  const cloudHaloMat = getStdMat('#ffd026', {
    emissive: new THREE.Color('#f59e0b'),
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.18,
  });
  morphSpecs.push({
    material: cloudHaloMat,
    stageColor: '#ffd026',
    awakenedColor: '#00f5d4',
    stageEmissive: '#f59e0b',
    awakenedEmissive: '#ffbe0b',
    stageIntensity: 0.45,
    awakenedIntensity: 1.4,
  });

  const mainHalo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.016, 16, 64), cloudHaloMat);
  auraGroup.add(mainHalo);

  // Awakened Minhwa spirit aura: golden flame nimbus behind the halo + 5 clean 운문 cloud puffs
  // riding the upper arc (replaces the tangled torus-knot "noodles").
  const cloudScrolls = new THREE.Group();
  cloudScrolls.name = 'awakenedCloudScrolls';
  cloudScrolls.visible = false;
  if (typeof MAT.buildSpiritFlamePetals === 'function') {
    const nimbus = MAT.buildSpiritFlamePetals('#ffbe0b', {
      count: 7,
      radius: 0.62,
      yBase: -0.55,
      height: 1.25,
      spreadAngle: Math.PI * 1.0,
      zBack: -0.04,
      hex2: '#fff1a8',
      opacity: 0.66,
    });
    cloudScrolls.add(nimbus);
  }
  const puffMat = getStdMat('#fff4c2', {
    emissive: new THREE.Color('#ffbe0b'),
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
  });
  for (let c = 0; c < 5; c++) {
    const ca = Math.PI * (0.18 + (c / 4) * 0.64); // upper arc of the halo only
    const puff = new THREE.Group();
    puff.position.set(Math.cos(ca) * 0.7, Math.sin(ca) * 0.7, -0.03);
    // Minhwa cloud: a spiral curl + two soft lobes
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 12, 28, Math.PI * 1.6), cloudHaloMat);
    curl.rotation.z = ca + Math.PI * 0.5;
    const lobeA = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 14), puffMat);
    lobeA.position.set(Math.cos(ca) * 0.07, Math.sin(ca) * 0.07, 0);
    lobeA.scale.set(1.3, 0.8, 0.5);
    const lobeB = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), puffMat);
    lobeB.position.set(-Math.sin(ca) * 0.08, Math.cos(ca) * 0.08, 0.01);
    lobeB.scale.set(1.1, 0.75, 0.5);
    puff.add(curl, lobeA, lobeB);
    cloudScrolls.add(puff);
  }
  auraGroup.add(cloudScrolls);
  awakenedNodes.push(cloudScrolls);
  markNoDecal(auraGroup);
  root.add(auraGroup);
  parts.auraGroup = auraGroup;

  root.parts = parts;
  attachMinhwaDualForm(root, { stageNodes: [], awakenedNodes, morphSpecs, auraGroup });
  return root;
}

// ============================================================================
// 2. SUSSIE MAGPIE (Sussie · Six-Eyed Magpie)
// ============================================================================
export function buildSussieMagpie() {
  const root = new THREE.Group();
  root.name = 'sussie_magpie';
  root.characterId = 'sussie_magpie';
  root.displayName = 'Sussie · Six-Eyed Magpie';
  root.group = root;
  root.userData.baseScale = 1.0;

  const parts = { root };
  const awakenedNodes = [];
  const morphSpecs = [];

  // Magpie Feather Palette — glossy obsidian with an iridescent indigo-blue sheen (real magpie plumage),
  // not a flat gray checkerboard.
  const obsidianFeatherMat = getStdMat('#1a1b30', {
    emissive: new THREE.Color('#1b2f7a'),
    emissiveIntensity: 0.22,
    roughness: 0.3,
    metalness: 0.2,
  });
  // Awakened plumage stays obsidian with a deep violet spirit sheen (a lighter '#231c52' + '#5b21b6' @ 0.32
  // rendered as a flat lavender "balloon" under the golden stage key light).
  morphSpecs.push({
    material: obsidianFeatherMat,
    stageColor: '#1a1b30',
    awakenedColor: '#1b1538',
    stageEmissive: '#1b2f7a',
    awakenedEmissive: '#4c1d95',
    stageIntensity: 0.22,
    awakenedIntensity: 0.22,
  });
  const snowBreastMat = getMinhwaFurMat('#f8fafc', '#cbd5e1', { roughness: 0.55, metalness: 0.05 });
  const iridescentBlueMat = getSatinMat('#1d4ed8', {
    emissive: new THREE.Color('#1e3a8a'),
    emissiveIntensity: 0.28,
    roughness: 0.22,
    metalness: 0.2,
  });
  morphSpecs.push({
    material: iridescentBlueMat,
    stageColor: '#1d4ed8',
    awakenedColor: '#00f5d4',
    stageEmissive: '#1e3a8a',
    awakenedEmissive: '#7c3aed',
    stageIntensity: 0.28,
    awakenedIntensity: 1.35,
  });

  const beakMat = getStdMat('#3b4256', { roughness: 0.25, metalness: 0.2 });
  const goldenEyeMat = getStdMat('#ffd026', {
    emissive: new THREE.Color('#ffaa00'),
    emissiveIntensity: 1.05,
    roughness: 0.14,
    metalness: 0.18,
  });
  // Six eyes stay GOLDEN in both forms (awakened = hotter amber-gold blaze, never white-out)
  morphSpecs.push({
    material: goldenEyeMat,
    stageColor: '#ffd026',
    awakenedColor: '#ffe066',
    stageEmissive: '#ffaa00',
    awakenedEmissive: '#ff8c00',
    stageIntensity: 1.05,
    awakenedIntensity: 2.1,
  });
  const pupilMat = getStdMat('#090a10', { roughness: 0.12, metalness: 0.1 });
  const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // HEAD: Plump Korean Folk Magpie Head (`SphereGeometry(0.38, 64, 48)`)
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.44, 0.04);
  parts.head = head;
  root.add(head);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.38, 64, 48), obsidianFeatherMat);
  headMesh.name = 'skullMesh';
  headMesh.scale.set(0.96, 0.98, 1.06);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  head.add(headMesh);

  // Sculpted Curved Beak with upper/lower mandibles
  const beakGroup = new THREE.Group();
  beakGroup.name = 'magpieBeak';
  beakGroup.position.set(0, -0.02, 0.37);

  const upperBeak = makeTaperedTube(
    [
      [0, 0.03, 0],
      [0, 0.02, 0.12],
      [0, -0.025, 0.22],
    ],
    [0.095, 0.055, 0.008],
    24,
    16,
    beakMat
  );
  const lowerBeak = makeTaperedTube(
    [
      [0, -0.025, 0],
      [0, -0.032, 0.1],
      [0, -0.04, 0.18],
    ],
    [0.072, 0.042, 0.006],
    20,
    14,
    beakMat
  );
  beakGroup.add(upperBeak, lowerBeak);
  markNoDecal(beakGroup);
  head.add(beakGroup);

  // ==========================================================================
  // SIX GLOWING GOLDEN EYES (3 stacked golden eyes in `leftEye` + 3 in `rightEye`)
  // ==========================================================================
  const eyes = new THREE.Group();
  eyes.name = 'eyes';
  eyes.position.set(0, 0.05, 0.31);
  parts.eyes = eyes;
  head.add(eyes);

  const subEyeOffsets = [
    { dy: 0.135, dx: 0.17, dz: -0.02, scale: 1.0 },   // Top clairvoyant eye
    { dy: 0.02, dx: 0.21, dz: 0.02, scale: 1.22 },    // Middle main eye
    { dy: -0.1, dx: 0.19, dz: 0.005, scale: 0.98 },   // Lower spirit eye
  ];

  [-1, 1].forEach((side) => {
    const sideEyeGroup = new THREE.Group();
    sideEyeGroup.name = side === 1 ? 'leftEye' : 'rightEye';

    subEyeOffsets.forEach((spec, idx) => {
      const singleEye = new THREE.Group();
      singleEye.name = `${side === 1 ? 'left' : 'right'}GoldenEye_${idx + 1}`;
      singleEye.position.set(side * spec.dx, spec.dy, spec.dz);
      singleEye.rotation.y = side * 0.42;
      singleEye.scale.setScalar(spec.scale);

      // Bigger saucer eyes with a dark folk-art rim so all six golden eyes read from the turntable
      const eyelidRim = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.009, 12, 28), pupilMat);
      const goldenIris = new THREE.Mesh(new THREE.SphereGeometry(0.056, 24, 20), goldenEyeMat);
      goldenIris.scale.set(1.0, 1.0, 0.5);

      const spiritPupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 14), pupilMat);
      spiritPupil.position.set(0, 0, 0.024);
      spiritPupil.scale.set(0.36, 1.05, 0.35);

      const catchLight = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), catchMat);
      catchLight.position.set(-0.015, 0.017, 0.031);

      // Awakened mystic spirit beam flaring from each of the 6 eyes
      const eyeBeam = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 14), goldenEyeMat);
      eyeBeam.rotation.x = Math.PI / 2;
      eyeBeam.position.set(0, 0, 0.05);
      eyeBeam.visible = false;
      awakenedNodes.push(eyeBeam);

      singleEye.add(eyelidRim, goldenIris, spiritPupil, catchLight, eyeBeam);
      sideEyeGroup.add(singleEye);
    });

    markNoDecal(sideEyeGroup);
    eyes.add(sideEyeGroup);
  });

  // Miniature Black Korean Gat Hat (`parts.leftEar`) with Red Coral Bead Strap
  const miniGat = new THREE.Group();
  miniGat.name = 'leftEar';
  miniGat.position.set(0, 0.36, -0.02);
  miniGat.rotation.z = -0.12; // Jauntily tilted

  const gatMeshMat = getGatMat({ opacity: 0.9 });
  const coralBeadMat = getStdMat('#ef4444', {
    emissive: new THREE.Color('#dc2626'),
    emissiveIntensity: 0.35,
    roughness: 0.2,
    metalness: 0.16,
  });

  const gatBrim = makeLatheLoft(
    [
      [0.12, 0.01],
      [0.28, 0.005],
      [0.42, -0.015],
    ],
    48,
    gatMeshMat
  );
  const gatCrown = makeLatheLoft(
    [
      [0.14, 0.01],
      [0.135, 0.22],
      [0.01, 0.225],
    ],
    40,
    gatMeshMat
  );
  // 18-bead miniature gatkkeun strap with red coral beads
  for (let b = 0; b < 18; b++) {
    const u = b / 17;
    const ang = (u - 0.5) * Math.PI;
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(b % 3 === 0 ? 0.016 : 0.012, 14, 12),
      b % 3 === 0 ? coralBeadMat : beakMat
    );
    bead.position.set(Math.sin(ang) * 0.24, -Math.cos(ang) * 0.34, 0.12 + Math.cos(ang) * 0.1);
    miniGat.add(bead);
  }
  miniGat.add(gatBrim, gatCrown);
  markNoDecal(miniGat);
  head.add(miniGat);
  parts.leftEar = miniGat;

  // Right ear feather tuft pivot (`parts.rightEar`)
  const rightEarFeather = new THREE.Group();
  rightEarFeather.name = 'rightEar';
  rightEarFeather.position.set(0.32, 0.16, -0.05);
  for (let f = 0; f < 3; f++) {
    const plume = makeTaperedTube(
      [
        [0, 0, 0],
        [0.08 + f * 0.02, 0.05 - f * 0.03, -0.06],
      ],
      [0.022, 0.005],
      16,
      10,
      iridescentBlueMat
    );
    rightEarFeather.add(plume);
  }
  markNoDecal(rightEarFeather);
  head.add(rightEarFeather);
  parts.rightEar = rightEarFeather;

  // TORSO: Plump Magpie Body with Glossy Obsidian Back & Snow-White Breast Shingle Feathers
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, -0.14, 0);
  parts.torso = torso;
  root.add(torso);

  const bodyLoft = makeLatheLoft(
    [
      [0.2, 0.34],
      [0.34, 0.18],
      [0.38, -0.04],
      [0.33, -0.26],
      [0.18, -0.38],
    ],
    56,
    obsidianFeatherMat
  );
  bodyLoft.scale.set(0.96, 1.0, 1.08);
  torso.add(bodyLoft);

  const whiteBreast = new THREE.Mesh(new THREE.SphereGeometry(0.31, 36, 28), snowBreastMat);
  whiteBreast.position.set(0, -0.04, 0.14);
  whiteBreast.scale.set(0.92, 1.02, 0.72);
  torso.add(whiteBreast);

  // 24 Sculpted Breast/Back Down Feather Shingles
  const downShingles = new THREE.Group();
  downShingles.name = 'magpieDownShingles';
  for (let s = 0; s < 24; s++) {
    const a = (s / 24) * Math.PI * 2;
    const row = s % 3;
    const shingle = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 12),
      Math.sin(a) > 0 ? snowBreastMat : obsidianFeatherMat
    );
    shingle.position.set(Math.cos(a) * 0.32, 0.14 - row * 0.12, Math.sin(a) * 0.34);
    shingle.scale.set(1.1, 1.4, 0.35);
    shingle.rotation.y = -a;
    downShingles.add(shingle);
  }
  markNoDecal(downShingles);
  torso.add(downShingles);

  // Demon-Mark / Honmoon Seal on chest
  const seal = new THREE.Group();
  seal.name = 'demonMarkSeal';
  seal.position.set(0, 0.16, 0.34);
  const sealDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.012, 32), goldenEyeMat);
  sealDisc.rotation.x = Math.PI / 2;
  seal.add(sealDisc);
  markNoDecal(seal);
  torso.add(seal);
  parts.demonMarkSeal = seal;

  // SPREAD ARTICULATED WINGS (`parts.leftArm`, `parts.rightArm`) with 36 Individual Flight Feathers (18 per wing)
  [-1, 1].forEach((side) => {
    const wing = new THREE.Group();
    wing.name = side === 1 ? 'leftArm' : 'rightArm';
    wing.position.set(side * 0.32, 0.08, -0.02);

    // Sculpted wing shoulder coverts
    const wingArch = makeTaperedTube(
      [
        [0, 0, 0],
        [side * 0.18, 0.06, -0.04],
        [side * 0.34, -0.08, -0.08],
      ],
      [0.095, 0.075, 0.045],
      24,
      16,
      snowBreastMat
    );
    wing.add(wingArch);

    // 18 Layered Primary & Secondary Flight Feathers per wing (36 total flight feathers >= 32!)
    for (let f = 0; f < 18; f++) {
      const isPrimary = f < 10;
      const u = isPrimary ? f / 9 : (f - 10) / 7;
      const fx0 = side * (0.08 + u * 0.24);
      const fy0 = 0.02 - u * 0.08 - (isPrimary ? 0 : 0.06);
      const fz0 = isPrimary ? -0.02 : -0.05;
      const len = isPrimary ? 0.28 + (1 - Math.abs(u - 0.4)) * 0.12 : 0.2;
      const angleSpread = -0.35 - u * 0.65;
      const fx1 = fx0 + side * Math.cos(angleSpread) * len;
      const fy1 = fy0 + Math.sin(angleSpread) * len;
      const fz1 = fz0 - 0.06;

      const fMat = f % 3 === 0 ? snowBreastMat : isPrimary ? iridescentBlueMat : obsidianFeatherMat;
      const featherBlade = makeTaperedTube(
        [
          [fx0, fy0, fz0],
          [(fx0 + fx1) * 0.5, (fy0 + fy1) * 0.5, (fz0 + fz1) * 0.5],
          [fx1, fy1, fz1],
        ],
        [0.026, 0.034, 0.006],
        20,
        12,
        fMat
      );
      featherBlade.scale.z = 0.38;
      wing.add(featherBlade);
    }

    root.add(wing);
    parts[wing.name] = wing;
  });

  // Sculpted Avian Legs (`parts.leftLeg`, `parts.rightLeg`) with 4-Toed Talons (3 forward, 1 hallux back)
  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.name = side === 1 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * 0.15, -0.46, 0.02);

    const drumstick = new THREE.Mesh(new THREE.SphereGeometry(0.088, 22, 18), obsidianFeatherMat);
    drumstick.scale.set(0.9, 1.3, 0.95);
    const tarsus = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.24, 18), beakMat);
    tarsus.position.set(0, -0.18, 0);
    leg.add(drumstick, tarsus);

    // 4-toed avian talons
    const toeAngles = [-0.42, 0, 0.42, Math.PI];
    toeAngles.forEach((ta, tIdx) => {
      const isBack = tIdx === 3;
      const len = isBack ? 0.09 : 0.12;
      const tx = Math.sin(ta) * len;
      const tz = Math.cos(ta) * len;
      const toe = makeTaperedTube(
        [
          [0, -0.3, 0],
          [tx * 0.6, -0.31, tz * 0.6],
          [tx, -0.33, tz],
        ],
        [0.016, 0.013, 0.004],
        16,
        10,
        beakMat
      );
      toe.userData.noDecal = true;
      leg.add(toe);
    });

    root.add(leg);
    parts[leg.name] = leg;
  });

  // Graduated Long Iridescent-Blue & Black Magpie Tail (`parts.tail`, 14 Layered Tail Feathers)
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, -0.34, -0.3);

  for (let t = 0; t < 14; t++) {
    const u = (t - 6.5) / 6.5; // -1 .. 1
    const len = 0.58 - Math.abs(u) * 0.22;
    const spreadX = u * 0.28;
    const dropY = -0.16 - Math.abs(u) * 0.06;
    const mat = t % 2 === 0 ? iridescentBlueMat : obsidianFeatherMat;
    const tailFeather = makeTaperedTube(
      [
        [u * 0.05, 0, 0],
        [spreadX * 0.55, dropY * 0.5, -len * 0.5],
        [spreadX, dropY, -len],
      ],
      [0.032, 0.042, 0.01],
      24,
      12,
      mat
    );
    tailFeather.scale.y = 0.35;
    tail.add(tailFeather);
  }
  root.add(tail);
  parts.tail = tail;

  // Signature Prop (`parts.signatureProp`): Golden Honmoon Bell & Talismanic Plum Blossom Branch
  const propGroup = new THREE.Group();
  propGroup.name = 'signatureProp';
  propGroup.position.set(0, -0.18, 0.38);

  const branchMat = getStdMat('#4a2c1d', { roughness: 0.65, metalness: 0.06 });
  const blossomMat = getStdMat('#ff6bb5', {
    emissive: new THREE.Color('#ec4899'),
    emissiveIntensity: 0.55,
    roughness: 0.24,
    metalness: 0.12,
  });

  const branchTube = makeTaperedTube(
    [
      [-0.26, -0.04, 0],
      [0, 0.02, 0.04],
      [0.28, 0.06, -0.02],
    ],
    [0.018, 0.015, 0.008],
    24,
    12,
    branchMat
  );
  propGroup.add(branchTube);

  // Golden Honmoon Bell hanging at center
  const bellBody = new THREE.Mesh(new THREE.SphereGeometry(0.065, 28, 22), goldenEyeMat);
  bellBody.position.set(0, -0.05, 0.05);
  const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 12, 24), goldenEyeMat);
  bellRim.rotation.x = Math.PI / 2;
  bellRim.position.set(0, -0.085, 0.05);
  propGroup.add(bellBody, bellRim);

  // 3 5-petal Plum Blossoms on the branch
  [-0.16, 0.14, 0.23].forEach((bx, bIdx) => {
    const fl = new THREE.Group();
    fl.position.set(bx, 0.01 + bIdx * 0.025, 0.03);
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 12), blossomMat);
      petal.position.set(Math.cos(pa) * 0.026, Math.sin(pa) * 0.026, 0);
      petal.scale.set(1.0, 1.0, 0.35);
      fl.add(petal);
    }
    propGroup.add(fl);
  });

  // Soft golden glint only: the bell hangs on the snow-white breast, so a 0.88 cd point light 0.16 units from
  // that surface blew the whole breast out to a white disc under physically based lighting.
  const propLight = new THREE.PointLight(0xffcf33, 0.14, 1.0);
  propLight.position.set(0, 0, 0.2);
  propGroup.add(propLight);
  markNoDecal(propGroup);
  torso.add(propGroup);

  parts.signatureProp = propGroup;
  root.pendantLight = propLight;
  root.pendantEmissiveMesh = bellBody;

  // Six-Pointed Golden Honmoon Divination Wheel Aura (`parts.auraGroup`)
  const auraGroup = new THREE.Group();
  auraGroup.name = 'auraGroup';
  auraGroup.position.set(0, 0.12, -0.24);

  const divWheel = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.014, 16, 64), goldenEyeMat);
  auraGroup.add(divWheel);

  const sixPointStar = new THREE.Group();
  sixPointStar.name = 'awakenedSixPointDivinationWheel';
  sixPointStar.visible = false;
  for (let k = 0; k < 6; k++) {
    const ka = (k / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.65, 16), goldenEyeMat);
    spoke.position.set(Math.cos(ka) * 0.32, Math.sin(ka) * 0.32, 0);
    spoke.rotation.z = ka - Math.PI / 2;
    sixPointStar.add(spoke);
  }
  auraGroup.add(sixPointStar);
  awakenedNodes.push(sixPointStar);
  markNoDecal(auraGroup);
  root.add(auraGroup);
  parts.auraGroup = auraGroup;

  root.parts = parts;
  attachMinhwaDualForm(root, { stageNodes: [], awakenedNodes, morphSpecs, auraGroup });
  return root;
}

export const MINHWA_COMPANIONS_META = {
  derpy_tiger: {
    id: 'derpy_tiger',
    name: 'Derpy · Blue Minhwa Tiger',
    shortName: 'Derpy',
    title: 'Korean Minhwa Lucky Tiger · Porcelain Flowerpot Guardian',
    who: 'Blue Minhwa Tiger',
    category: 'minhwa',
    group: 'minhwa',
    icon: '🐯',
    color: '#2b7de9',
    accent: '#ffd026',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.44, z: 0.04, rx: 0.38, ry: 0.22, rz: 0.36, frontY: -0.4, frontZ: 0.4 },
    hello: 'Rawr! I\'m Derpy, the blue Minhwa tiger. I was chasing a butterfly and knocked over my porcelain peony flowerpot. Help me stand it up!',
    thanks: 'Rawr-ha-ha! The flowerpot is standing tall, and the peonies smell so sweet. Derpy gives you a happy paw pat!',
    build: buildDerpyTiger,
  },
  sussie_magpie: {
    id: 'sussie_magpie',
    name: 'Sussie · Six-Eyed Magpie',
    shortName: 'Sussie',
    title: 'Korean Minhwa Six-Eyed Magpie · Little Gat Hat Messenger',
    who: 'Six-Eyed Magpie in a Little Gat',
    category: 'minhwa',
    group: 'minhwa',
    icon: '🐦‍⬛',
    color: '#1d4ed8',
    accent: '#ffd026',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.4, z: 0.02, rx: 0.3, ry: 0.18, rz: 0.28, frontY: -0.36, frontZ: 0.3 },
    hello: 'Chirp chirp! I\'m Sussie, the six-eyed magpie. I flew under a roof, and my little Gat hat tipped and my six golden eyes got dusty. Polish me up!',
    thanks: 'Chirp chirp chirp! Six golden eyes sparkling, little Gat hat looking sharp. Sussie brings you good luck!',
    build: buildSussieMagpie,
  },
};
