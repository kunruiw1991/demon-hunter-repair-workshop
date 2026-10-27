#!/usr/bin/env python3
"""Master E2E Verification Runner for KPop Demon Hunters Repair Workshop 3D.

Starts a local HTTP server, executes Tiers 1-4 across all 10 characters and responsive
viewports (1280x800, 1024x768, 390x844) via headless Chrome (gbrowser), prints a clear
pass/fail summary table, and exits 0 iff 100% of checks pass.

Usage:
  python3 tests/verify_all.py
"""

import json
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audit_scene

GBROWSER = audit_scene.GBROWSER
CANONICAL_CHARS = audit_scene.CANONICAL_CHARS

# NOTE: ChromeDriver enforces a hard 30 s script timeout per `eval`, so the Tier 2 checks and each of the
# 10 character playthroughs run as separate eval steps (results are returned per step and merged in Python).
HARNESS_JS = r"""
  window.__errs = window.__errs || [];
  if (!window.__errListeners) {
    window.__errListeners = true;
    window.addEventListener('error', (e) => __errs.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => __errs.push('rej:' + String(e.reason)));
  }
  const R = window.__REPAIR3D__ || window.__GAME__;
  if (!R) return JSON.stringify({ fatal: 'Missing window.__REPAIR3D__ / window.__GAME__' });

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
"""

TIER2_JS = r"""
(async () => {
""" + HARNESS_JS + r"""
  // --- Tier 1 UI & Audio Controls Check ---
  const voicePreviewBtn = document.getElementById('voicePreviewBtn');
  if (voicePreviewBtn) voicePreviewBtn.click();
  await sleep(100);

  // --- Tier 2 Boundary & Corner Cases ---
  // 2.1 Pause / Resume / Stop state transitions
  const rCard = document.querySelector('.patient[data-k="rumi"]');
  if (rCard) rCard.click();
  if (R.startVisit) R.startVisit({ forceAllDamages: true });
  else document.getElementById('startBtn').click();
  await sleep(250);

  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const pauseVeil = document.getElementById('pauseVeil');

  let pauseResumeStopOk = false;
  if (pauseBtn && resumeBtn && stopBtn && pauseVeil) {
    pauseBtn.click();
    await sleep(80);
    const pausedVisible = !pauseVeil.classList.contains('hidden');
    resumeBtn.click();
    await sleep(80);
    const resumedHidden = pauseVeil.classList.contains('hidden') && R.state === 'repair';
    stopBtn.click();
    await sleep(120);
    const stoppedHome = R.state === 'home';
    pauseResumeStopOk = pausedVisible && resumedHidden && stoppedHome;
  }

  // 2.2 Wrong-tool rejection + Fart 22-press multi-cycle wrap-around + Rapid Dual Form toggle
  if (rCard) rCard.click();
  if (R.startVisit) R.startVisit({ forceAllDamages: true });
  else document.getElementById('startBtn').click();
  await sleep(250);

  // Wrong tool test: select 'tweezers' for a 'mud' or 'eczema' damage and verify it does not complete
  const firstHoldIdx = R.damages().findIndex((d) => d.type === 'mud' || d.type === 'eczema');
  let wrongToolRejected = true;
  if (firstHoldIdx >= 0) {
    if (R.snapToDamage) R.snapToDamage(firstHoldIdx);
    R.selectTool('tweezers');
    const pt = R.screen(firstHoldIdx);
    if (R.tapTool) R.tapTool(pt.x, pt.y);
    if (R.holdTool) R.holdTool(pt.x, pt.y, 0.1);
    wrongToolRejected = !R.damages()[firstHoldIdx].done;
  }

  // Fart 22-press multi-cycle test (charges 1..10, fires #1 on 11, charges 12..21, fires #2 on 22)
  const fartBtn = document.getElementById('fartBtn');
  const fartCountEl = document.getElementById('fartCount');
  let cycle1MegaReady = false;
  let cycle1Fired = false;
  let cycle2MegaReady = false;
  let cycle2Fired = false;
  if (fartBtn && fartCountEl) {
    for (let i = 1; i <= 10; i++) fartBtn.click();
    cycle1MegaReady = fartBtn.classList.contains('mega') && fartCountEl.textContent.trim() === '10/10';
    fartBtn.click(); // 11th press
    const clouds1 = R.mushroomClouds ? R.mushroomClouds() : [];
    cycle1Fired =
      fartCountEl.textContent.trim() === '0/10' &&
      clouds1.length > 0 &&
      clouds1.some((c) => c.getObjectByName('stem') && c.getObjectByName('cap') && c.getObjectByName('shockwave'));

    for (let i = 1; i <= 10; i++) fartBtn.click();
    cycle2MegaReady = fartBtn.classList.contains('mega') && fartCountEl.textContent.trim() === '10/10';
    fartBtn.click(); // 22nd press
    cycle2Fired = fartCountEl.textContent.trim() === '0/10' && (R.mushroomClouds ? R.mushroomClouds().length > 0 : false);
  }
  const fartMultiCycleOk = cycle1MegaReady && cycle1Fired && cycle2MegaReady && cycle2Fired;

  // Rapid Dual Form toggle (6 times in a row during repair)
  const formBtn = document.getElementById('formToggleBtn') || document.getElementById('formBtn');
  const formSeq = [];
  for (let k = 0; k < 6; k++) {
    if (formBtn) formBtn.click();
    else if (R.toggleForm) R.toggleForm();
    formSeq.push(typeof R.form === 'function' ? R.form() : R.form);
  }
  const rapidDualFormOk =
    formSeq.includes('awakened') &&
    (formSeq.includes('stage') || formSeq.includes('idol')) &&
    R.remaining() > 0;

  // Return to home cleanly before running all 10 character full playthroughs
  if (stopBtn) stopBtn.click();
  await sleep(100);

  return JSON.stringify({
    errs: window.__errs,
    tier2: {
      pauseResumeStopOk,
      wrongToolRejected,
      fartMultiCycleOk,
      rapidDualFormOk,
    },
  });
})()
"""

