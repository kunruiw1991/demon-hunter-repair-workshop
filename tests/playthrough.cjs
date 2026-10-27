// Companion Playwright E2E test suite for KPop Demon Hunters Repair Workshop 3D.
// Run with NODE_PATH pointing to a Playwright installation against a local static server,
// or use `python3 tests/verify_all.py` for the primary gbrowser E2E suite.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const out = process.env.OUTPUT_DIR || path.join(require('node:os').tmpdir(), 'demon-hunter-repair-tests');
fs.mkdirSync(out, {recursive: true});

const CANONICAL_IDS = [
  'rumi', 'mira', 'zoey',
  'jinu', 'abby', 'mystery', 'romance', 'baby',
  'derpy_tiger', 'sussie_magpie',
];

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({viewport: {width: 1280, height: 800}});
  const errors = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.error(e.message);
  });

  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8765');
  await page.waitForFunction(() => window.__REPAIR3D__ || window.__GAME__);

  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');

  // Verify bundled zh-CN-XiaoyiNeural MP3 voice clips
  const recordings = await page.evaluate(async () => {
    const R = window.__REPAIR3D__ || window.__GAME__;
    const clips = (R.voiceClips && R.voiceClips()) || window.VOICE_CLIPS || {};
    const results = [];
    for (const [, src] of Object.entries(clips)) {
      const a = new Audio(src);
      await new Promise((resolve, reject) => {
        a.onloadedmetadata = resolve;
        a.onerror = () => reject(new Error('Bad audio: ' + src));
      });
      results.push({src, duration: a.duration});
    }
    return results;
  });
  assert(recordings.length >= 28, `Expected >= 28 voice recordings, got ${recordings.length}`);
  for (const r of recordings) {
    assert(r.duration > 0.3 && r.duration < 30, r.src);
  }
  console.log(`All ${recordings.length} Mandarin MP3 recordings decoded PASS`);

  // Verify 4 category filter tabs
  for (const [cat, expectedCount] of [['all', 10], ['huntrx', 3], ['saja_boys', 5], ['minhwa', 2]]) {
    await page.evaluate((c) => {
      const btn = document.querySelector(`#catTabs [data-cat="${c}"], #catTabs [data-cat="saja"]`);
      if (btn) btn.click();
    }, cat);
    const visibleCount = await page.evaluate(() =>
      [...document.querySelectorAll('#patients .patient')].filter((e) => !e.classList.contains('hidden') && e.offsetParent !== null).length
    );
    assert.equal(visibleCount, expectedCount, `Category tab ${cat} count mismatch`);
  }
  await page.click('#catTabs [data-cat="all"]');

  const ids = await page.evaluate(() => (window.__REPAIR3D__ || window.__GAME__).characters());
  assert.deepEqual(ids, CANONICAL_IDS);

  const visitIds = process.env.CRITTERS ? process.env.CRITTERS.split(',') : ids;
  for (const id of visitIds) {
    await page.click(`.patient[data-k="${id}"]`);
    const stats = await page.evaluate((cid) => {
      const R = window.__REPAIR3D__ || window.__GAME__;
      const a = R.auditCharacter ? R.auditCharacter(cid) : {};
      return {
        verts: R.vertexCount(),
        tris: R.triangleCount ? R.triangleCount() : a.triangles,
        maxMetalness: a.maxMetalness ?? 0,
      };
    }, id);
    assert(stats.verts >= 15000, `${id} vertices ${stats.verts} < 15000`);
    assert(stats.tris >= 25000, `${id} triangles ${stats.tris} < 25000`);
    assert(stats.maxMetalness <= 0.22, `${id} maxMetalness ${stats.maxMetalness} > 0.22`);

    // Toggle Dual Form (Stage Idol <-> Awakened Demon/Spirit)
    await page.click('#formToggleBtn');
    assert.equal(await page.evaluate(() => {
      const R = window.__REPAIR3D__ || window.__GAME__;
      return typeof R.form === 'function' ? R.form() : R.form;
    }), 'awakened');
    await page.click('#formToggleBtn');

    // Start visit with all damages forced
    await page.evaluate(() => {
      const R = window.__REPAIR3D__ || window.__GAME__;
      if (R.startVisit) R.startVisit({forceAllDamages: true});
      else document.getElementById('startBtn').click();
    });
    await page.waitForTimeout(400);

    // Verify 0/10 -> 10/10 -> 11th press 3D Mushroom-Cloud Mega Fart
    for (let f = 1; f <= 10; f++) {
      await page.click('#fartBtn');
      assert.equal((await page.locator('#fartCount').textContent()).trim(), `${f}/10`);
    }
    assert.equal(await page.evaluate(() => document.getElementById('fartBtn').classList.contains('mega')), true);
    await page.click('#fartBtn');
    assert.equal((await page.locator('#fartCount').textContent()).trim(), '0/10');
    assert.equal(await page.evaluate(() => (window.__REPAIR3D__ || window.__GAME__).mushroomClouds().length > 0), true);

    // Complete all surface, KPop special, and 3-point checkup repairs
    const log = await page.evaluate(async () => {
      const R = window.__REPAIR3D__ || window.__GAME__;
      const repaired = [];
      for (let step = 0; step < 120 && R.remaining() > 0; step++) {
        const ds = R.damages();
        const idx = ds.findIndex((d) => !d.done);
        if (idx < 0) break;
        const d = ds[idx];
        const tool = (R.toolFor && R.toolFor(d.type)) || d.tool;
        const isHold = R.isHoldTool ? R.isHoldTool(tool) : false;
        if (R.snapToDamage) R.snapToDamage(idx);
        else R.spinToDamage(idx);
        R.selectTool(tool);
        for (let n = 0; n < 90 && !R.damages()[idx].done; n++) {
          const useTorso = d.body || ['flat', 'flat_padding', 'faded', 'faded_outfit'].includes(d.type);
          const pos = useTorso ? R.critterScreen() : R.screen(idx);
          if (isHold) R.holdTool(pos.x, pos.y, 0.06);
          else R.tapTool(pos.x, pos.y);
        }
        if (!R.damages()[idx].done) throw new Error('Unreachable repair: ' + d.type);
        repaired.push(d.type);
      }
      return repaired;
    });

    assert(log.includes('eczema'), `${id} missed eczema`);
    assert(log.includes('wet_pants'), `${id} missed wet_pants`);
    assert(log.includes('demon_mark'), `${id} missed demon_mark`);
    assert.equal(log.filter((x) => x === 'checkup').length, 3);
    assert.equal(await page.evaluate(() => (window.__REPAIR3D__ || window.__GAME__).hasDiaper()), true);
    if (id === 'derpy_tiger') {
      assert.equal(await page.evaluate(() => (window.__REPAIR3D__ || window.__GAME__).flowerpotState().upright), true);
    }

    // Golden Honmoon Wake-Up
    await page.evaluate(() => {
      const R = window.__REPAIR3D__ || window.__GAME__;
      R.selectTool('heart');
      const p = R.critterScreen();
      R.tapTool(p.x, p.y);
    });
    await page.waitForFunction(() => (window.__REPAIR3D__ || window.__GAME__).state === 'awake');

    // Dress-up & Photo Card & Showcase Shelf
    await page.click('#dressItems .tool:first-child');
    await page.click('#shelfBtn');
    await page.waitForSelector('#nextBtn');
    assert.equal(await page.evaluate((cid) => (window.__REPAIR3D__ || window.__GAME__).save().fixed[cid] >= 1, id), true);
    console.log(`${id}: ${log.join(', ')} -> wake -> dress -> shelf PASS`);
    await page.click('#nextBtn');
  }

  // Verify localStorage persistence & mobile 390x844 layout
  await page.reload();
  await page.waitForFunction(() => window.__REPAIR3D__ || window.__GAME__);
  assert(await page.evaluate(() => (window.__REPAIR3D__ || window.__GAME__).save().shelf.length >= 6));

  await page.setViewportSize({width: 390, height: 844});
  await page.screenshot({path: path.join(out, 'repair-mobile.png')});
  assert.equal(await page.locator('.patient').count(), 10);
  for (const id of ids) {
    const box = await page.locator(`.patient[data-k="${id}"]`).boundingBox();
    assert(box.x >= -2 && box.x + box.width <= 392);
  }

  assert.deepEqual(errors, []);
  console.log('All 10 KPop Demon Hunters characters, Dual Form, Mega-Fart, and mobile checks PASS');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
