// Browser checks for the public home page: the live hero pipeline, colour meanings,
// accessibility and overflow, in English and Arabic.
// Usage: node tests/home-browser.mjs http://127.0.0.1:5199
// All non-local requests are aborted; the API is never called.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:5199';
const browser = await chromium.launch();
let count = 0;

async function open(path, width, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  await page.goto(base + path);
  await page.locator('.pipeline').waitFor();
  return { page, context, errors };
}
const activeLabel = page => page.locator('.pipeline-step[data-state=active] .pipeline-node-label').textContent();
const serious = async page => (await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.length}`);

try {
  for (const [lang, path, first, record] of [['en', '/en', 'A customer asks', 'Need'], ['ar', '/', 'العميل يسأل', 'الاحتياج']]) {
    // The pipeline cycles on its own, one step every few seconds.
    const { page, context, errors } = await open(path, 1440);
    assert.equal(await activeLabel(page), first); count++;
    await page.waitForFunction(f => document.querySelector('.pipeline-step[data-state=active] .pipeline-node-label')?.textContent !== f, first, { timeout: 6000 });
    count++;
    // Picking a step shows its example and stops the cycle.
    await page.mouse.move(0, 0);
    const fourth = page.locator('.pipeline-node').nth(3);
    await fourth.click();
    assert.equal(await fourth.getAttribute('aria-pressed'), 'true'); count++;
    assert.equal(await page.locator('.pipeline-record li').count(), 4, `${lang}: the record example shows four details`); count++;
    assert.match(await page.locator('.pipeline-record').textContent(), new RegExp(record)); count++;
    await page.mouse.move(0, 0);
    await page.waitForTimeout(3200);
    assert.equal(await page.locator('.pipeline-node').nth(3).getAttribute('aria-pressed'), 'true', 'a picked step stays'); count++;
    // Each section underlines in its own colour, and plans show their status in colour.
    const markColour = id => page.locator(`#${id} .mark`).first().evaluate(el => getComputedStyle(el).textDecorationColor);
    assert.equal(await markColour('tiers'), 'rgb(81, 164, 123)'); count++;
    assert.equal(await markColour('about'), 'rgb(92, 149, 198)'); count++;
    assert.notEqual(await page.locator('.tier-status.is-available').evaluate(el => getComputedStyle(el).backgroundColor), await page.locator('.tier-status.is-soon').first().evaluate(el => getComputedStyle(el).backgroundColor)); count++;
    assert.deepEqual(await serious(page), [], `${lang} 1440 accessibility`); count++;
    assert.deepEqual(errors, []); count++;
    await context.close();

    // Reduced motion: nothing cycles; the visitor clicks through.
    const still = await open(path, 375, 'reduce');
    await still.page.waitForTimeout(3200);
    assert.equal(await activeLabel(still.page), first, `${lang}: no cycle under reduced motion`); count++;
    await still.page.locator('.pipeline-node').nth(1).click();
    assert.equal(await still.page.locator('.pipeline-bubble.is-out').count(), 1); count++;
    for (const width of [320, 375, 768, 1024]) {
      await still.page.setViewportSize({ width, height: 900 });
      assert.equal(await still.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${lang} ${width}: no horizontal overflow`); count++;
    }
    assert.deepEqual(await serious(still.page), [], `${lang} 375 accessibility`); count++;
    await still.context.close();
  }
  console.log(`${count} home page checks passed (live pipeline, colour meanings, reduced motion, EN/AR, 320–1440).`);
} finally {
  await browser.close();
}