# --- Tier 3 & Tier 4: Exhaustive Full Playthrough, one character per eval step (`%s` = character id) ---
PLAYTHROUGH_ONE_JS = r"""
(async () => {
""" + HARNESS_JS + r"""
  const id = '%s';
  const card = document.querySelector(`.patient[data-k="${id}"]`);
  if (card) card.click();
  else if (R.previewCritter) R.previewCritter(id);

  if (R.startVisit) R.startVisit({ forceAllDamages: true });
  else document.getElementById('startBtn').click();
  await sleep(120);

  // Check initial Derpy flowerpot state before polishing
  const initialFp = id === 'derpy_tiger' && R.flowerpotState ? R.flowerpotState() : null;
  const initialDmgTypes = R.damages().map((d) => d.type);

  // Toggle Dual Form to 'awakened' mid-visit to test Tier 3 cross-feature repair in Awakened Form
  if (R.setForm) R.setForm('awakened');
  else if (R.toggleForm) R.toggleForm('awakened');

  const repairedTypes = [];
  for (let step = 0; step < 120 && R.remaining() > 0; step++) {
    const ds = R.damages();
    const idx = ds.findIndex((d) => !d.done);
    if (idx < 0) break;
    const d = ds[idx];
    const type = d.type;
    const tool = (R.toolFor && R.toolFor(type)) || d.tool || TOOLFOR[type];
    const isHold = R.isHoldTool ? R.isHoldTool(tool) : !!HOLD[tool];

    if (R.snapToDamage) R.snapToDamage(idx);
    else R.spinToDamage(idx);

    R.selectTool(tool);

    for (let n = 0; n < 90 && !R.damages()[idx].done; n++) {
      const useTorso =
        d.body || type === 'flat' || type === 'flat_padding' || type === 'faded' || type === 'faded_outfit';
      const pos = useTorso ? R.critterScreen() : R.screen(idx);
      if (isHold) {
        R.holdTool(pos.x, pos.y, 0.06);
      } else {
        R.tapTool(pos.x, pos.y);
      }
    }
    if (R.damages()[idx].done) {
      repairedTypes.push(type);
    } else {
      break;
    }
  }

  const remainingAfterFix = R.remaining();
  const hasDiaper = R.hasDiaper();
  const finalFp = id === 'derpy_tiger' && R.flowerpotState ? R.flowerpotState() : null;

  // Restore Stage Form and verify diaper/repairs remain intact
  if (R.setForm) R.setForm('stage');
  else if (R.toggleForm) R.toggleForm('stage');
  const hasDiaperInStage = R.hasDiaper();

  // Wake up with Golden Honmoon 'heart' tool
  const heartBtn = document.querySelector('#tools [data-t="heart"]');
  const heartAvailable = !!heartBtn;
  R.selectTool('heart');
  const cPos = R.critterScreen();
  R.tapTool(cPos.x, cPos.y);

  for (let w = 0; w < 40 && R.state !== 'awake'; w++) {
    await sleep(60);
  }
  const reachedAwake = R.state === 'awake';

  // Equip 2 dress-up accessories
  const dressBtns = [...document.querySelectorAll('#dressItems .tool')];
  if (dressBtns[0]) dressBtns[0].click();
  if (dressBtns[1]) dressBtns[1].click();
  await sleep(60);

  // Open Photo Card & Save to Honmoon Showcase Stage
  const shelfBtn = document.getElementById('shelfBtn');
  if (shelfBtn) shelfBtn.click();
  for (let w = 0; w < 30 && document.getElementById('endVeil').classList.contains('hidden'); w++) {
    await sleep(60);
  }
  const endVeilShown = !document.getElementById('endVeil').classList.contains('hidden');

  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) nextBtn.click();
  await sleep(80);

  const savedState = R.save ? R.save() : {};
  const fixedCount = (savedState.fixed && savedState.fixed[id]) || 0;

  return JSON.stringify({
    playthroughId: id,
    errs: window.__errs,
    result: {
      initialDmgCount: initialDmgTypes.length,
      repairedCount: repairedTypes.length,
      repairedTypes,
      remainingAfterFix,
      hasDiaper: hasDiaper && hasDiaperInStage,
      heartAvailable,
      reachedAwake,
      dressItemCount: dressBtns.length,
      endVeilShown,
      returnedHome: R.state === 'home',
      fixedCount,
      initialFp,
      finalFp,
    },
  });
})()
"""

