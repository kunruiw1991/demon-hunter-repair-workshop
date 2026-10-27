// js/characters/index.js — Unified 10-Character Registry, 4 Category Filter Tabs, Builder & Scene-Graph Auditor
// Unifies:
// - Group 1 (`huntrx`):      rumi, mira, zoey
// - Group 2 (`saja_boys`):   jinu, abby, mystery, romance, baby
// - Group 3 (`minhwa`):      derpy_tiger, sussie_magpie

import {
  MAX_METALNESS,
  registerDualForm,
  applyCharacterForm,
  countCharacterStats,
} from './materials.js';
import {
  buildRumi,
  buildMira,
  buildZoey,
  HUNTRX_GIRLS_META,
} from './HuntrxGirls.js';
import {
  buildJinu,
  buildAbby,
  buildMystery,
  buildRomance,
  buildBaby,
  SAJA_BOYS_META,
} from './SajaBoys.js';
import {
  buildDerpyTiger,
  buildSussieMagpie,
  MINHWA_COMPANIONS_META,
} from './MinhwaCompanions.js';

const THREE = window.THREE;

export const CHARACTER_ORDER = [
  'rumi',
  'mira',
  'zoey',
  'jinu',
  'abby',
  'mystery',
  'romance',
  'baby',
  'derpy_tiger',
  'sussie_magpie',
];

export const CATEGORY_TABS = [
  {
    id: 'all',
    key: 'all',
    label: '✨ 全部伙伴 (10)',
    shortLabel: '全部 (10)',
    icon: '✨',
    count: 10,
    characters: [...CHARACTER_ORDER],
  },
  {
    id: 'huntrx',
    key: 'huntrx',
    label: '🎤 HUNTR/X 猎魔女团 (3)',
    shortLabel: 'HUNTR/X (3)',
    icon: '🎤',
    count: 3,
    characters: ['rumi', 'mira', 'zoey'],
  },
  {
    id: 'saja_boys',
    key: 'saja_boys',
    aliases: ['saja', 'saja_boys'],
    label: '🕺 Saja Boys 狮男团 (5)',
    shortLabel: 'Saja Boys (5)',
    icon: '🕺',
    count: 5,
    characters: ['jinu', 'abby', 'mystery', 'romance', 'baby'],
  },
  {
    id: 'minhwa',
    key: 'minhwa',
    label: '🐯 民画福虎与喜鹊 (2)',
    shortLabel: '民画伙伴 (2)',
    icon: '🐯',
    count: 2,
    characters: ['derpy_tiger', 'sussie_magpie'],
  },
];

export const CHARACTERS = {
  rumi: HUNTRX_GIRLS_META.rumi,
  mira: HUNTRX_GIRLS_META.mira,
  zoey: HUNTRX_GIRLS_META.zoey,
  jinu: SAJA_BOYS_META.jinu,
  abby: SAJA_BOYS_META.abby,
  mystery: SAJA_BOYS_META.mystery,
  romance: SAJA_BOYS_META.romance,
  baby: SAJA_BOYS_META.baby,
  derpy_tiger: MINHWA_COMPANIONS_META.derpy_tiger,
  sussie_magpie: MINHWA_COMPANIONS_META.sussie_magpie,
};

// Backwards-compatible alias for any code referencing CRITTERS
export const CRITTERS = CHARACTERS;

/**
 * Normalizes a category filter key (`all`, `huntrx`, `saja_boys`, `saja`, `minhwa`).
 */
export function normalizeCategoryKey(cat = 'all') {
  const c = String(cat || 'all').trim().toLowerCase();
  if (c === 'saja' || c === 'saja_boys' || c === 'sajaboys') return 'saja_boys';
  if (c === 'huntrx' || c === 'huntrx_girls') return 'huntrx';
  if (c === 'minhwa' || c === 'minhwa_companions') return 'minhwa';
  return 'all';
}

/**
 * Returns the ordered array of character IDs matching a category tab (`all`, `huntrx`, `saja_boys`/`saja`, `minhwa`).
 */
export function getCharactersByCategory(cat = 'all') {
  const norm = normalizeCategoryKey(cat);
  if (norm === 'all') return [...CHARACTER_ORDER];
  return CHARACTER_ORDER.filter((id) => {
    const meta = CHARACTERS[id];
    return meta && normalizeCategoryKey(meta.category || meta.group) === norm;
  });
}

