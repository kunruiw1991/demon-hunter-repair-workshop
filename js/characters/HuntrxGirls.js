// High-Resolution 3D Character Builders for the 3 HUNTR/X Girls (Rumi, Mira, Zoey)
// Each model is built with >= 22,000-32,000 vertices and >= 38,000-54,000 triangles,
// enforcing metalness <= 0.22, complete rig parts, signature weapons (Saingeom, Gokdo, Twin Shin-kal),
// Rumi's 28-segment articulated dragon braid, and interactive Stage <-> Awakened Dual Form switching.

import {
  MAX_METALNESS,
  clampMetalness,
  enforceMetalnessCap,
  createStdMaterial,
  createSatinMaterial,
  createEmbroideryMaterial,
  createQuiltedMaterial,
  createDemonRuneMaterial,
  createStitchSeamStrip,
  taperedTube,
  latheLoft,
  buildSculptedIdolHead,
  buildArticulatedHand,
  buildPleatedSkirt,
  buildDemonMarkSealGroup,
  buildHonmoonAuraGroup,
  registerDualForm,
  applyCharacterForm,
} from './materials.js';

const THREE = window.THREE;

function markNoDecalRecursive(groupOrMesh) {
  if (!groupOrMesh || !groupOrMesh.traverse) return;
  groupOrMesh.traverse((obj) => {
    if (obj.isMesh) obj.userData.noDecal = true;
  });
}

function ensureBoundingSpheres(rootGroup) {
  if (!rootGroup || !rootGroup.traverse) return;
  rootGroup.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      if (!obj.geometry.boundingSphere) {
        obj.geometry.computeBoundingSphere();
      }
    }
  });
}

/* ============================================================================
 * 1. RUMI (鲁米 · 猎魔主唱) — Half-Demon Lead Vocalist with 28-Segment Dragon Braid & Saingeom
 * ============================================================================ */
