import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PAGES, SITE } from '../src/routes-manifest.js';

const base = process.argv[2] || 'http://127.0.0.1:5199';
const capture = process.argv.includes('--capture');
const output = process.env.SITE_AUDIT_OUT || 'work/site-audit';
await mkdir(output, { recursive: true });
const config = await readFile('react-router.config.ts', 'utf8');
const routes = JSON.parse(config.match(/prerender:\s*(\[[\s\S]*?\])/)[1]);
const publicPaths = new Set(PAGES.flatMap(({ path }) => [path, path === '/' ? '/en' : `/en${path}`]));
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
const redirectPaths = new Set(vercel.redirects.map(row => row.source));
const browser = await chromium.launch();
const report = [];
const assetFailures = new Set();
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('bf_playbook_seen', '1'));
    for (const path of routes) {
      const page = await context.newPage();
      const errors = [];
      const findings = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /did not match|hydration|server html/i.test(message.text())) errors.push(message.text()); });
      page.on('response', response => { const url = new URL(response.url()); if (url.origin === new URL(base).origin && !url.pathname.startsWith('/api/') && response.status() >= 400) assetFailures.add(`${response.status()} ${url.pathname}`); });
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(base).origin) return route.abort();
        if (url.pathname.startsWith('/_vercel/')) return route.fulfill({ contentType: 'application/javascript', body: '' });
        if (url.pathname === '/api/auth-session') return route.fulfill({ json: { ok: true, account: null } });
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
        return route.continue();
      });
      try {
        const response = await page.goto(base + path, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        if (response.status() !== 200) findings.push(`HTTP ${response.status()}`);
        const ar = !path.startsWith('/en');
        const state = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title, overflow: document.documentElement.scrollWidth > innerWidth + 1, h1: [...document.querySelectorAll('h1')].map(h => h.textContent), canonical: document.querySelector('link[rel=canonical]')?.href, noindex: document.querySelector('meta[name=robots]')?.content.includes('noindex'), links: [...document.querySelectorAll('a[href]')].map(a => a.href), ids: [...document.querySelectorAll('[id]')].map(el => el.id) }));
        if (state.lang !== (ar ? 'ar' : 'en') || state.dir !== (ar ? 'rtl' : 'ltr')) findings.push('Incorrect locale/direction');
        if (state.overflow) findings.push('Horizontal overflow');
        if (!state.title) findings.push('Missing title');
        if (publicPaths.has(path)) {
          if (state.h1.length !== 1) findings.push(`Expected one h1; found ${state.h1.length}`);
          if (!state.canonical) findings.push('Missing canonical');
          if (state.noindex) findings.push('Public page marked noindex');
          const stable = await page.addStyleTag({ content: '[data-reveal] { transition: none !important; animation: none !important; }' });
          const axe = (await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact));
          for (const item of axe) findings.push(`${item.id}: ${item.nodes.map(n => n.target.join(' ')).join(', ')}`);
          await stable.evaluate(el => el.remove());
        } else if (!state.noindex) findings.push('Private page missing noindex');
        if (errors.length) findings.push(...errors);
        const screenshot = `${path === '/' ? 'home-ar' : path.slice(1).replaceAll('/', '-')}-${width}.png`;
        if (capture && publicPaths.has(path)) {
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          await page.screenshot({ path: `${output}/${screenshot}` });
        }
        report.push({ path, width, scope: publicPaths.has(path) ? 'public-page' : 'signed-out-route-smoke', finalPath: new URL(page.url()).pathname, ...state, errors, findings, ...(capture && publicPaths.has(path) ? { screenshot } : {}) });
      } catch (error) { report.push({ path, width, findings: [error.message] }); }
      await page.close();
    }
    await context.close();
  }
  const brokenLinks = new Set();
  for (const row of report) for (const href of row.links || []) {
    const url = new URL(href);
    if (![new URL(base).origin, SITE].includes(url.origin)) continue;
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/oauth')) continue;
    if (!routes.includes(url.pathname) && !redirectPaths.has(url.pathname)) {
      const file = resolve('dist', '.' + decodeURIComponent(url.pathname));
      if (!(await stat(file).catch(() => null))?.isFile()) brokenLinks.add(`${row.path} → ${url.pathname}`);
    }
    if (url.hash && publicPaths.has(url.pathname)) {
      const target = report.find(page => page.path === url.pathname && page.width === row.width);
      if (Array.isArray(target?.ids) && !target.ids.includes(decodeURIComponent(url.hash.slice(1)))) brokenLinks.add(`${row.path} → ${url.pathname}${url.hash}`);
    }
  }
  const result = { source: 'local production build; all API/provider traffic synthetic or blocked; private routes are signed-out render smoke, authenticated behavior is covered by dedicated suites', routeCount: routes.length, checks: report.length, assetFailures: [...assetFailures], brokenLinks: [...brokenLinks], pages: report };
  await writeFile(`${output}/report.json`, JSON.stringify(result, null, 2));
  const failures = report.filter(row => row.findings.length);
  console.log(`${report.length} route/viewport audits across ${routes.length} paths. ${failures.length} pages with findings; ${assetFailures.size} failed local assets; ${brokenLinks.size} broken internal links.`);
  for (const row of failures) console.log(`${row.path} ${row.width}: ${row.findings.join('; ')}`);
  for (const link of brokenLinks) console.log(link);
  if (failures.length || assetFailures.size || brokenLinks.size) process.exitCode = 1;
} finally { await browser.close(); }
