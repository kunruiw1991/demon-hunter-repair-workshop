#!/usr/bin/env python3
"""Builds a gbrowser batch file that plays a full KPop Demon Hunters 3D repair visit.

Usage:
  python3 tests/make_batch.py <port> <char_id> <outdir> > /tmp/batch.json
  /google/bin/releases/gemini-agents-gbrowser/gbrowser --headless --width 1280 --height 800 \
    --no-proxy-server --clean-profile --timeout 300s batch @/tmp/batch.json
"""

import json
import sys

port = sys.argv[1] if len(sys.argv) > 1 else "18923"
critter = sys.argv[2] if len(sys.argv) > 2 else "rumi"
out = sys.argv[3] if len(sys.argv) > 3 else "/tmp/dh_e2e_out"

HARNESS = r"""
window.__errs = window.__errs || [];
window.addEventListener('error', (e) => __errs.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => __errs.push('rej:' + String(e.reason)));
window.__T = (() => {
  const cv = document.getElementById('gl');
  const ev = (t, x, y) => (t === 'pointerdown' ? cv : window).dispatchEvent(
    new PointerEvent(t, {
      clientX: x,
      clientY: y,
      bubbles: true,
      pointerId: 1,
      isPrimary: true,
      buttons: t === 'pointerup' ? 0 : 1,
    })
  );
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const TOOLFOR = {
    mud: 'sponge',
    wet: 'dryer',
    dust: 'brush',
    burr: 'tweezers',
    tear: 'needle',
    tangle: 'comb',
    patch: 'patch',
    eczema: 'moisture',
    wet_pants: 'diaper',
    demon_mark: 'honmoon_balm',
    braid_gat: 'needle',
    ear: 'needle',
    weapon_prop: 'polish',
    dull_weapon_flowerpot: 'polish',
    pendant: 'cloth',
    eye_gem: 'gem_replacer',
    missing_earmonitor_gem: 'gem_replacer',
    eye: 'button',
    flat_padding: 'cotton',
    flat: 'cotton',
    faded_outfit: 'airbrush',
    faded: 'paint',
    checkup: 'checkup',
  };
  const HOLD = {
    sponge: 1,
    dryer: 1,
    brush: 1,
    comb: 1,
    moisture: 1,
    honmoon_balm: 1,
    polish: 1,
    cloth: 1,
    airbrush: 1,
    paint: 1,
  };
  async function tap(x, y) {
    ev('pointerdown', x, y);
    await sleep(50);
    ev('pointerup', x, y);
  }
  async function hold(x, y, ms) {
    ev('pointerdown', x, y);
    const steps = Math.max(4, Math.floor(ms / 90));
    for (let k = 0; k < steps; k++) {
      ev('pointermove', x + (k % 2 ? 3 : -3), y);
      await sleep(90);
    }
    ev('pointerup', x, y);
  }
  async function testDualForm() {
    const R = window.__REPAIR3D__ || window.__GAME__;
    const btn = document.getElementById('formToggleBtn') || document.getElementById('formBtn');
    if (btn) btn.click();
    else if (R.toggleForm) R.toggleForm();
    await sleep(180);
    const f1 = typeof R.form === 'function' ? R.form() : R.form;
    if (btn) btn.click();
    else if (R.toggleForm) R.toggleForm();
    await sleep(180);
    const f2 = typeof R.form === 'function' ? R.form() : R.form;
    return { firstToggle: f1, secondToggle: f2 };
  }
  async function chargeFarts10() {
    const btn = document.getElementById('fartBtn');
    const counts = [];
    for (let i = 0; i < 10; i++) {
      btn.click();
      await sleep(50);
      counts.push(document.getElementById('fartCount').textContent.trim());
    }
    const megaReady =
      btn.classList.contains('mega') &&
      document.getElementById('fartCount').textContent.trim() === '10/10';
    return { counts: counts.join(','), megaReady };
  }
  async function fireMegaFart() {
    const R = window.__REPAIR3D__ || window.__GAME__;
    const btn = document.getElementById('fartBtn');
    btn.click();
    await sleep(320);
    const clouds = R.mushroomClouds ? R.mushroomClouds() : [];
    const hasMegaCloud = clouds.length > 0;
    const hasParts = clouds.some(
      (c) => c.getObjectByName('stem') && c.getObjectByName('cap') && c.getObjectByName('shockwave')
    );
    const resetCount = document.getElementById('fartCount').textContent.trim();
    return { hasMegaCloud, hasParts, resetCount };
  }
  async function fixAll(maxSteps) {
    const R = window.__REPAIR3D__ || window.__GAME__;
    const log = [];
    for (let s = 0; s < maxSteps && R.remaining() > 0; s++) {
      const ds = R.damages();
      const i = ds.findIndex((d) => !d.done);
      if (i < 0) break;
      const type = ds[i].type;
      const tool = (R.toolFor && R.toolFor(type)) || ds[i].tool || TOOLFOR[type];
      const isHold = R.isHoldTool ? R.isHoldTool(tool) : !!HOLD[tool];

      // Click chip if present to exercise UI chip-to-turntable rotation
      const chip = document.querySelector(`#chips .chip[data-k="${type}"]`);
      if (chip) chip.click();
      if (R.snapToDamage) {
        R.snapToDamage(i);
      } else {
        R.spinToDamage(i);
        await sleep(800);
      }
      R.selectTool(tool);
      await sleep(80);

      let p = R.screen(i);
      if (type === 'flat' || type === 'flat_padding' || type === 'faded' || type === 'faded_outfit') {
        p = R.critterScreen();
      }

      if (isHold) {
        await hold(p.x, p.y, 900);
        // Ensure deterministic completion on software WebGL frame rates
        for (let k = 0; k < 45 && !R.damages()[i].done; k++) {
          const q = (type === 'faded' || type === 'faded_outfit') ? R.critterScreen() : R.screen(i);
          if (R.holdTool) R.holdTool(q.x, q.y, 0.06);
        }
      } else if (type === 'flat' || type === 'flat_padding') {
        for (let k = 0; k < 5 && !R.damages()[i].done; k++) {
          const q = R.critterScreen();
          await tap(q.x, q.y);
          if (!R.damages()[i].done && R.tapTool) R.tapTool(q.x, q.y);
          await sleep(120);
        }
      } else if (type === 'tear' || type === 'patch') {
        for (let k = 0; k < 5 && !R.damages()[i].done; k++) {
          const q = R.screen(i);
          await tap(q.x, q.y);
          if (!R.damages()[i].done && R.tapTool) R.tapTool(q.x, q.y);
          await sleep(100);
        }
      } else {
        await tap(p.x, p.y);
        for (let k = 0; k < 4 && !R.damages()[i].done; k++) {
          const q = R.screen(i);
          if (R.tapTool) R.tapTool(q.x, q.y);
          await sleep(80);
        }
      }
      await sleep(120);
      log.push(type + (R.damages()[i].done ? ':ok' : ':NO'));
    }
    const fp = R.flowerpotState ? R.flowerpotState() : null;
    return (
      log.join(' ') +
      ' | remaining=' +
      R.remaining() +
      ' | hasDiaper=' +
      R.hasDiaper() +
      (fp && fp.present ? ' | flowerpotUpright=' + fp.upright : '')
    );
  }
  return { ev, sleep, tap, hold, testDualForm, chargeFarts10, fireMegaFart, fixAll };
})();
'harness';
"""

