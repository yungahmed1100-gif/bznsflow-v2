// What a release changes on screen: every public page and the demo dashboards,
// Arabic and English, desktop and phone, captured from a baseline build and
// from this checkout's build and compared pixel by pixel and by accessibility tree.
//
//   npm run build
//   node scripts/visual-diff.mjs --base green-p1 [--expect tests/fixtures/visual-p2.json]
//
// --base <ref>      git ref to compare with; built once in work/visual-base/<ref>
// --base-dir <dir>  an existing checkout (with dist/) to compare with instead
// --expect <file>   JSON { "<screen> <pixels|aria>": "reason" }: differences the release intends
// --out <dir>       where diff images and report.json go (default work/visual-diff)
// --only <regex>    capture only the screens whose name matches
//
// Every screen is captured signed out (API answered synthetically) or from the
// real-logic demo, with a frozen clock, reduced motion and fonts loaded. Exit 1
// when a difference is not expected, or an expected one did not occur.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { signedOut } from '../tests/helpers/browser-mocks.mjs';
import { compareAria, comparePixels, differenceKey, matchExpectations } from './lib/visual-compare.mjs';

const args = process.argv.slice(2);
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const OUT = resolve(option('--out') || 'work/visual-diff');
const ONLY = option('--only') ? new RegExp(option('--only')) : null;
const FROZEN = new Date('2026-11-12T08:00:00Z');
const FIXED_CLOCK = pathToFileURL(resolve('scripts/lib/fixed-clock.mjs')).href;
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, phone: { width: 375, height: 812 } };
const CONCURRENCY = 4;
// Demo dashboards: name, demo flags. Each opens its home and every tab it lists.
const DEMOS = [
  ['ascend retail', []],
  ['catalyst', ['--plan=catalyst']],
  ['employee', ['--role=employee']],
];
// Both builds are served on the same ports in turn, so nothing that shows the page's own address differs.
const PORTS = { static: 5299, demo: 5300 };

function run(command, commandArgs, cwd) {
  execFileSync(command, commandArgs, { cwd, stdio: 'inherit' });
}

/** A checkout of `ref` with a production build, made once and reused. */
function baseCheckout(ref) {
  const dir = resolve('work/visual-base', ref.replace(/[^\w.-]/g, '_'));
  if (!existsSync(dir)) run('git', ['worktree', 'add', '--detach', dir, ref]);
  if (!existsSync(join(dir, 'node_modules'))) run('npm', ['ci', '--no-audit', '--no-fund'], dir);
  if (!existsSync(join(dir, 'dist'))) run('npm', ['run', 'build'], dir);
  return dir;
}

/** Starts a server from `dir` and resolves once it prints `ready`. */
function serve(dir, script, scriptArgs, ready) {
  // The demo seeds its sample data from the process clock: start both builds at the browser's frozen instant.
  const child = spawn(process.execPath, ['--import', FIXED_CLOCK, script, ...scriptArgs], {
    cwd: dir,
    env: { ...process.env, FIXED_CLOCK_START: FROZEN.toISOString() },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const started = new Promise((resolveStart, reject) => {
    child.stdout.on('data', chunk => String(chunk).includes(ready) && resolveStart());
    child.on('exit', code => reject(new Error(`${script} in ${dir} exited with ${code}`)));
  });
  return { child, started };
}

async function pool(items, work) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) await work(queue.shift());
    }),
  );
}

async function capture(browser, url, viewport, mockApi) {
  const context = await browser.newContext({ viewport: VIEWPORTS[viewport], reducedMotion: 'reduce' });
  await context.clock.setFixedTime(FROZEN);
  if (mockApi) await signedOut(context);
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.dismiss().catch(() => {}));
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    // Lazy images below the fold would otherwise load in one capture and not the other.
    await page.evaluate(async () => {
      for (const image of document.images) image.loading = 'eager';
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
      await document.fonts.ready;
    });
    const png = await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
    const aria = await page.locator('body').ariaSnapshot();
    return { png, aria };
  } finally {
    await context.close();
  }
}

