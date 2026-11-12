// AC service (Ascend HVAC) in a real browser against the real-logic demo business ("Barid Cooling"):
// the six tabs of ascend/hvac.md, every Jobs view, a Layla request triaged and taken through
// estimate → the customer's yes → a booked visit → arrival → repair → checks → tested → completed →
// payment → next service date with the forms, a maintenance contract drafted and activated, drafts
// waiting for approval, Insights with drill-down, the follow-up rules, the links between Chats and
// Jobs, and a technician's limits. Runs a manager demo and a technician demo. Nothing reaches a provider.
// Usage: npm run build && node tests/hvac-browser.mjs
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const OUT = process.env.HVAC_BROWSER_OUT || 'work/hardening/hvac/browser';
const MANAGER_PORT = 5397,
  TECH_PORT = 5398,
  MUSCAT = 4 * 3600000;
await mkdir(OUT, { recursive: true });

function demo(port, ...flags) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), '--pack=hvac', ...flags], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('Hasib demo')) resolve();
    });
    child.on('exit', code => reject(new Error(`demo on ${port} exited with ${code}`)));
  });
  return { child, ready, base: `http://127.0.0.1:${port}` };
}

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page =>
  (await new AxeBuilder({ page }).include('.ld').analyze()).violations
    .filter(v => ['critical', 'serious'].includes(v.impact))
    .map(v => `${v.id}: ${v.nodes.length}`);
const DEMO_ONLY = /surface=(customer|instagram)/;
const local = ms => new Date(ms + MUSCAT).toISOString();

const manager = demo(MANAGER_PORT),
  tech = demo(TECH_PORT, '--role=employee');
await Promise.all([manager.ready, tech.ready]);
const browser = await chromium.launch();
let count = 0;
const ok = (value, message) => {
  assert.ok(value, message);
  count++;
};
const eq = (actual, expected, message) => {
  assert.deepEqual(actual, expected, message);
  count++;
};

async function open(base, width, lang, path) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(`pageerror ${e.message}`));
  page.on('response', r => {
    if (r.url().includes('/api/') && r.status() >= 400 && !DEMO_ONLY.test(r.url()))
      problems.push(`${r.status()} ${r.url()} ${r.request().postData()?.slice(0, 80)}`);
  });
  await page.goto(`${base}${lang === 'ar' ? '' : '/en'}${path}`);
  await page.locator('.ld-nav a').first().waitFor({ state: 'attached' });
  return { page, context, problems };
}
const api = (page, base, action, body = {}) =>
  page.evaluate(
    async ([url, payload]) =>
      (
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      ).json(),
    [`${base}/api/layla-meta?surface=hasib`, { action, ...body }],
  );
const inbound = (page, base, from, text, name) =>
  page.evaluate(
    async ([url, payload]) =>
      (
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      ).json(),
    [`${base}/demo/inbound`, { from, text, name }],
  );
const sections = page =>
  page
    .locator('.ld-desktop-nav a')
    .allInnerTexts()
    .then(list => list.map(x => x.trim().replace(/\s*\d+$/, '')));
const yes = page =>
  page
    .getByRole('alertdialog')
    .getByRole('button', { name: /Yes, continue|نعم، متابعة/ })
    .click();
const param = (page, key) => new URL(page.url()).searchParams.get(key);
const form = (page, name) => page.locator(`form[data-form="${name}"]`);
const save = async (page, name) => {
  await form(page, name)
    .getByRole('button', { name: /^Save$|^حفظ$/ })
    .click();
  try {
    await form(page, name).waitFor({ state: 'detached', timeout: 10000 });
  } catch {
    throw new Error(
      `${name} was not saved: ${(await page.getByRole('alert').allInnerTexts()).join(' | ') || 'no message shown'}`,
    );
  }
};
const record = page => page.locator('.hb-hvac-record');
const value = r => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value ?? r;
};
const status = (page, text) =>
  record(page)
    .locator('header h2 .ld-chip', { hasText: text })
    .first()
    .waitFor({ timeout: 15000 })
    .catch(async e => {
      throw new Error(
        `status ${text} not shown: ${(await page.getByRole('alert').allInnerTexts()).join(' | ') || (await record(page).locator('header').innerText()).slice(0, 300)}; ${e.message}`,
      );
    });
const click = (page, name) => record(page).locator('header').getByRole('button', { name, exact: true }).click();

