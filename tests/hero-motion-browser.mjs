import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:5199';
const capture = process.argv.includes('--capture');
const output = '.impeccable/review';
if (capture) await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let checks = 0;
async function localPage(context) {
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__cuboidDraws = 0;
    if (!window.WebGL2RenderingContext) return;
    const draw = WebGL2RenderingContext.prototype.drawArraysInstanced;
    WebGL2RenderingContext.prototype.drawArraysInstanced = function (...args) {
      window.__cuboidDraws++;
      return draw.apply(this, args);
    };
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydration|did not match|server html/i.test(message.text())) errors.push(message.text()); });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) return route.abort();
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, account: null } });
    return route.continue();
  });
  return { page, errors };
}
async function step(page, index) {
  await page.locator('.pipeline-step').nth(index).evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction(index => document.querySelector('.inquiry-story').dataset.activeStep === String(index), index);
  assert.equal(await page.locator('.pipeline-node').nth(index).getAttribute('aria-pressed'), 'true'); checks++;
}
try {
  for (const [lang, path] of [['en', '/en'], ['ar', '/']]) {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
      const { page, errors } = await localPage(context);
      await page.goto(base + path);
      await page.locator('.cuboid-sculpture[data-renderer=webgl]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1); checks++;
      assert.equal(await page.locator('.pipeline-step').count(), 5); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${lang} ${width}: overflow`); checks++;
      assert.equal(await page.locator('.inquiry-story').evaluate(el => el.clientWidth > document.querySelector('.hero-content').clientWidth * .8), true); checks++;
      const cta = page.locator('.hero-ctas a[href$="/audit"]');
      assert.equal(await cta.getAttribute('target'), null); checks++;
      if (capture && width !== 320) await page.screenshot({ path: `${output}/${lang === 'en' ? (width === 1440 ? 'desktop' : 'mobile') : (width === 1440 ? 'desktop-ar' : 'mobile-ar')}.png` });
      for (const index of [0, 1, 2, 3, 4, 2, 0]) await step(page, index);
      if (width < 769) { assert.equal(await page.locator('.chat-launcher').isVisible(), false, 'floating chat does not cover the story'); checks++; }
      await page.locator('.story-control').nth(3).focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.inquiry-story').dataset.activeStep === '3');
      assert.equal(await page.locator('.pipeline-record li').count(), 4); checks++;
      if (capture && width !== 320) {
        await page.waitForTimeout(1100);
        await page.screenshot({ path: `${output}/story-${lang}-${width}.png` });
      }
      await page.waitForFunction(() => window.__cuboidDraws > 0);
      if (lang === 'en' && width === 1440) {
        await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        const hidden = await page.evaluate(() => window.__cuboidDraws);
        await page.waitForTimeout(120);
        assert.equal(await page.evaluate(() => window.__cuboidDraws), hidden, 'hidden document stops rendering'); checks++;
        await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
        await page.waitForFunction(before => window.__cuboidDraws > before, hidden);
        await page.locator('#faq').scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        const offscreen = await page.evaluate(() => window.__cuboidDraws);
        await page.waitForTimeout(120);
        assert.equal(await page.evaluate(() => window.__cuboidDraws), offscreen, 'offscreen sculpture stops rendering'); checks++;
        await step(page, 1);
        await page.waitForFunction(before => window.__cuboidDraws > before, offscreen);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await step(page, 1);
      await page.waitForTimeout(100);
      const first = await page.evaluate(() => window.__cuboidDraws);
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => window.__cuboidDraws), first, `${lang} ${width}: reduced motion stops rendering after the static draw`); checks++;
      if (lang === 'en' && width === 1440) {
        await page.locator('.cuboid-canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
        await page.locator('.cuboid-sculpture[data-renderer=svg]').waitFor();
        const lost = await page.evaluate(() => window.__cuboidDraws);
        await step(page, 3);
        await page.waitForTimeout(120);
        assert.equal(await page.evaluate(() => window.__cuboidDraws), lost, 'context loss retains SVG without restarting rendering'); checks++;
      }
      if (width === 1440) {
        await page.setViewportSize({ width, height: 720 });
        await step(page, 2);
        const controls = await page.locator('.story-controls').boundingBox();
        assert.ok(controls.y >= 72 && controls.y + controls.height <= 720, 'short desktop keeps the controls visible'); checks++;
      }
      const violations = (await new AxeBuilder({ page }).include('#hero').analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }));
      assert.deepEqual(violations, [], `${lang} ${width}: accessibility`); checks++;
      assert.deepEqual(errors, [], `${lang} ${width}: browser/hydration errors`); checks++;
      await context.close();
    }
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
  });
  const { page, errors } = await localPage(context);
  await page.goto(base + '/');
  await page.locator('.inquiry-story').waitFor();
  await step(page, 3);
  assert.equal(await page.locator('.cuboid-sculpture').getAttribute('data-renderer'), 'svg'); checks++;
  assert.ok(await page.locator('.cuboid-fallback path').count() > 0); checks++;
  assert.deepEqual(errors, []); checks++;
  await context.close();

  for (const reducedMotion of ['reduce', 'no-preference']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
    const { page, errors } = await localPage(context);
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route('**/api/layla-meta?surface=dashboard', async route => { await held; await route.fulfill({ status: 503, json: { ok: false, reason: 'temporarily_unavailable' } }); });
    await page.goto(base + '/en/layla/dashboard');
    const loader = page.locator('.loading-status');
    await loader.waitFor();
    assert.match(await loader.innerText(), /Loading/); checks++;
    await page.locator('.loading-visual.is-visible').waitFor();
    assert.equal(await loader.getAttribute('role'), 'status'); checks++;
    assert.equal(await page.locator('.loading-dot').count(), 3); checks++;
    if (reducedMotion === 'reduce') {
      const transforms = () => page.locator('.loading-dot').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).transform));
      const before = await transforms(); await page.waitForTimeout(180);
      assert.deepEqual(await transforms(), before); checks++;
    }
    if (capture && reducedMotion === 'no-preference') await page.screenshot({ path: `${output}/loading-mobile.png` });
    release();
    await loader.waitFor({ state: 'detached' });
    assert.equal(await page.locator('.loading-dot').count(), 0); checks++;
    assert.deepEqual(errors, []); checks++;
    await context.close();
  }
  console.log(`${checks} hero/loading checks passed: EN/AR, scroll/reverse, keyboard, 320–1440, short screens, WebGL/SVG, reduced motion, hydration and axe. Synthetic API; no external network.`);
} finally { await browser.close(); }
