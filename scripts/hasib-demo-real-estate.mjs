// A synthetic Muscat agency for the local Real Estate demo: six listings, an agent, a dozen buyers
// and tenants at every stage, with viewings, offers, a closed and a part-paid commission, rules on.
// Each record is written through the same Hasib API the dashboard uses, at the time it happened,
// so every Insights figure, rule and follow-up has real records behind it. Nothing is sent.
import { randomUUID } from 'node:crypto';

const MIN = 60000, CHECKS = ['identity', 'authority', 'financing', 'agreement', 'completion'];

export async function seedRealEstate({ m, tenant, hasib, DAY, HOUR }) {
  if (m.now() < Date.now()) m.advance(Date.now() - m.now());
  const now = m.now(), ago = (days, hours = 0) => now - days * DAY + hours * HOUR;
  const run = (operation, args, at = m.now()) => hasib(operation, args, at);
  const create = (operation, args, at) => run(operation, { requestId: randomUUID(), ...args }, at);
  const session = await m.db.get(tenant.rowId);
  await m.db.patch(tenant.rowId, { profile: { ...session.profile, businessName: 'Bayt Muscat Properties', sector: 'Real estate', services: 'Sales and rentals across Muscat', location: 'Al Khuwair, Muscat', reviewed: true } });
  await run('settings_update', { packId: 'real-estate' });

  // The team: one agent who works their own deals.
  const member = await run('team_invite', { email: 'staff@noor.example' });
  const agentId = await m.db.insert('accounts', { email: 'staff@noor.example', role: 'customer', createdAt: ago(40) });
  await m.db.patch(member.id, { accountId: agentId, status: 'active', activatedAt: ago(40) });

  // Listings, verified except the Seeb plot (stale) and with authority to market them.
  const listing = async (workflow, verifiedDaysAgo) => {
    const p = await create('property_save', { workflow: { authorityStatus: 'confirmed', availability: 'available', ...workflow } }, ago(45));
    return verifiedDaysAgo == null ? p : run('property_verify', { propertyId: p.id, version: p.version }, ago(verifiedDaysAgo));
  };
  const L = {
    mouj: await listing({ label: 'Al Mouj marina apartment', reference: 'BM-101', transactionType: 'sale', propertyType: 'apartment', area: 'Al Mouj', location: 'The Wave, Al Mouj', askingPriceMinor: 85000000, bedrooms: 2, bathrooms: 2, sizeSqm: 118 }, 3),
    qurum: await listing({ label: 'Qurum Heights villa', reference: 'BM-102', transactionType: 'sale', propertyType: 'villa', area: 'Qurum', location: 'Qurum Heights, Muscat', askingPriceMinor: 240000000, bedrooms: 4, bathrooms: 5, sizeSqm: 410 }, 20),
    msq: await listing({ label: 'MSQ family villa', reference: 'BM-201', transactionType: 'rent', pricePeriod: 'month', propertyType: 'villa', area: 'Madinat Sultan Qaboos', location: 'MSQ, Muscat', askingPriceMinor: 900000, bedrooms: 3, bathrooms: 3 }, 25),
    khuwair: await listing({ label: 'Al Khuwair one-bedroom', reference: 'BM-202', transactionType: 'rent', pricePeriod: 'month', propertyType: 'apartment', area: 'Al Khuwair', location: 'Al Khuwair 33, Muscat', askingPriceMinor: 350000, bedrooms: 1, bathrooms: 1 }, 2),
    bausher: await listing({ label: 'Bausher townhouse', reference: 'BM-103', transactionType: 'sale', propertyType: 'townhouse', area: 'Bausher', location: 'Bausher Heights, Muscat', askingPriceMinor: 135000000, bedrooms: 3, bathrooms: 3, assignedAccountId: String(agentId) }, 5),
    seeb: await listing({ label: 'Seeb residential plot', reference: 'BM-104', transactionType: 'sale', propertyType: 'land', area: 'Seeb', location: 'Al Hail North, Seeb', askingPriceMinor: 45000000 }, null),
  };

  // People write in on WhatsApp or Instagram; each has a conversation and real messages.
  let n = 0;
  const person = async (name, channel, firstAt, text, reply = 'Thank you. An agent will follow up shortly.') => {
    const suffix = String(++n).padStart(2, '0'), waId = `968915000${suffix}`;
    const contactId = await m.db.insert('blueContacts', { accountId: tenant.accountId, key: `demo-re:${suffix}`, state: 'active', channel: 'whatsapp', waId, numberHash: `${suffix}`.repeat(32), ownerName: name, source: 'inbound',
      sectorId: 'real-estate', fields: [], qualificationStatus: 'in_progress', consent: { status: 'unknown' }, optout: false, searchText: `${name} ${waId}`, lastInboundAt: firstAt, lastActivityAt: firstAt, createdAt: firstAt, updatedAt: firstAt });
    const conversationId = await m.db.insert('blueConversations', { accountId: tenant.accountId, key: `demo-re:${suffix}`, integrationId: tenant.integration.id, channel: 'whatsapp', number: waId, contactId, version: 1, lastInbound: firstAt, takeover: false, optout: false, updatedAt: firstAt });
    await say(conversationId, 'in', text, firstAt);
    if (reply) await say(conversationId, 'out', reply, firstAt + 2 * MIN);
    return { contactId, conversationId, channel };
  };
  const say = async (conversationId, direction, text, at) => {
    await m.db.insert('blueMessages', { key: `demo-re:${randomUUID()}`, integrationId: tenant.integration.id, accountId: tenant.accountId, conversationId, direction, text, at,
      expiresAt: at + 60 * DAY, textExpiresAt: at + 60 * DAY, status: direction === 'in' ? 'received' : 'delivered', ...(direction === 'in' ? {} : { manual: direction === 'human' }) });
    if (direction === 'in') { const c = await m.db.get(conversationId); await m.db.patch(conversationId, { lastInbound: Math.max(c.lastInbound, at), updatedAt: at }); }
  };
  const deal = (who, workflow, at) => create('opportunity_save', { workflow: { contactId: who.contactId, conversationId: who.conversationId, source: who.channel, mustHaves: [], budgetMinMinor: 0, financeReadiness: 'unknown', decisionMakerReadiness: 'unknown', timeline: 'unknown', ...workflow } }, at);
  const qualify = (who, workflow, at) => deal(who, { financeReadiness: 'cash', decisionMakerReadiness: 'ready', timeline: 'Within two months', ...workflow }, at);
  const book = (d, property, scheduledAt, at, status = 'confirmed') => create('viewing_save', { workflow: { opportunityId: d.id, propertyId: property.id, status, scheduledAt } }, at);
  const outcome = (v, status, at, text) => run('viewing_save', { viewingId: v.id, version: v.version, workflow: { status, ...(text ? { outcome: text } : {}) } }, at);
  const offer = async (d, property, amountMinor, at, { decisionDueAt, accept = false, terms = 'Bank transfer on signing; completion within 30 days.' } = {}) => {
    let o = await create('offer_save', { workflow: { opportunityId: d.id, propertyId: property.id, amountMinor, terms, ...(decisionDueAt ? { decisionDueAt } : {}) } }, at);
    o = await run('offer_approve', { offerId: o.id, version: o.version }, at + HOUR);
    o = await run('offer_save', { offerId: o.id, version: o.version, workflow: { status: 'presented' } }, at + 2 * HOUR);
    return accept ? run('offer_save', { offerId: o.id, version: o.version, workflow: { status: 'accepted' } }, at + DAY) : o;
  };
  const close = async (d, o, commissionMinor, at, dueAt) => {
    let check;
    for (const kind of CHECKS) check = await run('compliance_update', { opportunityId: d.id, version: check?.version, kind, status: kind === 'financing' && commissionMinor < 1000000 ? 'not_applicable' : 'confirmed' }, at);
    return run('deal_close', { opportunityId: d.id, offerId: o.id, commissionMinor, dueAt }, at + HOUR);
  };

  // 1. Salim: Qurum villa, won 30 days ago; commission part-paid and now overdue.
  const salim = await person('Salim Al Harthy', 'whatsapp', ago(48), 'Looking for a 4-bedroom villa in Qurum, budget around 250k.');
  const dSalim = await qualify(salim, { need: 'buy', areas: ['Qurum'], propertyTypes: ['villa'], budgetMaxMinor: 260000000, bedrooms: 4 }, ago(47));
  const vSalim = await book(dSalim, L.qurum, ago(42), ago(46));
  await outcome(vSalim, 'completed', ago(42, 2), 'Loved the garden; wants to negotiate.');
  const oSalim = await offer(dSalim, L.qurum, 232000000, ago(40), { accept: true });
  const cSalim = await close(dSalim, oSalim, 4800000, ago(30), ago(30) + 14 * DAY);
  await create('payment_record', { orderId: cSalim.orderId, amountMinor: 2000000, method: 'bank_transfer' }, ago(20));

  // 2. Noor: MSQ villa to rent, won; commission paid in full.
  const noor = await person('نور الهنائية', 'whatsapp', ago(38), 'أبحث عن فيلا للإيجار في مدينة السلطان قابوس، ٣ غرف.');
  const dNoor = await qualify(noor, { need: 'rent', areas: ['Madinat Sultan Qaboos'], propertyTypes: ['villa'], budgetMaxMinor: 1000000, bedrooms: 3 }, ago(37));
  const vNoor = await book(dNoor, L.msq, ago(34), ago(36));
  await outcome(vNoor, 'completed', ago(34, 1), 'Ready to sign for 12 months.');
  const oNoor = await offer(dNoor, L.msq, 900000, ago(33), { accept: true, terms: '12-month lease, two cheques.' });
  const cNoor = await close(dNoor, oNoor, 450000, ago(31), ago(31) + 7 * DAY);
  await run('commission_record', { requestId: randomUUID(), commissionId: cNoor.id, status: 'paid' }, ago(28));

  // 3. Maryam: Al Mouj apartment, offer presented and past its decision date.
  const maryam = await person('مريم البلوشية', 'instagram', ago(26), 'هل شقة الموج ذات الغرفتين ما زالت متاحة؟');
  const dMaryam = await qualify(maryam, { need: 'buy', areas: ['Al Mouj'], propertyTypes: ['apartment'], budgetMaxMinor: 90000000, bedrooms: 2, financeReadiness: 'approved' }, ago(25));
  const vMaryam = await book(dMaryam, L.mouj, ago(21), ago(24));
  await outcome(vMaryam, 'completed', ago(21, 1), 'Likes the view; asked about service charges.');
  await offer(dMaryam, L.mouj, 81000000, ago(6), { decisionDueAt: ago(2) });
  await m.db.patch(dMaryam.id, { assignedAccountId: agentId });

  // 4. Ahmed: rents in Al Khuwair; missed his viewing.
  const ahmed = await person('Ahmed Al Rawahi', 'whatsapp', ago(19), 'Any one-bedroom flats in Al Khuwair under 400 a month?');
  const dAhmed = await qualify(ahmed, { need: 'rent', areas: ['Al Khuwair'], propertyTypes: ['apartment'], budgetMaxMinor: 400000, bedrooms: 1 }, ago(18));
  const vAhmed = await book(dAhmed, L.khuwair, ago(15), ago(17));
  await outcome(vAhmed, 'missed', ago(15, 2));

  // 5. Fatma: Bausher townhouse; viewing tomorrow morning (the confirmation rule fires).
  const fatma = await person('Fatma Al Saadi', 'whatsapp', ago(5), 'Interested in the Bausher townhouse. Can I see it this week?');
  const dFatma = await qualify(fatma, { need: 'buy', areas: ['Bausher'], propertyTypes: ['townhouse'], budgetMaxMinor: 140000000, bedrooms: 3, assignedAccountId: String(agentId) }, ago(4));
  await book(dFatma, L.bausher, now + 18 * HOUR, ago(3));

  // 6. Khalid: new from Instagram, no budget yet (missing requirements).
  const khalid = await person('خالد اللواتي', 'instagram', ago(1, -3), 'أريد شقة في القرم للشراء');
  await deal(khalid, { need: 'buy', areas: ['Qurum'], propertyTypes: ['apartment'], budgetMaxMinor: 0 }, ago(1, -3));

  // 7. Huda: qualified and waiting on a reply past the SLA (unanswered).
  const huda = await person('Huda Al Maskari', 'whatsapp', ago(9), 'Looking to buy in Al Mouj, up to 100k.');
  const dHuda = await qualify(huda, { need: 'buy', areas: ['Al Mouj'], propertyTypes: ['apartment'], budgetMaxMinor: 100000000, bedrooms: 2 }, ago(8));
  await say(huda.conversationId, 'in', 'Is there any parking with the Al Mouj apartment?', now - 3 * HOUR);
  void dHuda;

  // 8. Reem: lost on budget.
  const reem = await person('Reem Al Busaidi', 'whatsapp', ago(30), 'Villa in Qurum for 150k?');
  const dReem = await qualify(reem, { need: 'buy', areas: ['Qurum'], propertyTypes: ['villa'], budgetMaxMinor: 150000000, bedrooms: 3 }, ago(29));
  await run('opportunity_stage', { opportunityId: dReem.id, version: dReem.version, status: 'lost', reason: 'budget' }, ago(22));

  // 9. Saeed: the agent's deal, contacted; viewing requested for later this week.
  const saeed = await person('سعيد الكندي', 'whatsapp', ago(2), 'هل يمكن معاينة الفيلا في القرم؟', 'أهلاً سعيد، سيتواصل معك الوكيل.');
  const dSaeed = await deal(saeed, { need: 'buy', areas: ['Qurum'], propertyTypes: ['villa'], budgetMaxMinor: 250000000, assignedAccountId: String(agentId), nextAction: 'Confirm finance before the viewing' }, ago(2));
  await run('opportunity_stage', { opportunityId: dSaeed.id, version: dSaeed.version, status: 'contacted' }, ago(2, 1));

  // 10. Aisha: viewed the MSQ villa two days ago, no decision since (post-viewing rule writes a draft).
  const aisha = await person('Aisha Al Zadjali', 'whatsapp', ago(12), 'Need a 3-bedroom villa to rent near MSQ schools.');
  const dAisha = await qualify(aisha, { need: 'rent', areas: ['Madinat Sultan Qaboos'], propertyTypes: ['villa'], budgetMaxMinor: 950000, bedrooms: 3 }, ago(11));
  const vAisha = await book(dAisha, L.msq, ago(2), ago(4));
  await outcome(vAisha, 'completed', ago(2, 1), 'Wants to compare with one more option.');

  // 11. Yousuf: cancelled two days ahead (timely); 12. Laila: cancelled an hour before (late).
  const yousuf = await person('Yousuf Al Shukaili', 'whatsapp', ago(16), 'Plot in Seeb for a family home?');
  const dYousuf = await qualify(yousuf, { need: 'buy', areas: ['Seeb'], propertyTypes: ['land'], budgetMaxMinor: 50000000 }, ago(15));
  const vYousuf = await book(dYousuf, L.bausher, ago(10), ago(14));
  await outcome(vYousuf, 'cancelled', ago(12));
  const laila = await person('ليلى الشكيلية', 'whatsapp', ago(14), 'أبحث عن شقة للإيجار في الخوير');
  const dLaila = await qualify(laila, { need: 'rent', areas: ['Al Khuwair'], propertyTypes: ['apartment'], budgetMaxMinor: 380000, bedrooms: 1 }, ago(13));
  const vLaila = await book(dLaila, L.khuwair, ago(7), ago(12));
  await outcome(vLaila, 'cancelled', ago(7) - HOUR);

  // A dated follow-up the agent set on Fatma's deal.
  await create('followup_save', { contactId: fatma.contactId, conversationId: fatma.conversationId, dueAt: now + 2 * DAY, reason: 'Send the floor plan and service charges', linkedType: 'opportunity', linkedId: dFatma.id }, ago(3));

  // The rules, switched on as an owner would: two tasks and one draft for approval.
  await run('settings_update', { realEstate: { rules: [
    { id: 'missing_requirements', enabled: true, mode: 'task', offsetMinutes: 120 },
    { id: 'viewing_confirmation', enabled: true, mode: 'task', offsetMinutes: 1440 },
    { id: 'post_viewing_decision', enabled: true, mode: 'draft', offsetMinutes: 1440 },
  ] } });
  await run('real_estate_overview', {});
  return { agentId, memberId: member.id };
}
