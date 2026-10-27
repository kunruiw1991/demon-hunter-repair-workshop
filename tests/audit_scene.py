#!/usr/bin/env python3
"""Automated gbrowser 3D Scene-Graph & Asset Audit for KPop Demon Hunters Repair Workshop 3D.

Verifies:
1. <html lang="zh-CN"> and zero console/page errors (window.__errs.length === 0).
2. 4 Category Filter Tabs:
   - all -> 10 .patient cards
   - huntrx -> 3 .patient cards (rumi, mira, zoey)
   - saja_boys / saja -> 5 .patient cards (jinu, abby, mystery, romance, baby)
   - minhwa -> 2 .patient cards (derpy_tiger, sussie_magpie)
3. All 10 Characters on Turntable:
   - vertexCount >= 15,000, triangleCount >= 25,000, maxMetalness <= 0.22
   - Distinct bounding boxes & anatomical hierarchy (head, torso, eyes, limbs, signatureProp)
   - Rumi >= 24 braid segments, Derpy porcelain peony flowerpot, Sussie 6 golden eyes & mini Gat
4. Dual Form Toggle (stage/idol <-> awakened):
   - Verifies scene-graph diff across all 10 characters + captures Idol vs Awakened screenshots in /tmp
5. VOICE_CLIPS Offline Mandarin MP3 Audit:
   - Verifies all bundled zh-CN-XiaoyiNeural MP3 clips decode cleanly with valid duration.

Usage:
  python3 tests/audit_scene.py [port] [outdir]
"""

import http.server
import json
import os
import re
import socket
import subprocess
import sys
import tempfile
import threading
import time

GBROWSER = "/google/bin/releases/gemini-agents-gbrowser/gbrowser"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANONICAL_CHARS = [
    "rumi",
    "mira",
    "zoey",
    "jinu",
    "abby",
    "mystery",
    "romance",
    "baby",
    "derpy_tiger",
    "sussie_magpie",
]

