// A link with ?action= opens that form in each six-tab workspace (Today cards and
// older links use them). Pinned before the effect moved into useWorkspaceShell on
// 14 Nov 2026, and run on the real-logic demo of each sector.
// Usage: npm run build && node tests/action-links-browser.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const CASES = [
  { pack: 'dental', port: 5371, action: 'visit' },
  { pack: 'hvac', port: 5372, action: 'job' },
  { pack: 'media', port: 5373, action: 'brief' },
  { pack: 'real-estate', port: 5374, action: 'property' },
  { pack: 'real-estate', port: 5374, action: 'follow-up' },
  { pack: 'fitness', port: 5375, action: 'membership' },
  { pack: 'fitness', port: 5375, action: 'class' },
];

function demo(pack, port) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), `--pack=${pack}`], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => String(chunk).includes('Hasib demo') && resolve());
    child.on('exit', code => reject(new Error(`${pack} demo exited with ${code}`)));
  });
  return { child, ready };
}

const demos = new Map();
for (const { pack, port } of CASES) if (!demos.has(port)) demos.set(port, demo(pack, port));
const browser = await chromium.launch();
let checks = 0;
try {
  await Promise.all([...demos.values()].map(d => d.ready));
  for (const c of CASES) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = `http://127.0.0.1:${c.port}/en/layla/dashboard`;
    await page.goto(`${base}?tab=work&action=${c.action}`);
    await page.locator('.hb-action-fields').first().waitFor({ timeout: 15000 });
    assert.deepEqual(errors, [], `${c.pack} ${c.action}: no errors`);
    checks += 2;
    // Without an action the same workspace opens no form.
    await page.goto(`${base}?tab=work`);
    await page.locator('#ld-main[data-tab]').waitFor();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.hb-action-fields').count(), 0, `${c.pack}: no form without an action`);
    checks++;
    await context.close();
  }
  console.log(`Action links: ${checks} checks passed (${[...new Set(CASES.map(c => c.pack))].join(', ')}).`);
} finally {
  await browser.close();
  for (const d of demos.values()) d.child.kill();
}
