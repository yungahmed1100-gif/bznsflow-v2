// End to end, in a real browser, against the real-logic demo (production Convex state code on an
// in-memory database): every function Releases A and B added, for Automotive, Construction, Retail
// and Phones & electronics. A customer writes in, the records move, Hasib runs on his schedule (the
// demo's clock is moved past each rule's delay), Adiba's offers are approved in the dashboard, the
// customer's yes comes back through Layla, and each result is checked where the owner sees it.
// Usage: npm run build && node tests/ascend-e2e-browser.mjs [sector …]
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const OUT = process.env.ASCEND_E2E_OUT || 'work/ascend-e2e';
await mkdir(OUT, { recursive: true });
const SECTORS = process.argv.slice(2).length ? process.argv.slice(2) : ['retail', 'retail-tech', 'automotive', 'construction'];
const PORTS = { retail: 5451, 'retail-tech': 5453, automotive: 5455, construction: 5457 };

function demo(port, ...flags) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), ...flags], { stdio: ['ignore', 'pipe', 'inherit'] });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => { if (String(chunk).includes('Hasib demo')) resolve(); });
    child.on('exit', code => reject(new Error(`demo on ${port} exited with ${code}`)));
  });
  return { child, ready, base: `http://127.0.0.1:${port}` };
}

