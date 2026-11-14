// Production read-only audit. Real anonymous GETs; no API fixtures or live writes.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { PAGES, SITE } from '../src/routes-manifest.js';

const origin = SITE;
const output = process.env.LIVE_AUDIT_OUT || 'work/live-deployment-audit';
await mkdir(output, { recursive: true });
const config = await readFile('react-router.config.ts', 'utf8');
const paths = JSON.parse(config.match(/prerender:\s*(\[[\s\S]*?\])/)[1]);
const publicPaths = new Set(PAGES.flatMap(({ path }) => [path, path === '/' ? '/en' : `/en${path}`]));
const redirects = JSON.parse(await readFile('vercel.json', 'utf8')).redirects.map(r => r.source);
const blocked = new Set(), assetFailures = new Set(), apiResponses = new Set();
const intentionalAborts = new WeakSet();
const pages = [];
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    // No session/cookie import. Marketing collection and all writes are denied.
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      const createsLegacyDraft = url.pathname === '/api/layla-meta' && ['customer', 'customer-review'].includes(url.searchParams.get('surface'));
      if (url.origin !== origin || !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || /^\/(ingest|_vercel|email)(\/|$)/.test(url.pathname) || createsLegacyDraft) {
        blocked.add(`${request.method()} ${url.origin}${url.pathname}`);
        intentionalAborts.add(request);
        return route.abort();
      }
      return route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('bf_playbook_seen', '1'));
    for (const path of paths) {
      const page = await context.newPage(), errors = [], findings = [];
      let closing = false;
      const pendingApi = new Set();
      page.setDefaultTimeout(15000);
      page.on('request', request => { const u = new URL(request.url()); if (u.origin === origin && u.pathname.startsWith('/api/')) pendingApi.add(request); });
      page.on('requestfinished', request => pendingApi.delete(request));
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => {
        // Some 401 handlers intentionally leave the body unread. The response
        // status is sufficient for admission readiness; transport errors remain tracked.
        pendingApi.delete(r.request());
        const url = new URL(r.url());
        if (url.origin !== origin) return;
        if (url.pathname.startsWith('/api/')) {
          apiResponses.add(`${r.status()} ${url.pathname}`);
          if (r.status() >= 500) findings.push(`API HTTP ${r.status()}: ${url.pathname}`);
        }
        else if (r.status() >= 400 && !/^\/(ingest|_vercel)\//.test(url.pathname)) assetFailures.add(`${r.status()} ${url.pathname}`);
      });
      page.on('requestfailed', request => {
        pendingApi.delete(request);
        if (closing || intentionalAborts.has(request)) return;
        const url = new URL(request.url());
        if (url.origin === origin) findings.push(`Transport failure: ${url.pathname} (${request.failure()?.errorText || 'unknown'})`);
      });
      try {
        const response = await page.goto(origin + path, { waitUntil: 'load', timeout: 30000 });
        if (path.endsWith('/layla/dashboard')) await page.waitForURL(url => url.pathname === (path.startsWith('/en') ? '/en/catalyst/setup' : '/catalyst/setup'), { waitUntil: 'load', timeout: 15000 });
        await page.locator('main').first().waitFor({ state: 'visible' });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const deadline = Date.now() + 10000;
        while (pendingApi.size && Date.now() < deadline) await page.waitForTimeout(100);
        if (pendingApi.size) findings.push('Initial API responses not received within 10 seconds');
        const state = await page.evaluate(() => ({
          lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          h1: [...document.querySelectorAll('h1')].map(h => h.textContent),
          canonical: document.querySelector('link[rel=canonical]')?.href,
          noindex: /noindex/.test(document.querySelector('meta[name=robots]')?.content || ''),
          links: [...document.querySelectorAll('a[href]')].map(a => a.href),
          ids: [...document.querySelectorAll('[id]')].map(e => e.id),
        }));
        const ar = !new URL(page.url()).pathname.startsWith('/en');
        const headers = response.headers();
        const securityHeaders = { cacheControl: headers['cache-control'], robots: headers['x-robots-tag'], referrer: headers['referrer-policy'] };
        if (response.status() !== 200) findings.push(`HTTP ${response.status()}`);
        if (headers['x-content-type-options'] !== 'nosniff') findings.push('Missing nosniff header');
        if (headers['x-frame-options'] !== 'DENY') findings.push('Missing frame protection');
        if (state.lang !== (ar ? 'ar' : 'en') || state.dir !== (ar ? 'rtl' : 'ltr')) findings.push('Incorrect language/direction');
        if (state.overflow) findings.push('Horizontal overflow');
        if (!state.title) findings.push('Missing title');
        if (publicPaths.has(path)) {
          if (new URL(page.url()).pathname !== path) findings.push(`Wrong public destination: ${new URL(page.url()).pathname}`);
          if (state.h1.length !== 1) findings.push(`Expected one h1; found ${state.h1.length}`);
          if (!state.canonical || new URL(state.canonical).href !== new URL(path, origin).href) findings.push(`Incorrect canonical: ${state.canonical || 'missing'}`);
          if (state.noindex) findings.push('Public page marked noindex');
          const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact));
          for (const v of violations) findings.push(`${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`);
        } else if (!state.noindex) findings.push('Private page missing noindex');
        if (['/mcp', '/en/mcp'].includes(path)) {
          if (!/no-store/.test(headers['cache-control'] || '')) findings.push('MCP page missing no-store header');
          if (!/noindex/.test(headers['x-robots-tag'] || '')) findings.push('MCP page missing noindex header');
        }
        findings.push(...errors);
        const row = { path, width, scope: publicPaths.has(path) ? 'live-public-page' : 'live-signed-out-route', finalPath: new URL(page.url()).pathname, status: response.status(), securityHeaders, ...state, errors, findings };
        pages.push(row);
        if (findings.length) {
          row.screenshot = `${path === '/' ? 'home' : path.slice(1).replaceAll('/', '-')}-${width}.png`;
          try { await page.screenshot({ path: `${output}/${row.screenshot}`, fullPage: true }); }
          catch (e) { findings.push(`Screenshot failed: ${e.message}`); delete row.screenshot; }
        }
      } catch (e) {
        pages.push({ path, width, findings: [e.message] });
      } finally { closing = true; await page.close(); }
      console.log(`${width} ${path}: ${pages.at(-1).findings.length ? 'FINDING' : 'PASS'}`);
      // Retain evidence even if a later route or transport fails.
      await writeFile(`${output}/pages.json`, JSON.stringify(pages, null, 2));
    }
    await context.close();
  }
  const brokenLinks = new Set(), staticLinks = new Set();
  for (const row of pages) for (const href of row.links || []) {
    const url = new URL(href);
    if (url.origin !== origin || /^\/(api|oauth|email)(\/|$)/.test(url.pathname)) continue;
    if (url.hash && publicPaths.has(url.pathname)) {
      const target = pages.find(p => p.path === url.pathname && p.width === row.width);
      if (Array.isArray(target?.ids) && !target.ids.includes(decodeURIComponent(url.hash.slice(1)))) brokenLinks.add(`${row.path} → ${url.pathname}${url.hash}`);
    }
    if (!paths.includes(url.pathname) && !redirects.includes(url.pathname)) {
      if (/\.(pdf|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname) && !url.search) staticLinks.add(url.href);
      else brokenLinks.add(`${row.path} → undeclared ${url.pathname}`);
    }
  }
  // Fetch only declared static document/image links, never arbitrary action URLs.
  for (const url of staticLinks) {
    try {
      const r = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15000) });
      if (!r.ok) brokenLinks.add(`${new URL(url).pathname}: HTTP ${r.status}`);
    } catch (e) { brokenLinks.add(`${new URL(url).pathname}: ${e.message}`); }
  }
  const report = {
    checkedAt: new Date().toISOString(), origin,
    scope: 'Real deployed anonymous pages and GET APIs; analytics/external requests and all writes blocked. No authenticated workflow or provider delivery acceptance.',
    routes: paths.length, checks: pages.length, findings: pages.filter(p => p.findings.length).length,
    assetFailures: [...assetFailures], brokenLinks: [...brokenLinks], apiResponses: [...apiResponses], blocked: [...blocked], pages,
  };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks: report.checks, findings: report.findings, assetFailures: report.assetFailures, brokenLinks: report.brokenLinks, apiResponses: report.apiResponses }));
  if (report.findings || assetFailures.size || brokenLinks.size) process.exitCode = 1;
} finally { await browser.close(); }