# Test Tier 2.6: Corrupted / unknown character ID in localStorage sanitization (before reload)
STORAGE_SANITIZE_JS = r"""
(() => {
  const R = window.__REPAIR3D__ || window.__GAME__;
  const storageKeys = ['demonHunterRepair3D_v1', 'critterRepair3D_v1'];
  for (const k of storageKeys) {
    const raw = localStorage.getItem(k);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.shelf)) {
          parsed.shelf.push({ id: 'invalid_phantom_critter_999', acc: ['nonexistent_hat'] });
          localStorage.setItem(k, JSON.stringify(parsed));
        }
      } catch (e) {}
    }
  }
  return JSON.stringify({
    sanitizeInjected: true,
    errs: window.__errs || [],
    shelfLengthBeforeReload: (R && R.save && R.save().shelf) ? R.save().shelf.length : 0,
  });
})()
"""

RELOAD_VERIFY_JS = r"""
(() => {
  const R = window.__REPAIR3D__ || window.__GAME__;
  if (!R) return JSON.stringify({ ok: false });
  const sv = R.save ? R.save() : {};
  const shelf = Array.isArray(sv.shelf) ? sv.shelf : [];
  const hasInvalid = shelf.some((e) => e && e.id === 'invalid_phantom_critter_999');
  return JSON.stringify({
    ok: !hasInvalid && shelf.length >= 6,
    shelfLength: shelf.length,
    hasInvalid,
    fixedKeys: Object.keys(sv.fixed || {}),
  });
})()
"""

VIEWPORT_CHECK_JS = r"""
(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cards = [...document.querySelectorAll('#patients .patient')];
  const overflowCards = [];
  for (const c of cards) {
    const r = c.getBoundingClientRect();
    if (r.width === 0 || r.left < -2 || r.right > vw + 2) {
      overflowCards.push({ id: c.getAttribute('data-k'), left: Math.round(r.left), right: Math.round(r.right), vw });
    }
  }
  const docOverflow = document.documentElement.scrollWidth > vw + 4;
  return JSON.stringify({
    vw,
    vh,
    cardCount: cards.length,
    overflowCards,
    docOverflow,
    ok: cards.length === 10 && overflowCards.length === 0 && !docOverflow,
  });
})()
"""


def run_gbrowser_batch(steps, width=1280, height=800, timeout="240s"):
  with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
    json.dump(steps, f, indent=2)
    batch_path = f.name
  try:
    cmd = [
        GBROWSER,
        "--headless",
        "--width",
        str(width),
        "--height",
        str(height),
        "--no-proxy-server",
        "--clean-profile",
        "--timeout",
        timeout,
        "batch",
        f"@{batch_path}",
    ]
    return subprocess.run(cmd, capture_output=True, text=True, check=False)
  finally:
    if os.path.exists(batch_path):
      os.remove(batch_path)


