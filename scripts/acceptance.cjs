/* Usage: BASE_URL=https://.../ BROWSER_EXECUTABLE=/path/to/chromium npm test */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = (process.env.BASE_URL || 'http://localhost:8765/web-programming-homeworks/_site/').replace(/\/?$/, '/');
const out = path.resolve(process.env.TEST_OUTPUT || 'test-results');
fs.mkdirSync(out, { recursive: true });
const report = { base, startedAt: new Date().toISOString(), checks: [], observations: {}, issues: [] };
const projects = ['cow-game', 'cow-run', 'to-do-list', 'sticky-notes', 'information-board', 'real-time-aqi-map', 'english-listening-speaking'];
let browser;
const checks = async (name, fn) => {
  if (process.env.CHECK_FILTER && !name.includes(process.env.CHECK_FILTER)) return;
  try { const detail = await fn(); report.checks.push({ name, pass: true, detail }); console.log('PASS', name, detail || ''); }
  catch (e) { report.checks.push({ name, pass: false, error: e.stack }); console.error('FAIL', name, e.message); }
};
async function pageFor(ctx, name, suffix = '') {
  const p = await ctx.newPage();
  const failures = { errors: [], failed: [], http: [] };
  p.on('pageerror', e => failures.errors.push(e.message));
  p.on('requestfailed', r => failures.failed.push({ url: r.url(), error: r.failure()?.errorText }));
  p.on('response', r => { if (r.status() >= 400) failures.http.push({ url: r.url(), status: r.status() }); });
  p.audit = failures;
  const response = await p.goto(base + (name ? name + '/' : '') + suffix, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200);
  await p.waitForTimeout(1500);
  return p;
}
async function clean(p, name) {
  report.observations[name] = p.audit;
  assert.deepEqual(p.audit.errors, [], 'Uncaught JavaScript errors');
  assert.deepEqual(p.audit.http.filter(r => r.url.startsWith(base)), [], 'Local HTTP errors');
}
(async () => {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  ctx.setDefaultTimeout(15000);
  await checks('Homepage: seven independent project links', async () => {
    const p = await pageFor(ctx, '');
    assert.equal(await p.locator('.card').count(), 7);
    const hrefs = await p.locator('.demo').evaluateAll(es => es.map(e => e.getAttribute('href')));
    assert.deepEqual(hrefs.map(h => h.split('/')[1]).sort(), projects.slice().sort());
    await p.screenshot({ path: path.join(out, 'home-desktop.png'), fullPage: true });
    await clean(p, 'home'); await p.close();
  });
  await checks('To-do: create/edit/subtask/complete/search/export/import/delete/persistence', async () => {
    const p = await pageFor(ctx, 'to-do-list');
    await p.locator('#todoInput').fill('Portfolio acceptance task');
    await p.locator('#prioritySelect').selectOption('high');
    await p.locator('#categorySelect').selectOption('學習');
    await p.locator('#todoForm button[type=submit]').click();
    assert.equal(await p.locator('#totalCount').textContent(), '1');
    await p.locator('#todoList button[title="編輯"]').click();
    await p.locator('#editTaskTitle').fill('Edited portfolio task');
    await p.locator('#editForm button[type=submit]').click();
    assert.match(await p.locator('#todoList').textContent(), /Edited portfolio task/);
    // Use the rendered accordion and subtask input.
    await p.locator('#todoList button[onclick^="toggleSubtaskSection"]').click();
    const subtask = p.locator('#todoList input[placeholder="+ 新增子任務..."]');
    await subtask.fill('Test child task'); await p.locator('#todoList button[onclick^="handleAddSubtask"]').click();
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('taskmaster_todos_v1'))[0].subtasks.length), 1);
    await p.locator('#todoList button[onclick^="toggleTodo"]').click();
    assert.equal(await p.locator('#completedCount').textContent(), '1');
    await p.reload(); await p.waitForFunction(() => document.querySelector('#totalCount').textContent === '1');
    assert.equal(await p.locator('#completedCount').textContent(), '1');
    await p.locator('#searchInput').fill('unmatched-query');
    assert.equal(await p.locator('#todoList [data-id]').count(), 0);
    await p.locator('#searchInput').fill('');
    const downloadPromise = p.waitForEvent('download'); await p.locator('#exportBtn').click();
    const download = await downloadPromise; const dataPath = path.join(out, 'todo-backup.json'); await download.saveAs(dataPath);
    const backup = JSON.parse(fs.readFileSync(dataPath)); assert.equal(backup.length, 1);
    await p.locator('#todoList button[title="刪除"]').click(); await p.locator('#actionConfirmBtn').click();
    assert.equal(await p.locator('#totalCount').textContent(), '0');
    await p.locator('#importInput').setInputFiles(dataPath);
    await p.waitForFunction(() => document.querySelector('#totalCount').textContent === '1');
    await clean(p, 'to-do-list'); await p.close();
  });
  await checks('Sticky Notes: add/edit/color/drag/search/grid/delete/persistence', async () => {
    const p = await pageFor(ctx, 'sticky-notes');
    await p.locator('#addNoteBtn').click();
    let note = p.locator('.sticky-note-wrapper').last();
    const id = await note.getAttribute('data-id');
    await note.locator('textarea').fill('Persistent portfolio note');
    await note.locator('.note-header').hover();
    await note.locator('[title="更換顏色"]').hover();
    await note.locator('[data-change-color="blue"]').click();
    note = p.locator(`[data-id="${id}"]`);
    const handle = await note.locator('.note-header').boundingBox();
    await p.mouse.move(handle.x + 30, handle.y + 16); await p.mouse.down(); await p.mouse.move(handle.x + 110, handle.y + 70, { steps: 8 }); await p.mouse.up();
    const stored = await p.evaluate(id => JSON.parse(localStorage.getItem('sticky_notes_data')).find(n => n.id === id), id);
    assert.equal(stored.color, 'blue'); assert.equal(stored.content, 'Persistent portfolio note');
    await p.reload(); await p.waitForTimeout(500);
    assert.equal(await p.locator(`[data-id="${id}"] textarea`).inputValue(), 'Persistent portfolio note');
    await p.locator('#searchInput').fill('Persistent portfolio');
    assert.equal(await p.locator('.sticky-note-wrapper:visible').count(), 1);
    await p.locator('#searchInput').fill(''); await p.locator('#gridModeBtn').click();
    assert.match(await p.locator('#notesBoard').getAttribute('class'), /grid/);
    await p.locator(`[data-id="${id}"] .delete-btn`).click();
    await p.waitForTimeout(300); assert.equal(await p.locator(`[data-id="${id}"]`).count(), 0);
    await clean(p, 'sticky-notes'); await p.close();
  });
  await checks('Cow Game: movement/pause/grass/score/collision/restart/high-score persistence', async () => {
    const p = await pageFor(ctx, 'cow-game');
    await p.getByRole('button', { name: '開始吃草！' }).click(); await p.keyboard.press('Space');
    const before = await p.evaluate(() => ({ x: cow[0].x, y: cow[0].y }));
    await p.waitForTimeout(250); assert.deepEqual(await p.evaluate(() => ({ x: cow[0].x, y: cow[0].y })), before);
    // Controlled fixture places a grass on the next cell; key input and game updates remain real.
    await p.evaluate(() => { grass = { x: cow[0].x, y: cow[0].y - 1, isGold: false }; });
    await p.keyboard.press('Space');
    await p.waitForFunction(() => document.querySelector('#score-val').textContent !== '0');
    await p.waitForFunction(() => !document.querySelector('#gameOverModal').classList.contains('hidden'), null, { timeout: 7000 });
    const high = await p.locator('#high-val').textContent(); assert.ok(Number(high) >= 1);
    await p.getByRole('button', { name: '重新挑戰 🔄' }).click();
    assert.equal(await p.locator('#score-val').textContent(), '0');
    await p.reload(); assert.equal(await p.locator('#high-val').textContent(), high);
    await clean(p, 'cow-game'); await p.close();
  });
  await checks('Cow Run: real AI model/manual controls/game/synthetic-camera inference/stop', async () => {
    await ctx.grantPermissions(['camera'], { origin: new URL(base).origin });
    const p = await pageFor(ctx, 'cow-run');
    await p.waitForFunction(() => document.querySelector('#aiStatusText').textContent.includes('Ready'), null, { timeout: 90000 });
    await p.locator('#startScreenContent button').click();
    await p.locator('button[onclick="simulateMove(\'Left\')"]').click();
    assert.match(await p.locator('#activeLaneBadge').textContent(), /LEFT/);
    await p.keyboard.press('ArrowRight'); assert.match(await p.locator('#activeLaneBadge').textContent(), /RIGHT/);
    await p.locator('#toggleWebcamBtn').click();
    await p.waitForFunction(() => document.querySelector('#cameraVideo').videoWidth > 0);
    // Count calls through the real model; keep real inference, not a mocked pose result.
    await p.evaluate(() => { window.__inferences = 0; const original = model.predict.bind(model); model.predict = async (...args) => { const result = await original(...args); window.__inferences++; return result; }; });
    await p.waitForFunction(() => window.__inferences > 0, null, { timeout: 45000 });
    const result = await p.evaluate(() => ({ inferences: window.__inferences, dimensions: [cameraVideo.videoWidth, cameraVideo.videoHeight], labels: model.getClassLabels(), cameraError: document.querySelector('#cameraErrorText').textContent }));
    assert.equal(result.cameraError, '');
    await p.locator('#toggleWebcamBtn').click();
    assert.equal(await p.evaluate(() => document.querySelector('#cameraVideo').srcObject), null);
    await clean(p, 'cow-run'); await p.close();
    return { ...result, device: 'Chromium synthetic camera; human pose accuracy not tested' };
  });
  await checks('Information Board: official data/month/search/source dialog/refresh', async () => {
    const p = await pageFor(ctx, 'information-board');
    await p.waitForFunction(() => !AppState.produceLoading && !AppState.shelterLoading, null, { timeout: 75000 });
    const state = await p.evaluate(() => ({ produceSource: AppState.produceSourceType, dogsSource: AppState.shelterSourceType, produce: AppState.produceData.length, dogs: AppState.shelterData.length }));
    assert.equal(state.produceSource, 'api'); assert.equal(state.dogsSource, 'api');
    await p.locator('#month-select').selectOption('11');
    const crop = await p.evaluate(() => AppState.produceData.find(r => r.month.includes(11)).cropName);
    await p.locator('#produce-search').fill(crop); assert.ok(await p.locator('#produce-container h3').count() > 0);
    await p.locator('#produce-search').fill('no-match'); assert.match(await p.locator('#produce-count-badge').textContent(), /^0/);
    await p.locator('#btn-toggle-source').click(); assert.ok(await p.locator('#source-modal').isVisible()); await p.locator('#btn-modal-ok').click();
    await p.locator('#btn-refresh-shelter').click(); await p.waitForFunction(() => !AppState.shelterLoading, null, { timeout: 75000 });
    assert.equal(await p.evaluate(() => AppState.shelterSourceType), 'api');
    await clean(p, 'information-board'); await p.close(); return state;
  });
  await checks('AQI: official snapshot/map tiles/search/filter/popup/layer switching/geolocation', async () => {
    await ctx.grantPermissions(['geolocation'], { origin: new URL(base).origin }); await ctx.setGeolocation({ latitude: 25.033, longitude: 121.5654 });
    const p = await pageFor(ctx, 'real-time-aqi-map');
    await p.waitForFunction(() => stationData.length > 0);
    assert.equal(await p.evaluate(() => aqiSource), 'official');
    assert.ok(await p.evaluate(() => markersLayer.getLayers().length) >= 50);
    await p.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile')].some(i => i.complete && i.naturalWidth > 0));
    const site = await p.evaluate(() => stationData[0].sitename); await p.locator('#search-input').fill(site);
    assert.ok(await p.evaluate(() => getFilteredData().length) >= 1);
    await p.locator('#clear-search').click();
    await p.locator('.filter-pill[data-filter="良好"]').click();
    assert.ok(await p.evaluate(() => getFilteredData().every(s => Number(s.aqi) <= 50)));
    await p.locator('.filter-pill[data-filter="all"]').click();
    await p.locator('#station-list > div').first().click();
    await p.waitForFunction(() => document.querySelector('.leaflet-popup') !== null);
    await p.locator('#tile-toggle-btn').click(); assert.equal(await p.evaluate(() => currentTileLayerIndex), 1);
    await p.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile')].some(i => i.src.includes('cartocdn.com') && i.complete && i.naturalWidth > 0));
    await p.locator('#locate-btn').click(); await p.waitForFunction(() => userLocationMarker !== null);
    const result = await p.evaluate(() => ({ stations: stationData.length, status: document.querySelector('#data-source-status').textContent }));
    await clean(p, 'real-time-aqi-map'); await p.close(); return { ...result, geolocation: 'simulated Taipei location' };
  });
  await checks('English: listening answers/library/search/CSV/learning-record persistence/native speech capability', async () => {
    const p = await pageFor(ctx, 'english-listening-speaking');
    const word = await p.evaluate(() => currentWord().term); await p.locator('#answer-input').fill(word); await p.locator('#answer-form button').click();
    assert.match(await p.locator('.feedback-title').textContent(), /答對/);
    const key = await p.evaluate(() => KEY); const count = await p.evaluate(k => JSON.parse(localStorage.getItem(k)).length, key); assert.ok(count > 0);
    await p.reload(); assert.equal(await p.evaluate(k => JSON.parse(localStorage.getItem(k)).length, key), count);
    await p.locator('[data-view="library"]').first().click(); assert.equal(await p.locator('.vocab-row').count(), 100);
    await p.locator('#library-search').fill('hello'); assert.ok(await p.locator('.vocab-row').count() > 0);
    const downloadPromise = p.waitForEvent('download'); await p.locator('[data-action="export"]').first().click(); const download = await downloadPromise; await download.saveAs(path.join(out, 'english-vocabulary.csv'));
    const capability = await p.evaluate(() => ({ synthesis: 'speechSynthesis' in window, voices: speechSynthesis.getVoices().length, recognition: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), secureContext: isSecureContext }));
    await clean(p, 'english-listening-speaking'); await p.close(); return { ...capability, audio: 'Audio playback and real microphone recognition require manual verification' };
  });
  await checks('Storage isolation on shared origin', async () => {
    const p = await pageFor(ctx, '');
    const keys = await p.evaluate(() => Object.keys(localStorage));
    for (const key of ['taskmaster_todos_v1', 'sticky_notes_data', 'cow_game_highscore']) assert.ok(keys.includes(key));
    assert.ok(keys.some(k => k.includes('echo'))); await p.close(); return keys;
  });
  await ctx.close();
  for (const width of [390, 320]) {
    await checks(`Responsive layouts and touch controls: ${width}px`, async () => {
      const mobile = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
      try {
        for (const name of ['', ...projects]) {
          const p = await pageFor(mobile, name);
          const dimensions = await p.evaluate(() => ({ viewport: window.visualViewport.width, scroll: document.documentElement.scrollWidth }));
          assert.ok(dimensions.scroll <= width + 1, `${name} has horizontal overflow ${dimensions.scroll}`);
          if (name === 'cow-game') { await p.getByRole('button', { name: '開始吃草！' }).tap(); await p.locator('.dpad-btn[onclick*="ArrowRight"]').tap(); assert.ok(await p.evaluate(() => inputQueue.length > 0 || direction.x !== 0)); }
          if (name === 'sticky-notes') { assert.match(await p.locator('#notesBoard').getAttribute('class'), /grid/); await p.locator('#addNoteBtn').tap(); await p.locator('textarea').last().fill('Mobile note'); }
          await p.evaluate(() => window.scrollTo(0, 0));
          await p.screenshot({ path: path.join(out, `${name || 'home'}-mobile-${width}.png`), fullPage: true });
          await clean(p, `${name || 'home'}-mobile-${width}`); await p.close();
        }
      } finally { await mobile.close(); }
    });
  }
})().catch(e => { report.issues.push(e.stack); console.error(e); }).finally(async () => {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  console.log('REPORT', path.join(out, 'results.json'));
  if (report.issues.length || report.checks.some(c => !c.pass)) process.exitCode = 1;
});