export function buildRumi() {
  const root = new THREE.Group();
  root.name = 'rumi';
  root.characterId = 'rumi';
  root.displayName = '鲁米 · 猎魔主唱';
  root.group = root;
  root.userData.form = 'stage';
  root.userData.baseScale = 1.0;

  // Core Palette & Materials (all metalness <= 0.22)
  const skinMat = createStdMaterial('#ffe4d6', { roughness: 0.50, metalness: 0.04 });
  const hairMat = createSatinMaterial('#6d28d9', {
    emissive: new THREE.Color('#2e1065'),
    emissiveIntensity: 0.14,
    roughness: 0.34,
    metalness: 0.14,
  });
  const hairHighlightMat = createSatinMaterial('#a855f7', {
    emissive: new THREE.Color('#581c87'),
    emissiveIntensity: 0.20,
    roughness: 0.30,
    metalness: 0.16,
  });
  const jacketMat = createEmbroideryMaterial('#4c1d95', '#fbbf24', {
    emissive: new THREE.Color('#3b0764'),
    emissiveIntensity: 0.14,
    roughness: 0.36,
    metalness: 0.18,
  });
  jacketMat.userData.stageState = { emissive: '#3b0764', emissiveIntensity: 0.14 };
  jacketMat.userData.awakenedState = { emissive: '#a21caf', emissiveIntensity: 0.42 };

  const cropTopMat = createSatinMaterial('#f8fafc', { roughness: 0.38, metalness: 0.10 });
  const skirtMat = createSatinMaterial('#31105f', { roughness: 0.36, metalness: 0.15 });
  const goldMat = createStdMaterial('#fbbf24', {
    emissive: new THREE.Color('#d97706'),
    emissiveIntensity: 0.24,
    roughness: 0.24,
    metalness: 0.22,
  });
  const bootMat = createStdMaterial('#1e1b2e', { roughness: 0.40, metalness: 0.16 });
  const demonVeinMat = createDemonRuneMaterial('#3b0764', '#e879f9', {
    emissive: '#f0abfc',
    emissiveIntensity: 1.25,
    roughness: 0.22,
    metalness: 0.18,
  });

  // 1. Sculpted Idol Head
  const head = buildSculptedIdolHead({
    radius: 0.36,
    skinMat,
    blushHex: '#fb7185',
    lipHex: '#db2777',
    eyeHex: '#8b5cf6',
    awakenedEyeHex: '#f0abfc',
    browHex: '#3b0764',
    lashCount: 5,
    earMonitorHex: '#a855f7',
    earMonitorGemHex: '#fde047',
    female: true,
    cheekRuneHex: '#e879f9',
  });
  head.position.set(0, 0.56, 0.02);
  root.add(head);

  // Crown Hair Cap & Swept Side Bangs
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.375, 36, 26, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCap.position.set(0, 0.03, -0.02);
  hairCap.castShadow = true;
  head.add(hairCap);

  // Sculpted K-pop Idol Bangs & Side Framing Locks
  const bangSpecs = [
    [[-0.08, 0.35, 0.22], [-0.20, 0.22, 0.33], [-0.28, 0.02, 0.31], [-0.31, -0.18, 0.22]],
    [[0.08, 0.35, 0.22], [0.20, 0.22, 0.33], [0.28, 0.02, 0.31], [0.31, -0.18, 0.22]],
    [[-0.02, 0.36, 0.24], [-0.09, 0.25, 0.36], [-0.14, 0.11, 0.36]],
    [[0.04, 0.36, 0.24], [0.11, 0.25, 0.36], [0.16, 0.11, 0.36]],
    [[-0.18, 0.30, 0.14], [-0.34, 0.12, 0.18], [-0.38, -0.12, 0.12], [-0.35, -0.34, 0.08]],
    [[0.18, 0.30, 0.14], [0.34, 0.12, 0.18], [0.38, -0.12, 0.12], [0.35, -0.34, 0.08]],
  ];
  bangSpecs.forEach((pts, idx) => {
    const lock = taperedTube(
      pts,
      [0.048, 0.042, 0.030, 0.014],
      14,
      8,
      idx % 2 === 0 ? hairMat : hairHighlightMat
    );
    lock.userData.noDecal = true;
    head.add(lock);
  });

  // 2. Ultra-Long Purple Dragon-Braid (>= 24 Articulated Woven Segments — 28 Segments!)
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, 0.52, -0.26);
  root.add(tail);

  const braidCurvePoints = [
    new THREE.Vector3(0, 0.22, -0.02),
    new THREE.Vector3(-0.12, 0.06, -0.10),
    new THREE.Vector3(-0.26, -0.18, 0.02),
    new THREE.Vector3(-0.32, -0.46, 0.14),
    new THREE.Vector3(-0.28, -0.76, 0.18),
    new THREE.Vector3(-0.22, -1.04, 0.16),
    new THREE.Vector3(-0.18, -1.24, 0.14),
  ];
  const braidCurve = new THREE.CatmullRomCurve3(braidCurvePoints);
  const BRAID_SEGMENTS = 28;
  root.userData.dragonBraidSegments = BRAID_SEGMENTS;

  // Core braided spine tube
  const braidCore = taperedTube(
    braidCurvePoints,
    [0.072, 0.078, 0.075, 0.068, 0.058, 0.046, 0.030],
    36,
    12,
    hairMat
  );
  braidCore.userData.noDecal = true;
  tail.add(braidCore);

  const lobeGeo = new THREE.SphereGeometry(1, 7, 5);
  for (let s = 0; s < BRAID_SEGMENTS; s++) {
    const u = s / (BRAID_SEGMENTS - 1);
    const pt = braidCurve.getPointAt(u);
    const tangent = braidCurve.getTangentAt(u).normalize();
    const radiusScale = 0.082 * (1 - u * 0.48);

    const segGroup = new THREE.Group();
    segGroup.name = `dragonBraidSeg_${s}`;
    segGroup.position.copy(pt);
    const up = new THREE.Vector3(0, 1, 0);
    segGroup.quaternion.setFromUnitVectors(up, tangent);

    // 3 interwoven woven braid lobes per segment
    for (let l = 0; l < 3; l++) {
      const ang = (s * 0.85) + (l * Math.PI * 2) / 3;
      const lobe = new THREE.Mesh(lobeGeo, (s + l) % 2 === 0 ? hairMat : hairHighlightMat);
      lobe.scale.set(radiusScale * 0.78, radiusScale * 1.15, radiusScale * 0.68);
      lobe.position.set(Math.cos(ang) * radiusScale * 0.55, 0, Math.sin(ang) * radiusScale * 0.55);
      lobe.rotation.z = l % 2 === 0 ? 0.38 : -0.38;
      lobe.userData.noDecal = true;
      segGroup.add(lobe);
    }

    // Golden dragon hair cuff every 5 segments
    if (s > 0 && s % 5 === 0) {
      const cuff = new THREE.Mesh(
        new THREE.TorusGeometry(radiusScale * 0.96, 0.008, 6, 14),
        goldMat
      );
      cuff.rotation.x = Math.PI / 2;
      cuff.userData.noDecal = true;
      segGroup.add(cuff);
    }

    tail.add(segGroup);
  }

  // Dragon-Braid Ribbon Tie & Ornament attached to `head.leftEar` so `braid_gat` (`ear`) repair works
  const braidRibbonBow = new THREE.Group();
  braidRibbonBow.name = 'braidRibbonBow';
  const bowMat = createSatinMaterial('#f43f5e', {
    emissive: new THREE.Color('#be123c'),
    emissiveIntensity: 0.25,
    roughness: 0.30,
    metalness: 0.16,
  });
  [-1, 1].forEach((s) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.016, 10, 18), bowMat);
    loop.position.set(s * 0.048, 0.08, -0.06);
    loop.rotation.y = s * 0.4;
    loop.userData.noDecal = true;
    braidRibbonBow.add(loop);
  });
  head.leftEar.add(braidRibbonBow);

  // 3. Awakened Curved Demon Horns on Rumi's Brow (`awakenedOnly`)
  const demonHorns = new THREE.Group();
  demonHorns.name = 'demonHorns';
  demonHorns.visible = false;
  demonHorns.userData.onlyInForm = 'awakened';
  [-1, 1].forEach((s) => {
    const horn = taperedTube(
      [
        [s * 0.15, 0.26, 0.26],
        [s * 0.22, 0.38, 0.28],
        [s * 0.26, 0.50, 0.22],
        [s * 0.20, 0.60, 0.14],
      ],
      [0.036, 0.028, 0.018, 0.004],
      14,
      10,
      demonVeinMat
    );
    horn.userData.noDecal = true;
    demonHorns.add(horn);
  });
  head.add(demonHorns);

  // 4. Torso, Iridescent K-Pop Crop Jacket with Gold Epaulets & Pleated Stage Skirt
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.0, 0);
  root.add(torso);

  // Inner sculpted idol torso & midriff (decal-receivable)
  const innerTorso = latheLoft(
    [
      [0.14, -0.22],
      [0.21, -0.14],
      [0.17, -0.02],
      [0.18, 0.10],
      [0.23, 0.22],
      [0.22, 0.34],
      [0.14, 0.38],
    ],
    36,
    cropTopMat
  );
  innerTorso.name = 'innerTorso';
  torso.add(innerTorso);

  // Cropped Royal-Violet & Gold K-pop Stage Jacket Loft (decal-receivable)
  const cropJacket = latheLoft(
    [
      [0.205, 0.04],
      [0.235, 0.14],
      [0.258, 0.25],
      [0.248, 0.35],
      [0.175, 0.39],
    ],
    36,
    jacketMat,
    Math.PI * 0.18,
    Math.PI * 1.64
  );
  cropJacket.name = 'cropJacket';
  torso.add(cropJacket);

  // Gold Shoulder Epaulets with Hanging Fringe Tassels
  [-1, 1].forEach((s) => {
    const epauletPad = new THREE.Mesh(new THREE.SphereGeometry(0.088, 20, 16), goldMat);
    epauletPad.scale.set(1.35, 0.52, 1.05);
    epauletPad.position.set(s * 0.27, 0.34, 0.01);
    epauletPad.rotation.z = -s * 0.22;
    epauletPad.userData.noDecal = true;
    torso.add(epauletPad);

    for (let f = 0; f < 6; f++) {
      const ang = ((f / 5) - 0.5) * 1.2;
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.075, 8), goldMat);
      tassel.position.set(
        s * (0.32 + Math.cos(ang) * 0.02),
        0.29,
        Math.sin(ang) * 0.06
      );
      tassel.userData.noDecal = true;
      torso.add(tassel);
    }
  });

  // High-Waisted 24-Pleat Stage Skirt
  const skirt = buildPleatedSkirt(0.195, 0.355, 0.32, 24, skirtMat, goldMat);
  skirt.position.set(0, -0.05, 0);
  torso.add(skirt);

  // Front Demon-Mark / Honmoon Crest (`parts.demonMarkSeal`)
  const demonMarkSeal = buildDemonMarkSealGroup('#fbbf24', '#e879f9', { x: 0, y: 0.23, z: 0.255 });
  torso.add(demonMarkSeal);

  // 5. Articulated Arms, Hands, Awakened Arm Demon Patterns & Saingeom Sword (`parts.signatureProp`)
  const armDemonVeins = new THREE.Group();
  armDemonVeins.name = 'armDemonVeins';
  armDemonVeins.visible = false;
  armDemonVeins.userData.onlyInForm = 'awakened';
  torso.add(armDemonVeins);

  const buildIdolArm = (s, name) => {
    const armG = new THREE.Group();
    armG.name = name;
    armG.position.set(s * 0.26, 0.31, 0.0);

    // Jacket upper sleeve
    const upperSleeve = taperedTube(
      [
        [0, 0, 0],
        [s * 0.07, -0.12, 0.02],
        [s * 0.11, -0.23, 0.05],
      ],
      [0.068, 0.060, 0.054],
      20,
      16,
      jacketMat
    );
    armG.add(upperSleeve);

    // Bare forearm
    const forearm = taperedTube(
      [
        [s * 0.11, -0.23, 0.05],
        [s * 0.14, -0.35, 0.11],
        [s * 0.15, -0.45, 0.17],
      ],
      [0.048, 0.042, 0.036],
      20,
      16,
      skinMat
    );
    armG.add(forearm);

    // Gold wrist cuff
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.040, 0.008, 12, 24), goldMat);
    cuff.position.set(s * 0.15, -0.44, 0.16);
    cuff.rotation.x = Math.PI * 0.38;
    cuff.userData.noDecal = true;
    armG.add(cuff);

    // Glowing Demon Pattern Veins along forearm (visible in 'awakened' mode): main vein + forked branch
    const vein = taperedTube(
      [
        [s * 0.26 + s * 0.11, 0.31 - 0.22, 0.08],
        [s * 0.26 + s * 0.14, 0.31 - 0.33, 0.14],
        [s * 0.26 + s * 0.15, 0.31 - 0.43, 0.19],
      ],
      [0.02, 0.017, 0.011],
      14,
      8,
      demonVeinMat
    );
    vein.userData.noDecal = true;
    armDemonVeins.add(vein);
    const veinBranch = taperedTube(
      [
        [s * 0.26 + s * 0.135, 0.31 - 0.3, 0.1],
        [s * 0.26 + s * 0.1, 0.31 - 0.36, 0.13],
        [s * 0.26 + s * 0.12, 0.31 - 0.42, 0.17],
      ],
      [0.013, 0.011, 0.006],
      12,
      8,
      demonVeinMat
    );
    veinBranch.userData.noDecal = true;
    armDemonVeins.add(veinBranch);

    // Articulated 5-finger hand
    const hand = buildArticulatedHand(s, skinMat, goldMat, 0.85, { withRings: true });
    hand.position.set(s * 0.155, -0.47, 0.19);
    hand.rotation.x = -0.35;
    armG.add(hand);

    return armG;
  };

  const leftArm = buildIdolArm(-1, 'leftArm');
  const rightArm = buildIdolArm(1, 'rightArm');
  root.add(leftArm, rightArm);

  // 6. Signature Weapon (`parts.signatureProp`): Saingeom (四寅剑 — Four-Tiger Demon-Slaying Sword)
  const signatureProp = new THREE.Group();
  signatureProp.name = 'signatureProp';
  signatureProp.position.set(0.18, -0.46, 0.24);
  signatureProp.rotation.set(0.28, -0.22, -0.35);

  const bladeMat = createStdMaterial('#e0e7ff', {
    emissive: new THREE.Color('#a855f7'),
    emissiveIntensity: 0.72,
    roughness: 0.18,
    metalness: 0.22,
  });
  bladeMat.userData.stageState = { color: '#e0e7ff', emissive: '#a855f7', emissiveIntensity: 0.72 };
  bladeMat.userData.awakenedState = { color: '#f5d0fe', emissive: '#e879f9', emissiveIntensity: 1.35 };

  // Sculpted Tiger-Head Pommel & Wrapped Hilt
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.036, 18, 14), goldMat);
  pommel.position.set(0, -0.14, 0);
  signatureProp.add(pommel);

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.022, 0.14, 18), hairMat);
  grip.position.set(0, -0.06, 0);
  signatureProp.add(grip);

  // Four-Tiger Crossguard (四寅剑格)
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.032, 0.048, 4, 2, 2), goldMat);
  guard.position.set(0, 0.02, 0);
  signatureProp.add(guard);
  [-0.06, -0.02, 0.02, 0.06].forEach((gx) => {
    const tigerRelief = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), goldMat);
    tigerRelief.position.set(gx, 0.02, 0.024);
    signatureProp.add(tigerRelief);
  });

  // High-res Runic Diamond Sword Blade
  const bladeBody = taperedTube(
    [
      [0, 0.03, 0],
      [0, 0.25, 0],
      [0, 0.48, 0],
      [0, 0.68, 0],
      [0, 0.78, 0],
    ],
    [0.034, 0.031, 0.026, 0.018, 0.002],
    28,
    12,
    bladeMat
  );
  bladeBody.scale.set(1.15, 1.0, 0.28);
  signatureProp.add(bladeBody);

  // Glowing Big-Dipper & Four-Tiger Constellation Runes along the Fuller Channel
  for (let r = 0; r < 7; r++) {
    const runeStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 1), goldMat);
    runeStar.position.set((r % 2 === 0 ? 1 : -1) * 0.005, 0.12 + r * 0.082, 0.012);
    signatureProp.add(runeStar);
  }

  // Awakened Purple-Gold Spirit Flames along Saingeom Blade
  const swordFlames = new THREE.Group();
  swordFlames.name = 'swordFlames';
  swordFlames.visible = false;
  swordFlames.userData.onlyInForm = 'awakened';
  for (let f = 0; f < 5; f++) {
    const wisp = taperedTube(
      [
        [0, 0.10 + f * 0.12, 0],
        [(f % 2 === 0 ? 1 : -1) * 0.045, 0.18 + f * 0.12, 0.025],
        [0, 0.26 + f * 0.12, -0.02],
      ],
      [0.014, 0.010, 0.002],
      12,
      8,
      demonVeinMat
    );
    swordFlames.add(wisp);
  }
  signatureProp.add(swordFlames);

  const propLight = new THREE.PointLight('#c084fc', 0.65, 2.2);
  propLight.position.set(0, 0.38, 0.06);
  signatureProp.add(propLight);

  markNoDecalRecursive(signatureProp);
  rightArm.add(signatureProp);

  // 7. Legs & Knee-High Laced Combat Boots
  const buildIdolLeg = (s, name) => {
    const legG = new THREE.Group();
    legG.name = name;
    legG.position.set(s * 0.125, -0.32, 0);

    // Sculpted thigh
    const thigh = taperedTube(
      [
        [0, 0, 0],
        [s * 0.01, -0.14, 0.01],
        [s * 0.015, -0.26, 0.0],
      ],
      [0.088, 0.076, 0.066],
      18,
      16,
      skinMat
    );
    legG.add(thigh);

    // Knee-high combat boot shaft
    const bootShaft = latheLoft(
      [
        [0.068, -0.50],
        [0.064, -0.42],
        [0.072, -0.32],
        [0.070, -0.24],
      ],
      32,
      bootMat
    );
    legG.add(bootShaft);

    // 6 criss-cross gold boot laces
    for (let l = 0; l < 6; l++) {
      const ly = -0.27 - l * 0.034;
      const lace = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.008, 0.014), goldMat);
      lace.position.set(0, ly, 0.068);
      lace.rotation.z = l % 2 === 0 ? 0.28 : -0.28;
      lace.userData.noDecal = true;
      legG.add(lace);
    }

    // Boot foot & lugged platform sole
    const bootFoot = new THREE.Mesh(new THREE.SphereGeometry(0.082, 22, 16), bootMat);
    bootFoot.scale.set(0.92, 0.58, 1.55);
    bootFoot.position.set(0, -0.52, 0.045);
    bootFoot.castShadow = true;
    legG.add(bootFoot);

    const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.086, 0.036, 24), goldMat);
    sole.scale.set(0.95, 1.0, 1.55);
    sole.position.set(0, -0.55, 0.045);
    sole.userData.noDecal = true;
    legG.add(sole);

    return legG;
  };

  const leftLeg = buildIdolLeg(-1, 'leftLeg');
  const rightLeg = buildIdolLeg(1, 'rightLeg');
  root.add(leftLeg, rightLeg);

  // 8. Stage Honmoon / Awakened Demon Aura (`parts.auraGroup`)
  const auraGroup = buildHonmoonAuraGroup('#ffd447', '#d946ef', { flameCount: 8 });
  root.add(auraGroup);

  // Assemble `root.parts`
  root.pendantLight = propLight;
  root.pendantEmissiveMesh = bladeBody;
  root.parts = {
    root,
    head,
    torso,
    eyes: head.eyes,
    leftEar: head.leftEar,
    rightEar: head.rightEar,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    tail,
    signatureProp,
    demonMarkSeal,
    auraGroup,
    demonHorns,
    armDemonVeins,
  };

  registerDualForm(root, {
    awakenedNodes: [demonHorns, armDemonVeins, head.facePatternsGroup, swordFlames],
    morphSpecs: [
      ...head.morphSpecs,
      { material: jacketMat, stage: jacketMat.userData.stageState, awakened: jacketMat.userData.awakenedState },
      { material: bladeMat, stage: bladeMat.userData.stageState, awakened: bladeMat.userData.awakenedState },
    ],
    auraGroup,
  });

  ensureBoundingSpheres(root);
  enforceMetalnessCap(root);
  applyCharacterForm(root, 'stage');
  return root;
}