const browser = await chromium.launch();
let count = 0;
const ok = (value, message) => { assert.ok(value, message); count++; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); count++; };
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page => (await new AxeBuilder({ page }).include('.ld').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.length}`);
const DEMO_ONLY = /surface=(customer|instagram)/;

/** A page on one demo, with helpers that call the same API the dashboard calls. */
async function session(d, { width = 1440, lang = 'en' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(`pageerror ${e.message}`));
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400 && !DEMO_ONLY.test(r.url())) problems.push(`${r.status()} ${r.url()}`); });
  const post = (path, body) => page.evaluate(async ([url, payload]) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).json(), [`${d.base}${path}`, body]);
  const value = async (surface, action, body = {}) => { const r = await post(`/api/layla-meta?surface=${surface}`, { action, ...body }); assert.equal(r.ok, true, `${action}: ${r.reason}`); return r; };
  const s = {
    page, context, problems,
    go: path => page.goto(`${d.base}${lang === 'ar' ? '' : '/en'}/layla/dashboard${path}`).then(() => page.locator('.ld-nav a').first().waitFor({ state: 'attached' })),
    hasib: (action, body) => value('hasib', action, body),
    overview: () => page.evaluate(async url => (await fetch(url)).json(), `${d.base}/api/layla-meta?surface=hasib`),
    dashboard: (action, body) => value('dashboard', action, body),
    say: (from, text, name) => post('/demo/inbound', { from, text, name }),
    later: minutes => post('/demo/advance', { minutes }),
    run: () => post('/demo/run', {}).then(r => r.result),
    /** The customer's chat id and the thread's text. */
    async chat(name) {
      const c = (await s.dashboard('conversations', { search: name.split(' ')[0] })).items.find(x => x.contact?.name === name);
      assert.ok(c, `a chat with ${name}`);
      return c;
    },
    async thread(name) {
      const c = await s.chat(name);
      await s.go(`?tab=chats&chat=${c.id}`);
      await page.locator('.ld-messages').waitFor();
      return { id: c.id, text: await page.locator('.ld-messages').innerText() };
    },
    async contact(name) { return (await s.dashboard('contacts')).items.find(x => x.name === name); },
  };
  return s;
}
const uuid = () => randomUUID();
const closeClean = async (s, label) => { eq(s.problems, [], `${label}: no page errors or refused calls`); await s.context.close(); };

/** Settings → Follow-up rules: switch one rule's mode in the form, save, and see it persisted. */
async function rulesRoundTrip(s, settingsKey, ruleId, ruleLegend, mode) {
  await s.go('?tab=settings&view=rules');
  const rule = s.page.locator('fieldset.hb-rule', { hasText: ruleLegend }).first();
  await rule.waitFor();
  const select = rule.getByLabel('What it does');
  const before = await select.inputValue();
  await select.selectOption(mode);
  await s.page.getByRole('button', { name: 'Save' }).click();
  await s.page.getByText('Saved. Rules apply from the next check.').waitFor(); count++;
  eq((await s.overview()).settings[settingsKey].rules.find(r => r.id === ruleId).mode, mode, `${settingsKey}: ${ruleId} saved as ${mode}`);
  await s.page.reload();
  await s.page.locator('fieldset.hb-rule', { hasText: ruleLegend }).first().getByLabel('What it does').waitFor();
  eq(await s.page.locator('fieldset.hb-rule', { hasText: ruleLegend }).first().getByLabel('What it does').inputValue(), mode, `${settingsKey}: ${ruleId} still ${mode} after a reload`);
  await select.selectOption(before);
  await s.page.getByRole('button', { name: 'Save' }).click();
  await s.page.getByText('Saved. Rules apply from the next check.').waitFor();
  eq((await s.overview()).settings[settingsKey].rules.find(r => r.id === ruleId).mode, before, `${settingsKey}: ${ruleId} back to ${before}`);
}

/** Approves the one open offer shown beside a chat; returns the offer as the API sees it. */
async function approveInChat(s, name) {
  const { id } = await s.thread(name);
  const offer = s.page.locator('.hb-offers .hb-offer').first();
  await offer.waitFor();
  await offer.getByRole('button', { name: /Approve/ }).click();
  await s.page.locator('.hb-offers .hb-offer[data-status="sent"]').first().waitFor(); count++;
  return (await s.hasib('adiba_offers', { conversationId: id })).items[0];
}

/** Work → Follow-ups with a filter: the rows' titles. */
async function queue(s, filter) {
  await s.go(`?tab=work&view=followups&filter=${filter}`);
  await s.page.locator('main h1').first().waitFor();
  await s.page.waitForLoadState('networkidle');
  return s.page.locator('main').innerText();
}

/** The employee's view of the same workspace: three tabs, no approving, no Adiba panel. */
async function employeeChecks(sector, d, customerName) {
  const s = await session(d, { width: 320, lang: 'ar' });
  await s.go('?tab=work');
  await s.page.locator('.hb-attention').waitFor();
  eq((await s.page.locator('.ld-nav a').allInnerTexts()).length, 3, `${sector} employee: Chats, Work and Customers`);
  eq(await noOverflow(s.page), true, `${sector} employee: no overflow at 320 in Arabic`);
  eq(await axe(s.page), [], `${sector} employee: axe`);
  await s.go('?tab=work&view=followups&filter=decision');
  await s.page.locator('main h1').first().waitFor();
  eq(await s.page.locator('.hb-offers').count(), 0, `${sector} employee: no Adiba offers in Follow-ups`);
  eq(await s.page.getByRole('button', { name: /اعتماد وإرسال|Approve/ }).count(), 0, `${sector} employee: nothing to approve`);
  if (customerName) {
    const c = (await s.dashboard('conversations')).items[0];
    await s.go(`?tab=chats&chat=${c.id}`);
    await s.page.locator('.ld-messages').waitFor();
    eq(await s.page.locator('.hb-offers').count(), 0, `${sector} employee: no Adiba offers beside a chat`);
  }
  await s.page.screenshot({ path: `${OUT}/${sector}-employee-ar-320.png`, fullPage: true });
  await closeClean(s, `${sector} employee`);
}

// ── Retail ─────────────────────────────────────────────────────────────────
async function retail(d) {
  const s = await session(d);
  await s.go('?tab=work');
  await s.say('96899100001', 'Hello, I am looking for a navy abaya', 'Reem Al Said');
  const reem = await s.contact('Reem Al Said');
  ok(reem, 'Reem wrote in on WhatsApp');
  // A product she wants is out of stock: she is recorded as waiting for it.
  const saved = await s.hasib('item_save', { requestId: uuid(), item: { kind: 'product', nameAr: 'عباية كحلية', nameEn: 'Navy evening abaya', category: 'Abayas', unit: 'piece', trackStock: true },
    variants: [{ sku: `NV-${uuid().slice(0, 4)}`, options: [{ key: 'size', value: '56' }], priceMinor: 42000, costMinor: 20000, reorderPoint: 0 }] });
  const variantId = saved.variants[0].id;
  await s.hasib('product_request_create', { requestId: uuid(), workflow: { contactId: reem.id, variantId, qty: 1 } });
  await s.go('?tab=work&view=requests');
  await s.page.locator('.hb-requests').getByText('Reem Al Said').waitFor(); count++;
  // Stock arrives; after the rule's 5 minutes Hasib tells her by himself, once.
  await s.hasib('stock_move', { requestId: uuid(), variantId, delta: 2, reason: 'stock_in' });
  await s.later(6);
  const firstRun = await s.run();
  ok(/sent:[1-9]/.test(firstRun), `Hasib sent the back-in-stock message (${firstRun})`);
  let t = await s.thread('Reem Al Said');
  ok(/Navy evening abaya \(56\) you asked about is back in stock/.test(t.text), 'the chat shows the back-in-stock message with the product and size');
  await s.run();
  t = await s.thread('Reem Al Said');
  eq(t.text.match(/back in stock/g).length, 1, 'one message, however often Hasib runs');
  // She orders it for pickup; once it is ready, the ready message carries the order number and balance.
  let order = await s.hasib('order_create', { requestId: uuid(), channel: 'whatsapp', contactId: reem.id, fulfilment: { type: 'pickup' }, lines: [{ variantId, qty: 1 }], confirm: true });
  order = await s.hasib('payment_record', { requestId: uuid(), orderId: order.id, amountMinor: 12000, method: 'bank_transfer' }).then(r => r.order);
  order = await s.hasib('order_status', { orderId: order.id, to: 'ready', version: order.version });
  await s.go('?tab=work&view=orders');
  const ready = s.page.locator('.hb-attention-item[data-item="ready"]');
  await ready.waitFor(); count++;
  await ready.click();
  await s.page.waitForFunction(() => new URL(location.href).searchParams.get('filter') === 'ready'); count++;
  await s.later(31);
  await s.run();
  t = await s.thread('Reem Al Said');
  ok(t.text.includes(`#${order.number} is ready for collection. The balance due is 30.000 OMR.`), 'the ready message: order number and the balance after her deposit');
  // Beside the chat: her open order, with a link back into Work.
  const card = s.page.locator('.hb-deal-context-card', { hasText: `#${order.number}` });
  await card.waitFor(); count++;
  await card.getByRole('button', { name: 'Open order' }).click();
  await s.page.waitForFunction(id => new URL(location.href).searchParams.get('order') === id, order.id); count++;
  // A follow-up the team adds by hand appears in the queue and is marked done there.
  await s.hasib('followup_save', { requestId: uuid(), contactId: reem.id, dueAt: Date.now() - 60000, reason: 'Call Reem about the fitting' });
  ok((await queue(s, 'today')).includes('Call Reem about the fitting'), 'the team’s own follow-up is in the queue');
  await s.page.locator('li', { hasText: 'Call Reem about the fitting' }).getByRole('button', { name: 'Mark done' }).click();
  await s.page.getByText('Call Reem about the fitting').waitFor({ state: 'detached' }); count++;
  await rulesRoundTrip(s, 'retail', 'back_in_stock', 'Back in stock', 'draft');
  await s.page.screenshot({ path: `${OUT}/retail-rules-en-1440.png`, fullPage: true });
  await closeClean(s, 'retail manager');
}