/** Every screen to compare: [name, path, viewport, demo name or null]. */
async function screens(browser, demoBase) {
  const { default: config } = await import('../react-router.config.ts');
  const list = [];
  for (const path of config.prerender.filter(p => !/\/layla\/dashboard$/.test(p)))
    for (const viewport of Object.keys(VIEWPORTS)) list.push([`${path} @${viewport}`, path, viewport, null]);
  for (const [demo] of DEMOS)
    for (const prefix of ['', '/en']) {
      const root = `${prefix}/layla/dashboard`;
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
      await page.goto(`${demoBase(demo)}${root}`, { waitUntil: 'networkidle' });
      const tabs = await page.$$eval('[data-section]', els => [...new Set(els.map(e => e.dataset.section))]);
      await page.close();
      for (const path of [root, ...tabs.map(tab => `${root}?tab=${tab}`)])
        for (const viewport of Object.keys(VIEWPORTS))
          list.push([`${demo}: ${path} @${viewport}`, path, viewport, demo]);
    }
  return ONLY ? list.filter(([name]) => ONLY.test(name)) : list;
}

const baseDir = option('--base-dir')
  ? resolve(option('--base-dir'))
  : option('--base') && baseCheckout(option('--base'));
if (!baseDir) throw new Error('Pass --base <git ref> or --base-dir <checkout>.');
if (!existsSync('dist')) throw new Error('Build this checkout first: npm run build.');
const expected = option('--expect') ? JSON.parse(await readFile(option('--expect'), 'utf8')) : {};

const sides = { base: baseDir, head: process.cwd() };
const staticUrl = `http://127.0.0.1:${PORTS.static}`;
const demoUrl = demo => `http://127.0.0.1:${PORTS.demo + DEMOS.findIndex(([name]) => name === demo) * 2}`;
const urlOf = (path, demo) => `${demo === null ? staticUrl : demoUrl(demo)}${path}`;

/** Serves one build, runs `work` against it, and stops its servers. */
async function withServers(dir, work) {
  const servers = [serve(dir, 'scripts/preview.mjs', ['--port', String(PORTS.static)], 'Static preview')];
  for (const [i, [, flags]] of DEMOS.entries())
    servers.push(serve(dir, 'scripts/hasib-demo.mjs', [String(PORTS.demo + i * 2), ...flags], 'Hasib demo'));
  try {
    await Promise.all(servers.map(server => server.started));
    return await work();
  } finally {
    for (const server of servers) server.child.kill();
    await Promise.all(servers.map(server => new Promise(done => server.child.once('exit', done))));
  }
}

const browser = await chromium.launch();
const differences = new Map();
try {
  const list = await withServers(sides.head, () => screens(browser, demoUrl));
  const captures = { base: new Map(), head: new Map() };
  for (const [side, dir] of Object.entries(sides))
    await withServers(dir, () =>
      pool(list, async ([name, path, viewport, demo]) =>
        captures[side].set(name, await capture(browser, urlOf(path, demo), viewport, demo === null)),
      ),
    );
  await mkdir(OUT, { recursive: true });
  for (const [name] of list) {
    const base = captures.base.get(name);
    const head = captures.head.get(name);
    const pixels = comparePixels(base.png, head.png);
    const aria = compareAria(base.aria, head.aria);
    const file = name.replace(/[^\w@.-]+/g, '_');
    if (pixels.size || pixels.pixels) {
      differences.set(differenceKey(name, 'pixels'), pixels.size || `${pixels.pixels} pixels`);
      await writeFile(join(OUT, `${file}.base.png`), base.png);
      await writeFile(join(OUT, `${file}.head.png`), head.png);
      if (pixels.diff) await writeFile(join(OUT, `${file}.diff.png`), pixels.diff);
    }
    if (aria.removed.length || aria.added.length)
      differences.set(
        differenceKey(name, 'aria'),
        [...aria.removed.map(l => `- ${l}`), ...aria.added.map(l => `+ ${l}`)].join('\n'),
      );
  }

  const verdict = matchExpectations([...differences.keys()].sort(), expected);
  await writeFile(
    join(OUT, 'report.json'),
    JSON.stringify(
      { base: baseDir, screens: list.length, ...verdict, details: Object.fromEntries(differences) },
      null,
      2,
    ),
  );
  for (const key of verdict.expected) console.log(`expected  ${key}: ${expected[key]}`);
  for (const key of verdict.unexpected)
    console.error(`UNEXPECTED ${key}\n  ${differences.get(key).split('\n').join('\n  ')}`);
  for (const key of verdict.missing) console.error(`DID NOT OCCUR ${key}: ${expected[key]}`);
  console.log(
    `Visual diff: ${list.length} screens, ${differences.size} differences ` +
      `(${verdict.expected.length} expected, ${verdict.unexpected.length} unexpected, ` +
      `${verdict.missing.length} expected but not seen). Report: ${join(OUT, 'report.json')}`,
  );
  process.exitCode = verdict.unexpected.length || verdict.missing.length ? 1 : 0;
} finally {
  await browser.close();
}