const TABS = {
  en: ['Chats', 'Jobs', 'Customers', 'Broadcasts', 'Insights', 'Settings'],
  ar: ['المحادثات', 'الأعمال', 'العملاء', 'الرسائل الجماعية', 'المؤشرات', 'الإعدادات'],
};
const READY = {
  schedule: '.hb-day-nav',
  jobs: '.hb-hvac-jobs',
  contracts: '.hb-contract-book',
  units: '.hb-units',
  followups: '.hb-followup-filters',
  insights: '.hb-kpis',
  rules: '.hb-rules',
  team: '.hb-hvac .hb-page-header',
  customers: '.ld-table',
  chats: '.ld-conversations',
};
const PATH = {
  schedule: '?tab=work&view=schedule',
  jobs: '?tab=work&view=jobs',
  contracts: '?tab=work&view=contracts',
  units: '?tab=work&view=units',
  followups: '?tab=work&view=followups&filter=decision',
  insights: '?tab=insights',
  rules: '?tab=settings&view=rules',
  team: '?tab=settings&view=team',
  customers: '?tab=customers',
  chats: '?tab=chats',
};

try {
  // 1. Every destination for the manager and the technician, deep-linked, in both languages and three widths.
  if (!process.env.HVAC_SKIP_SWEEP)
    for (const [who, run, views] of [
      ['manager', manager, Object.keys(PATH)],
      ['technician', tech, ['schedule', 'jobs', 'units', 'followups', 'customers', 'chats']],
    ]) {
      for (const lang of ['en', 'ar']) {
        for (const width of [1440, 768, 320]) {
          for (const view of views) {
            const { page, context, problems } = await open(run.base, width, lang, `/layla/dashboard${PATH[view]}`);
            await page
              .locator(READY[view])
              .first()
              .waitFor()
              .catch(async error => {
                const visibleText = (await page.locator('body').innerText()).slice(0, 500);
                throw new Error(
                  `${who} ${view} ${lang} ${width}: view did not load; ${problems.join(' | ') || visibleText}; ${error.message}`,
                );
              });
            if (view === 'schedule' && width === 1440) {
              eq(
                await sections(page),
                who === 'manager' ? TABS[lang] : TABS[lang].slice(0, 3),
                `${who} sees ${who === 'manager' ? 'the six tabs' : 'Chats, Jobs and Customers'} in order, ${lang}`,
              );
              eq(
                (await page.locator('.hb-schedule-col h3').count()) >= (who === 'manager' ? 5 : 1),
                true,
                `${who} sees a column per technician${who === 'manager' ? ' and the jobs waiting for a time' : ''}, ${lang}`,
              );
            }
            eq(await noOverflow(page), true, `${who} ${view} overflow ${lang} ${width}`);
            eq(await axe(page), [], `${who} ${view} axe ${lang} ${width}`);
            eq(problems, [], `${who} ${view} errors ${lang} ${width}`);
            if (width === 1440 || width === 320)
              await page.screenshot({ path: `${OUT}/${who}-${view}-${lang}-${width}.png`, fullPage: true });
            await context.close();
          }
        }
      }
    }

  // 2. Older links land where their content now lives.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=today');
    for (const [old, ready] of [
      ['today', READY.schedule],
      ['orders', READY.jobs],
      ['stock', READY.units],
      ['money', READY.insights],
      ['team', READY.team],
    ]) {
      await page.goto(`${manager.base}/en/layla/dashboard?tab=${old}`);
      await page.locator(ready).first().waitFor();
      ok(await page.locator(ready).first().isVisible(), `old link ${old} opens its new place`);
    }
    await context.close();
  }

  // 3. A Layla request, through every step of the job with the screens.
  {
    const { page, context, problems } = await open(
      manager.base,
      1440,
      'en',
      '/layla/dashboard?tab=work&view=followups&filter=today',
    );
    await inbound(page, manager.base, '96899500001', 'السلام عليكم، المكيف ما يبرد', 'Hamdan Al Mahrouqi');
    await page.reload();
    await page.locator(READY.followups).waitFor();
    const request = page
      .locator('.hb-followups > li[data-kind="triage_request"]', { hasText: 'Hamdan Al Mahrouqi' })
      .first();
    await request.waitFor();
    await request.getByRole('button', { name: 'Open and triage' }).click();
    await record(page).waitFor();
    await status(page, 'Request');
    ok(
      await record(page).locator('header .ld-chip', { hasText: 'Urgent' }).isVisible(),
      '“not cooling” makes the request urgent',
    );
    ok(
      await record(page).locator('#hv-overview', { hasText: 'Not cooling' }).isVisible(),
      'what the customer said is kept as a fixed choice',
    );
    await click(page, 'Mark triaged');
    await status(page, 'Triaged');
    await record(page).getByRole('button', { name: 'Add a unit' }).click();
    await form(page, 'unit').locator('[name=label]').fill('Majlis split');
    await save(page, 'unit');
    await record(page).locator('#hv-overview li', { hasText: 'Majlis split' }).waitFor();
    ok(true, 'a unit added from the job is linked to it');
    await click(page, 'Write estimate');
    const est = form(page, 'estimate');
    const gas = await est.locator('select').first().locator('option', { hasText: 'Gas refill' }).getAttribute('value');
    await est.locator('select').first().selectOption(gas);
    eq(await est.locator('input[type=number]').nth(1).inputValue(), '15', 'a catalog line takes its fixed price');
    await save(page, 'estimate');
    await click(page, 'Send estimate');
    await yes(page);
    await status(page, 'Estimate with customer');
    await click(page, 'Record the customer’s yes');
    await form(page, 'approval').locator('[name=evidenceSource]').selectOption('whatsapp');
    await save(page, 'approval');
    await status(page, 'Approved');
    ok(
      await record(page).locator('#hv-estimate li[data-estimate="1"]', { hasText: 'Approved' }).isVisible(),
      'version 1 carries the yes',
    );
    // A window starting now for Rahul, whose day is free until the afternoon.
    const start = Date.now() - 30 * 60000,
      end = start + 2 * 3600000;
    await click(page, 'Book a visit');
    const v = form(page, 'visit');
    await v.locator('[name=technicianAccountId]').selectOption({ label: 'rahul' });
    await v.locator('[name=date]').fill(local(start).slice(0, 10));
    await v.locator('[name=from]').fill(local(start).slice(11, 16));
    await v
      .locator('[name=to]')
      .fill(local(end).slice(11, 16) < local(start).slice(11, 16) ? '23:59' : local(end).slice(11, 16));
    await save(page, 'visit');
    await status(page, 'Visit booked');
    await click(page, 'Technician arrived');
    await status(page, 'On site');
    await click(page, 'Start repair');
    await status(page, 'Repairing');
    await click(page, 'Record checks');
    const checks = form(page, 'checklist');
    await checks.locator('textarea').fill('Low charge; topped up 0.8 kg.');
    await save(page, 'checklist');
    await click(page, 'Mark tested');
    await status(page, 'Tested');
    await click(page, 'Mark completed');
    await status(page, 'Completed');
    await record(page)
      .locator('#hv-money', { hasText: /Charged 15\.000\s*OMR/ })
      .waitFor();
    ok(true, 'completing charges the approved estimate');
    await click(page, 'Record payment');
    await save(page, 'payment');
    await record(page).locator('#hv-money .ld-chip', { hasText: 'Paid' }).waitFor();
    eq(
      await record(page).getByRole('button', { name: 'Record payment' }).count(),
      0,
      'once paid in full there is nothing to collect',
    );
    await record(page).getByRole('button', { name: 'Set next service date' }).first().click();
    await form(page, 'service')
      .locator('[name=serviceOn]')
      .fill(local(Date.now() + 90 * 86400000).slice(0, 10));
    await save(page, 'service');
    await record(page).locator('#hv-overview li', { hasText: 'next service' }).waitFor();
    ok(
      (await record(page).locator('#hv-activity li', { hasText: 'Estimate approved' }).count()) === 1,
      'the activity keeps each fact',
    );
    eq(problems, [], 'no request failed in the job journey');
    await context.close();
  }

  // 4. A maintenance contract: drafted, activated on the customer's yes, its first visit opened as a job.
  {
    const { page, context, problems } = await open(
      manager.base,
      1440,
      'en',
      '/layla/dashboard?tab=work&view=contracts',
    );
    await page.locator(READY.contracts).waitFor();
    const before = value(await api(page, manager.base, 'hvac_contracts')).book.active;
    await page.getByRole('button', { name: 'New contract' }).first().click();
    const f = form(page, 'contract');
    await f.waitFor();
    await f.locator('[name=contactId]').selectOption({ label: 'Hamdan Al Mahrouqi' });
    await f
      .locator('input[name=unitIds]')
      .first()
      .check()
      .catch(() => {});
    if (!(await f.locator('input[name=unitIds]').count())) throw new Error('the customer has no unit to cover');
    await f.locator('[name=visitsPerYear]').fill('4');
    await f.locator('[name=price]').fill('60');
    await save(page, 'contract');
    const draft = value(await api(page, manager.base, 'hvac_contracts')).items.find(
      c => c.contactName === 'Hamdan Al Mahrouqi',
    );
    eq(draft.status, 'draft', 'the contract starts as a draft');
    await page.locator('.hb-contracts button', { hasText: draft.reference }).click();
    await page.getByRole('button', { name: 'Customer agreed: activate' }).click();
    await form(page, 'activate').locator('[name=evidenceSource]').selectOption('signed');
    await save(page, 'activate');
    await page.locator('#hv-contract-title .ld-chip', { hasText: 'Active' }).waitFor();
    await page.locator('#hv-cv-h').waitFor();
    eq(
      await page
        .locator('section', { has: page.locator('#hv-cv-h') })
        .locator('li button.ld-link')
        .count(),
      1,
      'Hasib opened exactly one job: the visit due now',
    );
    eq(value(await api(page, manager.base, 'hvac_contracts')).book.active, before + 1, 'the contract book counts it');
    eq(problems, [], 'no request failed in the contract journey');
    await context.close();
  }

  // 5. Follow-ups: drafts Hasib wrote wait for approval; self-closing tasks have no Done.
  {
    const { page, context } = await open(
      manager.base,
      1280,
      'en',
      '/layla/dashboard?tab=work&view=followups&filter=decision',
    );
    await page.locator(READY.followups).waitFor();
    const renewal = page.locator('.hb-followups > li', { hasText: 'Contract renewal' }).first();
    await renewal.waitFor();
    ok(
      /AMC-\d{4}/.test(await renewal.locator('.hb-draft-text').innerText()),
      'the renewal draft names the contract and its end date',
    );
    await renewal.getByRole('button', { name: 'Approve and send' }).click();
    await yes(page);
    await page.locator('.hb-followup-filters label', { hasText: 'Blocked / failed' }).click();
    await page.locator('.hb-followups > li', { hasText: 'Needs an approved template' }).first().waitFor();
    ok(true, 'outside the 24-hour window the approved draft waits for a template instead of sending');
    ok(
      Number(await page.locator('.ld-desktop-nav a[data-section="work"] .ld-nav-badge').innerText()) > 0,
      'the Jobs badge counts actionable follow-ups',
    );
    const all = value(await api(page, manager.base, 'hvac_followups', {})).items;
    const selfClosing = all.find(
      r => ['arrival_unrecorded', 'schedule_job'].includes(r.kind) && r.bucket !== 'completed',
    );
    ok(!!selfClosing, 'the demo has a task that closes itself');
    await page
      .locator('.hb-followup-filters label', { hasText: selfClosing.bucket === 'overdue' ? 'Overdue' : 'Today' })
      .click();
    const row = page.locator(`.hb-followups > li[data-kind="${selfClosing.kind}"]`).first();
    await row.waitFor();
    eq(await row.getByRole('button', { name: 'Mark done' }).count(), 0, 'a self-closing task cannot be marked done');
    await context.close();
  }

  // 6. Insights → source records → Back to Insights, restored after a reload; breakdowns and the contract book.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=insights');
    await page.locator('.hb-kpis').waitFor();
    eq(
      await page.locator('.hb-kpi > span').allInnerTexts(),
      ['On-time arrival', 'First-time fix', 'Maintenance due', 'Job contribution'],
      'the four headline cards, in the spec’s order',
    );
    ok(
      await page.locator('.hb-kpi[data-metric="on_time_arrival"]', { hasText: 'reference ≥95%' }).isVisible(),
      'the industry reference sits beside the figure',
    );
    await page.locator('.hb-kpi[data-metric="on_time_arrival"]').click();
    await page.locator('#hv-kpi-title', { hasText: 'On-time arrival' }).waitFor();
    await page.getByRole('button', { name: 'View source records' }).click();
    await page.locator('#hv-records-title').waitFor();
    eq(
      [param(page, 'tab'), param(page, 'metric'), param(page, 'from')],
      ['work', 'on_time_arrival', 'insights'],
      'records open in Jobs with the metric',
    );
    ok(
      (await page.locator('.hb-records tr[data-counted="yes"]').count()) >= 1,
      'the on-time visits are marked as counted',
    );
    await page.reload();
    await page.locator('#hv-records-title').waitFor();
    await page.getByRole('button', { name: 'Back to Insights' }).click();
    await page.locator('#hv-kpi-title', { hasText: 'On-time arrival' }).waitFor();
    ok(true, 'Back to Insights restores the selected measure after a reload');
    await page.locator('.hb-segments select').selectOption('unit_type');
    await page.locator('.hb-segments table').waitFor();
    ok((await page.locator('.hb-segments tbody tr').count()) >= 2, 'one breakdown row per unit type');
    ok(
      (await page.locator('#hv-book').isVisible()) && (await page.locator('#hv-costs').isVisible()),
      'the contract book, money owed and costs are in Insights',
    );
    await context.close();
  }

  // 7. Chat → job → Back to chat.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=chats');
    const open_ = value(await api(page, manager.base, 'hvac_jobs', { status: 'open' })).items.find(j => j.visit);
    const full = value(await api(page, manager.base, 'hvac_job', { jobId: open_.id }));
    await page.goto(`${manager.base}/en/layla/dashboard?tab=chats&chat=${full.conversationId}`);
    const card = page.locator('.hb-deal-context-card', { hasText: 'Open job' });
    await card.waitFor();
    await card.getByRole('button', { name: 'Open job' }).click();
    await record(page).waitFor();
    eq(param(page, 'job'), String(open_.id), 'the same job opens in Jobs');
    await page.getByRole('button', { name: 'Back to chat' }).click();
    await page.locator('.hb-deal-context-card').first().waitFor();
    eq(param(page, 'chat'), full.conversationId, 'Back returns to the same chat');
    await context.close();
  }

  // 8. Rules persist, with the service areas and Hasib's estimate limit.
  {
    const { page, context } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=settings&view=rules');
    await page.locator('.hb-rules').waitFor();
    eq(
      await page.locator('fieldset', { hasText: 'Visit reminder' }).locator('select').nth(1).inputValue(),
      'auto',
      'a visit reminder sends itself by default',
    );
    eq(
      await page.locator('fieldset', { hasText: 'Contract renewal' }).locator('select').nth(1).inputValue(),
      'draft',
      'a renewal waits for the owner by default',
    );
    ok((await page.locator('[name=areas]').inputValue()).includes('Seeb'), 'the service areas are listed one per line');
    await page.locator('fieldset', { hasText: 'Outstanding balance' }).locator('select').nth(1).selectOption('task');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('Saved. Rules apply from the next check.').waitFor();
    await page.reload();
    await page.locator('.hb-rules').waitFor();
    eq(
      await page.locator('fieldset', { hasText: 'Outstanding balance' }).locator('select').nth(1).inputValue(),
      'task',
      'a rule change survives a reload',
    );
    await context.close();
  }

  // 9. A technician: their own jobs only, no prices, no estimates, no Insights.
  {
    const { page, context } = await open(tech.base, 1280, 'en', '/layla/dashboard?tab=work&view=jobs');
    await page.locator(READY.jobs).waitFor();
    const list = value(await api(page, tech.base, 'hvac_jobs'));
    ok(
      list.items.length > 0 && list.items.every(j => j.money === undefined && j.estimate?.totalMinor === undefined),
      'a technician’s job list carries no prices',
    );
    const mine = value(await api(page, tech.base, 'hvac_overview'));
    ok(
      list.items.every(j => j.technicianName === 'salim'),
      'only the jobs assigned to them',
    );
    eq(mine.contracts, undefined, 'and not the contract book');
    eq(
      (await api(page, tech.base, 'hvac_insights')).reason || 'allowed',
      'manager_required',
      'Insights are the manager’s',
    );
    eq(
      (
        await api(page, tech.base, 'hvac_estimate_save', {
          requestId: crypto.randomUUID(),
          jobId: list.items[0].id,
          hvac: { lines: [] },
        })
      ).reason || 'allowed',
      'manager_required',
      'estimates are the office’s',
    );
    await page.goto(`${tech.base}/en/layla/dashboard?tab=work&view=jobs&job=${list.items[0].id}`);
    await record(page).waitFor();
    eq(
      await record(page).locator('#hv-estimate, #hv-money').count(),
      0,
      'a technician sees no estimate or money section',
    );
    eq(await record(page).getByRole('button', { name: 'Cancel job' }).count(), 0, 'and cannot cancel the job');
    await page.goto(`${tech.base}/en/layla/dashboard?tab=insights`);
    await page.locator(READY.schedule).waitFor();
    eq(await page.locator('.hb-kpis').count(), 0, 'Insights is not open to a technician');
    await context.close();
  }
  console.log(`hvac browser: ${count} checks passed`);
} finally {
  await browser.close();
  manager.child.kill();
  tech.child.kill();
}