// ── Phones & electronics ───────────────────────────────────────────────────
async function tech(d) {
  const s = await session(d);
  await s.go('?tab=work');
  // A repair question becomes one task for the team.
  await s.say('96899200001', 'My screen is broken, can you fix it?', 'Hamad Al Rawahi');
  await s.say('96899200001', 'It is cracked badly', 'Hamad Al Rawahi');
  const decision = await queue(s, 'decision');
  eq((decision.match(/Repair question from Layla/g) || []).length, 1, 'one repair question task, however many messages');
  const hamad = await s.contact('Hamad Al Rawahi');
  // Booked in and diagnosed: the quote becomes Adiba's offer, which only the owner can approve.
  let repair = await s.hasib('repair_create', { requestId: uuid(), device: 'iPhone 14 Pro', fault: 'Cracked screen', contactId: hamad.id, quoteMinor: 55000 });
  repair = await s.hasib('repair_status', { repairId: repair.id, to: 'diagnosing', version: repair.version });
  await s.run();
  ok(!(await queue(s, 'decision')).includes('Repair question from Layla'), 'booked in: the repair question closed itself');
  const offer = await approveInChat(s, 'Hamad Al Rawahi');
  eq([offer.subjectType, offer.status, offer.totalMinor], ['repair', 'sent', 55000], 'the owner approved the repair quote and Layla sent it');
  ok((await s.thread('Hamad Al Rawahi')).text.includes(offer.ref), 'the quote is in his chat, with its reference');
  // Repairing is refused until the customer approves; his yes in chat approves exactly that quote.
  const refused = await s.page.evaluate(async ([url, body]) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json(),
    [`${d.base}/api/layla-meta?surface=hasib`, { action: 'repair_status', repairId: repair.id, to: 'repairing', version: (await s.hasib('repair', { repairId: repair.id })).version }]);
  eq(refused.reason, 'approval_required', 'no repair work before the customer approves');
  s.problems.splice(0);
  await s.say('96899200001', 'YES', 'Hamad Al Rawahi');
  repair = await s.hasib('repair', { repairId: repair.id });
  eq(repair.approvalStatus, 'approved', 'his yes approved the repair');
  ok(repair.approvedBy.endsWith(offer.ref), 'approved by him, with the offer reference as evidence');
  // Repaired and ready: the ready message names the device and what is left to pay.
  repair = await s.hasib('repair_status', { repairId: repair.id, to: 'repairing', version: repair.version });
  repair = await s.hasib('repair_status', { repairId: repair.id, to: 'ready', version: repair.version });
  await s.later(31);
  await s.run();
  ok((await s.thread('Hamad Al Rawahi')).text.includes(`your iPhone 14 Pro repair (#${repair.number}) is ready for collection. The balance due is 55.000 OMR.`), 'the repair-ready message reached him by itself');
  // The strip and the repair card agree.
  await s.go('?tab=work&view=repairs');
  await s.page.locator('.hb-attention-item[data-item="repairs"]').waitFor(); count++;
  await rulesRoundTrip(s, 'retailTech', 'repair_quote_reminder', 'Repair quote reminder', 'task');
  await closeClean(s, 'phones manager');
}