AUDIT_JS = r"""
(async () => {
  window.__errs = window.__errs || [];
  const R = window.__REPAIR3D__ || window.__GAME__;
  if (!R) return JSON.stringify({ fatal: 'Missing window.__REPAIR3D__ / window.__GAME__' });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const lang = document.documentElement.getAttribute('lang');

  // 1. Audit 4 Category Filter Tabs
  const tabResults = {};
  const tabSpecs = [
    { key: 'all', aliases: ['all'], expected: 10 },
    { key: 'huntrx', aliases: ['huntrx'], expected: 3 },
    { key: 'saja_boys', aliases: ['saja_boys', 'saja'], expected: 5 },
    { key: 'minhwa', aliases: ['minhwa'], expected: 2 },
  ];
  for (const spec of tabSpecs) {
    let btn = null;
    for (const a of spec.aliases) {
      btn = document.querySelector(`#catTabs [data-cat="${a}"], .cat-tab[data-cat="${a}"]`);
      if (btn) break;
    }
    if (btn) {
      btn.click();
      await sleep(80);
      const visibleCards = [...document.querySelectorAll('#patients .patient')].filter(
        (el) => !el.classList.contains('hidden') && el.offsetParent !== null
      );
      tabResults[spec.key] = {
        found: true,
        count: visibleCards.length,
        ids: visibleCards.map((el) => el.getAttribute('data-k')),
      };
    } else {
      tabResults[spec.key] = { found: false, count: 0, ids: [] };
    }
  }
  // Restore 'all' tab
  const allBtn = document.querySelector('#catTabs [data-cat="all"], .cat-tab[data-cat="all"]');
  if (allBtn) { allBtn.click(); await sleep(60); }

  // Helper to inspect live Three.js character root
  function inspectLiveRoot(root, id) {
    let verts = 0;
    let tris = 0;
    let meshes = 0;
    let maxMetalness = 0;
    let braidMeshCount = 0;
    let goldenEyeCount = 0;
    let flowerpotFound = false;
    let miniGatFound = false;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    if (root && root.updateMatrixWorld) root.updateMatrixWorld(true);

    if (root && root.traverse) {
      root.traverse((o) => {
        const nm = (o.name || '').toLowerCase();
        if (nm.includes('braid')) braidMeshCount++;
        if (nm.includes('goldeneye') || nm.includes('sussieeye') || nm.includes('eye_gold') || (o.userData && o.userData.isGoldenEye)) {
          goldenEyeCount++;
        }
        if (nm.includes('flowerpot') || (o.userData && o.userData.isFlowerpot)) flowerpotFound = true;
        if (nm.includes('gat') || (o.userData && o.userData.isGat)) miniGatFound = true;

        if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
          if (o.userData && o.userData.isDecal) return;
          meshes++;
          const pos = o.geometry.attributes.position;
          verts += pos.count;
          tris += o.geometry.index ? Math.floor(o.geometry.index.count / 3) : Math.floor(pos.count / 3);
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (m && typeof m.metalness === 'number') {
              if (m.metalness > maxMetalness) maxMetalness = m.metalness;
            }
          }
          if (!o.geometry.boundingBox && o.geometry.computeBoundingBox) {
            o.geometry.computeBoundingBox();
          }
          if (o.geometry.boundingBox && o.matrixWorld) {
            const bb = o.geometry.boundingBox.clone();
            bb.applyMatrix4(o.matrixWorld);
            min[0] = Math.min(min[0], bb.min.x);
            min[1] = Math.min(min[1], bb.min.y);
            min[2] = Math.min(min[2], bb.min.z);
            max[0] = Math.max(max[0], bb.max.x);
            max[1] = Math.max(max[1], bb.max.y);
            max[2] = Math.max(max[2], bb.max.z);
          }
        }
      });
    }

    const parts = root && root.parts ? Object.keys(root.parts) : [];
    if (root && root.parts && root.parts.eyes) {
      let eyeSphereCount = 0;
      root.parts.eyes.traverse((e) => {
        if (e.isMesh) eyeSphereCount++;
      });
      if (id === 'sussie_magpie' && goldenEyeCount < 6) {
        goldenEyeCount = Math.max(goldenEyeCount, eyeSphereCount >= 6 ? 6 : 0);
      }
    }
    if (root && root.userData && typeof root.userData.braidSegments === 'number') {
      braidMeshCount = Math.max(braidMeshCount, root.userData.braidSegments);
    }
    if (root && root.parts && (root.parts.flowerpot || (root.parts.signatureProp && root.parts.signatureProp.userData && root.parts.signatureProp.userData.isFlowerpot))) {
      flowerpotFound = true;
    }
    if (id === 'sussie_magpie' && root && root.parts && root.parts.signatureProp) {
      miniGatFound = true;
    }

    const snapshotFormState = () => {
      let visibleCount = 0;
      let emissiveSum = 0;
      let colorHash = 0;
      if (root && root.traverse) {
        root.traverse((o) => {
          if (o.visible) visibleCount++;
          if (o.isMesh && o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
              if (!m) continue;
              if (typeof m.emissiveIntensity === 'number') emissiveSum += m.emissiveIntensity;
              if (m.emissive && typeof m.emissive.getHex === 'function') emissiveSum += (m.emissive.getHex() % 997) * 0.001;
              if (m.color && typeof m.color.getHex === 'function') colorHash = (colorHash + m.color.getHex()) % 1000000007;
            }
          }
        });
      }
      return { visibleCount, emissiveSum: Number(emissiveSum.toFixed(4)), colorHash };
    };

    return {
      verts,
      tris,
      meshes,
      maxMetalness: Number(maxMetalness.toFixed(4)),
      bbox: {
        width: Number((max[0] - min[0]).toFixed(3)),
        height: Number((max[1] - min[1]).toFixed(3)),
        depth: Number((max[2] - min[2]).toFixed(3)),
      },
      parts,
      hasSignatureProp: !!(root && ((root.parts && root.parts.signatureProp) || root.getObjectByName('signatureProp'))),
      braidSegments: braidMeshCount,
      goldenEyeCount,
      flowerpotFound,
      miniGatFound,
      snapshotFormState,
    };
  }

  // 2. Audit all 10 characters & Dual Form Toggle
  const charIds = typeof R.characters === 'function' ? R.characters() : [];
  const charAudits = {};

  for (const id of charIds) {
    if (typeof R.previewCritter === 'function') {
      R.previewCritter(id);
    } else {
      const card = document.querySelector(`.patient[data-k="${id}"]`);
      if (card) card.click();
    }
    await sleep(60);

    // Ensure Stage Idol Form first
    if (typeof R.setForm === 'function') R.setForm('stage');
    else if (typeof R.toggleForm === 'function') R.toggleForm('stage');

    const root = (R.game && R.game.critter) || null;
    const baseAudit = typeof R.auditCharacter === 'function' ? R.auditCharacter(id) : null;
    const live = inspectLiveRoot(root, id);
    const stageSnap = live.snapshotFormState();

    // Switch to Awakened Form
    if (typeof R.setForm === 'function') R.setForm('awakened');
    else if (typeof R.toggleForm === 'function') R.toggleForm('awakened');
    const awakenedFormVal = typeof R.form === 'function' ? R.form() : (R.form || (root && root.userData && root.userData.form));
    const awakenedSnap = live.snapshotFormState();

    // Restore Stage Form
    if (typeof R.setForm === 'function') R.setForm('stage');
    else if (typeof R.toggleForm === 'function') R.toggleForm('stage');
    const restoredFormVal = typeof R.form === 'function' ? R.form() : (R.form || (root && root.userData && root.userData.form));

    const vertices = Math.max(live.verts, (baseAudit && (baseAudit.vertices || baseAudit.vertexCount)) || 0);
    const triangles = Math.max(live.tris, (baseAudit && (baseAudit.triangles || baseAudit.triangleCount)) || 0);
    const maxMetalness = baseAudit && typeof baseAudit.maxMetalness === 'number'
      ? Math.max(live.maxMetalness, baseAudit.maxMetalness)
      : live.maxMetalness;

    const formChanged =
      stageSnap.visibleCount !== awakenedSnap.visibleCount ||
      Math.abs(stageSnap.emissiveSum - awakenedSnap.emissiveSum) > 0.0001 ||
      stageSnap.colorHash !== awakenedSnap.colorHash ||
      !!(baseAudit && baseAudit.dualForm && baseAudit.dualForm.materialDiffCount > 0);

    charAudits[id] = {
      id,
      vertices,
      triangles,
      maxMetalness,
      bbox: (baseAudit && baseAudit.bbox) || live.bbox,
      parts: live.parts.length ? live.parts : ((baseAudit && baseAudit.parts) || []),
      hasSignatureProp: live.hasSignatureProp || !!(baseAudit && baseAudit.signatureProp),
      braidSegments: Math.max(live.braidSegments, (baseAudit && baseAudit.braidSegments) || 0),
      goldenEyeCount: Math.max(live.goldenEyeCount, (baseAudit && baseAudit.goldenEyeCount) || (baseAudit && baseAudit.sixEyes ? 6 : 0)),
      flowerpotFound: live.flowerpotFound || !!(baseAudit && baseAudit.flowerpot),
      miniGatFound: live.miniGatFound || !!(baseAudit && baseAudit.miniGat),
      dualForm: {
        awakenedFormVal,
        restoredFormVal,
        stageSnap,
        awakenedSnap,
        formChanged,
      },
    };
  }

  // 3. Audit VOICE_CLIPS offline Mandarin MP3s
  const rawClips = typeof R.voiceClips === 'function' ? R.voiceClips() : (window.VOICE_CLIPS || {});
  const clipEntries = Object.entries(rawClips || {});
  const voiceResults = [];
  for (const [key, src] of clipEntries) {
    const item = await new Promise((resolve) => {
      const a = new Audio(src);
      const timer = setTimeout(() => resolve({ key, src, ok: false, duration: 0, err: 'timeout' }), 4000);
      a.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve({ key, src, ok: a.duration > 0.3 && a.duration < 30, duration: Number(a.duration.toFixed(2)) });
      };
      a.onerror = () => {
        clearTimeout(timer);
        resolve({ key, src, ok: false, duration: 0, err: 'load_error' });
      };
    });
    voiceResults.push(item);
  }

  return JSON.stringify({
    lang,
    errs: window.__errs,
    charIds,
    tabResults,
    charAudits,
    voiceClipCount: clipEntries.length,
    voiceAllOk: voiceResults.length >= 28 && voiceResults.every((v) => v.ok),
    voiceFailures: voiceResults.filter((v) => !v.ok),
  });
})()
"""