steps = [
    {"action": "navigate", "url": f"http://127.0.0.1:{port}/index.html", "waitUntil": "none"},
    {"action": "sleep", "duration": "2500ms"},
    {"action": "eval", "expression": HARNESS},
    {
        "action": "eval",
        "expression": (
            f"(() => {{ const R = window.__REPAIR3D__ || window.__GAME__;"
            f"const card = document.querySelector('.patient[data-k=\"{critter}\"]');"
            f"if (card) card.click(); else if (R.previewCritter) R.previewCritter('{critter}');"
            f"if (R.startVisit) R.startVisit({{ forceAllDamages: true }});"
            f"else document.getElementById('startBtn').click();"
            f"return 'started'; }})()"
        ),
    },
    {"action": "sleep", "duration": "2200ms"},
    {
        "action": "eval",
        "print": "true",
        "expression": (
            "JSON.stringify({"
            "st: (__REPAIR3D__||__GAME__).state,"
            "dmg: (__REPAIR3D__||__GAME__).damages().map(d=>d.type).join(','),"
            "verts: (__REPAIR3D__||__GAME__).vertexCount(),"
            "tris: (__REPAIR3D__||__GAME__).triangleCount ? (__REPAIR3D__||__GAME__).triangleCount() : 0"
            "})"
        ),
    },
    {"action": "screenshot", "file": f"{out}/{critter}_1_broken.png"},
    {
        "action": "eval",
        "print": "true",
        "expression": "(async()=>{const d=await __T.testDualForm();return JSON.stringify(d)})()",
    },
    {
        "action": "eval",
        "print": "true",
        "expression": "(async()=>{const f=await __T.chargeFarts10();return JSON.stringify(f)})()",
    },
    {"action": "screenshot", "file": f"{out}/{critter}_1a_fart10.png"},
    {
        "action": "eval",
        "print": "true",
        "expression": "(async()=>{const f=await __T.fireMegaFart();return JSON.stringify(f)})()",
    },
    {"action": "screenshot", "file": f"{out}/{critter}_1b_megafart.png"},
    {
        "action": "eval",
        "print": "true",
        "expression": "(async()=>{const r=await __T.fixAll(6);return r})()",
    },
    {"action": "screenshot", "file": f"{out}/{critter}_2_midway.png"},
    {
        "action": "eval",
        "print": "true",
        "expression": "(async()=>{const r=await __T.fixAll(8);return r})()",
    },
    {
        "action": "eval",
        "print": "true",
        "expression": "(async()=>{const r=await __T.fixAll(8);return r})()",
    },
    {
        "action": "eval",
        "print": "true",
        "expression": "(async()=>{const r=await __T.fixAll(15);return r})()",
    },
    {
        "action": "eval",
        "print": "true",
        "expression": (
            "(async()=>{await __T.sleep(400);const R=__REPAIR3D__||__GAME__;"
            "R.selectTool('heart');const c=R.critterScreen();await __T.tap(c.x,c.y);"
            "if(R.state!=='awake'&&R.state!=='waking'&&R.tapTool)R.tapTool(c.x,c.y);"
            "for(let w=0;w<40&&R.state!=='awake';w++)await __T.sleep(150);"
            "return 'state='+R.state})()"
        ),
    },
    {"action": "screenshot", "file": f"{out}/{critter}_3_awake.png"},
    {
        "action": "eval",
        "print": "true",
        "expression": (
            "(async()=>{for(let w=0;w<30&&document.querySelectorAll('#dressItems .tool').length===0;w++)await __T.sleep(150);"
            "const it=[...document.querySelectorAll('#dressItems .tool')];"
            "it[0]&&it[0].click();it[1]&&it[1].click();"
            "await __T.sleep(500);return 'dress items='+it.length})()"
        ),
    },
    {"action": "screenshot", "file": f"{out}/{critter}_4_dress.png"},
    {
        "action": "eval",
        "print": "true",
        "expression": (
            "(async()=>{document.getElementById('shelfBtn').click();"
            "for(let w=0;w<40&&document.getElementById('endVeil').classList.contains('hidden');w++)await __T.sleep(150);"
            "const saved=localStorage.getItem('demonHunterRepair3D_v1')||localStorage.getItem('critterRepair3D_v1');"
            "return 'endVeil='+!document.getElementById('endVeil').classList.contains('hidden')+' save='+saved})()"
        ),
    },
    {"action": "screenshot", "file": f"{out}/{critter}_5_card.png"},
    {
        "action": "eval",
        "print": "true",
        "expression": (
            "(async()=>{document.getElementById('nextBtn').click();await __T.sleep(800);"
            "return 'state='+(__REPAIR3D__||__GAME__).state+' errs='+JSON.stringify(__errs)})()"
        ),
    },
    {"action": "screenshot", "file": f"{out}/{critter}_6_home_shelf.png"},
]

print(json.dumps(steps, indent=1))
