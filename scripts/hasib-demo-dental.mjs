// 30 days of a fictional Muscat dental clinic ("Bayan Dental Clinic") for the local
// Hasib demo, then two weeks of appointments in the six-tab Visits workspace. Patients write to Layla, the owner records visits and payments, and
// supplies are counted, all in true time order through the real state code.
// Every name and figure here is invented; messages carry no clinical detail.
import { randomUUID } from 'node:crypto';

const TREATMENTS = [
  ['Check-up', 'فحص', 'Examinations', { type: 'fixed', amount: 10 }],
  ['Scaling and polishing', 'تنظيف وتلميع', 'Cleaning', { type: 'fixed', amount: 20 }],
  ['Composite filling', 'حشوة تجميلية', 'Restorative', { type: 'fixed', amount: 25 }],
  ['Whitening', 'تبييض', 'Cosmetic', { type: 'from', amount: 80, minimum: 80 }],
  ['Root canal', 'علاج العصب', 'Restorative', { type: 'from', amount: 90, minimum: 90 }],
  ['Braces consultation', 'استشارة تقويم', 'Orthodontics', { type: 'fixed', amount: 15 }],
  ['Implant', 'زراعة', 'Surgery', { type: 'quote' }],
];

export async function seedDental({ m, tenant, call, hasib, executeMessaging, DAY, HOUR }) {
  const at = daysAgo => Date.now() - daysAgo * DAY + 3 * HOUR;

  // Treatments live in Layla's catalog, which is what she quotes; Hasib charges them on visits.
  for (const [i, [nameEn, nameAr, category, price]] of TREATMENTS.entries()) {
    const label = price.type === 'quote' ? 'On request' : price.type === 'from' ? `From ${price.amount} OMR` : `${price.amount} OMR`;
    await m.db.insert('blueCatalogEntries', { ownerKey: String(tenant.accountId), entryKey: randomUUID(), kind: 'service', status: 'approved', nameEn, nameAr, category,
      benefitEn: '', benefitAr: '', descriptionEn: '', descriptionAr: '', availability: 'Saturday to Thursday, 9am–9pm',
      prices: [{ currency: 'OMR', unit: 'visit', label, ...price }], source: 'owner', confidence: 1, laylaUseEn: '', laylaUseAr: '', revision: 1, sortOrder: i, createdAt: m.now(), updatedAt: m.now() });
  }
  await hasib('services_sync', {});
  const items = (await hasib('items', { limit: 50 })).items;
  const treatment = nameEn => items.find(i => i.nameEn === nameEn).variants[0];

  // Supplies the clinic keeps count of (internal: never shown to patients).
  const supply = async (nameEn, nameAr, unit, onHand, reorderPoint, cost) => (await hasib('item_save', { requestId: randomUUID(),
    item: { kind: 'product', nameAr, nameEn, category: 'Supplies', unit, trackStock: true },
    variants: [{ sku: '', options: [], priceMinor: 0, costMinor: cost, reorderPoint, openingStock: onHand }] }, at(29))).variants[0];
  await supply('Nitrile gloves', 'قفازات نيتريل', 'box', 3, 5, 3500);
  await supply('Anaesthetic cartridges', 'أمبولات تخدير', 'box', 12, 4, 18000);
  await supply('Composite resin', 'مادة الحشو التجميلي', 'syringe', 2, 3, 9500);
  await supply('Face masks', 'كمامات', 'box', 20, 6, 2000);

  const people = [['96893300001', 'سارة الحبسية'], ['96893300002', 'Hamed Al Siyabi'], ['96893300003', 'منى العبرية'], ['96893300004', 'Yasmin Al Zadjali'],
    ['96893300005', 'علي البلوشي'], ['96893300006', 'Fatma Al Mamari'], ['96893300007', 'خالد المعولي'], ['96893300008', 'Rawan Al Hosni'],
    ['96893300009', 'بدر الكلباني'], ['96893300010', 'Huda Al Wahaibi']];
  const contactOf = i => m.table('blueContacts').find(c => c.waId === people[i][0] && c.state === 'active')?._id;
  const events = [];
  const say = (daysAgo, who, text, intent, reply, handoff = false) => events.push({ t: at(daysAgo) - HOUR, run: async () => {
    const t = at(daysAgo) - HOUR; if (t > m.now()) m.advance(t - m.now());
    await call(executeMessaging, 'ingest', { integrationId: tenant.integration.id, events: [{ kind: 'message', id: `dental-${randomUUID()}`, from: people[who][0], at: m.now(), text,
      reply, intent, handoff, profileName: people[who][1] }] });
  } });
  /** A visit: treatments charged, paid in full, part, or not yet; optionally refunded later. */
  const visit = (daysAgo, lines, { who, method = 'card', paid = 'full', done = true, date, refund } = {}) => events.push({ t: at(daysAgo), run: async () => {
    const t = at(daysAgo);
    let o = await hasib('order_create', { requestId: randomUUID(), channel: who !== undefined ? 'whatsapp' : 'walk_in', confirm: true, fulfilment: { type: 'in_store' },
      lines: lines.map(([name, qty = 1, price]) => ({ variantId: treatment(name).id, qty, ...(price ? { unitPriceMinor: price } : {}) })),
      ...(who !== undefined ? { contactId: contactOf(who) } : {}),
      customFields: [{ key: 'visit_date', value: date || new Date(t + 4 * HOUR).toISOString().slice(0, 10) }, { key: 'branch', value: 'Qurum' }] }, t);
    const amount = paid === 'full' ? o.totalMinor : paid === 'part' ? Math.round(o.totalMinor / 2000) * 1000 : 0;
    if (amount) o = (await hasib('payment_record', { requestId: randomUUID(), orderId: o.id, amountMinor: amount, method }, t + HOUR)).order;
    if (done) o = await hasib('order_status', { orderId: o.id, to: 'completed', version: o.version }, t + 2 * HOUR);
    // A refunded visit: marked refunded (closed), then the money goes back.
    if (refund) {
      o = await hasib('order_status', { orderId: o.id, to: 'returned', version: o.version }, t + 3 * HOUR);
      await hasib('payment_record', { requestId: randomUUID(), orderId: o.id, amountMinor: -o.paidMinor, method }, t + 3 * HOUR);
    }
  } });

  // A month of reception work and visits.
  say(28, 0, 'السلام عليكم، كم سعر تنظيف الأسنان؟', 'prices', 'تنظيف وتلميع الأسنان بسعر 20 ر.ع.');
  say(28, 0, 'أبغى موعد تنظيف يوم الأحد', 'disabled', 'سيتواصل معك الفريق لتأكيد الموعد.');
  visit(27, [['Scaling and polishing']], { who: 0, method: 'cash' });
  say(25, 1, 'Hi, what services do you offer?', 'services', 'We offer check-ups, cleaning, fillings, whitening, root canal, braces consultations and implants.');
  say(25, 1, 'How much is whitening?', 'prices', 'Whitening starts from 80 OMR.');
  visit(22, [['Check-up'], ['Whitening']], { who: 1, method: 'card' });
  say(21, 2, 'عندكم استشارة تقويم؟', 'services', 'نعم، استشارة التقويم بسعر 15 ر.ع.');
  visit(20, [['Braces consultation']], { who: 2, method: 'bank_transfer' });
  visit(19, [['Check-up'], ['Composite filling', 2]], { method: 'card' });
  say(17, 3, 'I would like a check-up on Thursday at the clinic', 'disabled', 'The team will confirm your appointment.');
  visit(15, [['Check-up'], ['Scaling and polishing']], { who: 3, method: 'card' });
  visit(14, [['Root canal', 1, 110000]], { method: 'card', paid: 'part', done: false });
  say(12, 4, 'كم سعر علاج العصب؟', 'prices', 'علاج العصب يبدأ من 90 ر.ع.');
  visit(11, [['Root canal', 1, 95000]], { who: 4, method: 'cash', paid: 'part', done: false });
  visit(9, [['Composite filling']], { method: 'cash' });
  visit(8, [['Whitening']], { method: 'card', refund: true });
  say(7, 5, 'Can I book a cleaning next week?', 'disabled', 'The team will confirm your appointment.');
  visit(6, [['Scaling and polishing'], ['Check-up']], { who: 5, method: 'card' });
  visit(4, [['Check-up']], { method: 'cash' });
  visit(3, [['Composite filling'], ['Check-up']], { method: 'card', paid: 'none', done: false });
  // Recent requests with no visit yet, and today's reception.
  say(2, 6, 'أبغى تبييض الأسنان، متى يناسبكم؟', 'services', 'التبييض يبدأ من 80 ر.ع. سيتواصل معك الفريق.');
  say(1, 7, 'I would like a check-up tomorrow at 5pm at the clinic', 'disabled', 'The team will confirm your appointment.');
  visit(0.5, [['Check-up'], ['Scaling and polishing']], { method: 'cash' });
  say(0.4, 8, 'كم سعر الحشوة التجميلية؟', 'prices', 'الحشوة التجميلية بسعر 25 ر.ع.');
  say(0.3, 8, 'أبغى حشوة تجميلية بكره الساعه 6 مساء', 'disabled', 'سيتواصل معك الفريق لتأكيد الموعد.');
  say(0.2, 9, 'Can I talk to someone at reception please?', 'human', 'I’ll connect you with the team.', true);
  visit(0.1, [['Braces consultation']], { method: 'card', paid: 'none', done: false });

  // The everyday list: walk-in and returning patients most days.
  for (let d = 29; d >= 15; d--) { // the clinic moved to Visits two weeks ago; after that, charges belong to visits
    if (d % 7 === 6) continue; // Friday closed
    visit(d + 0.3, [['Check-up'], ['Scaling and polishing']], { method: d % 2 ? 'cash' : 'card' });
    visit(d + 0.25, [[d % 3 ? 'Composite filling' : 'Check-up']], { method: 'card' });
    if (d % 4 === 0) visit(d + 0.2, [['Whitening', 1, 90000]], { method: 'bank_transfer' });
  }
  for (const e of events.sort((x, y) => x.t - y.t)) await e.run();

  const expense = (daysAgo, category, amount, vendor, method = 'bank_transfer') => hasib('expense_create', { requestId: randomUUID(), category, amountMinor: amount, method,
    paidOn: new Date(at(daysAgo) + 4 * HOUR).toISOString().slice(0, 10), vendor }, at(daysAgo));
  await expense(26, 'rent', 650000, 'Qurum clinic landlord');
  await expense(2, 'salaries', 1150000, 'Dentist, hygienist and receptionist');
  await expense(20, 'supplies', 85000, 'Dental supplies trader');
  await expense(12, 'lab_fees', 120000, 'Dental lab');
  await expense(9, 'equipment', 45000, 'Chair maintenance', 'cash');
  await expense(5, 'utilities', 68000, 'Nama electricity');
  return seedVisits({ m, tenant, hasib, DAY, HOUR, people, contactOf, treatment });
}

