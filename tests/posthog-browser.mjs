// Browser checks for PostHog (src/lib/posthog.js): public pages on the live site send page views and CTA
// events; private pages send nothing, whether opened directly or reached inside the app; other hosts send nothing.
// Usage: node tests/posthog-browser.mjs http://127.0.0.1:5199 — the build is served as www.bznsflowai.com through
// Chromium's host mapping; /ingest is answered here and never reaches PostHog, and other traffic is aborted.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { capabilitiesFor } from '../convex/hasib/capabilities.js';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const { port } = new URL(BASE);
const LIVE = `http://www.bznsflowai.com:${port}`;
const PRIVATE = /^\/(?:en\/)?(?:owner|layla|catalyst|mcp|signin)(?:\/|$)/;
// PostHog starts 3 s after load, then at idle, then batches events: wait long enough for one flush.
const SETTLE_MS = 9000;
const VISITOR_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const VISITOR_HINTS = {
  brands: [
    { brand: 'Google Chrome', version: '141' },
    { brand: 'Chromium', version: '141' },
    { brand: 'Not?A_Brand', version: '24' },
  ],
  fullVersion: '141.0.0.0',
  platform: 'macOS',
  platformVersion: '15.0.0',
  architecture: 'arm',
  model: '',
  mobile: false,
};

function decodeEvents(request) {
  const raw = request.postDataBuffer();
  if (!raw) return [];
  // Batches are gzip (told apart by the gzip magic bytes), base64 form data, or plain JSON.
  let text = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
  if (text.startsWith('data=')) text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString('utf8');
  const body = JSON.parse(text);
  return Array.isArray(body) ? body : body.batch || [body];
}

