// Where every link and button leads, on every page, for every kind of account.
//
//   npm run build && node tests/nav-crawl-browser.mjs http://127.0.0.1:5199
//
// Public pages: every prerendered page, Arabic and English, desktop and phone,
// signed out (API answers are synthetic). Every link must reach a page in the
// same language (or the page's own twin), every #anchor must exist, external
// links go only to reviewed hosts, and every visible button must do something
// a person can see when clicked.
//
// Dashboards: the real-logic demo (scripts/hasib-demo.mjs) for every sector
// pack, a Catalyst account and an employee. Every tab must be reachable on
// desktop and on a phone (tab bar or More), open as itself rather than falling
// back, and every view of it must open; every link inside must lead somewhere.
//
// Findings that are already known are listed in KNOWN_BROKEN with the fix that
// removes them. The list must match exactly: a new problem fails, and so does a
// fixed one that is still listed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { classifyLink } from './helpers/nav-crawl/links.mjs';
import { KNOWN_BROKEN } from './helpers/nav-crawl/known-broken.mjs';
import { intentProblems } from './helpers/nav-crawl/intents.mjs';
import { clickEffect } from './helpers/nav-crawl/buttons.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const { default: config } = await import('../react-router.config.ts');
const PRERENDERED = new Set(config.prerender);
const PUBLIC = config.prerender.filter(p => !/\/layla\/dashboard$/.test(p));
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, phone: { width: 375, height: 812 } };
const DASHBOARDS = [
  ['retail', []],
  ['retail-tech', ['--pack=retail-tech']],
  ['real-estate', ['--pack=real-estate']],
  ['media', ['--pack=media']],
  ['fitness', ['--pack=fitness']],
  ['dental', ['--pack=dental']],
  ['hvac', ['--pack=hvac']],
  ['construction', ['--pack=construction']],
  ['automotive', ['--pack=automotive']],
  ['catalyst', ['--plan=catalyst']],
  ['retail employee', ['--role=employee']],
];

const CONCURRENCY = 4;
// Root cause → the places it was seen. The key is the same on every page and
// in both languages, so one fix clears one entry.
const findings = new Map();

/** Runs `work` over `items`, at most CONCURRENCY at a time. */
async function pool(items, work) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) await work(queue.shift());
    }),
  );
}
const report = (where, text, key = text.replace(/\/en(?=\/|$)/g, '')) => {
  if (!findings.has(key)) findings.set(key, []);
  findings.get(key).push(`${where}: ${text}`);
};
let checks = 0;

/** Signed out, with every API answered synthetically so pages settle quickly. */
async function signedOut(context) {
  await context.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth-session')
      return route.fulfill({ json: { account: null, csrfToken: 'c'.repeat(64) } });
    if (route.request().method() === 'GET')
      return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
    return route.fulfill({ json: { ok: true } });
  });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route => route.abort());
}

async function open(context, url) {
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.dismiss().catch(() => {}));
  await page.goto(url, { waitUntil: 'networkidle' });
  return page;
}

const links = page =>
  page.$$eval('a[href]', anchors =>
    anchors.map(a => ({
      href: a.href,
      raw: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      className: a.className,
      text: (a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    })),
  );

const ids = new Map();
async function idsOn(context, url) {
  if (!ids.has(url)) {
    const page = await open(context, url);
    ids.set(url, new Set(await page.$$eval('[id]', els => els.map(e => e.id))));
    await page.close();
  }
  return ids.get(url);
}

/** Checks every link on the page; returns the internal ones with a query, for dashboards. */
async function checkLinks(context, page, where) {
  const found = await links(page);
  const queries = [];
  for (const link of found) {
    const result = classifyLink(link, page.url(), PRERENDERED);
    checks++;
    const label = `"${link.text || link.raw}" → ${link.raw}`;
    for (const { key, text } of intentProblems(link, page.url())) report(where, `${label}: ${text}`, key);
    if (result.problem) {
      report(where, `${label}: ${result.problem}`, result.problem.replace(/\/en(?=\/|$)/g, ''));
      continue;
    }
    if (result.kind === 'anchor' && !(await page.$(`[id="${result.hash.slice(1)}"]`)))
      report(where, `${label}: no element ${result.hash} on this page`);
    if (result.kind === 'internal' && result.hash) {
      const target = new URL(link.href);
      if (!(await idsOn(context, `${target.origin}${target.pathname}${target.search}`)).has(result.hash.slice(1)))
        report(where, `${label}: no element ${result.hash} on ${result.path}`);
    }
    if (result.kind === 'internal' && result.search) queries.push({ ...link, ...result });
  }
  return queries;
}

/** Clicks every visible, enabled button once, each on a freshly loaded page. */
async function checkButtons(context, url, where) {
  // An option already chosen (pressed, selected or current) rightly does nothing when chosen again.
  const chosen = ':not([aria-pressed="true"]):not([aria-selected="true"]):not([aria-current])';
  const selector = [
    `button:visible:enabled${chosen}`,
    `[role="button"]:visible${chosen}`,
    'input[type="submit"]:visible:enabled',
  ].join(', ');
  const first = await open(context, url);
  const count = await first.locator(selector).count();
  await first.close();
  for (let i = 0; i < count; i++) {
    const page = await open(context, url);
    const button = page.locator(selector).nth(i);
    if (!(await button.count())) {
      await page.close();
      continue;
    }
    const name = ((await button.getAttribute('aria-label')) || (await button.innerText()).trim() || `button ${i + 1}`)
      .replace(/\s+/g, ' ')
      .slice(0, 40);
    const effect = await clickEffect(page, button);
    checks++;
    if (!effect) report(where, `button "${name}" does nothing visible`);
    await page.close();
  }
}

async function crawlPublic(browser) {
  for (const [viewport, size] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
    await signedOut(context);
    await pool(PUBLIC, async path => {
      const page = await open(context, `${BASE}${path}`);
      await checkLinks(context, page, `${path} (${viewport})`);
      await page.close();
      if (viewport === 'desktop') await checkButtons(context, `${BASE}${path}`, path);
    });
    await context.close();
  }
}

function demo(port, flags) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), ...flags], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => String(chunk).includes('Hasib demo') && resolve());
    child.on('exit', code => reject(new Error(`demo ${flags.join(' ')} exited with ${code}`)));
  });
  return { child, ready, base: `http://127.0.0.1:${port}` };
}