// ── Automotive ─────────────────────────────────────────────────────────────
async function automotive(d) {
  const s = await session(d);
  await s.go('?tab=work');
  await s.say('96899300001', 'Hello, my car needs a service', 'Saif Al Hinai');
  const saif = await s.contact('Saif Al Hinai');
  const seeded = (await s.hasib('automotive_work_orders')).items[0];
  const service = (await s.hasib('automotive_services')).items[0], bay = (await s.hasib('automotive_bays')).items[0];
  const vehicle = await s.hasib('automotive_vehicle_save', { requestId: uuid(), workflow: { contactId: saif.id, plate: 'E2E 4321', make: 'Toyota', model: 'Land Cruiser', year: 2021, powertrain: 'petrol', odometerKm: 61000 } });
  let work = await s.hasib('automotive_work_order_save', { requestId: uuid(), workflow: { vehicleId: vehicle.id, serviceId: service.id, bayId: bay.id, technicianAccountId: seeded.technicianAccountId,
    concern: 'Routine service', promisedAt: Date.now() + 2 * 86400000, odometerKm: 61000 } });
  await s.hasib('automotive_estimate_save', { requestId: uuid(), workOrderId: work.id, workflow: { lines: [{ kind: 'labor', name: 'Routine service', qty: 1, unitPriceMinor: service.priceMinor, standardMinutes: 90 }] } });
  await s.run();
  // The estimate is Adiba's offer, priced from the service list; the owner approves it beside the chat.
  const offer = await approveInChat(s, 'Saif Al Hinai');
  eq([offer.subjectType, offer.status, offer.lines[0].priceSource], ['automotive_estimate', 'sent', 'settings'], 'the estimate went out at the service-list price after the owner approved');
  await s.say('96899300001', 'YES', 'Saif Al Hinai');
  const approved = (await s.hasib('automotive_estimates', { workOrderId: work.id })).items.find(e => e.status === 'approved');
  ok(approved && approved.evidenceSource === 'whatsapp' && approved.approvedBy.endsWith(offer.ref), 'his yes approved that estimate, recorded as WhatsApp evidence');
  work = (await s.hasib('automotive_work_order', { workOrderId: work.id }));
  eq(work.status, 'approved', 'the work order moved to approved');
  // Ready only after a passed quality check, then the message goes by itself.
  for (const status of ['in_progress', 'quality_check']) work = await s.hasib('automotive_work_order_status', { requestId: uuid(), workOrderId: work.id, version: work.version, status });
  await s.later(40);
  await s.run();
  ok(!(await s.thread('Saif Al Hinai')).text.includes('ready for collection'), 'no ready message before the quality check');
  work = await s.hasib('automotive_quality_save', { requestId: uuid(), workOrderId: work.id, version: work.version, workflow: { checklist: [{ text: 'Road test', done: true }] } });
  work = await s.hasib('automotive_work_order_status', { requestId: uuid(), workOrderId: work.id, version: work.version, status: 'ready' });
  await s.later(31);
  await s.run();
  ok((await s.thread('Saif Al Hinai')).text.includes('quality check and is ready for collection'), 'the ready message reached him after the passed check');
  await rulesRoundTrip(s, 'automotive', 'service_due', 'Next service due', 'task');
  await closeClean(s, 'automotive manager');
}

