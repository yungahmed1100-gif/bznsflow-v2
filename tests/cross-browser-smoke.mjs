// The home page in Firefox and Safari's engine (Chromium is covered by the other suites): it
// loads, the pipeline works by click and keyboard, the sculpture is either moving or still, and
// nothing overflows or throws. Run by hand: npm run test:cross-browser [base]
// Needs the browsers once: npx playwright install firefox webkit
import assert from 'node:assert/strict';
import { firefox, webkit } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:5199';
let checks = 0;
for (const [name, engine] of [
  ['firefox', firefox],
  ['webkit', webkit],
]) {
  const browser = await engine.launch();
  try {
    for (const [lang, path] of [
      ['en', '/en'],
      ['ar', '/'],
    ])
      for (const width of [1440, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route =>
          new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort(),
        );
        await page.goto(base + path);
        await page.locator('.pipeline-art').waitFor();
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        // Either renderer is fine; an empty band is not.
        await page.waitForTimeout(2500);
        const renderer = await page.locator('.pipeline-art').getAttribute('data-renderer');
        assert.ok(['webgl', 'still'].includes(renderer));
        if (renderer === 'still') assert.equal(await page.locator('.cuboid-still').isVisible(), true);
        await page.locator('.pipeline-node').nth(3).click();
        await page.locator('.pipeline-art.tone-orange').waitFor();
        await page.locator('.pipeline-node').nth(1).focus();
        await page.keyboard.press('Enter');
        await page.locator('.pipeline-art.tone-green').waitFor();
        assert.deepEqual(errors, [], `${name} ${lang} ${width}`);
        checks += 6;
        console.log(`${name} ${lang} ${width}px: ${renderer}`);
        await context.close();
      }
  } finally {
    await browser.close();
  }
}
console.log(`${checks} cross-browser checks passed (Firefox, WebKit; AR/EN; 390 and 1440).`);