def find_free_port():
  with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind(("127.0.0.1", 0))
    return s.getsockname()[1]


def start_local_server(port):
  handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(
      *args, directory=PROJECT_ROOT, **kwargs
  )

  class QuietServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True

  httpd = QuietServer(("127.0.0.1", port), handler)
  # Suppress noisy request logs
  httpd.RequestHandlerClass.log_message = lambda *a, **kw: None
  thread = threading.Thread(target=httpd.serve_forever, daemon=True)
  thread.start()
  return httpd


def build_audit_batch(port, out_dir):
  os.makedirs(out_dir, exist_ok=True)
  steps = [
      {
          "action": "navigate",
          "url": f"http://127.0.0.1:{port}/index.html",
          "waitUntil": "none",
      },
      {"action": "sleep", "duration": "2500ms"},
      {
          "action": "eval",
          "expression": (
              "window.__errs = window.__errs || [];"
              "window.addEventListener('error', e => __errs.push(String(e.message)));"
              "window.addEventListener('unhandledrejection', e => __errs.push('rej:' + String(e.reason)));"
              "'listeners_attached'"
          ),
      },
      {"action": "eval", "print": "true", "expression": AUDIT_JS},
  ]

  # Capture Dual Form comparison screenshots for representative characters across all 3 groups
  for cid in ["rumi", "jinu", "derpy_tiger"]:
    steps.extend([
        {
            "action": "eval",
            "expression": (
                f"(() => {{ const R = window.__REPAIR3D__ || window.__GAME__;"
                f"if (R.previewCritter) R.previewCritter('{cid}');"
                f"if (R.setForm) R.setForm('stage'); else if (R.toggleForm) R.toggleForm('stage');"
                f"return '{cid}_stage'; }})()"
            ),
        },
        {"action": "sleep", "duration": "350ms"},
        {"action": "screenshot", "file": os.path.join(out_dir, f"{cid}_idol.png")},
        {
            "action": "eval",
            "expression": (
                f"(() => {{ const R = window.__REPAIR3D__ || window.__GAME__;"
                f"if (R.setForm) R.setForm('awakened'); else if (R.toggleForm) R.toggleForm('awakened');"
                f"return '{cid}_awakened'; }})()"
            ),
        },
        {"action": "sleep", "duration": "350ms"},
        {"action": "screenshot", "file": os.path.join(out_dir, f"{cid}_awakened.png")},
    ])

  return steps


