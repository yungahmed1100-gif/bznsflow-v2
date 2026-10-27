// Browser checks for the Apex request page (/apex, /en/apex): pick the agent functions, describe the need, send.
// Usage: node tests/apex-browser.mjs http://127.0.0.1:5199 — /api/lead?op=apex is synthetic; other traffic is aborted.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const OUT = process.env.APEX_BROWSER_OUT || 'work/apex-browser';
await mkdir(OUT, { recursive: true });

async function openPage(browser, { lang, width, answer }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const state = { posts: [] };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(BASE).origin) return route.abort();
    if (url.pathname === '/api/lead' && url.searchParams.get('op') === 'apex') {
      const body = route.request().postDataJSON();
      state.posts.push(body);
      const reply = answer(body, state);
      return route.fulfill({ status: reply.status, json: reply.json });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
    return route.continue();
  });
  await page.goto(`${BASE}${lang === 'ar' ? '' : '/en'}/apex`);
  return { page, context, state };
}
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page => (await new AxeBuilder({ page }).include('main').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);

const browser = await chromium.launch();
let count = 0;
try {
  for (const [lang, width] of [['en', 1280], ['ar', 375]]) {
    const ar = lang === 'ar', t = (en, arabic) => ar ? arabic : en;
    // The first send is refused for a missing function; the second goes through.
    const { page, context, state } = await openPage(browser, { lang, width, answer: (body, s) => s.posts.length === 1
      ? { status: 400, json: { ok: false, reason: 'invalid_functions' } } : { status: 200, json: { ok: true, received: true, emailed: true } } });
    await page.locator('h1').waitFor();
    assert.equal(await page.locator('h1').textContent(), t('Request Apex', 'اطلب أبيكس')); count++;
    assert.match(await page.title(), ar ? /أبيكس/ : /Request Apex/); count++;
    assert.equal(await page.getByRole('checkbox').count(), 5, 'four functions and something else'); count++;
    const whatsapp = page.getByRole('link', { name: t('Ask about Apex on WhatsApp', 'اسأل عن أبيكس على واتساب') });
    assert.match(await whatsapp.getAttribute('href'), /^https:\/\/wa\.me\/\d+\?text=/, 'the WhatsApp button is under the form'); count++;
    const send = page.getByRole('button', { name: t('Send my request', 'أرسل طلبي') });
    assert.equal(await send.isDisabled(), true, 'nothing filled yet'); count++;
    assert.deepEqual(await axe(page), []); count++;
    assert.equal(await noOverflow(page), true); count++;
    await page.screenshot({ path: `${OUT}/form-${lang}-${width}.png`, fullPage: true });
    await page.getByRole('checkbox', { name: new RegExp(t('ERP and Odoo connection', 'الربط مع Odoo')) }).check();
    await page.getByRole('checkbox', { name: new RegExp(t('Branches and teams routing', 'توزيع العمل بين الفروع')) }).check();
    await page.getByLabel(t('What should the agents do?', 'ماذا يجب أن يفعل الوكلاء؟')).fill('Answer stock questions from Odoo for our 8 branches.');
    await page.getByLabel(t('Company', 'الشركة'), { exact: true }).fill('Nour Group');
    await page.getByLabel(t('Your name', 'اسمك')).fill('Sara');
    await page.getByLabel(t('Work email', 'بريد العمل')).fill('sara@nour.om');
    await page.getByLabel(t('Branches (optional)', 'عدد الفروع (اختياري)')).selectOption('6-20');
    await page.getByLabel(t('Your business system (optional)', 'نظام إدارة أعمالك (اختياري)')).selectOption('odoo');
    assert.equal(await send.isDisabled(), false); count++;
    assert.deepEqual(await axe(page), []); count++;
    await send.click();
    await page.getByText(t('Choose at least one agent function.', 'اختر مهمة واحدة على الأقل.')).waitFor(); count++;
    await send.click();
    await page.getByText(t('Request received', 'وصلنا طلبك')).waitFor(); count++;
    const post = state.posts.at(-1);
    assert.deepEqual([post.company, post.name, post.email, post.functions, post.branches, post.system, post.lang, post.website],
      ['Nour Group', 'Sara', 'sara@nour.om', ['erp', 'branches'], '6-20', 'odoo', lang, ''], 'what the page sends'); count++;
    assert.equal(await page.getByRole('link', { name: t('Ask about Apex on WhatsApp', 'اسأل عن أبيكس على واتساب') }).count(), 1, 'WhatsApp stays after sending'); count++;
    assert.deepEqual(await axe(page), []); count++;
    assert.equal(await noOverflow(page), true); count++;
    await page.screenshot({ path: `${OUT}/done-${lang}-${width}.png`, fullPage: true });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`${count} Apex request browser assertions passed in English and Arabic at 375–1280px. Synthetic API; no external network.`);
