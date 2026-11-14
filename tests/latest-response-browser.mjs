// Only the newest answer may fill a view. The automotive and construction
// dashboards (and the clinic preview) reuse one component across their Team and
// workshop/site views and reload when the view changes. Until 14 Nov 2026 a slow
// answer for the view just left could arrive last and replace the new view's
// data: the team list landing in workshop settings.
// Usage: npm run build && node tests/latest-response-browser.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { settle } from './helpers/settle.mjs';

const SLOW_MS = 1500;
const CASES = [
  { pack: 'automotive', port: 5381, from: 'team', to: 'workshop' },
  { pack: 'construction', port: 5382, from: 'team', to: 'site' },
];

function demo({ pack, port }) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), `--pack=${pack}`], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => String(chunk).includes('Hasib demo') && resolve());
    child.on('exit', code => reject(new Error(`${pack} demo exited with ${code}`)));
  });
  return { child, ready, base: `http://127.0.0.1:${port}` };
}

/** The headings a view shows: enough to tell Team from workshop or site settings. */
const headings = page =>
  page.locator('#ld-main').evaluate(main => [...main.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim()));

const demos = CASES.map(demo);
const browser = await chromium.launch();
let checks = 0;
try {
  await Promise.all(demos.map(d => d.ready));
  for (const [i, c] of CASES.entries()) {
    const { base } = demos[i];
    const url = view => `${base}/en/layla/dashboard?tab=settings&view=${view}`;
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });

    // What the destination view shows when opened directly.
    const direct = await context.newPage();
    await settle(direct, url(c.to));
    await direct.waitForTimeout(300);
    const expected = await headings(direct);
    await direct.close();

    // Open the first view with its team list held back, then switch before it answers.
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // A render crash is caught by the error boundary, so it shows up as a console error, not a page error.
    page.on(
      'console',
      m => m.type() === 'error' && /TypeError|Cannot read|is not/.test(m.text()) && errors.push(m.text()),
    );
    let held = false;
    await page.route('**/api/**', async route => {
      const body = route.request().postData() || '';
      if (!held && body.includes('"action":"team_list"')) {
        held = true;
        await new Promise(resolve => setTimeout(resolve, SLOW_MS));
      }
      return route.continue();
    });
    await page.goto(url(c.from));
    await page.locator('#ld-main[data-tab]').waitFor();
    await page.locator(`#ld-main a[href*="view=${c.to}"]`).first().click();
    await page.waitForURL(new RegExp(`view=${c.to}`));
    await page.waitForTimeout(SLOW_MS + 1000);
    assert.ok(held, `${c.pack}: the team list was held back`);
    assert.deepEqual(errors, [], `${c.pack}: no errors`);
    assert.equal(await page.locator('#ld-main').count(), 1, `${c.pack}: the dashboard is still on screen`);
    assert.deepEqual(await headings(page), expected, `${c.pack}: ${c.to} keeps its own data after the late answer`);
    checks += 4;
    await context.close();
  }
  console.log(`Latest response wins: ${checks} checks passed (${CASES.map(c => c.pack).join(', ')}).`);
} finally {
  await browser.close();
  for (const d of demos) d.child.kill();
}