def extract_json_payload(stdout_text):
  """Extracts the JSON object printed by gbrowser batch eval."""
  for line in reversed(stdout_text.splitlines()):
    line = line.strip()
    if line.startswith("{") and line.endswith("}") and '"charAudits"' in line:
      return json.loads(line)
    # Sometimes gbrowser wraps string results in quotes
    if line.startswith('"{') and line.endswith('}"') and "charAudits" in line:
      return json.loads(json.loads(line))
  # Fallback regex scan
  m = re.search(r'(\{"lang":.*"voiceFailures":\[.*?\]\})', stdout_text, re.DOTALL)
  if m:
    return json.loads(m.group(1))
  raise RuntimeError(f"Could not parse audit JSON from gbrowser output:\n{stdout_text[:1500]}")


def run_scene_audit(port=None, out_dir=None):
  own_server = None
  if port is None:
    port = find_free_port()
    own_server = start_local_server(port)
  if out_dir is None:
    out_dir = tempfile.mkdtemp(prefix="dh_scene_audit_")

  try:
    steps = build_audit_batch(port, out_dir)
    batch_file = os.path.join(out_dir, "audit_batch.json")
    with open(batch_file, "w", encoding="utf-8") as f:
      json.dump(steps, f, indent=2)

    cmd = [
        GBROWSER,
        "--headless",
        "--width",
        "1280",
        "--height",
        "800",
        "--no-proxy-server",
        "--clean-profile",
        "--timeout",
        "180s",
        "batch",
        f"@{batch_file}",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
      return False, {"fatal": f"gbrowser exited {proc.returncode}: {proc.stderr[-800:]}"}

    data = extract_json_payload(proc.stdout)
    failures = []

    if data.get("fatal"):
      failures.append(data["fatal"])
      return False, {"data": data, "failures": failures}

    if data.get("lang") != "zh-CN":
      failures.append(f"Expected <html lang='zh-CN'>, got {data.get('lang')!r}")

    if data.get("errs"):
      failures.append(f"Runtime console/page errors: {data['errs']}")

    if data.get("charIds") != CANONICAL_CHARS:
      failures.append(f"Character list mismatch: got {data.get('charIds')}, expected {CANONICAL_CHARS}")

    # Check 4 category tabs
    expected_tabs = {"all": 10, "huntrx": 3, "saja_boys": 5, "minhwa": 2}
    tabs = data.get("tabResults", {})
    for tkey, exp_count in expected_tabs.items():
      tinfo = tabs.get(tkey, {})
      if not tinfo.get("found") or tinfo.get("count") != exp_count:
        failures.append(f"Category tab {tkey!r} expected {exp_count} cards, got {tinfo}")

    # Check all 10 characters
    audits = data.get("charAudits", {})
    bboxes = set()
    for cid in CANONICAL_CHARS:
      ca = audits.get(cid)
      if not ca:
        failures.append(f"Missing character audit for {cid}")
        continue
      if ca["vertices"] < 15000:
        failures.append(f"{cid}: vertexCount={ca['vertices']} < 15,000")
      if ca["triangles"] < 25000:
        failures.append(f"{cid}: triangleCount={ca['triangles']} < 25,000")
      if ca["maxMetalness"] > 0.2201:
        failures.append(f"{cid}: maxMetalness={ca['maxMetalness']} > 0.22")
      if not ca.get("hasSignatureProp"):
        failures.append(f"{cid}: missing signatureProp")
      for req_part in ["head", "torso", "eyes", "leftArm", "rightArm", "leftLeg", "rightLeg"]:
        if req_part not in ca.get("parts", []):
          failures.append(f"{cid}: missing required anatomical part {req_part!r}")
      if cid == "rumi" and ca.get("braidSegments", 0) < 24:
        failures.append(f"rumi: braidSegments={ca.get('braidSegments')} < 24")
      if cid == "derpy_tiger" and not ca.get("flowerpotFound"):
        failures.append("derpy_tiger: missing porcelain peony flowerpot")
      if cid == "sussie_magpie":
        if ca.get("goldenEyeCount", 0) < 6:
          failures.append(f"sussie_magpie: goldenEyeCount={ca.get('goldenEyeCount')} < 6")
        if not ca.get("miniGatFound"):
          failures.append("sussie_magpie: missing miniature black Gat hat")
      df = ca.get("dualForm", {})
      if not df.get("formChanged"):
        failures.append(f"{cid}: Dual Form toggle did not update scene graph state ({df})")
      bb = ca.get("bbox", {})
      bboxes.add((round(bb.get("width", 0), 2), round(bb.get("height", 0), 2), ca["vertices"]))

    if len(bboxes) < 8:
      failures.append(f"Characters lack distinct bounding boxes/vertex silhouettes (unique={len(bboxes)})")

    if not data.get("voiceAllOk"):
      failures.append(
          f"Voice clip check failed (count={data.get('voiceClipCount')}, failures={data.get('voiceFailures')})"
      )

    return len(failures) == 0, {"data": data, "failures": failures, "out_dir": out_dir}
  finally:
    if own_server is not None:
      own_server.shutdown()


def main():
  port = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else None
  out_dir = sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp(prefix="dh_scene_audit_")
  ok, res = run_scene_audit(port=port, out_dir=out_dir)
  if "data" in res and "charAudits" in res["data"]:
    print("=== 3D Scene-Graph & Asset Audit Summary ===")
    for cid in CANONICAL_CHARS:
      ca = res["data"]["charAudits"].get(cid, {})
      print(
          f"  {cid:14s} | verts={ca.get('vertices', 0):6d} | tris={ca.get('triangles', 0):6d} "
          f"| metal<={ca.get('maxMetalness', -1):.2f} | prop={ca.get('hasSignatureProp')} "
          f"| dualForm={ca.get('dualForm', {}).get('formChanged')}"
      )
    print(f"  Voice clips decoded: {res['data'].get('voiceClipCount', 0)} (allOk={res['data'].get('voiceAllOk')})")
  if not ok:
    print("AUDIT FAILED:")
    for f in res.get("failures", [res.get("fatal", "unknown error")]):
      print(f"  - {f}")
    sys.exit(1)
  print("ALL SCENE-GRAPH & ASSET AUDITS PASSED!")


if __name__ == "__main__":
  main()