const tabsIn = (page, attribute) =>
  page.$$eval(
    `[${attribute}]`,
    (els, name) => [...new Set(els.map(e => e.getAttribute(name)).filter(Boolean))],
    attribute,
  );

async function crawlDashboard(browser, name, flags, port) {
  const server = demo(port, flags);
  await server.ready;
  try {
    for (const prefix of ['', '/en']) {
      const root = `${server.base}${prefix}/layla/dashboard`;
      const desktop = await browser.newContext({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
      const home = await open(desktop, root);
      const tabs = await tabsIn(home, 'data-section');
      await home.close();
      assert.ok(tabs.length >= 3, `${name}: the dashboard lists its tabs`);
      const queries = [];
      for (const tab of tabs) {
        const page = await open(desktop, `${root}?tab=${tab}`);
        const current = await page.getAttribute('[data-section][aria-current="page"]', 'data-section');
        checks++;
        if (current !== tab) report(`${name}${prefix}`, `?tab=${tab} opens ${current} instead`);
        queries.push(...(await checkLinks(desktop, page, `${name}${prefix} ?tab=${tab}`)));
        const views = await page.$$eval('.ld-section-tabs a[href]', as => as.map(a => a.getAttribute('href')));
        await page.close();
        for (const href of views) {
          const view = new URLSearchParams(href.slice(1)).get('view');
          const viewPage = await open(desktop, `${root}${href}`);
          const shown = await viewPage
            .locator('.ld-section-tabs a[aria-current="page"]')
            .getAttribute('href')
            .catch(() => null);
          checks++;
          if (!shown || new URLSearchParams(shown.slice(1)).get('view') !== view)
            report(`${name}${prefix}`, `${href} does not open the ${view} view`);
          await viewPage.close();
        }
      }
      // Every in-dashboard link with a query must open what it names.
      for (const link of queries) {
        const wanted = new URL(link.href).searchParams;
        if (!wanted.get('tab')) continue;
        const page = await open(desktop, link.href);
        const current = await page.getAttribute('[data-section][aria-current="page"]', 'data-section');
        checks++;
        if (current !== wanted.get('tab'))
          report(`${name}${prefix}`, `"${link.text}" → ${link.raw}: opens ${current} instead of ${wanted.get('tab')}`);
        await page.close();
      }
      await desktop.close();
      // On a phone every tab is in the tab bar or behind More.
      const phone = await browser.newContext({ viewport: VIEWPORTS.phone, reducedMotion: 'reduce' });
      const page = await open(phone, root);
      const bar = await tabsIn(page, 'data-tab');
      const more = page.locator('.ld-tabbar-more');
      if (await more.count()) await more.click();
      const reachable = new Set([...bar, ...(await tabsIn(page, 'data-section'))]);
      for (const tab of tabs) {
        checks++;
        if (!reachable.has(tab)) report(`${name}${prefix} (phone)`, `tab ${tab} cannot be reached`);
      }
      await phone.close();
    }
  } finally {
    server.child.kill();
  }
}

const browser = await chromium.launch();
try {
  await crawlPublic(browser);
  await pool(
    DASHBOARDS.map(([name, flags], i) => [name, flags, 5520 + i * 2]),
    ([name, flags, port]) => crawlDashboard(browser, name, flags, port),
  );
} finally {
  await browser.close();
}

const actual = [...findings.keys()].sort();
for (const key of actual.filter(k => !KNOWN_BROKEN.has(k)))
  console.error(
    `NEW: ${key}\n  ${findings.get(key).slice(0, 3).join('\n  ')}${findings.get(key).length > 3 ? `\n  … and ${findings.get(key).length - 3} more` : ''}`,
  );
assert.deepEqual(
  actual.filter(k => !KNOWN_BROKEN.has(k)),
  [],
  'new navigation problems (fix them, or list them in tests/helpers/nav-crawl/known-broken.mjs with the fix)',
);
assert.deepEqual(
  [...KNOWN_BROKEN.keys()].filter(k => !findings.has(k)),
  [],
  'fixed problems still listed as known: remove them from known-broken.mjs',
);
console.log(
  `Navigation crawl: ${checks} checks passed on ${PUBLIC.length} public pages and ${DASHBOARDS.length} dashboards ` +
    `(Arabic and English); ${KNOWN_BROKEN.size} known problems, seen in ${actual.reduce((n, k) => n + findings.get(k).length, 0)} places.`,
);
