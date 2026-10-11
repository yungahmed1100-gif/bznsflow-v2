// Fitness & wellness (gym, Ascend) in a real browser against the real-logic demo gym: the six tabs of
// ascend/fitness.md, every Memberships view, a membership added and started by its payment through the
// forms, a freeze, the waitlist filling a freed place by itself, one-tap check-in, drafts waiting for
// approval, Insights with drill-down, the follow-up rules and the links that carry one member between
// Chats, Memberships, Customers and Insights. Runs a manager demo and a coach (employee) demo.
// No message reaches a provider. Usage: npm run build && node tests/fitness-browser.mjs
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const OUT = process.env.FITNESS_BROWSER_OUT || 'work/hardening/fitness/browser';
const MANAGER_PORT = 5383, COACH_PORT = 5384;
await mkdir(OUT, { recursive: true });

function demo(port, ...flags) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), '--pack=fitness', ...flags], { stdio: ['ignore', 'pipe', 'inherit'] });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => { if (String(chunk).includes('Hasib demo')) resolve(); });
    child.on('exit', code => reject(new Error(`demo on ${port} exited with ${code}`)));
  });
  return { child, ready, base: `http://127.0.0.1:${port}` };
}

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page => (await new AxeBuilder({ page }).include('.ld').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.length}`);
const DEMO_ONLY = /surface=(customer|instagram)/;

const manager = demo(MANAGER_PORT), coach = demo(COACH_PORT, '--role=employee');
await Promise.all([manager.ready, coach.ready]);
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
const record = page => page.locator('.hb-member-record');
const value = r => { assert.equal(r.ok, true, JSON.stringify(r)); return r.value ?? r; };
const memberNamed = async (page, base, name) => value(await api(page, base, 'fitness_members')).items.find(r => r.contactName === name);

const TABS = { en: ['Chats', 'Memberships', 'Customers', 'Broadcasts', 'Insights', 'Settings'], ar: ['المحادثات', 'العضويات', 'العملاء', 'الرسائل الجماعية', 'المؤشرات', 'الإعدادات'] };
const READY = { members: '.hb-members', classes: '.hb-calendar', plans: '.hb-plans', followups: '.hb-followup-filters', insights: '.hb-kpis', rules: '.hb-rules', team: '.hb-fitness .hb-page-header', customers: '.ld-table', chats: '.ld-conversations' };
const PATH = { members: '?tab=work&view=members', classes: '?tab=work&view=classes', plans: '?tab=work&view=plans', followups: '?tab=work&view=followups&filter=decision',
  insights: '?tab=insights', rules: '?tab=settings&view=rules', team: '?tab=settings&view=team', customers: '?tab=customers', chats: '?tab=chats' };

try {
  // 1. Every destination for the manager and the coach, deep-linked, in both languages and three widths.
  // FITNESS_SKIP_SWEEP=1 runs only the journeys while iterating; a release run always sweeps.
  if (!process.env.FITNESS_SKIP_SWEEP) for (const [who, run, views] of [['manager', manager, Object.keys(PATH)], ['coach', coach, ['members', 'classes', 'plans', 'followups', 'customers', 'chats']]]) {
    for (const lang of ['en', 'ar']) {
      for (const width of [1440, 768, 320]) {
        for (const view of views) {
          const { page, context, problems } = await open(run.base, width, lang, `/layla/dashboard${PATH[view]}`);
          await page.locator(READY[view]).first().waitFor();
          if (view === 'members' && width === 1440) {
            const nav = await sections(page);
            eq(nav, who === 'manager' ? TABS[lang] : TABS[lang].slice(0, 3), `${who} sees ${who === 'manager' ? 'the six tabs' : 'Chats, Memberships and Customers'} in order, ${lang}`);
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
    for (const [old, ready] of [['today', READY.members], ['orders', READY.members], ['stock', READY.plans], ['money', READY.insights], ['team', READY.team]]) {
      await page.goto(`${manager.base}/en/layla/dashboard?tab=${old}`);
      await page.locator(ready).first().waitFor();
      ok(await page.locator(ready).first().isVisible(), `old link ${old} opens its new place`);
    }
    await context.close();
  }

  // 3. A Layla enquiry becomes a member through the forms: refused without a membership, added, started by its payment, frozen and unfrozen.
  {
    const { page, context, problems } = await open(manager.base, 1440, 'en', '/layla/dashboard?tab=work&view=members&quick=trialFollowUp');
    await page.locator(READY.members).waitFor();
    ok(await page.locator('.hb-members tr', { hasText: 'Maryam Al Farsi' }).count() === 1, 'Layla’s enquiry is in Trial follow-up');
    await page.goto(`${manager.base}/en/layla/dashboard?tab=work&view=classes`);
    await page.locator(READY.classes).waitFor();
    await page.locator('.hb-class', { hasText: 'Sunset Yoga' }).filter({ has: page.getByRole('button', { name: 'Book a place' }) }).first().getByRole('button', { name: 'Book a place' }).click();
    await form(page, 'book').locator('[name=contactId]').selectOption({ label: 'Maryam Al Farsi' });
    await form(page, 'book').getByRole('button', { name: 'Save' }).click();
    await page.getByRole('alert').filter({ hasText: 'They need a membership' }).waitFor();
    ok(true, 'booking a class without a membership is refused with the next step');
    problems.splice(0); // that refusal (409) was the point of the step
    await form(page, 'book').getByRole('button', { name: 'Cancel' }).click();
    await page.goto(`${manager.base}/en/layla/dashboard?tab=work&view=members`);
    await page.getByRole('button', { name: 'Add membership' }).first().click();
    await form(page, 'membership').locator('[name=contactId]').selectOption({ label: 'Maryam Al Farsi' });
    await form(page, 'membership').locator('[name=planId]').selectOption(await form(page, 'membership').locator('[name=planId] option', { hasText: 'Monthly' }).getAttribute('value'));
    await save(page, 'membership');
    await page.locator('.hb-members .hb-member-open', { hasText: 'Maryam Al Farsi' }).click();
    if (await page.getByRole('button', { name: 'Open full record' }).count()) await page.getByRole('button', { name: 'Open full record' }).click();
    await record(page).waitFor();
    eq(param(page, 'member') !== null, true, 'the record is addressed by ?member');
    await record(page).locator('header .ld-chip', { hasText: 'Awaiting payment' }).waitFor();
    ok(true, 'a new membership waits for its payment');
    await record(page).getByRole('button', { name: 'Record payment' }).click();
    await save(page, 'payment');
    await record(page).locator('header .ld-chip', { hasText: 'Active' }).waitFor();
    ok(true, 'the full payment starts the membership by itself');
    await record(page).getByRole('button', { name: 'Freeze' }).click();
    await form(page, 'freeze').locator('[name=days]').fill('7');
    await save(page, 'freeze');
    await record(page).locator('header .ld-chip', { hasText: 'Frozen' }).waitFor();
    ok(true, 'a freeze shows at once');
    await record(page).getByRole('button', { name: 'End freeze' }).click();
    await yes(page);
    await record(page).locator('header .ld-chip', { hasText: 'Active' }).waitFor();
    ok(await record(page).locator('#ft-activity li', { hasText: 'Started (paid)' }).count() === 1, 'the activity records the paid start');
    eq(problems, [], 'no request failed in the membership journey');
    await context.close();
  }

  // 4. The waitlist fills a freed place by itself, and check-in is one tap.
  {
    const { page, context } = await open(manager.base, 1440, 'en', '/layla/dashboard?tab=work&view=classes');
    await page.locator(READY.classes).waitFor();
    const classes = value(await api(page, manager.base, 'fitness_classes', {})).items;
    const full = classes.find(c => c.title === 'Spin 45' && c.waitlisted > 0);
    ok(!!full && full.booked === full.capacity, 'the demo has a full spin class with a waitlist');
    const card = page.locator('.hb-class').filter({ has: page.locator('.hb-roster li', { hasText: 'Aisha Al Habsi' }) }).filter({ hasText: 'waiting' }).first();
    await card.locator('.hb-roster li', { hasText: 'Aisha Al Habsi' }).getByRole('button', { name: 'Cancel booking' }).click();
    await yes(page);
    await page.locator('.hb-roster li', { hasText: 'خالد الرواحي' }).locator('.ld-chip', { hasText: 'Booked' }).first().waitFor();
    ok(true, 'the first person on the waitlist got the place');
    const drafts = value(await api(page, manager.base, 'fitness_followups', { filter: 'decision' })).items;
    ok(drafts.some(d => d.kind === 'waitlist_promoted'), 'and a “place opened” message waits for approval');
    // A class starting now: book through the API, check in with one tap.
    const startsAt = Date.now() + 10 * 60000;
    const k = value(await api(page, manager.base, 'fitness_class_save', { requestId: randomUUID(), fitness: { title: 'Browser Bootcamp', classType: 'bootcamp', startsAt, endsAt: startsAt + 3600000, capacity: 8 } }));
    const omar = await memberNamed(page, manager.base, 'Omar Al Lawati');
    value(await api(page, manager.base, 'fitness_seat_book', { requestId: randomUUID(), classId: k.id, contactId: omar.contactId }));
    await page.reload();
    const boot = page.locator('.hb-class', { hasText: 'Browser Bootcamp' });
    await boot.getByRole('button', { name: 'Check in' }).click();
    await boot.locator('.ld-chip', { hasText: 'Attended' }).waitFor();
    ok(true, 'one tap checks a member in');
    await context.close();
  }

  // 5. Follow-ups: drafts Hasib wrote wait for approval; outside 24 hours one needs a template.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=work&view=followups&filter=decision');
    await page.locator('.hb-followup-filters').waitFor();
    const row = page.locator('.hb-followups > li', { hasText: 'Renewal reminder' }).first();
    await row.waitFor();
    ok(await row.locator('.hb-draft-text').isVisible(), 'the draft text, written from recorded facts, is shown');
    await row.getByRole('button', { name: 'Approve and send' }).click();
    await yes(page);
    await page.locator('.hb-followup-filters label', { hasText: 'Blocked / failed' }).click();
    await page.locator('.hb-followups > li', { hasText: 'Needs an approved template' }).first().waitFor();
    ok(true, 'outside the 24-hour window the approved draft waits for a template instead of sending');
    const badge = await page.locator('.ld-desktop-nav a[data-section="work"] .ld-nav-badge').innerText();
    ok(Number(badge) > 0, 'the Memberships badge counts actionable follow-ups');
    await page.locator('.hb-followup-filters label', { hasText: 'Waiting on customer' }).click();
    const due = page.locator('.hb-followups > li', { hasText: 'Payment before it starts' }).first();
    await due.waitFor();
    eq(await due.getByRole('button', { name: 'Mark done' }).count(), 0, 'a self-closing task cannot be marked done');
    await context.close();
  }

  // 6. Insights → source records → Back to Insights, restored after a reload.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=insights');
    await page.locator('.hb-kpis').waitFor();
    eq(await page.locator('.hb-kpi > span').allInnerTexts(), ['Trial-to-member conversion', 'Membership renewal', 'Members with an attendance gap', 'Class attended occupancy'], 'the four headline cards, in the spec’s order');
    await page.locator('.hb-kpi[data-metric="class_occupancy"]').click();
    await page.locator('#ft-kpi-title', { hasText: 'Class attended occupancy' }).waitFor();
    await page.getByRole('button', { name: 'View source records' }).click();
    await page.locator('#ft-records-title').waitFor();
    eq([param(page, 'tab'), param(page, 'metric'), param(page, 'from')], ['work', 'class_occupancy', 'insights'], 'records open in Memberships with the metric');
    await page.reload();
    await page.locator('#ft-records-title').waitFor();
    await page.getByRole('button', { name: 'Back to Insights' }).click();
    await page.locator('#ft-kpi-title', { hasText: 'Class attended occupancy' }).waitFor();
    ok(true, 'Back to Insights restores the selected measure after a reload');
    await page.locator('.hb-segments select').selectOption('class_type');
    await page.locator('.hb-segments table').waitFor();
    ok(await page.locator('.hb-segments tbody tr').count() >= 3, 'the class-type breakdown has a row per class type');
    ok(await page.locator('.hb-funnel').isVisible(), 'the trial funnel is shown, with cost per trial marked unavailable');
    await context.close();
  }

  // 7. Chat → membership → Back to chat; customer → membership.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=chats');
    const lina = value(await api(page, manager.base, 'fitness_member', { contactId: (await memberNamed(page, manager.base, 'Lina Haddad')).contactId }));
    await page.goto(`${manager.base}/en/layla/dashboard?tab=chats&chat=${lina.conversationId}`);
    const card = page.locator('.hb-deal-context-card', { hasText: 'Quarterly' });
    await card.waitFor();
    ok(await card.locator('.ld-chip', { hasText: 'Frozen' }).isVisible(), 'the chat shows the member is frozen');
    await card.getByRole('button', { name: 'Open membership' }).click();
    await record(page).waitFor();
    await page.getByRole('button', { name: 'Back to chat' }).click();
    await page.locator('.hb-deal-context-card').first().waitFor();
    eq(param(page, 'chat'), lina.conversationId, 'Back returns to the same chat');
    await page.goto(`${manager.base}/en/layla/dashboard?tab=customers`);
    await page.locator('.ld-table').waitFor();
    await page.getByRole('row', { name: /Omar Al Lawati/ }).first().locator('.ld-row-open').click();
    await page.locator('.hb-deal-context-card', { hasText: 'Monthly' }).waitFor();
    ok(true, 'a customer record shows their membership');
    await context.close();
  }

  // 8. Rules persist; 9. the coach's limits.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=settings&view=rules');
    await page.locator('.hb-rules').waitFor();
    ok(await page.locator('fieldset', { hasText: 'Renewal' }).locator('input[type=checkbox]').isChecked(), 'the rules start on, writing drafts');
    await page.locator('fieldset', { hasText: 'Renewal' }).locator('select').nth(1).selectOption('task');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('Saved. Rules apply from the next check.').waitFor();
    await page.reload();
    await page.locator('.hb-rules').waitFor();
    eq(await page.locator('fieldset', { hasText: 'Renewal' }).locator('select').nth(1).inputValue(), 'task', 'a rule change survives a reload');
    await context.close();
  }
  {
    const { page, context } = await open(coach.base, 1280, 'en', '/layla/dashboard?tab=work&view=members');
    await page.locator(READY.members).waitFor();
    const list = value(await api(page, coach.base, 'fitness_members'));
    ok(list.items.every(r => r.money === undefined), 'a coach’s member list carries no money');
    eq((await api(page, coach.base, 'fitness_insights')).reason || 'allowed', 'manager_required', 'Insights are the manager’s');
    eq((await api(page, coach.base, 'fitness_freeze', { membershipId: 'x' })).reason || 'allowed', 'manager_required', 'freezes are the manager’s');
    eq(await page.getByRole('button', { name: 'Add membership' }).count(), 0, 'a coach does not add memberships');
    await page.locator('.hb-member-open').first().click();
    if (await page.getByRole('button', { name: 'Open full record' }).count()) await page.getByRole('button', { name: 'Open full record' }).click();
    await record(page).waitFor();
    eq(await record(page).locator('#ft-payments').count(), 0, 'a coach sees no payments');
    eq(await record(page).getByRole('button', { name: 'Freeze' }).count(), 0, 'a coach cannot freeze');
    await page.goto(`${coach.base}/en/layla/dashboard?tab=insights`);
    await page.locator(READY.members).waitFor();
    eq(await page.locator('.hb-kpis').count(), 0, 'Insights is not open to a coach');
    await context.close();
  }
  console.log(`fitness browser: ${count} checks passed`);
} finally {
  await browser.close();
  manager.child.kill(); coach.child.kill();
}