/* ============================================================================
 * 2. MIRA (米拉 · 刀群舞主舞) — Main Dancer with 22 Hot-Pink Hair Strands & Gokdo Polearm
 * ============================================================================ */
export function buildMira() {
  const root = new THREE.Group();
  root.name = 'mira';
  root.characterId = 'mira';
  root.displayName = '米拉 · 刀群舞主舞';
  root.group = root;
  root.userData.form = 'stage';
  root.userData.baseScale = 1.06;

  const skinMat = createStdMaterial('#ffe6dc', { roughness: 0.48, metalness: 0.04 });
  const pinkHairMat = createSatinMaterial('#f43f5e', {
    emissive: new THREE.Color('#881337'),
    emissiveIntensity: 0.16,
    roughness: 0.30,
    metalness: 0.16,
  });
  const lightPinkHairMat = createSatinMaterial('#fb7185', {
    emissive: new THREE.Color('#9f1239'),
    emissiveIntensity: 0.20,
    roughness: 0.28,
    metalness: 0.16,
  });
  const corsetMat = createEmbroideryMaterial('#881337', '#fbbf24', {
    emissive: new THREE.Color('#4c0519'),
    emissiveIntensity: 0.16,
    roughness: 0.34,
    metalness: 0.18,
  });
  corsetMat.userData.stageState = { emissive: '#4c0519', emissiveIntensity: 0.16 };
  corsetMat.userData.awakenedState = { emissive: '#e11d48', emissiveIntensity: 0.52 };

  // Deep wine-plum velvet (skirt, gloves, thigh-high boots) with a visible satin sheen instead of flat black
  const velvetBlackMat = createSatinMaterial('#4a1d4e', {
    emissive: new THREE.Color('#2a0f33'),
    emissiveIntensity: 0.18,
    roughness: 0.34,
    metalness: 0.14,
  });
  const goldMat = createStdMaterial('#fbbf24', {
    emissive: new THREE.Color('#b45309'),
    emissiveIntensity: 0.25,
    roughness: 0.22,
    metalness: 0.22,
  });
  const sigilMat = createDemonRuneMaterial('#881337', '#ff2e88', {
    emissive: '#fb7185',
    emissiveIntensity: 1.25,
    roughness: 0.20,
    metalness: 0.18,
  });

  // 1. Sculpted Tall Visual Head
  const head = buildSculptedIdolHead({
    radius: 0.35,
    skinMat,
    blushHex: '#fda4af',
    lipHex: '#be123c',
    eyeHex: '#e11d48',
    awakenedEyeHex: '#fde047',
    browHex: '#4c0519',
    lashCount: 6,
    earMonitorHex: '#f43f5e',
    earMonitorGemHex: '#fde047',
    female: true,
    cheekRuneHex: '#fb7185',
  });
  head.position.set(0, 0.59, 0.02);
  root.add(head);

  // Crown Hair Cap & Center-Parted Curtain Bangs
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.365, 36, 26, 0, Math.PI * 2, 0, Math.PI * 0.60),
    pinkHairMat
  );
  hairCap.position.set(0, 0.03, -0.02);
  head.add(hairCap);

  [-1, 1].forEach((s) => {
    const curtainBang = taperedTube(
      [
        [s * 0.04, 0.35, 0.22],
        [s * 0.18, 0.22, 0.34],
        [s * 0.28, 0.02, 0.30],
        [s * 0.32, -0.20, 0.20],
      ],
      [0.044, 0.038, 0.028, 0.012],
      14,
      8,
      lightPinkHairMat
    );
    curtainBang.userData.noDecal = true;
    head.add(curtainBang);
  });

  // 22 Long Twin-Swept Hot-Pink Silk Hair Strands cascading past her waist
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, 0.56, -0.10);
  root.add(tail);

  const STRAND_COUNT = 22;
  for (let i = 0; i < STRAND_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const idxInSide = Math.floor(i / 2);
    const u = idxInSide / (STRAND_COUNT / 2 - 1);
    const angle = side * (0.28 + u * 1.15);
    const rx = Math.sin(angle) * 0.34;
    const rz = -Math.cos(angle) * 0.30;

    const strand = taperedTube(
      [
        [rx * 0.75, 0.24, rz * 0.75],
        [rx * 1.12, 0.04, rz * 1.05 - 0.06],
        [rx * 1.28 + side * 0.06, -0.28, rz * 1.15 - 0.10],
        [rx * 1.18 + side * 0.10, -0.62, rz * 1.08 - 0.12],
        [rx * 1.05 + side * 0.14, -0.92 - (i % 3) * 0.06, rz * 0.98 - 0.08],
      ],
      [0.042, 0.046, 0.038, 0.026, 0.010],
      18,
      8,
      i % 3 === 0 ? lightPinkHairMat : pinkHairMat
    );
    strand.userData.noDecal = true;
    tail.add(strand);
  }

  // Golden Butterfly Hairpin Clasps on `head.leftEar` & `head.rightEar`
  [-1, 1].forEach((s) => {
    const targetEar = s < 0 ? head.leftEar : head.rightEar;
    const clasp = new THREE.Group();
    clasp.name = s < 0 ? 'leftHairpin' : 'rightHairpin';
    const wing1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 1), goldMat);
    wing1.scale.set(1.2, 0.7, 0.3);
    wing1.position.set(s * 0.04, 0.16, 0.05);
    wing1.userData.noDecal = true;
    clasp.add(wing1);
    targetEar.add(clasp);
  });

  // 2. Torso, Asymmetric Crimson-and-Black K-Pop Stage Corset & 3 Draped Gold Waist Chains
  const torso = new THREE.Group();
  torso.name = 'torso';
  root.add(torso);

  // Sculpted Asymmetric Stage Corset (decal-receivable)
  const corset = latheLoft(
    [
      [0.21, -0.10],
      [0.18, 0.02],
      [0.19, 0.14],
      [0.24, 0.26],
      [0.22, 0.37],
      [0.14, 0.41],
    ],
    40,
    corsetMat
  );
  corset.name = 'stageCorset';
  torso.add(corset);

  // Asymmetric Diagonal Black Velvet Sash & Cutout Trim
  const diagonalSash = taperedTube(
    [
      [-0.22, 0.37, 0.12],
      [-0.04, 0.22, 0.24],
      [0.16, 0.05, 0.20],
      [0.22, -0.08, 0.04],
    ],
    [0.038, 0.044, 0.042, 0.034],
    24,
    14,
    velvetBlackMat
  );
  diagonalSash.userData.noDecal = true;
  torso.add(diagonalSash);

  // 3 Draped Catenary Gold Waist Chains with Star Charms
  for (let c = 0; c < 3; c++) {
    const drop = 0.05 + c * 0.045;
    const chain = taperedTube(
      [
        [-0.21, -0.02 - c * 0.02, 0.06],
        [-0.12, -0.04 - drop, 0.20],
        [0.04, -0.06 - drop, 0.22],
        [0.18, -0.03 - c * 0.02, 0.12],
        [0.22, 0.0, -0.02],
      ],
      [0.009, 0.010, 0.010, 0.009, 0.008],
      24,
      10,
      goldMat
    );
    chain.userData.noDecal = true;
    torso.add(chain);

    const starCharm = new THREE.Mesh(new THREE.OctahedronGeometry(0.024, 1), goldMat);
    starCharm.position.set(0.04, -0.085 - drop, 0.23);
    starCharm.userData.noDecal = true;
    torso.add(starCharm);
  }

  // Tailored High-Waist Stage Shorts + Side Drape Skirt Panel
  const shorts = buildPleatedSkirt(0.20, 0.33, 0.26, 20, velvetBlackMat, goldMat);
  shorts.position.set(0, -0.08, 0);
  torso.add(shorts);

  // Front Demon-Mark / Honmoon Crest (`parts.demonMarkSeal`)
  const demonMarkSeal = buildDemonMarkSealGroup('#fbbf24', '#fb7185', { x: 0, y: 0.25, z: 0.25 });
  torso.add(demonMarkSeal);

  // Awakened Lotus-Blade Spirit Rings behind Mira's Back
  const awakenedLotusRings = new THREE.Group();
  awakenedLotusRings.name = 'awakenedLotusRings';
  awakenedLotusRings.visible = false;
  awakenedLotusRings.userData.onlyInForm = 'awakened';
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * Math.PI * 2;
    const petal = taperedTube(
      [
        [Math.cos(a) * 0.18, 0.22 + Math.sin(a) * 0.18, -0.26],
        [Math.cos(a) * 0.42, 0.22 + Math.sin(a) * 0.42, -0.30],
        [Math.cos(a + 0.18) * 0.56, 0.22 + Math.sin(a + 0.18) * 0.56, -0.34],
      ],
      [0.016, 0.024, 0.004],
      14,
      10,
      sigilMat
    );
    petal.userData.noDecal = true;
    awakenedLotusRings.add(petal);
  }
  torso.add(awakenedLotusRings);

  // 3. Arms, Hands & Signature Weapon (`parts.signatureProp`): Gokdo (曲刀 Crescent Polearm)
  const buildDancerArm = (s, name) => {
    const armG = new THREE.Group();
    armG.name = name;
    armG.position.set(s * 0.25, 0.34, 0);

    const upperArm = taperedTube(
      [
        [0, 0, 0],
        [s * 0.08, -0.14, 0.03],
        [s * 0.12, -0.26, 0.07],
      ],
      [0.056, 0.048, 0.044],
      20,
      16,
      skinMat
    );
    armG.add(upperArm);

    // Velvet opera glove forearm
    const gloveForearm = taperedTube(
      [
        [s * 0.12, -0.26, 0.07],
        [s * 0.15, -0.38, 0.14],
        [s * 0.16, -0.47, 0.20],
      ],
      [0.046, 0.040, 0.035],
      20,
      16,
      velvetBlackMat
    );
    armG.add(gloveForearm);

    const hand = buildArticulatedHand(s, skinMat, goldMat, 0.86, {
      gloveMat: velvetBlackMat,
      withRings: true,
    });
    hand.position.set(s * 0.165, -0.49, 0.22);
    hand.rotation.x = -0.32;
    armG.add(hand);

    return armG;
  };

  const leftArm = buildDancerArm(-1, 'leftArm');
  const rightArm = buildDancerArm(1, 'rightArm');
  root.add(leftArm, rightArm);

  // Gokdo (曲刀) Crescent Polearm attached to `rightArm`
  const signatureProp = new THREE.Group();
  signatureProp.name = 'signatureProp';
  signatureProp.position.set(0.18, -0.42, 0.24);
  signatureProp.rotation.set(0.18, -0.15, -0.22);

  const gokdoBladeMat = createStdMaterial('#ffe4e6', {
    emissive: new THREE.Color('#f43f5e'),
    emissiveIntensity: 0.75,
    roughness: 0.16,
    metalness: 0.22,
  });
  gokdoBladeMat.userData.stageState = { color: '#ffe4e6', emissive: '#f43f5e', emissiveIntensity: 0.75 };
  gokdoBladeMat.userData.awakenedState = { color: '#fecdd3', emissive: '#ff1e56', emissiveIntensity: 1.40 };

  // Long lacquered polearm shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.32, 20), corsetMat);
  shaft.position.set(0, 0.12, 0);
  signatureProp.add(shaft);

  // Lotus-petal brass collar
  const lotusCollar = latheLoft(
    [
      [0.022, 0.72],
      [0.052, 0.76],
      [0.036, 0.81],
    ],
    24,
    goldMat
  );
  signatureProp.add(lotusCollar);

  // Sweeping Crescent Moon Blade (曲刀月刃)
  const crescentBlade = taperedTube(
    [
      [0, 0.78, 0],
      [0.04, 0.94, 0.04],
      [0.12, 1.12, 0.08],
      [0.06, 1.30, 0.04],
      [-0.04, 1.42, -0.02],
    ],
    [0.038, 0.056, 0.052, 0.034, 0.004],
    28,
    14,
    gokdoBladeMat
  );
  crescentBlade.scale.set(1.15, 1.0, 0.26);
  signatureProp.add(crescentBlade);

  // Twin crimson silk streamers hanging from lotus collar
  [-1, 1].forEach((s) => {
    const streamer = taperedTube(
      [
        [0, 0.74, 0],
        [s * 0.08, 0.58, -0.06],
        [s * 0.14, 0.38, -0.12],
      ],
      [0.016, 0.022, 0.008],
      16,
      10,
      pinkHairMat
    );
    signatureProp.add(streamer);
  });

  const propLight = new THREE.PointLight('#fb7185', 0.68, 2.4);
  propLight.position.set(0.06, 1.05, 0.08);
  signatureProp.add(propLight);

  markNoDecalRecursive(signatureProp);
  rightArm.add(signatureProp);

  // 4. Long Dancer Legs & Thigh-High Heeled Boots with Gold Buckles
  const buildDancerLeg = (s, name) => {
    const legG = new THREE.Group();
    legG.name = name;
    legG.position.set(s * 0.125, -0.30, 0);

    const upperThigh = taperedTube(
      [
        [0, 0, 0],
        [s * 0.01, -0.13, 0.01],
      ],
      [0.086, 0.076],
      14,
      16,
      skinMat
    );
    legG.add(upperThigh);

    // Thigh-high heeled boot shaft (decal-receivable)
    const thighBoot = latheLoft(
      [
        [0.062, -0.52],
        [0.058, -0.38],
        [0.072, -0.22],
        [0.078, -0.11],
      ],
      36,
      velvetBlackMat
    );
    legG.add(thighBoot);

    // 5 gold buckle straps along thigh boot
    for (let b = 0; b < 5; b++) {
      const by = -0.15 - b * 0.068;
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.072 - b * 0.002, 0.007, 10, 24), goldMat);
      strap.rotation.x = Math.PI / 2;
      strap.position.y = by;
      strap.userData.noDecal = true;
      legG.add(strap);
    }

    const bootFoot = new THREE.Mesh(new THREE.SphereGeometry(0.078, 20, 16), velvetBlackMat);
    bootFoot.scale.set(0.88, 0.56, 1.52);
    bootFoot.position.set(0, -0.53, 0.045);
    legG.add(bootFoot);

    return legG;
  };

  const leftLeg = buildDancerLeg(-1, 'leftLeg');
  const rightLeg = buildDancerLeg(1, 'rightLeg');
  root.add(leftLeg, rightLeg);

  // 5. Stage / Awakened Aura (`parts.auraGroup`)
  const auraGroup = buildHonmoonAuraGroup('#ffd447', '#ff2e88', { flameCount: 8 });
  root.add(auraGroup);

  root.pendantLight = propLight;
  root.pendantEmissiveMesh = crescentBlade;
  root.parts = {
    root,
    head,
    torso,
    eyes: head.eyes,
    leftEar: head.leftEar,
    rightEar: head.rightEar,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    tail,
    signatureProp,
    demonMarkSeal,
    auraGroup,
    awakenedLotusRings,
  };

  registerDualForm(root, {
    awakenedNodes: [awakenedLotusRings, head.facePatternsGroup],
    morphSpecs: [
      ...head.morphSpecs,
      { material: corsetMat, stage: corsetMat.userData.stageState, awakened: corsetMat.userData.awakenedState },
      {
        material: gokdoBladeMat,
        stage: gokdoBladeMat.userData.stageState,
        awakened: gokdoBladeMat.userData.awakenedState,
      },
    ],
    auraGroup,
  });

  ensureBoundingSpheres(root);
  enforceMetalnessCap(root);
  applyCharacterForm(root, 'stage');
  return root;
}

