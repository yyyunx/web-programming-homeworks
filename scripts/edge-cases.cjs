// Deliberately mocked fault paths are reported separately from real-service checks.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = (process.env.BASE_URL || 'http://localhost:8765/web-programming-homeworks/_site/').replace(/\/?$/, '/');
const out = path.resolve(process.env.TEST_OUTPUT || 'test-results');
fs.mkdirSync(out, { recursive: true });
const results = { base, startedAt: new Date().toISOString(), checks: [] };
let browser;
async function check(name, fn) {
  try { const detail = await fn(); results.checks.push({ name, pass: true, detail }); console.log('PASS', name, detail || ''); }
  catch (e) { results.checks.push({ name, pass: false, error: e.stack }); console.error('FAIL', name, e.message); }
}
(async () => {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--use-fake-device-for-media-stream'] });
  await check('Native camera denied: clear error without crashing', async () => {
    const ctx = await browser.newContext();
    try {
      await ctx.grantPermissions([], { origin: new URL(base).origin });
      const p = await ctx.newPage(); await p.goto(base + 'cow-run/');
      await p.waitForFunction(() => document.querySelector('#aiStatusText').textContent.includes('Ready'), null, { timeout: 90000 });
      await p.locator('#toggleWebcamBtn').click();
      await p.waitForFunction(() => document.querySelector('#cameraErrorText').textContent.includes('權限遭拒'));
      return await p.locator('#cameraErrorText').textContent();
    } finally { await ctx.close(); }
  });
  await check('Native speech recognition: permission/service failure is displayed', async () => {
    const ctx = await browser.newContext();
    try {
      await ctx.grantPermissions([], { origin: new URL(base).origin });
      const p = await ctx.newPage(); await p.goto(base + 'english-listening-speaking/');
      await p.locator('[data-mode="speak"]').click(); await p.locator('[data-action="record"]').click();
      await p.locator('.notice[role="alert"]').waitFor({ timeout: 25000 });
      return { message: await p.locator('.notice').textContent(), actualAudio: 'not tested' };
    } finally { await ctx.close(); }
  });
  await check('Mock speech: utterance parameters, recognition result scoring and persistence', async () => {
    const ctx = await browser.newContext();
    try {
      await ctx.addInitScript(() => {
        window.__speechCalls = [];
        speechSynthesis.speak = u => window.__speechCalls.push({ text: u.text, lang: u.lang, rate: u.rate });
        window.SpeechRecognition = class {
          start() { window.__recognitionLang = this.lang; queueMicrotask(() => this.onresult({ results: [[{ transcript: window.__transcript }]] })); }
          stop() { this.onend?.(); }
        };
      });
      const p = await ctx.newPage(); await p.goto(base + 'english-listening-speaking/');
      const goal = await p.evaluate(() => currentWord().term); await p.locator('[data-action="play-current"]').click();
      const utterance = await p.evaluate(() => window.__speechCalls.at(-1)); assert.equal(utterance.text, goal); assert.equal(utterance.lang, 'en-US');
      await p.locator('[data-mode="speak"]').click();
      await p.evaluate(() => { window.__transcript = currentWord().term; });
      await p.locator('[data-action="record"]').click();
      await p.waitForFunction(() => document.querySelector('.feedback-title')?.textContent.includes('答對'));
      assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem(KEY)).at(-1).mode), 'speak');
      assert.equal(await p.evaluate(() => window.__recognitionLang), 'en-US');
      await p.reload(); assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem(KEY)).at(-1).correct), true);
      return { utterance, mode: 'mocked synthesis and recognition; no real audio' };
    } finally { await ctx.close(); }
  });
  await check('Mock network failure: Board demo labels and broken-image fallback', async () => {
    const ctx = await browser.newContext();
    try {
      await ctx.route('**/*', route => {
        const u = new URL(route.request().url());
        if (['data.moa.gov.tw', 'api.allorigins.win'].includes(u.hostname) || route.request().resourceType() === 'image') return route.abort();
        return route.continue();
      });
      const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message)); await p.goto(base + 'information-board/');
      await p.waitForFunction(() => !AppState.produceLoading && !AppState.shelterLoading);
      assert.equal(await p.evaluate(() => AppState.produceSourceType), 'fallback');
      assert.equal(await p.evaluate(() => AppState.shelterSourceType), 'fallback');
      assert.match(await p.locator('#ticker-text').textContent(), /示範資料/);
      await p.waitForFunction(() => [...document.querySelectorAll('#shelter-container img')].every(i => i.src.startsWith('data:image/svg+xml')));
      assert.deepEqual(errors, []); return 'Both data sources forced offline; image fallback executes without JS syntax errors';
    } finally { await ctx.close(); }
  });
  await check('Mock AQI failure: explicitly marked demonstration data', async () => {
    const ctx = await browser.newContext();
    try {
      await ctx.route('**/data/aqi.json', r => r.abort());
      const p = await ctx.newPage(); await p.goto(base + 'real-time-aqi-map/');
      await p.waitForFunction(() => stationData.length > 0);
      assert.equal(await p.evaluate(() => aqiSource), 'demo');
      assert.match(await p.locator('#data-source-status').textContent(), /示範資料（非即時）/);
      return await p.locator('#data-source-status').textContent();
    } finally { await ctx.close(); }
  });
})().catch(e => { results.error = e.stack; console.error(e); }).finally(async () => {
  if (browser) await browser.close(); results.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'edge-cases.json'), JSON.stringify(results, null, 2));
  if (results.error || results.checks.some(c => !c.pass)) process.exitCode = 1;
});
