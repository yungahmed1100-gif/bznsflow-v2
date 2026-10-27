// Browser checks for PostHog (src/lib/posthog.js): public pages on the live site send page views and CTA
// events; private pages send nothing, whether opened directly or reached inside the app; other hosts send nothing.
// Usage: node tests/posthog-browser.mjs http://127.0.0.1:5199 — the build is served as www.bznsflowai.com through
// Chromium's host mapping; /ingest is answered here and never reaches PostHog, and other traffic is aborted.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const { port } = new URL(BASE);
const LIVE = `http://www.bznsflowai.com:${port}`;
const PRIVATE = /^\/(?:en\/)?(?:owner|layla|catalyst|mcp|signin)(?:\/|$)/;
// PostHog starts 3 s after load, then at idle, then batches events: wait long enough for one flush.
const SETTLE_MS = 9000;
const VISITOR_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

function decodeEvents(request) {
  const raw = request.postDataBuffer();
  if (!raw) return [];
  // Batches are gzip (told apart by the gzip magic bytes), base64 form data, or plain JSON.
  let text = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
  if (text.startsWith('data=')) text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString('utf8');
  const body = JSON.parse(text);
  return Array.isArray(body) ? body : body.batch || [body];
}

async function openSite(browser) {
  // PostHog drops events from headless and automated browsers, so the test browser presents as an ordinary one.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', userAgent: VISITOR_UA });
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  const ingest = { requests: [], events: [] };
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const local = url.port === port && ['www.bznsflowai.com', '127.0.0.1'].includes(url.hostname);
    if (!local) return route.abort();
    if (url.pathname.startsWith('/ingest/')) {
      ingest.requests.push(url.pathname);
      if (request.method() === 'POST') {
        try { ingest.events.push(...decodeEvents(request)); } catch { ingest.events.push({ event: '<undecodable>' }); }
        return route.fulfill({ status: 200, json: { status: 1 } });
      }
      return url.pathname.endsWith('.js') ? route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }) : route.fulfill({ status: 200, json: {} });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
    return route.continue();
  });
  return { context, ingest, page: await context.newPage() };
}
const pathOf = event => { try { return new URL(event.properties?.$current_url).pathname; } catch { return ''; } };
const waitFor = async (check, label, deadline = Date.now() + 20000) => {
  while (Date.now() < deadline) { if (check()) return; await new Promise(r => setTimeout(r, 250)); }
  assert.fail(`timed out waiting for ${label}`);
};

const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP www.bznsflowai.com 127.0.0.1`] });
let count = 0;
try {
  {
    // Public home page: a page view, then a CTA click is forwarded under its own name.
    const { context, ingest, page } = await openSite(browser);
    await page.goto(`${LIVE}/en`);
    await waitFor(() => ingest.events.some(e => e.event === '$pageview' && pathOf(e) === '/en'), 'the home page view');
    count++;
    const whatsapp = page.locator('a[href*="wa.me"]').first();
    await whatsapp.evaluate(a => { a.removeAttribute('target'); a.addEventListener('click', e => e.preventDefault(), { once: true }); });
    await whatsapp.click();
    await waitFor(() => ingest.events.some(e => e.event === 'WhatsAppClick'), 'the WhatsAppClick event');
    const click = ingest.events.find(e => e.event === 'WhatsAppClick');
    assert.ok(click.properties.source, 'carries where the click came from'); count++;
    // Into the dashboard without a reload: the page view and anything after it are dropped.
    const before = ingest.events.length;
    await page.evaluate(() => window.__reactRouterDataRouter.navigate('/en/layla/dashboard'));
    await page.waitForURL('**/en/layla/dashboard');
    await page.mouse.click(400, 400);
    await page.waitForTimeout(SETTLE_MS);
    const leaked = ingest.events.slice(before).filter(e => PRIVATE.test(pathOf(e)));
    assert.deepEqual(leaked.map(e => `${e.event} ${pathOf(e)}`), [], 'nothing from the dashboard'); count++;
    assert.ok(ingest.events.every(e => e.event !== '<undecodable>'), 'every batch was read'); count++;
    await context.close();
  }
  {
    const { context, ingest, page } = await openSite(browser);
    await page.goto(`${LIVE}/en/apex`);
    await waitFor(() => ingest.events.some(e => e.event === '$pageview' && pathOf(e) === '/en/apex'), 'the Apex page view');
    count++;
    await context.close();
  }
  for (const path of ['/en/layla/dashboard', '/owner', '/en/owner/apex', '/signin', '/catalyst/setup']) {
    // Opened directly, a private page never starts PostHog.
    const { context, ingest, page } = await openSite(browser);
    await page.goto(`${LIVE}${path}`);
    await page.waitForTimeout(SETTLE_MS);
    assert.deepEqual(ingest.requests, [], `${path} contacted /ingest`); count++;
    await context.close();
  }
  {
    // Any host other than the live site (local, preview, tests) sends nothing.
    const { context, ingest, page } = await openSite(browser);
    await page.goto(`${BASE}/en`);
    await page.waitForTimeout(SETTLE_MS);
    assert.deepEqual(ingest.requests, [], '127.0.0.1 contacted /ingest'); count++;
    await context.close();
  }
  console.log(`✓ posthog browser: ${count} checks passed`);
} finally {
  await browser.close();
}
