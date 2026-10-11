// Dental clinics (Ascend) in a real browser against the real-logic demo clinic: the six tabs of
// ascend/dental.md, every Visits view, a Layla request booked and taken through confirm → arrived →
// completed → charges → payment with the forms, a missed visit rebooked (its recovery message
// withdrawn), drafts waiting for approval, Insights with drill-down, the follow-up rules and the
// links that carry one visit between Chats, Visits, Customers and Insights. Runs a manager demo and
// a receptionist (employee) demo. No message reaches a provider.
// Usage: npm run build && node tests/dental-browser.mjs
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const OUT = process.env.DENTAL_BROWSER_OUT || 'work/hardening/dental/browser';
const MANAGER_PORT = 5393, DESK_PORT = 5394, MUSCAT = 4 * 3600000;
await mkdir(OUT, { recursive: true });

function demo(port, ...flags) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), '--pack=dental', ...flags], { stdio: ['ignore', 'pipe', 'inherit'] });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => { if (String(chunk).includes('Hasib demo')) resolve(); });
    child.on('exit', code => reject(new Error(`demo on ${port} exited with ${code}`)));
  });
  return { child, ready, base: `http://127.0.0.1:${port}` };
}

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page => (await new AxeBuilder({ page }).include('.ld').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.length}`);
const DEMO_ONLY = /surface=(customer|instagram)/;
const localInput = ms => new Date(ms + MUSCAT).toISOString().slice(0, 16);

const manager = demo(MANAGER_PORT), desk = demo(DESK_PORT, '--role=employee');
await Promise.all([manager.ready, desk.ready]);
const browser = await chromium.launch();
let count = 0;
const ok = (value, message) => { assert.ok(value, message); count++; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); count++; };

async function open(base, width, lang, path) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(`pageerror ${e.message}`));
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400 && !DEMO_ONLY.test(r.url())) problems.push(`${r.status()} ${r.url()} ${r.request().postData()?.slice(0, 80)}`); });
  await page.goto(`${base}${lang === 'ar' ? '' : '/en'}${path}`);
  await page.locator('.ld-nav a').first().waitFor({ state: 'attached' });
  return { page, context, problems };
}
const api = (page, base, action, body = {}) => page.evaluate(async ([url, payload]) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).json(),
  [`${base}/api/layla-meta?surface=hasib`, { action, ...body }]);
const sections = page => page.locator('.ld-desktop-nav a').allInnerTexts().then(list => list.map(x => x.trim().replace(/\s*\d+$/, '')));
const yes = page => page.getByRole('alertdialog').getByRole('button', { name: /Yes, continue|نعم، متابعة/ }).click();
const param = (page, key) => new URL(page.url()).searchParams.get(key);
const form = (page, name) => page.locator(`form[data-form="${name}"]`);
const save = async (page, name) => { await form(page, name).getByRole('button', { name: /^Save$|^حفظ$/ }).click(); await form(page, name).waitFor({ state: 'detached' }); };
const record = page => page.locator('.hb-visit-record');
const value = r => { assert.equal(r.ok, true, JSON.stringify(r)); return r.value ?? r; };
const chip = (page, text) => record(page).locator('header .ld-chip', { hasText: text }).first().waitFor();

const TABS = { en: ['Chats', 'Visits', 'Patients', 'Broadcasts', 'Insights', 'Settings'], ar: ['المحادثات', 'الزيارات', 'المرضى', 'الرسائل الجماعية', 'المؤشرات', 'الإعدادات'] };
const READY = { schedule: '.hb-day-nav', visits: '.hb-visits', services: '.hb-services-block', followups: '.hb-followup-filters', insights: '.hb-kpis', rules: '.hb-rules',
  team: '.hb-dental .hb-page-header', customers: '.ld-table', chats: '.ld-conversations' };
const PATH = { schedule: '?tab=work&view=schedule', visits: '?tab=work&view=visits', services: '?tab=work&view=services', followups: '?tab=work&view=followups&filter=decision',
  insights: '?tab=insights', rules: '?tab=settings&view=rules', team: '?tab=settings&view=team', customers: '?tab=customers', chats: '?tab=chats' };

try {
  // 1. Every destination for the manager and the receptionist, deep-linked, in both languages and three widths.
  // DENTAL_SKIP_SWEEP=1 runs only the journeys while iterating; a release run always sweeps.
  if (!process.env.DENTAL_SKIP_SWEEP) for (const [who, run, views] of [['manager', manager, Object.keys(PATH)], ['desk', desk, ['schedule', 'visits', 'services', 'followups', 'customers', 'chats']]]) {
    for (const lang of ['en', 'ar']) {
      for (const width of [1440, 768, 320]) {
        for (const view of views) {
          const { page, context, problems } = await open(run.base, width, lang, `/layla/dashboard${PATH[view]}`);
          await page.locator(READY[view]).first().waitFor();
          if (view === 'schedule' && width === 1440) {
            const nav = await sections(page);
            eq(nav, who === 'manager' ? TABS[lang] : TABS[lang].slice(0, 3), `${who} sees ${who === 'manager' ? 'the six tabs' : 'Chats, Visits and Patients'} in order, ${lang}`);
          }
          eq(await noOverflow(page), true, `${who} ${view} overflow ${lang} ${width}`);
          eq(await axe(page), [], `${who} ${view} axe ${lang} ${width}`);
          eq(problems, [], `${who} ${view} errors ${lang} ${width}`);
          if (width === 1440 || width === 320) await page.screenshot({ path: `${OUT}/${who}-${view}-${lang}-${width}.png`, fullPage: true });
          await context.close();
        }
      }
    }
  }

  // 2. Older links land where their content now lives.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=today');
    for (const [old, ready] of [['today', READY.schedule], ['orders', READY.visits], ['stock', READY.services], ['money', READY.insights], ['team', READY.team]]) {
      await page.goto(`${manager.base}/en/layla/dashboard?tab=${old}`);
      await page.locator(ready).first().waitFor();
      ok(await page.locator(ready).first().isVisible(), `old link ${old} opens its new place`);
    }
    await context.close();
  }

  // 3. A Layla request booked from Follow-ups, then confirm → arrived → completed → charges → payment, all through the screens.
  {
    const { page, context, problems } = await open(manager.base, 1440, 'en', '/layla/dashboard?tab=work&view=followups&filter=today');
    await page.locator(READY.followups).waitFor();
    const request = page.locator('.hb-followups > li[data-kind="visit_request"]').first();
    await request.waitFor();
    const name = (await request.locator('bdi').first().innerText()).trim();
    await request.getByRole('button', { name: 'Book a visit' }).click();
    const f = form(page, 'visit');
    await f.waitFor();
    eq(await f.locator('[name=contactId] option:checked').innerText(), name, 'the request’s patient is already chosen');
    await f.locator('[name=startsAt]').fill(localInput(Date.now() + 25 * 60000));
    await f.locator('[name=providerId]').selectOption({ label: 'Hygienist Noor' });
    await save(page, 'visit');
    const visits = value(await api(page, manager.base, 'dental_visits', {})).items;
    const booked = visits.find(v => v.contactName === name && v.status === 'booked' && v.startsAt > Date.now());
    ok(!!booked, 'the visit is booked');
    const queue = value(await api(page, manager.base, 'dental_followups', { filter: 'today' })).items;
    eq(queue.some(r => r.kind === 'visit_request' && r.contactName === name), false, 'booking closed Layla’s request by itself');
    await page.goto(`${manager.base}/en/layla/dashboard?tab=work&view=visits&visit=${booked.id}`);
    await record(page).waitFor();
    await chip(page, 'Booked');
    await record(page).getByRole('button', { name: 'Confirm', exact: true }).click();
    await chip(page, 'Confirmed');
    await record(page).getByRole('button', { name: 'Arrived', exact: true }).click();
    await chip(page, 'Arrived');
    await record(page).getByRole('button', { name: 'Completed', exact: true }).click();
    await chip(page, 'Completed');
    ok(true, 'confirm, arrived and completed are one tap each');
    await record(page).getByRole('button', { name: 'Record charges' }).click();
    const charge = form(page, 'charge');
    const option = await charge.locator('select option', { hasText: 'Check-up' }).first().getAttribute('value');
    await charge.locator('select').first().selectOption(option);
    await save(page, 'charge');
    await record(page).locator('#dn-charges li', { hasText: 'Check-up' }).waitFor();
    ok(true, 'charges are recorded on the visit from the catalog');
    await record(page).getByRole('button', { name: 'Record payment' }).click();
    await save(page, 'payment');
    await record(page).locator('#dn-charges', { hasText: /Paid 10\.000\s*OMR of 10\.000\s*OMR/ }).waitFor();
    eq(await record(page).getByRole('button', { name: 'Record payment' }).count(), 0, 'once paid in full there is nothing to collect');
    ok(await record(page).locator('#dn-activity li', { hasText: 'Charges recorded' }).count() === 1, 'the activity keeps each fact');
    eq(problems, [], 'no request failed in the visit journey');
    await context.close();
  }

  // 4. A missed visit: a rebook task and a recovery message; booking another time closes both by itself.
  {
    const { page, context } = await open(manager.base, 1440, 'en', '/layla/dashboard?tab=work&view=visits&quick=missed');
    await page.locator(READY.visits).waitFor();
    const missed = value(await api(page, manager.base, 'dental_visits', { filter: 'missed' })).items.find(v => v.nextAction === 'rebook');
    ok(!!missed, 'the demo has a missed visit waiting to be rebooked');
    const draftsBefore = value(await api(page, manager.base, 'dental_followups', { filter: 'decision' })).items.filter(r => r.kind === 'missed_recovery' && String(r.visitId) === String(missed.id));
    eq(draftsBefore.length, 1, 'Hasib wrote one recovery message for it');
    await page.goto(`${manager.base}/en/layla/dashboard?tab=work&view=visits&visit=${missed.id}`);
    await record(page).waitFor();
    await record(page).getByRole('button', { name: 'Book another time' }).click();
    await form(page, 'visit').locator('[name=startsAt]').fill(localInput(Date.now() + 3 * 86400000 + 7 * 3600000));
    await save(page, 'visit');
    const after = value(await api(page, manager.base, 'dental_followups', { filter: 'decision' })).items;
    eq(after.some(r => r.kind === 'missed_recovery' && String(r.visitId) === String(missed.id)), false, 'rebooking withdrew the unsent recovery message');
    const tasks = value(await api(page, manager.base, 'dental_followups', {})).items;
    eq(tasks.some(r => r.kind === 'rebook_missed' && String(r.visitId) === String(missed.id) && r.bucket !== 'completed'), false, 'and closed the rebook task');
    await context.close();
  }

  // 5. Follow-ups: drafts Hasib wrote wait for approval; outside 24 hours one needs a template; self-closing tasks have no Done.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=work&view=followups&filter=decision');
    await page.locator(READY.followups).waitFor();
    const row = page.locator('.hb-followups > li', { hasText: 'Recall reminder' }).first();
    await row.waitFor();
    ok(await row.locator('.hb-draft-text').isVisible(), 'the recall draft, written from the clinician’s date, is shown');
    ok(!/clean|filling|whiten|pain/i.test(await row.locator('.hb-draft-text').innerText()), 'it names no treatment');
    await row.getByRole('button', { name: 'Approve and send' }).click();
    await yes(page);
    await page.locator('.hb-followup-filters label', { hasText: 'Blocked / failed' }).click();
    await page.locator('.hb-followups > li', { hasText: 'Needs an approved template' }).first().waitFor();
    ok(true, 'outside the 24-hour window the approved draft waits for a template instead of sending');
    const badge = await page.locator('.ld-desktop-nav a[data-section="work"] .ld-nav-badge').innerText();
    ok(Number(badge) > 0, 'the Visits badge counts actionable follow-ups');
    await page.locator('.hb-followup-filters label', { hasText: 'Overdue' }).click();
    const unrecorded = page.locator('.hb-followups > li[data-kind="attendance_unrecorded"]').first();
    await unrecorded.waitFor();
    eq(await unrecorded.getByRole('button', { name: 'Mark done' }).count(), 0, 'a self-closing task cannot be marked done');
    await context.close();
  }

  // 6. Insights → source records → Back to Insights, restored after a reload.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=insights');
    await page.locator('.hb-kpis').waitFor();
    eq(await page.locator('.hb-kpi > span').allInnerTexts(), ['Visit attendance', 'Missed visits', 'Follow-ups due', 'Overdue visit balances'], 'the four headline cards, in the spec’s order');
    await page.locator('.hb-kpi[data-metric="missed_visits"]').click();
    await page.locator('#dn-kpi-title', { hasText: 'Missed visits' }).waitFor();
    await page.getByRole('button', { name: 'View source records' }).click();
    await page.locator('#dn-records-title').waitFor();
    eq([param(page, 'tab'), param(page, 'metric'), param(page, 'from')], ['work', 'missed_visits', 'insights'], 'records open in Visits with the metric');
    ok(await page.locator('.hb-records tr[data-counted="yes"]').count() >= 1, 'the missed visits are marked as counted');
    await page.reload();
    await page.locator('#dn-records-title').waitFor();
    await page.getByRole('button', { name: 'Back to Insights' }).click();
    await page.locator('#dn-kpi-title', { hasText: 'Missed visits' }).waitFor();
    ok(true, 'Back to Insights restores the selected measure after a reload');
    await page.locator('.hb-segments select').selectOption('provider');
    await page.locator('.hb-segments table').waitFor();
    eq(await page.locator('.hb-segments tbody tr').count(), 3, 'one breakdown row per provider');
    ok(await page.locator('#dn-costs').isVisible(), 'clinic costs stay in Insights');
    await context.close();
  }

  // 7. Chat → visit → Back to chat; patient → visit card.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=chats');
    const next = value(await api(page, manager.base, 'dental_visits', {})).items.find(v => v.status === 'confirmed' && v.startsAt > Date.now());
    const full = value(await api(page, manager.base, 'dental_visit', { visitId: next.id }));
    await page.goto(`${manager.base}/en/layla/dashboard?tab=chats&chat=${full.conversationId}`);
    const card = page.locator('.hb-deal-context-card', { hasText: 'Next visit' });
    await card.waitFor();
    ok(await card.locator('.ld-chip', { hasText: 'Confirmed' }).isVisible(), 'the chat shows the patient’s next visit');
    await card.getByRole('button', { name: 'Open visit' }).click();
    await record(page).waitFor();
    eq(param(page, 'visit'), String(next.id), 'the same visit opens in Visits');
    await page.getByRole('button', { name: 'Back to chat' }).click();
    await page.locator('.hb-deal-context-card').first().waitFor();
    eq(param(page, 'chat'), full.conversationId, 'Back returns to the same chat');
    await page.goto(`${manager.base}/en/layla/dashboard?tab=customers`);
    await page.locator('.ld-table').waitFor();
    await page.getByRole('row', { name: new RegExp(next.contactName) }).first().locator('.ld-row-open').click();
    await page.locator('.hb-deal-context-card', { hasText: 'Next visit' }).waitFor();
    ok(true, 'a patient record shows their next visit');
    await context.close();
  }

  // 8. Rules persist; 9. the receptionist's limits.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=settings&view=rules');
    await page.locator('.hb-rules').waitFor();
    ok(await page.locator('fieldset', { hasText: 'Overdue balance' }).locator('input[type=checkbox]').isChecked(), 'the rules start on, writing drafts');
    await page.locator('fieldset', { hasText: 'Overdue balance' }).locator('select').nth(1).selectOption('task');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('Saved. Rules apply from the next check.').waitFor();
    await page.reload();
    await page.locator('.hb-rules').waitFor();
    eq(await page.locator('fieldset', { hasText: 'Overdue balance' }).locator('select').nth(1).inputValue(), 'task', 'a rule change survives a reload');
    await context.close();
  }
  {
    const { page, context } = await open(desk.base, 1280, 'en', '/layla/dashboard?tab=work&view=visits');
    await page.locator(READY.visits).waitFor();
    const list = value(await api(page, desk.base, 'dental_visits'));
    ok(list.items.every(r => r.money === undefined), 'a receptionist’s visit list carries no money');
    eq((await api(page, desk.base, 'dental_insights')).reason || 'allowed', 'manager_required', 'Insights are the manager’s');
    eq((await api(page, desk.base, 'dental_charge', { visitId: list.items[0].id, version: 1, requestId: crypto.randomUUID(), lines: [] })).reason || 'allowed', 'manager_required', 'charges are the manager’s');
    const done = list.items.find(v => v.status === 'completed');
    await page.goto(`${desk.base}/en/layla/dashboard?tab=work&view=visits&visit=${done.id}`);
    await record(page).waitFor();
    eq(await record(page).locator('#dn-charges').count(), 0, 'a receptionist sees no charges');
    eq(await record(page).getByRole('button', { name: 'Record charges' }).count(), 0, 'and cannot record them');
    ok(await record(page).getByRole('button', { name: /recall date/ }).count() === 1, 'but records the clinician’s recall date');
    await page.goto(`${desk.base}/en/layla/dashboard?tab=insights`);
    await page.locator(READY.schedule).waitFor();
    eq(await page.locator('.hb-kpis').count(), 0, 'Insights is not open to a receptionist');
    await context.close();
  }
  console.log(`dental browser: ${count} checks passed`);
} finally {
  await browser.close();
  manager.child.kill(); desk.child.kill();
}