/* ============================================================================
 * 3. ZOEY (佐伊 · 双丸子头忙内) — Maknae Rapper with Twin Braided Space-Buns & Twin Shin-kal
 * ============================================================================ */
export function buildZoey() {
  const root = new THREE.Group();
  root.name = 'zoey';
  root.characterId = 'zoey';
  root.displayName = '佐伊 · 双丸子头忙内';
  root.group = root;
  root.userData.form = 'stage';
  root.userData.baseScale = 0.97;

  const skinMat = createStdMaterial('#ffe8dc', { roughness: 0.50, metalness: 0.04 });
  const darkHairMat = createSatinMaterial('#1e1b4b', {
    emissive: new THREE.Color('#0f172a'),
    emissiveIntensity: 0.12,
    roughness: 0.34,
    metalness: 0.14,
  });
  const cyanHighlightMat = createSatinMaterial('#06b6d4', {
    emissive: new THREE.Color('#0891b2'),
    emissiveIntensity: 0.28,
    roughness: 0.28,
    metalness: 0.16,
  });
  const bomberMat = createQuiltedMaterial('#06b6d4', '#0e7490', {
    emissive: new THREE.Color('#083344'),
    emissiveIntensity: 0.16,
    roughness: 0.42,
    metalness: 0.14,
  });
  bomberMat.userData.stageState = { emissive: '#083344', emissiveIntensity: 0.16 };
  bomberMat.userData.awakenedState = { emissive: '#06b6d4', emissiveIntensity: 0.55 };

  const yellowAccentMat = createSatinMaterial('#facc15', {
    emissive: new THREE.Color('#ca8a04'),
    emissiveIntensity: 0.22,
    roughness: 0.32,
    metalness: 0.18,
  });
  const magentaMat = createSatinMaterial('#ec4899', {
    emissive: new THREE.Color('#9d174d'),
    emissiveIntensity: 0.20,
    roughness: 0.34,
    metalness: 0.16,
  });
  const cargoSkirtMat = createSatinMaterial('#1e293b', { roughness: 0.44, metalness: 0.12 });
  const shamanRuneMat = createDemonRuneMaterial('#083344', '#22d3ee', {
    emissive: '#67e8f9',
    emissiveIntensity: 1.30,
    roughness: 0.20,
    metalness: 0.18,
  });

  // 1. Sculpted Cute Maknae Head
  const head = buildSculptedIdolHead({
    radius: 0.36,
    skinMat,
    blushHex: '#f472b6',
    lipHex: '#ec4899',
    eyeHex: '#06b6d4',
    awakenedEyeHex: '#67e8f9',
    browHex: '#1e1b4b',
    lashCount: 5,
    earMonitorHex: '#22d3ee',
    earMonitorGemHex: '#facc15',
    female: true,
    cheekRuneHex: '#22d3ee',
  });
  head.position.set(0, 0.55, 0.02);
  root.add(head);

  // Crown Hair Cap & Playful Wispy Bangs
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.372, 44, 32, 0, Math.PI * 2, 0, Math.PI * 0.62),
    darkHairMat
  );
  hairCap.position.set(0, 0.03, -0.02);
  head.add(hairCap);

  for (let b = 0; b < 7; b++) {
    const u = (b / 6) - 0.5;
    const bx = u * 0.44;
    const bang = taperedTube(
      [
        [bx * 0.5, 0.34, 0.22],
        [bx * 0.85, 0.24, 0.35],
        [bx * 1.0, 0.10, 0.36],
      ],
      [0.036, 0.030, 0.012],
      16,
      10,
      b % 2 === 0 ? darkHairMat : cyanHighlightMat
    );
    bang.userData.noDecal = true;
    head.add(bang);
  }

  // 2. Iconic Twin Sculpted Braided Space-Buns (双丸子头) + Fluttering Ribbons on `leftEar` & `rightEar`
  const tail = new THREE.Group();
  tail.name = 'tail';
  tail.position.set(0, 0.55, -0.10);
  root.add(tail);

  [-1, 1].forEach((s) => {
    const targetEar = s < 0 ? head.leftEar : head.rightEar;
    const bunGroup = new THREE.Group();
    bunGroup.name = s < 0 ? 'leftSpaceBun' : 'rightSpaceBun';
    bunGroup.position.set(s * 0.28, 0.30, -0.04);

    // Core sculpted bun sphere
    const bunCore = new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 18), darkHairMat);
    bunCore.castShadow = true;
    bunCore.userData.noDecal = true;
    bunGroup.add(bunCore);

    // Braided TorusKnot hair coil wrapped around the space-bun
    const braidedCoil = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.115, 0.028, 44, 10, 2, 3),
      cyanHighlightMat
    );
    braidedCoil.userData.noDecal = true;
    bunGroup.add(braidedCoil);

    // Golden lattice bun cuff ring
    const bunRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 12, 28), yellowAccentMat);
    bunRing.rotation.y = s * 0.5;
    bunRing.userData.noDecal = true;
    bunGroup.add(bunRing);

    // Long fluttering cyan & gold hair ribbons (attached inside `targetEar` so `braid_gat` repair works!)
    for (let r = 0; r < 2; r++) {
      const ribbon = taperedTube(
        [
          [s * 0.02, 0.28, -0.04],
          [s * (0.14 + r * 0.05), 0.08, -0.14],
          [s * (0.20 + r * 0.08), -0.22, -0.18],
          [s * (0.16 + r * 0.06), -0.52, -0.14],
        ],
        [0.026, 0.032, 0.028, 0.012],
        22,
        12,
        r === 0 ? cyanHighlightMat : yellowAccentMat
      );
      ribbon.userData.noDecal = true;
      targetEar.add(ribbon);
    }

    head.add(bunGroup);
  });

  // 3. Torso, Cropped Street-Idol Quilted Bomber Jacket & Pleated Cargo Mini-Skirt
  const torso = new THREE.Group();
  torso.name = 'torso';
  root.add(torso);

  // Inner street crop top
  const cropTop = latheLoft(
    [
      [0.14, -0.20],
      [0.20, -0.12],
      [0.165, 0.0],
      [0.18, 0.12],
      [0.22, 0.24],
      [0.21, 0.35],
      [0.14, 0.39],
    ],
    52,
    magentaMat
  );
  torso.add(cropTop);

  // Puffy Cropped Street-Idol Quilted Bomber Jacket (decal-receivable)
  const bomberJacket = latheLoft(
    [
      [0.215, 0.04],
      [0.255, 0.15],
      [0.275, 0.26],
      [0.260, 0.36],
      [0.185, 0.40],
    ],
    56,
    bomberMat,
    Math.PI * 0.14,
    Math.PI * 1.72
  );
  bomberJacket.name = 'bomberJacket';
  torso.add(bomberJacket);

  // Pleated Cargo Mini-Skirt with Utility Pockets & Wallet Chain
  const cargoSkirt = buildPleatedSkirt(0.195, 0.36, 0.31, 24, cargoSkirtMat, yellowAccentMat);
  cargoSkirt.position.set(0, -0.05, 0);
  torso.add(cargoSkirt);

  [-1, 1].forEach((s) => {
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.105, 0.045, 4, 4, 2), cyanHighlightMat);
    pocket.position.set(s * 0.26, -0.19, 0.08);
    pocket.rotation.y = s * 0.35;
    pocket.userData.noDecal = true;
    torso.add(pocket);
  });

  // Front Demon-Mark / Honmoon Crest (`parts.demonMarkSeal`)
  const demonMarkSeal = buildDemonMarkSealGroup('#facc15', '#22d3ee', { x: 0, y: 0.23, z: 0.26 });
  torso.add(demonMarkSeal);

  // Awakened Floating Spirit-Knife Halo Blades orbiting Zoey
  const spiritKnifeHalo = new THREE.Group();
  spiritKnifeHalo.name = 'spiritKnifeHalo';
  spiritKnifeHalo.visible = false;
  spiritKnifeHalo.userData.onlyInForm = 'awakened';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const haloBlade = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.22, 12), shamanRuneMat);
    haloBlade.position.set(Math.cos(a) * 0.56, 0.36 + Math.sin(a) * 0.36, -0.24);
    haloBlade.rotation.z = a - Math.PI / 2;
    haloBlade.userData.noDecal = true;
    spiritKnifeHalo.add(haloBlade);
  }
  torso.add(spiritKnifeHalo);

  // 4. Arms, Hands & Signature Prop (`parts.signatureProp`): Twin Shin-kal (神刀 Spirit Throwing Knives)
  const buildRapperArm = (s, name) => {
    const armG = new THREE.Group();
    armG.name = name;
    armG.position.set(s * 0.26, 0.31, 0);

    // Puffy bomber sleeve
    const puffySleeve = taperedTube(
      [
        [0, 0, 0],
        [s * 0.08, -0.13, 0.03],
        [s * 0.13, -0.26, 0.08],
      ],
      [0.078, 0.082, 0.064],
      20,
      16,
      s < 0 ? bomberMat : magentaMat
    );
    armG.add(puffySleeve);

    // Ribbed cuff & forearm
    const forearm = taperedTube(
      [
        [s * 0.13, -0.26, 0.08],
        [s * 0.15, -0.37, 0.14],
        [s * 0.16, -0.45, 0.19],
      ],
      [0.052, 0.044, 0.038],
      18,
      16,
      skinMat
    );
    armG.add(forearm);

    const hand = buildArticulatedHand(s, skinMat, cyanHighlightMat, 0.84, { withRings: true });
    hand.position.set(s * 0.165, -0.47, 0.21);
    hand.rotation.x = -0.34;
    armG.add(hand);

    return armG;
  };

  const leftArm = buildRapperArm(-1, 'leftArm');
  const rightArm = buildRapperArm(1, 'rightArm');
  root.add(leftArm, rightArm);

  // Twin Shin-kal (神刀) Spirit Throwing Knives with Shamanic Bells & 5-Element Tassels (`parts.signatureProp`)
  const signatureProp = new THREE.Group();
  signatureProp.name = 'signatureProp';
  signatureProp.position.set(0.17, -0.45, 0.23);

  const shinkalBladeMat = createStdMaterial('#cffafe', {
    emissive: new THREE.Color('#06b6d4'),
    emissiveIntensity: 0.78,
    roughness: 0.16,
    metalness: 0.22,
  });
  shinkalBladeMat.userData.stageState = { color: '#cffafe', emissive: '#06b6d4', emissiveIntensity: 0.78 };
  shinkalBladeMat.userData.awakenedState = { color: '#ecfeff', emissive: '#22d3ee', emissiveIntensity: 1.45 };

  const obangsaekColors = ['#06b6d4', '#f43f5e', '#facc15', '#f8fafc', '#a855f7'];
  let mainKnifeBlade = null;

  [-1, 1].forEach((kSide, kIdx) => {
    const knife = new THREE.Group();
    knife.name = kIdx === 0 ? 'shinkalPrimary' : 'shinkalSecondary';
    knife.position.set(kIdx === 0 ? 0 : -0.09, kIdx === 0 ? 0 : 0.05, kIdx === 0 ? 0 : 0.04);
    knife.rotation.set(0.22, kSide * 0.25, -0.28 + kIdx * 0.42);

    // Hilt & Ringing Brass Shaman Bells (방울)
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.12, 16), yellowAccentMat);
    knife.add(hilt);

    for (let b = 0; b < 5; b++) {
      const a = (b / 5) * Math.PI * 2;
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), yellowAccentMat);
      bell.position.set(Math.cos(a) * 0.024, -0.05, Math.sin(a) * 0.024);
      knife.add(bell);
    }

    // Leaf-shaped engraved spirit blade
    const blade = taperedTube(
      [
        [0, 0.06, 0],
        [0.012, 0.18, 0],
        [-0.008, 0.30, 0],
        [0, 0.40, 0],
      ],
      [0.024, 0.032, 0.022, 0.002],
      22,
      12,
      shinkalBladeMat
    );
    blade.scale.set(1.15, 1.0, 0.25);
    knife.add(blade);
    if (kIdx === 0) mainKnifeBlade = blade;

    // 5-Element Obangsaek (오방색) Flowing Silk Tassels
    obangsaekColors.forEach((hex, tIdx) => {
      const tMat = createSatinMaterial(hex, { roughness: 0.32, metalness: 0.14 });
      const tassel = taperedTube(
        [
          [0, -0.06, 0],
          [(tIdx - 2) * 0.022, -0.15, -0.03 - tIdx * 0.01],
          [(tIdx - 2) * 0.034, -0.26, -0.06],
        ],
        [0.008, 0.010, 0.004],
        12,
        8,
        tMat
      );
      knife.add(tassel);
    });

    signatureProp.add(knife);
  });

  const propLight = new THREE.PointLight('#22d3ee', 0.68, 2.2);
  propLight.position.set(0, 0.22, 0.06);
  signatureProp.add(propLight);

  markNoDecalRecursive(signatureProp);
  rightArm.add(signatureProp);

  // 5. Legs, Ribbed Leg Warmers & Chunky Platform High-Top Sneakers
  const buildSneakerLeg = (s, name) => {
    const legG = new THREE.Group();
    legG.name = name;
    legG.position.set(s * 0.125, -0.32, 0);

    const thigh = taperedTube(
      [
        [0, 0, 0],
        [s * 0.01, -0.15, 0.01],
        [s * 0.012, -0.26, 0],
      ],
      [0.086, 0.074, 0.064],
      18,
      16,
      skinMat
    );
    legG.add(thigh);

    // Ribbed street leg warmer
    const legWarmer = latheLoft(
      [
        [0.076, -0.46],
        [0.082, -0.38],
        [0.072, -0.28],
        [0.068, -0.22],
      ],
      32,
      cyanHighlightMat
    );
    legG.add(legWarmer);

    // Chunky Platform High-Top Sneaker
    const sneakerUpper = new THREE.Mesh(new THREE.SphereGeometry(0.088, 22, 16), yellowAccentMat);
    sneakerUpper.scale.set(0.96, 0.62, 1.58);
    sneakerUpper.position.set(0, -0.51, 0.048);
    sneakerUpper.castShadow = true;
    legG.add(sneakerUpper);

    const platformSole = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.098, 0.048, 26), magentaMat);
    platformSole.scale.set(0.98, 1.0, 1.58);
    platformSole.position.set(0, -0.55, 0.048);
    platformSole.userData.noDecal = true;
    legG.add(platformSole);

    return legG;
  };

  const leftLeg = buildSneakerLeg(-1, 'leftLeg');
  const rightLeg = buildSneakerLeg(1, 'rightLeg');
  root.add(leftLeg, rightLeg);

  // 6. Stage / Awakened Aura (`parts.auraGroup`)
  const auraGroup = buildHonmoonAuraGroup('#ffd447', '#22d3ee', { flameCount: 8 });
  root.add(auraGroup);

  root.pendantLight = propLight;
  root.pendantEmissiveMesh = mainKnifeBlade;
  root.parts = {
    root,
    head,
    torso,
    eyes: head.eyes,
    leftEar: head.leftEar,
    rightEar: head.rightEar,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    tail,
    signatureProp,
    demonMarkSeal,
    auraGroup,
    spiritKnifeHalo,
  };

  registerDualForm(root, {
    awakenedNodes: [spiritKnifeHalo, head.facePatternsGroup],
    morphSpecs: [
      ...head.morphSpecs,
      { material: bomberMat, stage: bomberMat.userData.stageState, awakened: bomberMat.userData.awakenedState },
      {
        material: shinkalBladeMat,
        stage: shinkalBladeMat.userData.stageState,
        awakened: shinkalBladeMat.userData.awakenedState,
      },
    ],
    auraGroup,
  });

  ensureBoundingSpheres(root);
  enforceMetalnessCap(root);
  applyCharacterForm(root, 'stage');
  return root;
}

