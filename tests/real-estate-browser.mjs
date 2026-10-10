// Real Estate (agency, Ascend) in a real browser against the real-logic demo agency: the six tabs of
// ascend/real-estate.md, every Deals view, Insights with drill-down, the follow-up rules, and the links
// that carry one deal between Chats, Deals, Customers and Insights. Every listing, deal, viewing,
// offer, compliance check, close and rule runs through the production Convex state code.
// Runs a manager demo and an agent (employee) demo. No message reaches a provider.
// Usage: npm run build && node tests/real-estate-browser.mjs
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const OUT = process.env.REAL_ESTATE_BROWSER_OUT || 'work/hardening/real-estate/browser';
const MANAGER_PORT = 5341, AGENT_PORT = 5342;
await mkdir(OUT, { recursive: true });

function demo(port, ...flags) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), '--pack=real-estate', ...flags], { stdio: ['ignore', 'pipe', 'inherit'] });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => { if (String(chunk).includes('Hasib demo')) resolve(); });
    child.on('exit', code => reject(new Error(`demo on ${port} exited with ${code}`)));
  });
  return { child, ready, base: `http://127.0.0.1:${port}` };
}

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page => (await new AxeBuilder({ page }).include('.ld').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.length}`);
const DEMO_ONLY = /surface=(customer|instagram)/;

const manager = demo(MANAGER_PORT), agent = demo(AGENT_PORT, '--role=employee');
await Promise.all([manager.ready, agent.ready]);
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
const pick = (scope, name) => scope.getByRole('combobox', { name: new RegExp(`^${name}`) });
const yes = page => page.getByRole('alertdialog').getByRole('button', { name: /Yes, continue|نعم، متابعة/ }).click();
const param = (page, key) => new URL(page.url()).searchParams.get(key);

const TABS = { en: ['Chats', 'Deals', 'Customers', 'Broadcasts', 'Insights', 'Settings'], ar: ['المحادثات', 'الصفقات', 'العملاء', 'الرسائل الجماعية', 'المؤشرات', 'الإعدادات'] };
const READY = {
  board: '.hb-board', viewings: '.hb-viewings', properties: '.hb-property-card', followups: '.hb-followup-filters', insights: '.hb-kpis',
  rules: '.hb-rules', team: '.hb-real-estate .hb-page-header', customers: '.ld-table', chats: '.ld-conversations',
};
const PATH = {
  board: '?tab=work&view=board', viewings: '?tab=work&view=viewings', properties: '?tab=work&view=properties', followups: '?tab=work&view=followups&filter=overdue',
  insights: '?tab=insights', rules: '?tab=settings&view=rules', team: '?tab=settings&view=team', customers: '?tab=customers', chats: '?tab=chats',
};

try {
  // 1. Every destination for the manager and the agent, deep-linked, in both languages and three widths.
  for (const [who, run, views] of [['manager', manager, Object.keys(PATH)], ['agent', agent, ['board', 'viewings', 'properties', 'followups', 'customers', 'chats']]]) {
    for (const lang of ['en', 'ar']) {
      for (const width of [1440, 768, 320]) {
        for (const view of views) {
          const { page, context, problems } = await open(run.base, width, lang, `/layla/dashboard${PATH[view]}`);
          await page.locator(READY[view]).first().waitFor();
          if (view === 'board' && width === 1440) {
            const nav = await sections(page);
            if (who === 'manager') eq(nav, TABS[lang], `manager sees the six tabs in order, ${lang}`);
            else eq(nav, TABS[lang].filter((_, i) => [0, 1, 2].includes(i)), `agent sees Chats, Deals and Customers, ${lang}`);
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
    for (const [old, tab, view, ready] of [['today', 'work', 'board', READY.board], ['orders', 'work', 'board', READY.board], ['stock', 'work', 'properties', READY.properties], ['money', 'insights', null, READY.insights], ['team', 'settings', 'team', READY.team]]) {
      await page.goto(`${manager.base}/en/layla/dashboard?tab=${old}`);
      await page.locator(ready).first().waitFor();
      eq([await page.locator('.ld-desktop-nav a[aria-current="page"]').getAttribute('data-section'), await page.locator('.ld-section-tabs a[aria-current="page"]').count() ? (await page.locator('.ld-section-tabs a[aria-current="page"]').getAttribute('href')).match(/view=([a-z]+)/)?.[1] : null], [tab, view], `?tab=${old}`);
    }
    await context.close();
  }

  // 3. A listing, verified on purpose.
  {
    const { page, context, problems } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=work&view=properties');
    await page.locator('.hb-section-header').getByRole('button', { name: 'Add a listing' }).click();
    const form = page.getByRole('form', { name: 'Listing' });
    await form.getByLabel('Listing title').fill('Qurum garden villa');
    await form.getByLabel('Property type (e.g. villa, apartment)').fill('villa');
    await form.getByLabel('Area', { exact: true }).fill('Qurum');
    await form.getByLabel('Address or landmark').fill('Qurum Heights, Muscat');
    await form.getByLabel('Asking price (OMR)').fill('120000');
    await form.getByLabel('Bedrooms').fill('4');
    await form.getByLabel('Description').fill('A long description of the garden villa, its majlis, maid’s room and shaded parking. '.repeat(3));
    await pick(form, 'Authority to market it').selectOption('confirmed');
    await form.getByRole('button', { name: 'Save' }).click();
    const card = page.locator('.hb-property-card', { hasText: 'Qurum garden villa' });
    await card.waitFor();
    ok(/never verified/.test(await card.textContent()), 'a new listing is not verified by saving it');
    await card.getByRole('button', { name: 'Mark verified today' }).click();
    await yes(page);
    await card.getByText(/verified \d/).waitFor(); count++;
    eq(problems, [], 'listing flow errors');
    await context.close();
  }

  // 4. A deal on the board, from requirements to close: preview → full record → match → viewing → outcome →
  //    offer with a decision date → approve → present → accept → compliance ×5 → close with a due date.
  {
    const { page, context, problems } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=work&view=board');
    await page.getByRole('button', { name: 'New inquiry' }).click();
    const form = page.getByRole('form', { name: 'Customer requirements' });
    await pick(form, 'Customer').selectOption({ index: 1 });
    const customer = (await pick(form, 'Customer').locator('option:checked').innerText()).trim();
    await pick(form, 'They want to').selectOption('buy');
    await form.getByLabel('Areas, separated by commas').fill('Qurum');
    await form.getByLabel('Property types, separated by commas').fill('villa');
    await form.getByLabel('Maximum budget (OMR)').fill('130000');
    await pick(form, 'Finance').selectOption('cash');
    await pick(form, 'Decision maker').selectOption('ready');
    await form.getByLabel('When do they want to move?').fill('Within a month');
    await form.getByRole('button', { name: 'Save' }).click();
    const card = page.locator('.hb-board-column[data-stage="qualified"] .hb-deal-card', { hasText: 'up to 130,000' }).first();
    await card.waitFor();
    ok((await card.textContent()).includes(customer), 'complete requirements qualify the deal onto the Qualified column');
    await card.locator('.hb-deal-open').click();
    const preview = page.locator('.hb-deal-preview');
    await preview.waitFor();
    ok((await preview.textContent()).includes('Qualified'), 'the preview shows the deal beside the board');
    await preview.getByRole('button', { name: 'Open full record' }).click();
    const detail = page.locator('.hb-deal-detail');
    await detail.waitFor();
    const dealId = param(page, 'deal');
    ok(dealId, 'the record has its own URL');
    await detail.getByRole('button', { name: 'Find matches' }).click();
    const match = detail.locator('.hb-re-list li', { hasText: 'Qurum garden villa' });
    await match.waitFor(); count++;
    await match.getByRole('button', { name: 'Schedule viewing' }).click();
    const viewing = page.getByRole('form', { name: 'Schedule a viewing' });
    await viewing.getByLabel('Date and time').fill('2026-10-02T17:00');
    await pick(viewing, 'Status').selectOption('confirmed');
    await viewing.getByRole('button', { name: 'Save' }).click();
    await detail.getByRole('button', { name: 'Record outcome' }).click();
    const outcome = page.getByRole('form', { name: 'How did the viewing go?' });
    await pick(outcome, 'Result').selectOption('completed');
    await outcome.getByLabel('What the customer thought').fill('Loved the garden; ready to offer.');
    await outcome.getByRole('button', { name: 'Save' }).click();
    await detail.getByText('Loved the garden; ready to offer.').waitFor(); count++;
    await detail.getByRole('button', { name: 'Draft an offer' }).click();
    const offer = page.getByRole('form', { name: 'Draft an offer' });
    await pick(offer, 'Property').selectOption({ label: 'Qurum garden villa · Qurum Heights, Muscat' });
    await offer.getByLabel('Offer amount (OMR)').fill('118000');
    const terms = 'Cash on signing; completion in 30 days; the seller leaves the kitchen appliances and repaints the majlis before handover. '.repeat(2);
    await offer.getByLabel('Terms (payment, dates, conditions)').fill(terms);
    await offer.getByLabel('Decision expected by (optional)').fill('2026-12-01T12:00');
    await offer.getByRole('button', { name: 'Save' }).click();
    await detail.getByText(/decision by/).waitFor(); count++;
    ok((await detail.textContent()).includes(terms.trim().slice(0, 150)), 'long offer terms are kept, not dropped');
    await detail.getByRole('button', { name: 'Approve', exact: true }).click(); await yes(page);
    await detail.getByRole('button', { name: 'Presented', exact: true }).click();
    await detail.getByRole('button', { name: 'Accepted', exact: true }).click(); await yes(page);
    await detail.getByText('Compliance before closing').waitFor(); count++;
    ok(await detail.getByRole('button', { name: 'Confirm all five checks to close' }).isDisabled(), 'closing waits for compliance');
    for (let i = 0; i < 5; i++) {
      await detail.locator('.hb-re-checks li:not([data-done])').first().getByRole('button', { name: 'Confirm' }).click();
      await yes(page);
      await page.waitForFunction(n => document.querySelectorAll('.hb-re-checks li[data-done]').length >= n, i + 1);
    }
    await detail.getByRole('button', { name: 'Close the deal' }).click();
    const close = page.getByRole('form', { name: 'Close the deal' });
    ok(await close.getByLabel('Commission due on').inputValue(), 'the due date is prefilled from the payment terms');
    await close.getByLabel('Agency commission (OMR)').fill('2360');
    await close.getByRole('button', { name: 'Save' }).click();
    await detail.locator('.ld-chip', { hasText: 'Won' }).first().waitFor(); count++;
    const commission = (await api(page, manager.base, 'commissions')).items.find(c => c.opportunityId === dealId);
    ok(commission?.dueAt && commission.balanceMinor === 2360000, 'the commission is owed with a due date');
    await page.screenshot({ path: `${OUT}/deal-closed-en.png`, fullPage: true });
    await detail.getByRole('button', { name: 'Back to the board' }).click();
    await page.locator('.hb-board').waitFor(); count++;
    eq(problems, [], 'deal flow errors');
    await context.close();
  }

  // 5. Filters survive opening a record; a stage move asks first; a lost deal needs a reason (Arabic).
  {
    const { page, context, problems } = await open(manager.base, 900, 'ar', '/layla/dashboard?tab=work&view=board&quick=unassigned');
    await page.locator('.hb-board').waitFor();
    const before = await page.locator('.hb-deal-card').count();
    await page.locator('.hb-deal-card .hb-deal-open').first().click(); // under 1100px: straight to the full record
    await page.locator('.hb-deal-detail').waitFor();
    await page.getByRole('button', { name: 'العودة إلى اللوحة' }).click();
    await page.locator('.hb-board').waitFor();
    eq([param(page, 'quick'), await page.locator('.hb-deal-card').count()], ['unassigned', before], 'the filter and its cards are kept after Back');
    const qualified = page.locator('.hb-board-column[data-stage="qualified"] .hb-deal-card').first();
    await qualified.getByRole('combobox', { name: 'نقل إلى' }).selectOption('viewing');
    await yes(page);
    await page.locator('.hb-board-column[data-stage="viewing"]').waitFor(); count++;
    await page.locator('.hb-deal-card .hb-deal-open').first().click();
    await page.getByRole('button', { name: 'تسجيل كخاسرة' }).click();
    const lost = page.getByRole('form', { name: 'تسجيل الصفقة كخاسرة' });
    await pick(lost, 'لماذا خُسرت؟').selectOption('budget');
    await lost.getByRole('button', { name: 'حفظ' }).click();
    await page.locator('.hb-deal-detail .ld-chip', { hasText: 'خاسرة' }).first().waitFor(); count++;
    eq(problems, [], 'board flow errors');
    await context.close();
  }

  // 6. Follow-ups: the rule's draft waits for approval; approving outside the 24-hour window is blocked for a template.
  {
    const { page, context, problems } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=work&view=followups&filter=approval');
    const row = page.locator('.hb-followups li', { hasText: 'Decision after a viewing' });
    await row.waitFor();
    ok(/MSQ family villa/.test(await row.textContent()), 'the draft is written from the approved listing');
    ok(!/available/i.test(await row.locator('.hb-draft-text').textContent()), 'the draft never states availability');
    await row.getByRole('button', { name: 'Approve and send' }).click(); await yes(page);
    await page.locator('.hb-followup-filters label', { hasText: 'Blocked or failed' }).click();
    await page.locator('.hb-followups li[data-bucket="blocked"]', { hasText: 'Decision after a viewing' }).filter({ hasText: 'Needs an approved template' }).waitFor(); count++;
    await page.locator('.hb-followup-filters label', { hasText: 'Overdue' }).click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('filter') === 'overdue');
    await page.locator('.hb-followups li[data-bucket="overdue"]').first().waitFor();
    const rows = page.locator('.hb-followups li[data-bucket="overdue"]');
    let index = 0;
    while (!(await rows.nth(index).getByRole('button', { name: 'Snooze' }).count())) index++;
    const task = rows.nth(index); // a task row; it keeps its place while the snooze choices are open
    const before = Number(await page.locator('.hb-followup-filters label', { hasText: 'Overdue' }).locator('b').innerText());
    await task.getByRole('button', { name: 'Snooze' }).click();
    await task.getByRole('button', { name: 'Tomorrow' }).click();
    await page.waitForFunction(n => Number(document.querySelector('input[name="re-followup-filter"]:checked + span b')?.textContent) === n - 1, before); count++;
    eq(problems, [], 'follow-up flow errors');
    await context.close();
  }

  // 7. Insights: each card names its basis; source records are its population; Back restores it, after a reload too.
  {
    const { page, context, problems } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=insights');
    await page.locator('.hb-kpis').waitFor();
    eq(await page.locator('.hb-kpi').count(), 4, 'four headline cards');
    eq(await page.locator('.hb-diagnostics tbody tr').count(), 4, 'four diagnostics');
    await page.getByRole('button', { name: /^Viewing attendance/ }).click();
    await page.locator('.hb-kpi-detail h2', { hasText: 'Viewing attendance' }).waitFor();
    ok(/cancelled less than 24 hours ahead/.test(await page.locator('.hb-kpi-detail').textContent()), 'the definition names the late-cancellation window');
    const basis = (await page.getByRole('button', { name: /^Viewing attendance/ }).locator('small').innerText()).match(/(\d+) of (\d+)/);
    await page.locator('.hb-kpi-detail').getByRole('button', { name: 'View source records' }).click();
    await page.locator('.hb-records').waitFor();
    eq([String(await page.locator('.hb-records tr[data-counted="yes"]').count()), String(await page.locator('.hb-records tr[data-counted="yes"], .hb-records tr[data-counted="no"]').count())], [basis[1], basis[2]], 'the records are the measure\'s numerator and denominator');
    await page.reload();
    await page.locator('.hb-records').waitFor();
    await page.getByRole('button', { name: 'Back to Insights' }).click();
    await page.locator('.hb-kpi[aria-pressed="true"]', { hasText: 'Viewing attendance' }).waitFor(); count++;
    await page.getByRole('combobox', { name: 'Break down by' }).selectOption('source');
    await page.locator('.hb-segments tbody tr').first().waitFor();
    ok((await page.locator('.hb-segments tbody').innerText()).includes('WhatsApp'), 'lead source is a breakdown');
    eq(problems, [], 'insights flow errors');
    await context.close();
  }

  // 8. A chat shows its deal; Open deal → the record → Back to chat. A customer record shows the same deal.
  {
    const { page, context, problems } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=chats');
    await page.locator('.ld-conversation', { hasText: 'Huda Al Maskari' }).click();
    const card = page.locator('.hb-deal-context-card');
    await card.waitFor();
    ok(/Al Mouj/.test(await card.textContent()), 'the chat shows the customer\'s deal');
    const chat = param(page, 'chat');
    await card.getByRole('button', { name: 'Open deal' }).click();
    await page.locator('.hb-deal-detail').waitFor();
    eq(param(page, 'from'), 'chat', 'the record knows it came from a chat');
    await page.getByRole('button', { name: 'Back to chat' }).click();
    await page.locator('.ld-thread-pane .hb-deal-context-card').waitFor();
    eq([param(page, 'tab'), param(page, 'chat')], ['chats', chat], 'Back returns to the same chat');
    await page.goto(`${manager.base}/en/layla/dashboard?tab=customers`);
    await page.locator('.ld-row-open', { hasText: 'Fatma Al Saadi' }).click();
    const context2 = page.locator('.ld-contact-panel .hb-deal-context-card');
    await context2.waitFor();
    ok(/Follow-ups \(\d+\)/.test(await context2.textContent()), 'the customer record links to the deal\'s follow-ups');
    eq(problems, [], 'chat and customer link errors');
    await context.close();
  }

  // 9. Settings → rules and windows save and come back after a reload; Insights then names the new window.
  {
    const { page, context, problems } = await open(manager.base, 1280, 'en', '/layla/dashboard?tab=settings&view=rules');
    await page.locator('.hb-rules').waitFor();
    await page.getByLabel('Qualified-to-viewing window (days)').fill('21');
    await page.locator('.hb-rule', { hasText: 'Viewing confirmation' }).getByRole('combobox', { name: 'What it does' }).selectOption('draft');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('Saved. Rules apply from the next check.').waitFor(); count++;
    await page.reload();
    await page.locator('.hb-rules').waitFor();
    eq([await page.getByLabel('Qualified-to-viewing window (days)').inputValue(), await page.locator('.hb-rule', { hasText: 'Viewing confirmation' }).getByRole('combobox', { name: 'What it does' }).inputValue()], ['21', 'draft'], 'rules persist');
    await page.goto(`${manager.base}/en/layla/dashboard?tab=insights`);
    await page.locator('.hb-kpi-detail').waitFor();
    ok(/within 21 days/.test(await page.locator('.hb-kpi-detail').textContent()), 'the definition uses the saved window');
    eq(problems, [], 'rules flow errors');
    await context.close();
  }

  // 10. The agent: own and unassigned deals, no approvals, no Insights or money.
  {
    const { page, context, problems } = await open(agent.base, 1280, 'en', '/layla/dashboard?tab=work&view=followups&filter=approval');
    await page.locator('.hb-followup-filters').waitFor();
    eq(await page.getByRole('button', { name: 'Approve and send' }).count(), 0, 'no approvals for agents');
    eq((await api(page, agent.base, 'real_estate_insights')).reason, 'manager_required', 'no Insights for agents');
    eq((await api(page, agent.base, 'real_estate_metric_records', { metric: 'viewing_attendance' })).reason, 'manager_required', 'no source records for agents');
    eq((await api(page, agent.base, 'commissions')).reason, 'manager_required', 'no commissions for agents');
    await page.goto(`${agent.base}/en/layla/dashboard?tab=insights`);
    await page.locator(READY.board).waitFor();
    eq(param(page, 'tab'), 'insights', 'the URL stays as typed');
    eq(await page.locator('.ld-desktop-nav a[aria-current="page"]').getAttribute('data-section'), 'work', 'an agent asking for Insights lands on Deals');
    eq(problems.filter(p => !/manager_required|409|403/.test(p)), [], 'agent errors');
    await context.close();
  }
  console.log(`real-estate browser: ${count} assertions passed`);
} finally {
  await browser.close();
  manager.child.kill(); agent.child.kill();
}
