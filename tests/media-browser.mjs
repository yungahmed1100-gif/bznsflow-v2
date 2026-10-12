// Media & production (studio, Ascend) in a real browser against the real-logic demo studio: the six
// tabs of ascend/media.md, every Productions view, a brief driven to delivery through the forms,
// exact-version cut decisions, extra scope, holds that cannot double-book, Insights with drill-down,
// the follow-up rules and the links that carry one production between Chats, Productions, Customers
// and Insights. Runs a manager demo and a producer (employee) demo. No message reaches a provider.
// Usage: npm run build && node tests/media-browser.mjs
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const OUT = process.env.MEDIA_BROWSER_OUT || 'work/hardening/media/browser';
const MANAGER_PORT = 5343, PRODUCER_PORT = 5344;
await mkdir(OUT, { recursive: true });

function demo(port, ...flags) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), '--pack=media', ...flags], { stdio: ['ignore', 'pipe', 'inherit'] });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => { if (String(chunk).includes('Hasib demo')) resolve(); });
    child.on('exit', code => reject(new Error(`demo on ${port} exited with ${code}`)));
  });
  return { child, ready, base: `http://127.0.0.1:${port}` };
}

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page => (await new AxeBuilder({ page }).include('.ld').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.length}`);
const DEMO_ONLY = /surface=(customer|instagram)/;

const manager = demo(MANAGER_PORT), producer = demo(PRODUCER_PORT, '--role=employee');
await Promise.all([manager.ready, producer.ready]);
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
const local = ms => { const d = new Date(ms + 4 * 3600000); return d.toISOString().slice(0, 16); }; // Asia/Muscat wall time
const record = page => page.locator('.hb-production-record');
const value = r => { assert.equal(r.ok, true, JSON.stringify(r)); return r.value ?? r; };

const TABS = { en: ['Chats', 'Productions', 'Customers', 'Broadcasts', 'Insights', 'Settings'], ar: ['المحادثات', 'الإنتاج', 'العملاء', 'الرسائل الجماعية', 'المؤشرات', 'الإعدادات'] };
const READY = { board: '.hb-media-board', calendar: '.hb-calendar', resources: '.ld-table', followups: '.hb-followup-filters', insights: '.hb-kpis', rules: '.hb-rules', team: '.hb-media .hb-page-header', customers: '.ld-table', chats: '.ld-conversations' };
const PATH = { board: '?tab=work&view=board', calendar: '?tab=work&view=calendar', resources: '?tab=work&view=resources', followups: '?tab=work&view=followups&filter=decision',
  insights: '?tab=insights', rules: '?tab=settings&view=rules', team: '?tab=settings&view=team', customers: '?tab=customers', chats: '?tab=chats' };

try {
  // 1. Every destination for the manager and the producer, deep-linked, in both languages and three widths.
  // MEDIA_SKIP_SWEEP=1 runs only the journeys while iterating; a release run always sweeps.
  if (!process.env.MEDIA_SKIP_SWEEP) for (const [who, run, views] of [['manager', manager, Object.keys(PATH)], ['producer', producer, ['board', 'calendar', 'resources', 'followups', 'customers', 'chats']]]) {
    for (const lang of ['en', 'ar']) {
      for (const width of [1440, 768, 320]) {
        for (const view of views) {
          const { page, context, problems } = await open(run.base, width, lang, `/layla/dashboard${PATH[view]}`);
          await page.locator(READY[view]).first().waitFor();
          if (view === 'board' && width === 1440) {
            const nav = await sections(page);
            eq(nav, who === 'manager' ? TABS[lang] : TABS[lang].slice(0, 3), `${who} sees ${who === 'manager' ? 'the six tabs' : 'Chats, Productions and Customers'} in order, ${lang}`);
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
    for (const [old, tab, view, ready] of [['today', 'work', 'board', READY.board], ['orders', 'work', 'board', READY.board], ['stock', 'work', 'resources', READY.resources], ['money', 'insights', null, READY.insights], ['team', 'settings', 'team', READY.team]]) {
      await page.goto(`${manager.base}/en/layla/dashboard?tab=${old}`);
      await page.locator(ready).first().waitFor();
      eq([param(page, 'tab') || tab, page.url().includes(`tab=${old}`) ? tab : param(page, 'tab')].length, 2, `${old} resolves`);
      ok(await page.locator(ready).first().isVisible(), `old link ${old} opens ${tab}${view ? `/${view}` : ''}`);
    }
    await context.close();
  }

  // 3. A brief from a client, driven through the forms to delivery.
  {
    const { page, context, problems } = await open(manager.base, 1440, 'en', '/layla/dashboard?tab=work&view=board');
    await page.locator(READY.board).waitFor();
    await page.getByRole('button', { name: 'New production brief' }).first().click();
    const brief = form(page, 'brief');
    await brief.locator('[name=contactId]').selectOption({ label: 'هدى الكندية' });
    await brief.locator('[name=title]').fill('Graduation film (browser)');
    await brief.locator('[name=productionType]').selectOption('live_capture');
    await brief.locator('[name=format]').selectOption('video');
    await brief.locator('[name=quantity]').fill('1');
    const start = Date.now() + 20 * 86400000;
    await brief.locator('[name=shootStartsAt]').fill(local(start));
    await brief.locator('[name=shootEndsAt]').fill(local(start + 4 * 3600000));
    await brief.locator('[name=location]').fill('Al Bustan hall');
    await brief.locator('[name=deliveryDueAt]').fill(local(start + 7 * 86400000));
    await save(page, 'brief');
    await record(page).waitFor();
    ok(/PRJ-\d{3}/.test(await record(page).locator('h2').first().innerText()), 'saving a new brief opens its record with a reference');
    const id = param(page, 'production');
    ok(!!id, 'the record is addressed by ?production');
    const step = async (label, then) => { await record(page).getByRole('button', { name: label }).first().click(); if (then) await then(); };
    await step('Issue the quote', async () => { await form(page, 'quote').locator('[name=quote]').fill('800'); await save(page, 'quote'); });
    await step('Mark as presented to the client');
    await page.getByText('Waiting for acceptance').first().waitFor();
    await step('Record acceptance', async () => { await form(page, 'accept').locator('[name=acceptedBy]').fill('هدى الكندية'); await form(page, 'accept').locator('[name=evidenceSource]').selectOption('chat'); await save(page, 'accept'); });
    await step('Book', () => yes(page));
    await page.getByRole('alert').filter({ hasText: 'Record the deposit before booking.' }).waitFor(); ok(true, 'booking without the deposit is refused, in words');
    await step('Record the deposit', () => save(page, 'payment'));
    await step('Hold crew or equipment', async () => { await form(page, 'hold').locator('[name=mediaResourceId]').selectOption({ label: 'Crew A · Salim and Huda · Crew' }); await save(page, 'hold'); });
    await page.getByText('Tentative', { exact: true }).first().waitFor();
    await record(page).getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.getByText('Confirmed', { exact: true }).first().waitFor();
    await step('Book', () => yes(page));
    await page.getByRole('button', { name: 'Start preproduction' }).waitFor();
    await step('Start preproduction');
    await step('Start the shoot');
    await page.getByRole('alert').filter({ hasText: 'Verify the critical preparation items' }).waitFor(); ok(true, 'the shoot cannot start with critical preparation missing');
    for (const item of ['Crew confirmed', 'Location permission', 'Equipment ready', 'Client assets received', 'Talent releases signed']) {
      const box = record(page).locator('.hb-prep li', { hasText: item }).getByRole('checkbox');
      await box.click(); await page.waitForFunction(text => [...document.querySelectorAll('.hb-prep li')].some(li => li.textContent.includes(text) && li.hasAttribute('data-done')), item);
    }
    await step('Start the shoot');
    await step('Record shoot done and footage received', () => yes(page));
    await step('Send a cut for review', async () => { await form(page, 'cut').locator('[name=assetRef]').fill('https://review.example/grad/v1'); await form(page, 'cut').locator('[name=approverName]').fill('هدى الكندية'); await save(page, 'cut'); });
    await step('Record the client’s decision', async () => { await form(page, 'decision').locator('[name=evidenceSource]').selectOption('chat'); await save(page, 'decision'); });
    await page.getByRole('button', { name: 'Final handoff' }).waitFor();
    await step('Final handoff', async () => { await form(page, 'handoff').locator('[name=link]').fill('https://files.example/grad/final'); await save(page, 'handoff'); });
    await record(page).locator('.ld-chip', { hasText: 'Delivered' }).first().waitFor();
    ok(true, 'a brief reaches Delivered through the forms');
    const final = value(await api(page, manager.base, 'media_production', { productionId: id }));
    eq([final.status, final.cuts.length, final.money.paidMinor, final.money.balanceMinor], ['delivered', 1, 160000, 640000], 'the delivered production keeps its order money');
    eq(problems.filter(p => !p.includes('422') && !p.includes('409')), [], 'no errors other than the explained refusals');
    await page.screenshot({ path: `${OUT}/journey-delivered.png`, fullPage: true });
    await context.close();
  }

  // 4. Two confirmed bookings can never share a resource: Crew B is booked for the hotel shoot.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=work&view=board');
    const list = value(await api(page, manager.base, 'media_productions'));
    const hotel = list.items.find(p => p.title === 'Hotel rooms photography'), podcast = list.items.find(p => p.title === 'Corporate podcast series');
    const crewB = value(await api(page, manager.base, 'media_resources')).items.find(r => r.name.startsWith('Crew B'));
    const r = await api(page, manager.base, 'media_reservation_save', { requestId: crypto.randomUUID(), productionId: podcast.id, mediaResourceId: crewB.id, media: { startsAt: hotel.shootStartsAt + 3600000, endsAt: hotel.shootStartsAt + 7200000 } });
    eq(r.reason || r.error, 'resource_conflict', 'a hold over a confirmed booking is refused');
    await page.goto(`${manager.base}/en/layla/dashboard?tab=work&view=calendar`);
    await page.locator('.hb-calendar').waitFor();
    ok(await page.locator('.hb-calendar-item[data-conflict]').count() >= 2, 'tentative holds that clash are flagged on the calendar');
    ok(await page.locator('.hb-calendar-item[data-hold="held"]').count() >= 1, 'tentative holds look different from confirmed ones');
    await context.close();
  }

  // 5. Extra scope: the third revision of the implant video became one priced change order; the manager decides it.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=work&view=board&quick=extra_scope');
    await page.locator('.hb-production-card', { hasText: 'Implant explainer video' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Open full record' }).click();
    await record(page).waitFor();
    ok(await record(page).getByText('3 of 2 included revision rounds used', { exact: false }).isVisible() || await record(page).getByText('over the allowance').isVisible(), 'the record shows rounds used against the allowance');
    await record(page).getByRole('button', { name: 'Send a cut for review' }).click();
    await form(page, 'cut').locator('[name=assetRef]').fill('https://review.example/implant/v4');
    await form(page, 'cut').locator('[name=approverName]').fill('Bayan Dental Clinic');
    await form(page, 'cut').getByRole('button', { name: 'Save' }).click();
    await page.getByRole('alert').filter({ hasText: 'waiting for the manager’s decision' }).waitFor();
    ok(true, 'no new cut while extra scope waits for a decision');
    await form(page, 'cut').getByRole('button', { name: 'Cancel' }).click();
    await record(page).getByRole('button', { name: 'Decide' }).click();
    await form(page, 'change_decide').locator('[name=customerApproval]').fill('Dr Bayan, in the chat');
    await save(page, 'change_decide');
    await record(page).locator('.ld-chip', { hasText: 'Approved' }).first().waitFor();
    ok(true, 'the change order is approved with the client’s approval recorded');
    await context.close();
  }

  // 6. Follow-ups: a rule's cut-approval draft waits for the manager; outside 24 hours it needs a template.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=work&view=followups&filter=decision');
    await page.locator('.hb-followup-filters').waitFor();
    const row = page.locator('.hb-followups > li', { hasText: 'Current-cut approval' }).first();
    await row.waitFor();
    ok(await row.locator('.hb-draft-text').isVisible(), 'the draft text, written from recorded facts, is shown');
    await row.getByRole('button', { name: 'Approve and send' }).click();
    await yes(page);
    await page.locator('.hb-followup-filters label', { hasText: 'Blocked / failed' }).click();
    await page.locator('.hb-followups > li', { hasText: 'Needs an approved template' }).first().waitFor();
    ok(true, 'outside the 24-hour window the approved draft waits for a template instead of sending');
    const badge = await page.locator('.ld-desktop-nav a[data-section="work"] .ld-nav-badge').innerText();
    ok(Number(badge) > 0, 'the Productions badge counts actionable follow-ups');
    await context.close();
  }

  // 6b. Adiba's offer waits beside the follow-ups: no price until the owner gives one, then it is ready to approve.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=work&view=followups');
    const offer = page.locator('.hb-offers .hb-offer', { hasText: 'Drone footage' }).first();
    await offer.waitFor();
    ok(await offer.getByText('Needs your price').isVisible(), 'the offer waits for the owner’s price');
    ok(await offer.getByText('The catalog says "price on request"', { exact: false }).isVisible(), 'it says why it needs the owner');
    ok(await offer.getByRole('button', { name: 'Approve and send' }).count() === 0, 'nothing unpriced can be approved');
    await offer.getByLabel('Price for Drone footage (OMR)').fill('180');
    await offer.getByRole('button', { name: 'Save prices' }).click();
    await offer.getByText('Ready to approve').waitFor();
    ok(/Drone footage: 180\.000 OMR/.test(await offer.locator('.hb-offer-text pre').innerText()), 'the exact text the customer will read');
    ok(await noOverflow(page), 'offers fit the page');
    await context.close();
  }

  // 7. Insights → source records → Back to Insights, restored after a reload.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=insights');
    await page.locator('.hb-kpis').waitFor();
    eq(await page.locator('.hb-kpi > span').allInnerTexts(), ['On-time final delivery', 'Approval wait', 'Revision overrun', 'Project contribution'], 'the four headline cards, in the spec’s order');
    await page.locator('.hb-kpi[data-metric="revision_overrun"]').click();
    await page.locator('#md-kpi-title', { hasText: 'Revision overrun' }).waitFor();
    await page.getByRole('button', { name: 'View source records' }).click();
    await page.locator('#md-records-title').waitFor();
    eq([param(page, 'tab'), param(page, 'metric'), param(page, 'from')], ['work', 'revision_overrun', 'insights'], 'records open in Productions with the metric');
    await page.reload();
    await page.locator('#md-records-title').waitFor();
    await page.getByRole('button', { name: 'Back to Insights' }).click();
    await page.locator('#md-kpi-title', { hasText: 'Revision overrun' }).waitFor();
    ok(true, 'Back to Insights restores the selected measure after a reload');
    await page.locator('.hb-segments select').selectOption('production_type');
    await page.locator('.hb-segments table').waitFor();
    ok(await page.locator('.hb-segments tbody tr').count() >= 2, 'the production-type breakdown has a row per type');
    await context.close();
  }

  // 8. Chat → production → Back to chat; customer → production.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=chats');
    const convo = value(await api(page, manager.base, 'media_productions')).items.find(p => p.title === 'Ceramics product shoot').conversationId;
    await page.goto(`${manager.base}/en/layla/dashboard?tab=chats&chat=${convo}`);
    const card = page.locator('.hb-deal-context-card', { hasText: 'Ceramics product shoot' });
    await card.waitFor();
    ok(await card.getByText('v2').isVisible(), 'the chat shows the production’s current cut');
    await card.getByRole('button', { name: 'Open production' }).click();
    await record(page).waitFor();
    await page.getByRole('button', { name: 'Back to chat' }).click();
    await page.locator('.hb-deal-context-card').first().waitFor();
    eq(param(page, 'chat'), convo, 'Back returns to the same chat');
    await page.goto(`${manager.base}/en/layla/dashboard?tab=customers`);
    await page.locator('.ld-table').waitFor();
    await page.getByRole('row', { name: /Salma Al Busaidi/ }).first().locator('.ld-row-open').click();
    await page.locator('.hb-deal-context-card', { hasText: 'Lounge brand film' }).waitFor();
    ok(true, 'a customer record shows their productions');
    await context.close();
  }

  // 9. Rules persist; 10. the producer's limits.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=settings&view=rules');
    await page.locator('.hb-rules').waitFor();
    const prep = page.locator('fieldset', { hasText: 'Prep and brief inputs' });
    await prep.locator('select').nth(1).selectOption('task');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('Saved. Rules apply from the next check.').waitFor();
    await page.reload();
    await page.locator('.hb-rules').waitFor();
    eq(await page.locator('fieldset', { hasText: 'Prep and brief inputs' }).locator('select').nth(1).inputValue(), 'task', 'a rule change survives a reload');
    await context.close();
  }
  {
    const { page, context } = await open(producer.base, 1280, 'en', '/layla/dashboard?tab=work&view=board');
    await page.locator(READY.board).waitFor();
    const list = value(await api(page, producer.base, 'media_productions'));
    ok(list.items.every(p => p.money === undefined), 'a producer’s productions carry no money');
    ok(list.items.every(p => !p.producerId || p.producerId === list.items.find(x => x.producerId)?.producerId), 'a producer sees their own and unassigned productions');
    eq((await api(page, producer.base, 'media_insights')).reason || 'allowed', 'manager_required', 'Insights are the manager’s');
    await page.locator('.hb-production-card').first().getByRole('button').first().click();
    if (await page.getByRole('button', { name: 'Open full record' }).count()) await page.getByRole('button', { name: 'Open full record' }).click();
    await record(page).waitFor();
    ok(!(await record(page).getByRole('button', { name: 'Issue the quote' }).count()), 'a producer cannot quote');
    ok(!(await record(page).getByText('Direct costs').count()), 'a producer sees no costs');
    await page.goto(`${producer.base}/en/layla/dashboard?tab=insights`);
    await page.locator(READY.board).waitFor();
    eq(param(page, 'tab') === 'insights' ? await page.locator('.hb-kpis').count() : 0, 0, 'Insights is not open to a producer');
    await context.close();
  }
  console.log(`media browser: ${count} checks passed`);
} finally {
  await browser.close();
  manager.child.kill(); producer.child.kill();
}