def parse_json_lines(stdout_text):
  objs = []
  for line in stdout_text.splitlines():
    s = line.strip()
    # Current gbrowser builds prefix printed eval results with "Eval Result: ".
    if s.startswith("Eval Result:"):
      s = s[len("Eval Result:"):].strip()
    if s.startswith("{") and s.endswith("}"):
      try:
        objs.append(json.loads(s))
      except Exception:
        pass
    elif s.startswith('"{') and s.endswith('}"'):
      try:
        objs.append(json.loads(json.loads(s)))
      except Exception:
        pass
  return objs


def main():
  port = audit_scene.find_free_port()
  server = audit_scene.start_local_server(port)
  out_dir = tempfile.mkdtemp(prefix="dh_verify_all_")
  results_table = []

  try:
    # 1. Run Tier 1 Scene-Graph, Category Tabs, Dual Form & Voice Clips Audit
    t1_ok, t1_res = audit_scene.run_scene_audit(port=port, out_dir=out_dir)
    results_table.append((
        "Tier 1: 3D Scene-Graph (10 Chars >=15k verts / >=25k tris / metal<=0.22), 4 Tabs, Dual Form & Voices",
        t1_ok,
        "PASS" if t1_ok else "; ".join(t1_res.get("failures", ["Failed"])[:3]),
    ))

    # 2. Run Tier 2 Boundary Cases + Tier 3 Cross-Feature + Tier 4 All-10-Characters Playthroughs
    #    (one eval step per character: ChromeDriver kills any single eval that runs longer than 30 s)
    steps = [
        {"action": "navigate", "url": f"http://127.0.0.1:{port}/index.html", "waitUntil": "none"},
        {"action": "sleep", "duration": "2200ms"},
        {"action": "eval", "print": "true", "expression": TIER2_JS},
    ]
    for cid in CANONICAL_CHARS:
      steps.append({"action": "eval", "print": "true", "expression": PLAYTHROUGH_ONE_JS % cid})
    steps.extend([
        {"action": "eval", "print": "true", "expression": STORAGE_SANITIZE_JS},
        {"action": "navigate", "url": f"http://127.0.0.1:{port}/index.html", "waitUntil": "none"},
        {"action": "sleep", "duration": "1500ms"},
        {"action": "eval", "print": "true", "expression": RELOAD_VERIFY_JS},
    ])
    proc = run_gbrowser_batch(steps, width=1280, height=800, timeout="600s")
    with open(os.path.join(out_dir, "playthrough_gbrowser_stdout.txt"), "w", encoding="utf-8") as f:
      f.write(proc.stdout)
      f.write("\n--- stderr ---\n")
      f.write(proc.stderr)
    objs = parse_json_lines(proc.stdout)

    tier2_payload = next((o for o in objs if "tier2" in o or "fatal" in o), None)
    reload_payload = next((o for o in objs if "shelfLength" in o), None)
    pt_payloads = {o["playthroughId"]: o for o in objs if "playthroughId" in o}
    all_errs = []
    for o in objs:
      errs = o.get("errs")
      if isinstance(errs, list) and len(errs) > len(all_errs):
        all_errs = errs
    main_payload = None
    if tier2_payload and not tier2_payload.get("fatal"):
      main_payload = {
          "errs": all_errs,
          "tier2": tier2_payload.get("tier2", {}),
          "playthroughs": {cid: o.get("result", {}) for cid, o in pt_payloads.items()},
      }
    elif tier2_payload:
      main_payload = tier2_payload

    if not main_payload or main_payload.get("fatal"):
      msg = main_payload.get("fatal") if main_payload else f"gbrowser rc={proc.returncode} (no Tier 2 payload; see {out_dir}/playthrough_gbrowser_stdout.txt)"
      results_table.append(("Tier 2: Boundary & Corner Cases", False, msg))
      results_table.append(("Tier 3: Pairwise Cross-Feature Interactions", False, msg))
      results_table.append(("Tier 4: Full Playthroughs Across All 10 Characters", False, msg))
    else:
      t2 = main_payload.get("tier2", {})
      t2_ok = (
          bool(t2.get("pauseResumeStopOk"))
          and bool(t2.get("wrongToolRejected"))
          and bool(t2.get("fartMultiCycleOk"))
          and bool(t2.get("rapidDualFormOk"))
          and bool(reload_payload and reload_payload.get("ok"))
          and len(main_payload.get("errs", [])) == 0
      )
      results_table.append((
          "Tier 2: Wrong-Tool, 22-Press Fart Wrap, Rapid Dual Form, Pause/Resume/Stop, Storage Sanitization",
          t2_ok,
          "PASS" if t2_ok else f"t2={t2}, reload={reload_payload}, errs={main_payload.get('errs')}",
      ))

      pts = main_payload.get("playthroughs", {})
      t4_failures = []
      for cid in CANONICAL_CHARS:
        p = pts.get(cid)
        if not p:
          t4_failures.append(f"{cid}:missing")
          continue
        if p.get("remainingAfterFix") != 0:
          t4_failures.append(f"{cid}:remaining={p.get('remainingAfterFix')}")
        if not p.get("hasDiaper"):
          t4_failures.append(f"{cid}:noDiaper")
        if not p.get("reachedAwake"):
          t4_failures.append(f"{cid}:notAwake")
        if p.get("dressItemCount", 0) < 6:
          t4_failures.append(f"{cid}:dressItems={p.get('dressItemCount')}")
        if not p.get("endVeilShown") or not p.get("returnedHome") or p.get("fixedCount", 0) < 1:
          t4_failures.append(f"{cid}:cardOrSaveFailed")
        # Check signature repairs were exercised
        rtypes = set(p.get("repairedTypes", []))
        for req in ["mud", "wet", "dust", "burr", "tear", "tangle", "patch", "eczema", "wet_pants", "demon_mark", "checkup"]:
          if req not in rtypes:
            t4_failures.append(f"{cid}:missed_{req}")
        if cid == "derpy_tiger":
          fp0 = p.get("initialFp") or {}
          fp1 = p.get("finalFp") or {}
          if not fp1.get("upright") or fp0.get("upright") is True:
            t4_failures.append(f"derpy_tiger:flowerpot(init={fp0},final={fp1})")

      t3_ok = len(t4_failures) == 0 and bool(reload_payload and reload_payload.get("ok"))
      results_table.append((
          "Tier 3: Pairwise Cross-Feature (Awakened Repair + 3D Diaper + Flowerpot + Showcase Reload)",
          t3_ok,
          "PASS" if t3_ok else "; ".join(t4_failures[:4]),
      ))
      results_table.append((
          "Tier 4: Full Playthroughs Across All 10 Characters (HUNTR/X, Saja Boys, Derpy & Sussie)",
          len(t4_failures) == 0,
          "PASS (10/10 characters)" if not t4_failures else "; ".join(t4_failures[:4]),
      ))

    # 3. Responsive Viewports Check (1024x768 iPad Landscape & 390x844 Mobile Portrait)
    for vw, vh, label in [(1024, 768, "iPad Landscape 1024x768"), (390, 844, "Mobile Portrait 390x844")]:
      v_steps = [
          {"action": "navigate", "url": f"http://127.0.0.1:{port}/index.html", "waitUntil": "none"},
          {"action": "sleep", "duration": "1500ms"},
          {"action": "eval", "print": "true", "expression": VIEWPORT_CHECK_JS},
          {"action": "screenshot", "file": os.path.join(out_dir, f"viewport_{vw}x{vh}.png")},
      ]
      v_proc = run_gbrowser_batch(v_steps, width=vw, height=vh, timeout="90s")
      v_objs = parse_json_lines(v_proc.stdout)
      v_res = next((o for o in v_objs if "cardCount" in o), None)
      v_ok = bool(v_res and v_res.get("ok"))
      results_table.append((
          f"Responsive Viewport Layout ({label})",
          v_ok,
          "PASS" if v_ok else f"Failed: {v_res}",
      ))

    # Print formatted summary table
    print("\n" + "=" * 96)
    print(" KPOP DEMON HUNTERS REPAIR WORKSHOP 3D — MASTER E2E VERIFICATION REPORT")
    print("=" * 96)
    all_passed = True
    for name, ok, detail in results_table:
      status = "PASS" if ok else "FAIL"
      if not ok:
        all_passed = False
      print(f"[{status:4s}] {name:72s} | {detail}")
    print("=" * 96)
    print(f"Artifacts & Screenshots Directory: {out_dir}\n")

    if not all_passed:
      sys.exit(1)
    sys.exit(0)
  finally:
    server.shutdown()


if __name__ == "__main__":
  main()