async function openSite(browser, api = null) {
  // PostHog drops events from headless and automated browsers, so the test browser presents as an ordinary one.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    userAgent: VISITOR_UA,
  });
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
        try {
          ingest.events.push(...decodeEvents(request));
        } catch {
          ingest.events.push({ event: '<undecodable>' });
        }
        return route.fulfill({ status: 200, json: { status: 1 } });
      }
      return url.pathname.endsWith('.js')
        ? route.fulfill({ status: 200, contentType: 'text/javascript', body: '' })
        : route.fulfill({ status: 200, json: {} });
    }
    const answer = url.pathname.startsWith('/api/') && api?.(url, request);
    if (answer) return route.fulfill({ status: 200, json: answer });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
    return route.continue();
  });
  const page = await context.newPage();
  // Headless Chromium also names itself in the client hints, which PostHog reads too.
  await (
    await context.newCDPSession(page)
  ).send('Emulation.setUserAgentOverride', { userAgent: VISITOR_UA, userAgentMetadata: VISITOR_HINTS });
  return { context, ingest, page };
}
const pathOf = event => {
  try {
    return new URL(event.properties?.$current_url).pathname;
  } catch {
    return '';
  }
};
const waitFor = async (check, label, deadline = Date.now() + 20000) => {
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise(r => setTimeout(r, 250));
  }
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
    await whatsapp.evaluate(a => {
      a.removeAttribute('target');
      a.addEventListener('click', e => e.preventDefault(), { once: true });
    });
    await whatsapp.click();
    await waitFor(() => ingest.events.some(e => e.event === 'WhatsAppClick'), 'the WhatsAppClick event');
    const click = ingest.events.find(e => e.event === 'WhatsAppClick');
    assert.ok(click.properties.source, 'carries where the click came from');
    count++;
    // Into the dashboard without a reload: the page view and anything after it are dropped.
    const before = ingest.events.length;
    await page.evaluate(() => window.__reactRouterDataRouter.navigate('/en/layla/dashboard'));
    await page.waitForURL('**/en/layla/dashboard');
    await page.mouse.click(400, 400);
    await page.waitForTimeout(SETTLE_MS);
    const leaked = ingest.events.slice(before).filter(e => PRIVATE.test(pathOf(e)));
    assert.deepEqual(
      leaked.map(e => `${e.event} ${pathOf(e)}`),
      [],
      'nothing from the dashboard',
    );
    count++;
    assert.ok(
      ingest.events.every(e => e.event !== '<undecodable>'),
      'every batch was read',
    );
    count++;
    await context.close();
  }
  {
    const { context, ingest, page } = await openSite(browser);
    await page.goto(`${LIVE}/en/apex`);
    await waitFor(
      () => ingest.events.some(e => e.event === '$pageview' && pathOf(e) === '/en/apex'),
      'the Apex page view',
    );
    count++;
    await context.close();
  }
  {
    // The website brief on the dashboard (2026-10-31): PostHog starts in private mode for the wizard's funnel and
    // nothing else. Only website_brief_* events leave, with allowlisted properties; no page view, click, replay,
    // name, number or file; nothing is stored in the browser.
    const csrfToken = 'a'.repeat(64);
    const api = (url, request) => {
      if (url.pathname === '/api/auth-session')
        return {
          ok: true,
          csrfToken,
          account: { id: 'a1', email: 'owner@example.test', accessPlan: 'ascend', profileComplete: true },
        };
      const surface = url.searchParams.get('surface');
      if (surface === 'website-brief' && request.method() === 'GET')
        return {
          ok: true,
          csrfToken,
          brief: {
            account: { email: 'owner@example.test', name: 'Sara' },
            version: 0,
            fields: {
              nameEn: 'Blue Studio',
              phone: '+968 9000 0000',
              mailboxLocal: 'info',
              recoveryEmail: 'owner@example.test',
            },
            prefilled: [],
            draft: { step: 5, updatedAt: 1 },
            project: null,
            logo: null,
            photos: [],
            docs: [],
          },
        };
      if (surface === 'website-brief') return { ok: true, csrfToken, step: 6 };
      if (surface === 'dashboard' && request.method() === 'GET')
        return {
          ok: true,
          csrfToken,
          account: { email: 'owner@example.test' },
          plan: 'ascend',
          workspaceRole: 'manager',
          capabilities: capabilitiesFor('ascend'),
          dashboardAvailable: true,
          broadcastEnabled: false,
          connected: true,
          founderPreview: false,
          business: { name: 'Blue Studio', sector: 'Retail', sectorId: 'retail' },
          integration: {
            sender: '96890000000',
            path: 'coexistence',
            status: 'connected',
            checks: { routing: true, registered: true, path: true },
            checkedAt: 1,
          },
          messaging: {
            available: true,
            active: true,
            reason: '',
            broadcastAvailable: false,
            limits: { perMinute: 10, perDay: 100, usedToday: 0 },
          },
          timezone: 'Asia/Muscat',
          migrationPending: false,
        };
      if (surface === 'customer')
        return {
          ok: true,
          csrfToken,
          available: true,
          status: 'connected',
          savedToAccount: true,
          profileVersion: 1,
          bzns: { markdown: '# Blue Studio', version: 1, publishedRevision: 1, unpublishedChanges: false },
          profile: {
            businessName: 'Blue Studio',
            sector: 'Retail',
            services: 'Abayas',
            prices: '',
            hours: '',
            location: '',
            humanContact: 'team@example.test',
            faqs: [],
            reviewed: true,
          },
        };
      return { ok: true, csrfToken, items: [] };
    };
    const { context, ingest, page } = await openSite(browser, api);
    // Feature-flag requests post a body without an event name; only real events count here.
    const events = () => ingest.events.filter(e => typeof e.event === 'string');
    await page.goto(`${LIVE}/en/layla/dashboard?tab=website&conversation=c-secret`);
    const wizard = page.locator('.ld-web');
    await wizard.getByRole('heading', { name: 'Online payments', exact: true }).waitFor();
    await wizard.getByRole('radio', { name: /Yes, set up online payments/ }).check();
    await wizard.getByLabel('Full name').fill('Sara Al Balushi');
    await wizard.getByLabel('Personal mobile number').fill('+968 9123 4567');
    await wizard.getByRole('button', { name: 'Next', exact: true }).click();
    await page.mouse.click(600, 600);
    await waitFor(
      () =>
        ['website_brief_step', 'website_brief_payments_answer', 'website_brief_error'].every(name =>
          events().some(e => e.event === name),
        ),
      'the wizard funnel events',
    );
    await page.waitForTimeout(4000);
    assert.deepEqual(
      [...new Set(events().map(e => e.event))].filter(name => !name.startsWith('website_brief_')),
      [],
      'nothing but the wizard funnel leaves the dashboard',
    );
    count++;
    const custom = events().flatMap(e =>
      Object.keys(e.properties || {}).filter(k => !k.startsWith('$') && !['token', 'distinct_id'].includes(k)),
    );
    assert.deepEqual(
      [...new Set(custom)].sort(),
      ['answer', 'field', 'index', 'reason', 'step'],
      'only allowlisted properties',
    );
    count++;
    assert.deepEqual(
      [...new Set(events().map(e => e.properties.$current_url))],
      [`${LIVE}/en/layla/dashboard`],
      'no query string, so no conversation id',
    );
    count++;
    const sent = JSON.stringify(events());
    for (const secret of ['Sara Al Balushi', '9123', 'owner@example.test', 'c-secret'])
      assert.equal(sent.includes(secret), false, `${secret} never leaves`);
    count++;
    assert.equal(
      events().find(e => e.event === 'website_brief_error').properties.field,
      'doc_cr',
      'the first missing document is counted by its slot',
    );
    count++;
    const stored = await page.evaluate(() => [
      document.cookie.includes('ph_'),
      Object.keys(localStorage).some(k => k.startsWith('ph_') || k.includes('posthog')),
    ]);
    assert.deepEqual(stored, [false, false], 'private mode stores nothing in the browser');
    count++;
    await context.close();
  }
  for (const path of ['/en/layla/dashboard', '/owner', '/en/owner/apex', '/signin', '/catalyst/setup']) {
    // Opened directly, a private page never starts PostHog.
    const { context, ingest, page } = await openSite(browser);
    await page.goto(`${LIVE}${path}`);
    await page.waitForTimeout(SETTLE_MS);
    assert.deepEqual(ingest.requests, [], `${path} contacted /ingest`);
    count++;
    await context.close();
  }
  {
    // Any host other than the live site (local, preview, tests) sends nothing.
    const { context, ingest, page } = await openSite(browser);
    await page.goto(`${BASE}/en`);
    await page.waitForTimeout(SETTLE_MS);
    assert.deepEqual(ingest.requests, [], '127.0.0.1 contacted /ingest');
    count++;
    await context.close();
  }
  console.log(`✓ posthog browser: ${count} checks passed`);
} finally {
  await browser.close();
}
