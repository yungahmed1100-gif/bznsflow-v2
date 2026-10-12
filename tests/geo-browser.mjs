// Local-only discovery acceptance; no messaging, booking or Google API calls.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { BUSINESS_PAGES } from '../src/content/business-pages.js';

const base = process.argv[2] || 'http://127.0.0.1:5207';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Use a local preview');
const browser = await chromium.launch();
let count = 0;
try {
  for (const lang of ['ar', 'en']) {
    const prefix = lang === 'en' ? '/en' : '';
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => route.request().url().startsWith(base) && !route.request().url().includes('/api/') ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(`${base}${prefix || '/'}`);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const services = schemas.map(JSON.parse).filter(s => s['@type'] === 'Service');
    assert.deepEqual(services.map(s => s['@id'].split('#')[1]), ['catalyst', 'ascend']); count++;
    assert.ok(await page.locator('h1').textContent()); count++;
    for (const target of ['ar', 'en']) {
      assert.equal(await page.locator(`.lang-item[hreflang="${target}"]`).getAttribute('href'), target === 'en' ? '/en' : '/'); count++;
    }
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), 'https://www.bznsflowai.com/og-image.jpg'); count++;
    const image = await context.request.get(`${base}/og-image.jpg`);
    assert.equal(image.status(), 200); count++;
    assert.match(image.headers()['content-type'], /image\/jpeg/); count++;
    await page.goto(`${base}/og-image.jpg`);
    assert.deepEqual(await page.locator('img').evaluate(img => [img.naturalWidth, img.naturalHeight]), [1200, 630]); count++;
    for (const route of ['/contact', '/services', '/support']) {
      await page.goto(`${base}${prefix}${route}`);
      const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
      assert.equal(schema.inLanguage, lang); count++;
      assert.equal(schema.url, `https://www.bznsflowai.com${prefix}${route}`); count++;
      assert.equal(schema.name, await page.locator('h1').textContent()); count++;
      assert.ok((await page.locator('body').textContent()).includes(BUSINESS_PAGES[route.slice(1)][lang].updated)); count++;
    }
    await context.close();
    const interactive = await browser.newContext();
    await interactive.route('**/*', route => route.request().url().startsWith(base) && !route.request().url().includes('/api/') ? route.continue() : route.abort());
    const live = await interactive.newPage();
    await live.goto(`${base}${prefix || '/'}`);
    await live.locator('.lang-toggle').click();
    const alternate = live.locator(`.lang-item[hreflang="${lang === 'en' ? 'ar' : 'en'}"]`);
    await alternate.waitFor({ state: 'visible' });
    await alternate.focus();
    assert.equal(await alternate.evaluate(el => el === document.activeElement), true); count++;
    await live.keyboard.press('Enter');
    await live.waitForURL(`${base}${lang === 'en' ? '/' : '/en'}`);
    assert.equal(await live.locator('html').getAttribute('lang'), lang === 'en' ? 'ar' : 'en'); count++;
    await interactive.close();
  }
  const llms = await (await fetch(`${base}/llms.txt`)).text();
  assert.ok(llms.includes('Ascend — available by owner-granted access')); count++;
  assert.ok(llms.includes('Apex — in preparation')); count++;
  console.log(`PASS: ${count} bilingual discovery, no-JS content, schema, social-image and keyboard checks.`);
} finally { await browser.close(); }