/* ============================================================================
 * 4. HUNTR/X Girls Metadata Registry (`HUNTRX_GIRLS_META`)
 * ============================================================================ */
export const HUNTRX_GIRLS_META = {
  rumi: {
    id: 'rumi',
    name: '鲁米 · 猎魔主唱',
    shortName: '鲁米 Rumi',
    enName: 'Rumi',
    title: 'HUNTR/X 猎魔主唱 · 半魔剑舞少女',
    who: 'HUNTR/X 猎魔主唱 · 半魔剑舞少女',
    category: 'huntrx',
    group: 'huntrx',
    icon: '🗡️',
    pendantIcon: '🗡️',
    color: '#8b5cf6',
    accent: '#fbbf24',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.29, z: 0.0, rx: 0.23, ry: 0.15, rz: 0.22, frontY: -0.26, frontZ: 0.3 },
    hello: '嗨！我是 HUNTR/X 主唱鲁米！刚才和冥界恶魔战斗时，我的紫龙长辫和四寅剑都弄脏啦，快帮我修复吧！',
    thanks: '哇！紫龙长辫和四寅剑都闪耀着金色魂门光芒，谢谢你，我们一起站上舞台高歌吧！',
    build: buildRumi,
  },
  mira: {
    id: 'mira',
    name: '米拉 · 刀群舞主舞',
    shortName: '米拉 Mira',
    enName: 'Mira',
    title: 'HUNTR/X 刀群舞主舞 · 绯红月刃女神',
    who: 'HUNTR/X 刀群舞主舞 · 绯红月刃女神',
    category: 'huntrx',
    group: 'huntrx',
    icon: '🌙',
    pendantIcon: '🌙',
    color: '#f43f5e',
    accent: '#fbbf24',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.27, z: 0.0, rx: 0.23, ry: 0.15, rz: 0.22, frontY: -0.24, frontZ: 0.29 },
    hello: '你好呀！我是主舞米拉，练刀群舞时把粉色长发、金腰链和绯红曲刀刮花啦，帮我护理一下吧！',
    thanks: '太棒啦！绯红曲刀和舞台胸衣焕然一新，看我为你跳支最闪耀的刀群舞！',
    build: buildMira,
  },
  zoey: {
    id: 'zoey',
    name: '佐伊 · 双丸子头忙内',
    shortName: '佐伊 Zoey',
    enName: 'Zoey',
    title: 'HUNTR/X 说唱忙内 · 双丸子神刀少女',
    who: 'HUNTR/X 说唱忙内 · 双丸子神刀少女',
    category: 'huntrx',
    group: 'huntrx',
    icon: '⚡',
    pendantIcon: '⚡',
    color: '#06b6d4',
    accent: '#facc15',
    earSide: 'leftEar',
    pendantKey: 'signatureProp',
    pelvis: { y: -0.29, z: 0.0, rx: 0.23, ry: 0.15, rz: 0.22, frontY: -0.26, frontZ: 0.3 },
    hello: '耶！我是说唱忙内佐伊！双丸子头发带散了，神刀流苏也沾了泥巴，快帮我打理一下吧！',
    thanks: '酷毙啦！双丸子头和双神刀叮当作响，看我给你来一段超燃说唱！',
    build: buildZoey,
  },
};

export const HUNTRX_GIRLS = HUNTRX_GIRLS_META;