/**
 * Two weeks of appointments behind and three days ahead in the six-tab Visits workspace: two
 * dentists and a hygienist, three chairs, visits in every state (completed and charged, missed,
 * cancelled late and in good time, one not yet recorded, arrived now, confirmed and unconfirmed
 * ahead), clinician-set recalls, a past-due balance and a minor booked with a guardian. Every
 * record goes through the same Hasib API the dashboard uses, at the time it happened.
 */
async function seedVisits({ m, tenant, hasib, DAY, HOUR, people, contactOf, treatment }) {
  const MIN = 60000, now = m.now(), offset = 4 * HOUR; // Muscat is UTC+4
  const day0 = now - ((now + offset) % DAY); // local midnight today
  const local = (d, hour) => day0 + d * DAY + Math.round(hour * 60) * MIN;
  const run = (operation, args, at) => hasib(operation, args, at);
  const create = (operation, args, at) => run(operation, { requestId: randomUUID(), ...args }, at);
  const resource = (kind, name) => create('dental_resource_save', { dental: { kind, name } }, local(-20, 8));
  const providers = [await resource('provider', 'Dr Salma Al Busaidi'), await resource('provider', 'Dr Khalid Al Rawahi'), await resource('provider', 'Hygienist Noor')];
  const chairs = [await resource('chair', 'Chair 1'), await resource('chair', 'Chair 2')];

  // Ten more patients who wrote in, on top of the ten from the month above.
  const extra = [['96893300011', 'مريم الشكيلية'], ['96893300012', 'Omar Al Habsi'], ['96893300013', 'ليلى الرحبية'], ['96893300014', 'Saif Al Kindi'], ['96893300015', 'نورة الهنائية'],
    ['96893300016', 'Ahmed Al Farsi'], ['96893300017', 'شيماء العامرية'], ['96893300018', 'Hilal Al Shibli'], ['96893300019', 'عائشة السعدية'], ['96893300020', 'Talal Al Maskari'],
    ['96893300021', 'Zainab Al Lawati'], ['96893300022', 'سالم الغافري'], ['96893300023', 'Rashid Al Amri']]; // the last three come once: two recalls and a missed visit
  const patients = people.map((_, i) => contactOf(i)).filter(Boolean);
  for (const [i, [waId, name]] of extra.entries()) {
    const at = local(-18 + i, 10), key = `demo-dn:${waId}`;
    const contactId = await m.db.insert('blueContacts', { accountId: tenant.accountId, key, state: 'active', channel: 'whatsapp', waId, numberHash: waId.padEnd(64, '0'), ownerName: name, source: 'inbound',
      sectorId: 'dental', fields: [], qualificationStatus: 'in_progress', consent: { status: 'unknown' }, optout: false, searchText: `${name} ${waId}`, lastInboundAt: at, lastActivityAt: at, createdAt: at, updatedAt: at });
    const conversationId = await m.db.insert('blueConversations', { accountId: tenant.accountId, key, integrationId: tenant.integration.id, channel: 'whatsapp', number: waId, contactId, version: 1,
      lastInbound: at, takeover: false, optout: false, createdAt: at, updatedAt: at });
    await m.db.insert('blueMessages', { key: `${key}:in`, integrationId: tenant.integration.id, accountId: tenant.accountId, conversationId, direction: 'in', text: /[؀-ۿ]/.test(name) ? 'السلام عليكم، أبغى أحجز موعد' : 'Hello, I would like to book a visit',
      at, expiresAt: at + 30 * DAY, textExpiresAt: at + DAY, status: 'received' });
    patients.push(contactId);
  }

  const services = ['Check-up', 'Scaling and polishing', 'Composite filling', 'Whitening', 'Braces consultation'];
  const item = name => m.table('hasibItems').find(x => x.nameEn === name)?._id;
  const visits = [];
  /** Books a visit two days ahead of its time (or now, if that is later), then records what happened. */
  const visit = async (d, hour, who, p, { minutes = 30, outcome = 'completed', service = services[(((Math.floor(d + hour + who)) % services.length) + services.length) % services.length], chair = p, pay = 'full', recall, minor } = {}) => {
    const startsAt = local(d, hour), bookAt = Math.min(startsAt - 2 * DAY, now - HOUR);
    let v = await create('dental_visit_book', { contactId: patients[who], dental: { providerId: providers[p].id, chairId: chairs[chair].id, serviceItemId: item(service), startsAt, durationMinutes: minutes,
      source: who % 3 ? 'layla' : 'phone', ...(minor ? { forMinor: true, guardianContactId: patients[minor] } : {}) } }, bookAt);
    const step = async (to, at, extra = {}) => { v = await run('dental_visit_status', { visitId: v.id, version: v.version, status: to, ...extra }, at); };
    if (['confirmed', 'arrived', 'completed', 'missed', 'unknown'].includes(outcome)) await step('confirmed', Math.min(startsAt - DAY, now));
    if (outcome === 'arrived' || outcome === 'completed') await step('arrived', startsAt - 5 * MIN);
    if (outcome === 'completed') {
      await step('completed', startsAt + minutes * MIN);
      if (pay !== 'none') {
        const line = treatment(service);
        v = await create('dental_charge', { visitId: v.id, version: v.version, lines: [{ variantId: line.id, qty: 1, ...(line.priceMinor ? {} : { unitPriceMinor: 120000 }) }] }, startsAt + minutes * MIN + 5 * MIN);
        const order = m.table('hasibOrders').find(o => String(o._id) === String(v.orderId));
        const amount = pay === 'full' ? order.totalMinor : Math.round(order.totalMinor / 2000) * 1000;
        if (amount) await create('dental_payment_record', { visitId: v.id, amountMinor: amount, method: (d + hour) % 2 ? 'card' : 'cash' }, startsAt + minutes * MIN + 10 * MIN);
      }
      if (recall) v = await run('dental_recall_set', { visitId: v.id, version: m.table('dentalVisits').find(x => String(x._id) === String(v.id)).version, dental: { recallDueAt: local(recall, 10) } }, startsAt + minutes * MIN + 15 * MIN);
    }
    if (outcome === 'missed') await step('missed', startsAt + (minutes + 20) * MIN);
    if (outcome === 'late_cancel') await step('cancelled', startsAt - 3 * HOUR, { reason: 'patient_request' });
    if (outcome === 'cancelled') await step('cancelled', bookAt + HOUR, { reason: 'clinic_request' });
    visits.push(v);
    return v;
  };

  // Two weeks behind: nine visits a day on two chairs (never two at once on a chair or a provider); Fridays closed.
  const SLOTS = [[9, 0, 0, 0, 30], [9, 0, 1, 1, 45], [10, 0, 2, 0, 30], [10, 0, 0, 1, 30], [11, 30, 1, 0, 45], [16, 0, 0, 0, 30], [16, 30, 2, 1, 30], [17, 30, 1, 0, 45], [19, 0, 0, 1, 30]];
  const friday = d => new Date(day0 + d * DAY + offset).getUTCDay() === 5;
  // The visit whose outcome nobody recorded sits on the last open day: yesterday, or the day before when yesterday was a Friday.
  const unrecordedDay = friday(-1) ? -2 : -1;
  for (let d = -14; d <= -1; d++) {
    if (friday(d)) continue;
    for (const [i, [hour, minute, p, chair, minutes]] of SLOTS.entries()) {
      const who = ((d + 14) * 9 + i) % 20;
      const outcome = (i === 6 && (d === -8 || d === -3)) || (i === 4 && (d === -13 || d === -9 || d === -6)) || (i === 2 && d === -2) ? 'missed' : i === 8 && d === -5 ? 'late_cancel' : i === 8 && d === -11 ? 'cancelled' : i === 8 && d === unrecordedDay ? 'unknown' : 'completed';
      await visit(d, hour + minute / 60, who, p, { chair, minutes, outcome, pay: i === 7 && d === -4 ? 'none' : i === 1 && d === -10 ? 'part' : 'full', recall: i === 0 && d === -6 ? 120 : undefined });
    }
  }
  // Clinician-set recalls coming up: reminders are drafted 14 and 3 days before.
  await visit(-13, 13, 20, 0, { recall: 10 });
  await visit(-12, 13, 21, 1, { recall: 2 });
  // A missed visit nobody has rebooked yet: a rebook task and a recovery message wait.
  await visit(-2, 13, 22, 2, { outcome: 'missed', chair: 0 });
  // Today and the next three days.
  const hourNow = Math.floor(((now + offset) % DAY) / HOUR);
  // Clamp the whole schedule together: clamping each slot separately can overlap chairs overnight.
  const demoHour = Math.min(18, Math.max(10, hourNow));
  await visit(0, demoHour - 2, 3, 0, { outcome: 'completed', chair: 0 });
  await visit(0, demoHour - 1, 4, 1, { outcome: hourNow - 1 >= 8 ? 'arrived' : 'confirmed', minutes: 60, chair: 1 });
  await visit(0, demoHour + 2, 5, 0, { outcome: 'confirmed', chair: 0 });
  await visit(0, demoHour + 3, 6, 2, { outcome: 'booked', chair: 1 });
  await visit(1, 9, 7, 0, { outcome: 'booked', chair: 0 });
  await visit(1, 11, 12, 1, { outcome: 'booked', minor: 11, chair: 1 }); // a minor, messages go to the guardian
  await visit(1, 16, 8, 2, { outcome: 'confirmed', chair: 0 });
  await visit(2, 10, 13, 0, { outcome: 'booked', minutes: 60, chair: 0 });
  await visit(3, 17, 14, 1, { outcome: 'booked', chair: 1 });
  return { providers, chairs, visits };
}
