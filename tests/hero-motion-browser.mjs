// The hero's sculpture: a still drawing that is always there, a moving canvas when the browser
// can draw it, the colour of the step being shown, and no shift or overflow when it loads.
// Usage: npm run build && node scripts/preview.mjs --port 5199 & node tests/hero-motion-browser.mjs http://127.0.0.1:5199
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:5199';
const browser = await chromium.launch();
let count = 0;

async function open(path, width, { reducedMotion = 'no-preference', webgl = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route =>
    new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort(),
  );
  await page.addInitScript(allowWebgl => {
    // Layout shifts are summed from the first paint.
    window.__shift = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shift += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    if (!allowWebgl) {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
        return kind === 'webgl2' ? null : original.call(this, kind, ...rest);
      };
    }
  }, webgl);
  await page.goto(base + path);
  await page.locator('.pipeline-art').waitFor();
  return { page, context, errors };
}
const art = page => page.locator('.pipeline-art');
// Read inside an animation frame, after the sculpture's own draw: a WebGL buffer is only readable then.
const inked = page =>
  page.evaluate(
    () =>
      new Promise(resolve =>
        requestAnimationFrame(() => {
          const canvas = document.querySelector('.cuboid-canvas');
          const copy = document.createElement('canvas');
          copy.width = canvas.width;
          copy.height = canvas.height;
          const ctx = copy.getContext('2d');
          ctx.drawImage(canvas, 0, 0);
          const { data } = ctx.getImageData(0, 0, copy.width, copy.height);
          let drawn = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i] > 0) drawn++;
          resolve(drawn);
        }),
      ),
  );

try {
  for (const [path, lang] of [
    ['/', 'ar'],
    ['/en', 'en'],
  ])
    for (const width of [320, 375, 1440]) {
      // 1. Motion allowed: the canvas takes over from the still drawing.
      const moving = await open(path, width);
      assert.equal(await art(moving.page).getAttribute('aria-hidden'), 'true', 'decoration is hidden from readers');
      assert.equal(await moving.page.locator('.cuboid-still use').count(), 48, 'the still drawing is in the page');
      const before = await art(moving.page).boundingBox();
      await moving.page.locator('.pipeline-art[data-renderer="webgl"]').waitFor({ timeout: 15000 });
      const after = await art(moving.page).boundingBox();
      assert.deepEqual(
        [after.width, after.height],
        [before.width, before.height],
        'the band keeps its size when the canvas loads',
      );
      await moving.page.waitForTimeout(400);
      assert.ok((await inked(moving.page)) > 0, 'the canvas has drawn the blocks');
      // Picking a step gives the sculpture that step's colour.
      await moving.page.locator('.pipeline-node').nth(1).click();
      await moving.page.locator('.pipeline-art.tone-green').waitFor();
      const [artColor, stepColor] = await moving.page.evaluate(() => [
        getComputedStyle(document.querySelector('.pipeline-art')).color,
        getComputedStyle(document.querySelector('.pipeline-step.tone-green .pipeline-node-icon')).backgroundColor,
      ]);
      assert.equal(artColor, stepColor, 'the blocks take the colour of the step shown');
      assert.ok((await moving.page.evaluate(() => window.__shift)) < 0.1, 'no layout shift');
      assert.equal(
        await moving.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        true,
        'no overflow',
      );
      assert.deepEqual(moving.errors, [], `${lang} ${width}: page errors`);
      count += 8;
      await moving.context.close();

      // 2. Reduced motion: the canvas shows the step as a still frame and never runs a loop.
      const reduced = await open(path, width, { reducedMotion: 'reduce' });
      await reduced.page.locator('.pipeline-art[data-renderer="webgl"]').waitFor({ timeout: 15000 });
      const frames = await reduced.page.evaluate(
        () =>
          new Promise(resolve => {
            let calls = 0;
            const real = window.requestAnimationFrame;
            window.requestAnimationFrame = callback => {
              calls++;
              return real(callback);
            };
            setTimeout(() => resolve(calls), 800);
          }),
      );
      assert.ok(frames <= 2, `reduced motion draws on demand, not every frame (${frames})`);
      assert.deepEqual(reduced.errors, []);
      count += 2;
      await reduced.context.close();

      // 3. No WebGL2: the still drawing stays, in the step's colour, with no error.
      const plain = await open(path, width, { webgl: false });
      await plain.page.waitForTimeout(2500);
      assert.equal(await art(plain.page).getAttribute('data-renderer'), 'still');
      assert.equal(await plain.page.locator('.cuboid-still').isVisible(), true);
      assert.equal(await plain.page.locator('.cuboid-canvas').isVisible(), false, 'no empty canvas over the drawing');
      assert.deepEqual(plain.errors, []);
      count += 4;
      await plain.context.close();
      console.log(`Hero sculpture passed (${lang}, ${width}px).`);
    }
  console.log(`${count} hero sculpture checks passed (moving, reduced motion, no WebGL; AR/EN; 320–1440).`);
} finally {
  await browser.close();
}