/**
 * Builds a character 3D `THREE.Group` by ID, guarantees bounding spheres are computed for raycasting,
 * clamps `metalness <= 0.22`, and attaches `.setForm(mode)`, `.getForm()`, and `.toggleForm()`.
 */
export function buildCharacter(id = 'rumi') {
  const meta = CHARACTERS[id] || CHARACTERS.rumi;
  const root = meta.build();
  root.name = meta.id;
  root.characterId = meta.id;
  root.displayName = meta.name;
  root.group = root;
  if (!root.userData.form) {
    root.userData.form = 'stage';
  }

  // Ensure every geometry has a computed boundingSphere so surface raycasting works immediately
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      if (!obj.geometry.boundingSphere) {
        obj.geometry.computeBoundingSphere();
      }
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m && typeof m.metalness === 'number' && m.metalness > MAX_METALNESS) {
          m.metalness = MAX_METALNESS;
        }
      }
    }
  });

  const origSetForm = typeof root.setForm === 'function' ? root.setForm.bind(root) : null;
  root.setForm = (mode = 'stage') => {
    const raw = String(mode || 'stage').toLowerCase();
    const norm = raw === 'awakened' || raw === 'demon' || raw === 'spirit' || raw === 'saja' ? 'awakened' : 'stage';
    if (origSetForm) {
      origSetForm(norm);
    } else {
      applyCharacterForm(root, norm);
    }
    root.userData.form = norm;
    return norm;
  };
  root.getForm = () => root.userData.form || 'stage';
  root.toggleForm = (forceMode) => {
    const next = forceMode
      ? forceMode
      : root.userData.form === 'awakened'
        ? 'stage'
        : 'awakened';
    return root.setForm(next);
  };

  return root;
}

export const buildCritter = buildCharacter;

/**
 * Switches a built character `root` between `'stage'` (`'idol'`) and `'awakened'` form.
 */
export function setCharacterForm(root, mode = 'stage') {
  if (!root) return 'stage';
  if (typeof root.setForm === 'function') {
    return root.setForm(mode);
  }
  return applyCharacterForm(root, mode);
}

/**
 * Programmatically builds and audits a character by ID, returning vertex count, triangle count,
 * max metalness, bounding box dimensions, parts list, signatureProp presence, and Dual Form verification.
 */
export function auditCharacter(id = 'rumi', existingRoot = null) {
  const meta = CHARACTERS[id] || CHARACTERS.rumi;
  const root = existingRoot || buildCharacter(meta.id);
  root.updateMatrixWorld(true);

  const stats = countCharacterStats(root);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Verify Dual Form transition
  const prevForm = root.userData.form || 'stage';
  setCharacterForm(root, 'stage');
  const stageForm = root.userData.form;
  setCharacterForm(root, 'awakened');
  const awakenedForm = root.userData.form;
  let awakenedVisibleCount = 0;
  root.traverse((o) => {
    if (o.visible) awakenedVisibleCount += 1;
  });
  setCharacterForm(root, prevForm);

  const p = root.parts || {};
  return {
    id: meta.id,
    name: meta.name,
    category: meta.category,
    group: meta.group,
    vertexCount: stats.vertexCount,
    vertices: stats.vertexCount,
    triangleCount: stats.triangleCount,
    triangles: stats.triangleCount,
    meshCount: stats.meshCount,
    maxMetalness: stats.maxMetalness,
    bbox: {
      width: Number(size.x.toFixed(3)),
      height: Number(size.y.toFixed(3)),
      depth: Number(size.z.toFixed(3)),
    },
    parts: Object.keys(p),
    hasSignatureProp: !!(p.signatureProp || root.getObjectByName('signatureProp')),
    hasDemonMarkSeal: !!(p.demonMarkSeal || root.getObjectByName('demonMarkSeal')),
    hasAuraGroup: !!(p.auraGroup || root.getObjectByName('auraGroup')),
    isFlowerpot: !!(p.signatureProp && p.signatureProp.userData && p.signatureProp.userData.isFlowerpot),
    dualForm: {
      stageForm,
      awakenedForm,
      awakenedVisibleCount,
    },
  };
}

export {
  MAX_METALNESS,
  registerDualForm,
  applyCharacterForm,
  countCharacterStats,
  HUNTRX_GIRLS_META,
  SAJA_BOYS_META,
  MINHWA_COMPANIONS_META,
  buildRumi,
  buildMira,
  buildZoey,
  buildJinu,
  buildAbby,
  buildMystery,
  buildRomance,
  buildBaby,
  buildDerpyTiger,
  buildSussieMagpie,
};
