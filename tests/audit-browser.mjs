// Browser checks for the free-audit booking page (/audit, /en/audit): pick a day, a time, give details, book.
// Usage: node tests/audit-browser.mjs http://127.0.0.1:5199 — /api/lead?op=audit is synthetic; other traffic is aborted.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { auditSlots } from '../config/audit.js';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const OUT = process.env.AUDIT_BROWSER_OUT || 'work/audit-browser';
await mkdir(OUT, { recursive: true });

async function openPage(browser, { lang, width, book }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const state = { slots: auditSlots(Date.now()), posts: [] };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(BASE).origin) return route.abort();
    if (url.pathname === '/api/lead' && url.searchParams.get('op') === 'audit') {
      if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { ok: true, slots: state.slots } });
      const body = route.request().postDataJSON();
      state.posts.push(body);
      const answer = book(body, state);
      return route.fulfill({ status: answer.status, json: answer.json });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
    return route.continue();
  });
  await page.goto(`${BASE}${lang === 'ar' ? '' : '/en'}/audit`);
  return { page, context, state };
}
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page => (await new AxeBuilder({ page }).include('main').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);

const browser = await chromium.launch();
let count = 0;
try {
  for (const [lang, width] of [['en', 1280], ['ar', 375]]) {
    const ar = lang === 'ar';
    // The first try finds the time just taken; the second books.
    const { page, context, state } = await openPage(browser, { lang, width, book: (body, s) => s.posts.length === 1
      ? (s.slots = s.slots.filter(at => at !== body.startAt), { status: 409, json: { ok: false, reason: 'slot_taken' } })
      : { status: 200, json: { ok: true, booking: { startAt: body.startAt }, emailed: true } } });
    await page.locator('.audit-day').first().waitFor();
    assert.equal(await page.locator('h1').textContent(), ar ? 'احجز التدقيق المجاني لنشاطك' : 'Book your free business audit'); count++;
    assert.match(await page.title(), ar ? /التدقيق المجاني/ : /free business audit/); count++;
    assert.equal(await page.locator('.audit-day[aria-pressed="true"]').count(), 1, 'the first open day is chosen'); count++;
    const days = await page.locator('.audit-day').count();
    assert.ok(days >= 10 && days <= 16, `three weeks of Sunday–Thursday days (${days})`); count++;
    await page.locator('.audit-day').nth(1).click();
    assert.equal(await page.locator('.audit-day').nth(1).getAttribute('aria-pressed'), 'true'); count++;
    assert.equal(await page.locator('.audit-time').count(), 14, 'fourteen half-hour times on a full day'); count++;
    assert.deepEqual(await axe(page), []); count++;
    assert.equal(await noOverflow(page), true); count++;
    await page.screenshot({ path: `${OUT}/pick-${lang}-${width}.png`, fullPage: true });
    const firstTime = await page.locator('.audit-time').first().textContent();
    await page.locator('.audit-time').first().click();
    await page.locator('.audit-chosen').waitFor(); count++;
    const submit = page.getByRole('button', { name: ar ? 'احجز التدقيق' : 'Book the audit' });
    assert.equal(await submit.isDisabled(), true, 'name and email first'); count++;
    await page.getByLabel(ar ? 'اسمك' : 'Your name').fill('Sara');
    await page.getByLabel(ar ? 'البريد الإلكتروني' : 'Email').fill('sara@example.com');
    await page.getByLabel(ar ? 'اسم النشاط (اختياري)' : 'Business name (optional)').fill('Nour Abayas');
    await page.getByLabel(ar ? 'المجال (اختياري)' : 'Industry (optional)').selectOption('retail');
    assert.deepEqual(await axe(page), []); count++;
    await page.screenshot({ path: `${OUT}/details-${lang}-${width}.png`, fullPage: true });
    await submit.click();
    // Taken meanwhile: back to the times, told why, and that time is gone.
    await page.getByText(ar ? 'حُجز هذا الوقت للتو. اختر وقتًا آخر.' : 'That time was just taken. Pick another one.').waitFor(); count++;
    await page.locator('.audit-time').first().waitFor();
    assert.notEqual(await page.locator('.audit-time').first().textContent(), firstTime, 'the taken time is no longer offered'); count++;
    await page.locator('.audit-time').first().click();
    await page.getByRole('button', { name: ar ? 'احجز التدقيق' : 'Book the audit' }).click();
    await page.locator('.audit-done').waitFor(); count++;
    assert.match(await page.locator('.audit-done').textContent(), ar ? /تم الحجز/ : /Booked/); count++;
    const post = state.posts.at(-1);
    assert.deepEqual([post.name, post.email, post.business, post.industry, post.lang, post.website], ['Sara', 'sara@example.com', 'Nour Abayas', 'retail', lang, ''], 'what the page sends'); count++;
    assert.ok(state.slots.includes(post.startAt) || post.startAt > Date.now(), 'an offered time'); count++;
    assert.deepEqual(await axe(page), []); count++;
    assert.equal(await noOverflow(page), true); count++;
    await page.screenshot({ path: `${OUT}/done-${lang}-${width}.png`, fullPage: true });
    await context.close();
  }

  // Already booked: the message says how to change it, nothing else breaks.
  {
    const { page, context } = await openPage(browser, { lang: 'en', width: 768, book: () => ({ status: 409, json: { ok: false, reason: 'already_booked' } }) });
    await page.locator('.audit-time').first().click();
    await page.getByLabel('Your name').fill('Sara');
    await page.getByLabel('Email').fill('sara@example.com');
    await page.getByRole('button', { name: 'Book the audit' }).click();
    await page.getByText('You already have an audit booked. Reply to our email to change it.').waitFor(); count++;
    assert.equal(await page.locator('.audit-chosen').count(), 1, 'the chosen time stays'); count++;
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`${count} audit booking browser assertions passed in English and Arabic at 375–1280px. Synthetic API; no external network.`);