// ── Construction ───────────────────────────────────────────────────────────
async function construction(d) {
  const s = await session(d);
  await s.go('?tab=work');
  // A client who wrote in through Layla, on an active project with an approved baseline.
  await s.say('96899400001', 'Hello, about the villa extension', 'Khalid Al Busaidi');
  const khalid = await s.contact('Khalid Al Busaidi');
  const DAY = 86400000, now = Date.now();
  let project = await s.hasib('construction_project_save', { requestId: uuid(), workflow: { reference: 'P-E2E', title: 'Villa extension', location: 'Qurum, Muscat', contractType: 'lump_sum',
    originalContractMinor: 80000000, originalBudgetMinor: 60000000, startAt: now - 10 * DAY, contractFinishAt: now + 80 * DAY, contactId: khalid.id } });
  await s.hasib('construction_milestone_save', { requestId: uuid(), projectId: project.id, workflow: { projectId: project.id, label: 'Structure', weightBps: 10000, budgetMinor: 60000000, plannedStartAt: now - 10 * DAY, plannedFinishAt: now + 60 * DAY } });
  project = await s.hasib('construction_baseline_approve', { projectId: project.id, version: project.version });
  for (const status of ['quoted', 'awarded', 'active']) project = await s.hasib('construction_project_status', { requestId: uuid(), projectId: project.id, version: project.version, status });
  await s.hasib('construction_variation_save', { requestId: uuid(), projectId: project.id, workflow: { projectId: project.id, reference: 'VO-E2E', title: 'Extra window', reason: 'Client request',
    contractDeltaMinor: 2500000, budgetDeltaMinor: 1500000, scheduleDeltaDays: 1 } });
  // The variation adds to the contract: Adiba drafts it for the owner, who approves it beside the chat.
  await s.run();
  const offer = await approveInChat(s, 'Khalid Al Busaidi');
  eq([offer.subjectType, offer.status, offer.totalMinor], ['construction_variation', 'sent', 2500000], 'the owner approved the variation offer and Layla sent it');
  ok(!(await s.thread('Khalid Al Busaidi')).text.includes('15.000') && !(await s.thread('Khalid Al Busaidi')).text.includes('1,500'), 'the internal cost effect never reaches the client');
  const byRef = async ref => (await s.hasib('construction_variations', { projectId: project.id })).items.find(v => v.reference === ref);
  eq((await byRef('VO-E2E')).status, 'submitted', 'approving submitted the variation to the client');
  // The client agrees in chat: recorded on the variation, and the signed copy is the owner's task.
  await s.say('96899400001', 'YES', 'Khalid Al Busaidi');
  const after = await byRef('VO-E2E');
  ok(/^chat_reply:OFR-/.test(after.customerApproval || ''), 'the client’s yes is recorded on the variation');
  eq(after.status, 'submitted', 'a chat reply does not approve a variation');
  ok((await queue(s, 'decision')).includes('VO-E2E'), 'the owner has a task to attach the signed variation');
  await rulesRoundTrip(s, 'construction', 'variation_decision', 'Variation decision', 'task');
  await closeClean(s, 'construction manager');
}

const FLOWS = { retail, 'retail-tech': tech, automotive, construction };
try {
  for (const sector of SECTORS) {
    const manager = demo(PORTS[sector], `--pack=${sector}`), employee = demo(PORTS[sector] + 1, `--pack=${sector}`, '--role=employee');
    try {
      await Promise.all([manager.ready, employee.ready]);
      await FLOWS[sector](manager);
      await employeeChecks(sector, employee, true);
      console.log(`✓ ${sector}`);
    } finally { manager.child.kill(); employee.child.kill(); }
  }
  console.log(`Ascend end-to-end: ${count} checks passed (${SECTORS.join(', ')}; real-logic demo, manager and employee, EN/AR).`);
} finally {
  await browser.close();
}
