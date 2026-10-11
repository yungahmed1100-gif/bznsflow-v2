// A synthetic Muscat production studio for the local Media & production demo: five crew and kit
// resources, a producer, and a dozen productions at every stage, from a fresh brief to a delivered,
// paid and costed film. Includes the spec's journey: cut v1 superseded by v2, a third revision that
// becomes a priced change order, and two projects competing for the same crew. Each record is
// written through the same Hasib API the dashboard uses, at the time it happened. Nothing is sent.
import { randomUUID } from 'node:crypto';

const MIN = 60000, OMR = 1000;
const PREP = ['crew_confirmed', 'location_permission', 'equipment_ready', 'client_assets', 'talent_releases'];

export async function seedMedia({ m, tenant, hasib, DAY, HOUR }) {
  if (m.now() < Date.now()) m.advance(Date.now() - m.now());
  // Whole hours, so the demo's shoot times read like real bookings.
  m.advance(HOUR - (m.now() % HOUR));
  const now = m.now(), ago = (days, hours = 0) => now - days * DAY + hours * HOUR, ahead = (days, hours = 0) => now + days * DAY + hours * HOUR;
  const run = (operation, args, at = m.now()) => hasib(operation, args, at);
  const create = (operation, args, at) => run(operation, { requestId: randomUUID(), ...args }, at);
  const session = await m.db.get(tenant.rowId);
  await m.db.patch(tenant.rowId, { profile: { ...session.profile, businessName: 'Noor Frames Studio', sector: 'Media & production', services: 'Brand films, product shoots, podcasts and social packages', location: 'Al Khuwair, Muscat', reviewed: true } });
  await run('settings_update', { packId: 'media' });

  // The team: one producer who works their own productions.
  const member = await run('team_invite', { email: 'staff@noor.example' });
  const producerId = await m.db.insert('accounts', { email: 'staff@noor.example', role: 'customer', createdAt: ago(60) });
  await m.db.patch(member.id, { accountId: producerId, status: 'active', activatedAt: ago(60) });

  const resource = (name, category, rate) => create('media_resource_save', { media: { name, category, active: true, ...(rate ? { internalRateMinor: rate } : {}) } }, ago(60));
  const R = { crewA: await resource('Crew A · Salim and Huda', 'crew', 120 * OMR), crewB: await resource('Crew B · Ahmed and Rashid', 'crew', 110 * OMR),
    camera: await resource('Camera C · Sony FX6', 'camera', 45 * OMR), lights: await resource('Lighting kit · Aputure', 'lighting', 25 * OMR), studio: await resource('Studio 1 · Al Khuwair', 'location', 80 * OMR) };

  // Clients write in on WhatsApp or Instagram; each has a conversation and real messages.
  let n = 0;
  const say = async (conversationId, direction, text, at) => {
    await m.db.insert('blueMessages', { key: `demo-md:${randomUUID()}`, integrationId: tenant.integration.id, accountId: tenant.accountId, conversationId, direction, text, at,
      expiresAt: at + 60 * DAY, textExpiresAt: at + 60 * DAY, status: direction === 'in' ? 'received' : 'delivered' });
    if (direction === 'in') { const c = await m.db.get(conversationId); await m.db.patch(conversationId, { lastInbound: Math.max(c.lastInbound, at), updatedAt: at }); }
  };
  const person = async (name, channel, firstAt, text, reply = 'Thank you. A producer will send you a brief shortly.') => {
    const suffix = String(++n).padStart(2, '0'), waId = `968916000${suffix}`;
    const contactId = await m.db.insert('blueContacts', { accountId: tenant.accountId, key: `demo-md:${suffix}`, state: 'active', channel, waId, numberHash: `${suffix}`.repeat(32), ownerName: name, source: 'inbound',
      sectorId: 'media', fields: [], qualificationStatus: 'in_progress', consent: { status: 'unknown' }, optout: false, searchText: `${name} ${waId}`, lastInboundAt: firstAt, lastActivityAt: firstAt, createdAt: firstAt, updatedAt: firstAt });
    const conversationId = await m.db.insert('blueConversations', { accountId: tenant.accountId, key: `demo-md:${suffix}`, integrationId: tenant.integration.id, channel, number: waId, contactId, version: 1, lastInbound: firstAt, takeover: false, optout: false, updatedAt: firstAt });
    await say(conversationId, 'in', text, firstAt);
    if (reply) await say(conversationId, 'out', reply, firstAt + 2 * MIN);
    return { contactId, conversationId, channel };
  };

  // One production's life, a step at a time; each step returns the saved card.
  const brief = (who, media, at) => create('media_production_save', { media: { contactId: who.contactId, conversationId: who.conversationId, source: who.channel, ...media } }, at);
  const quote = (p, quoteMinor, at) => run('media_quote', { productionId: p.id, version: p.version, media: { quoteMinor } }, at);
  const present = (p, at) => run('media_production_status', { productionId: p.id, version: p.version, status: 'awaiting_acceptance' }, at);
  const accept = (p, by, at) => run('media_accept', { productionId: p.id, version: p.version, media: { quoteVersion: p.quoteVersion, acceptedBy: by, evidenceSource: 'chat' } }, at);
  const pay = (p, amountMinor, at, extra = {}) => create('media_payment_record', { productionId: p.id, amountMinor, method: 'bank_transfer', ...extra }, at);
  const hold = async (p, resources, startsAt, endsAt, at, confirm = true) => {
    for (const r of resources) {
      const h = await create('media_reservation_save', { productionId: p.id, mediaResourceId: r.id, media: { startsAt, endsAt } }, at);
      if (confirm) await run('media_reservation_status', { reservationId: h.id, version: h.version, status: 'confirmed' }, at + MIN);
    }
    return run('media_production', { productionId: p.id }, at + 2 * MIN);
  };
  const move = (p, status, at, reason) => run('media_production_status', { productionId: p.id, version: p.version, status, ...(reason ? { reason } : {}) }, at);
  const prep = async (p, keys, at) => { for (const key of keys) p = await run('media_prep_verify', { productionId: p.id, version: p.version, media: { key, verified: true } }, at); return p; };
  const shot = (p, at) => run('media_shoot_complete', { productionId: p.id, version: p.version, media: { mediaReceived: true, note: 'Footage backed up to the studio NAS' } }, at);
  const cut = (p, label, approverName, at, due) => create('media_cut_submit', { productionId: p.id, version: p.version, media: { label, assetRef: `https://review.noorframes.example/${p.ref}/${label}`, approverName, ...(due ? { decisionDueAt: due } : {}) } }, at);
  const current = async (p, at) => (await run('media_production', { productionId: p.id }, at)).cuts[0];
  const decide = async (p, decision, approverName, at, feedback) => {
    const c = await current(p, at);
    return run('media_cut_decide', { cutId: c.id, version: c.version, media: { decision, approverName, evidenceSource: 'chat', ...(feedback ? { feedback } : {}) } }, at);
  };
  const cost = (p, category, label, amountMinor, at, extra = {}) => create('media_cost_save', { productionId: p.id, media: { category, label, amountMinor, costKind: 'actual', incurredAt: at, ...extra } }, at);
  const book = async (p, by, quoteMinor, resources, startsAt, endsAt, at) => {
    p = await quote(p, quoteMinor, at); p = await present(p, at + HOUR); p = await accept(p, by, at + DAY);
    p = await pay(p, Math.round(quoteMinor / 5), at + DAY + HOUR);
    p = await hold(p, resources, startsAt, endsAt, at + DAY + 2 * HOUR);
    return move(p, 'booked', at + DAY + 3 * HOUR);
  };
  const deliverable = (format, quantity = 1, durationSeconds) => ({ format, quantity, language: 'ar', ...(durationSeconds ? { durationSeconds } : {}) });

  // 1. Delivered on time, paid in full, costs confirmed: the contribution is complete.
  const salma = await person('Salma Al Busaidi', 'whatsapp', ago(42), 'We need a 90-second brand film for our new lounge.');
  let p1 = await brief(salma, { title: 'Lounge brand film', productionType: 'video', deliverables: [deliverable('video', 1, 90), deliverable('social_cut', 3, 15)], shootStartsAt: ago(30), shootEndsAt: ago(30, 6),
    location: 'Al Mouj lounge', deliveryDueAt: ago(10), revisionAllowance: 2, producerId: String(producerId), usageRights: { channels: ['web', 'social'], territory: 'GCC', clearance: 'cleared' } }, ago(41));
  p1 = await book(p1, 'Salma Al Busaidi', 1800 * OMR, [R.crewA, R.camera, R.lights], ago(30), ago(30, 6), ago(40));
  p1 = await move(p1, 'preproduction', ago(36)); p1 = await prep(p1, PREP, ago(33)); p1 = await move(p1, 'shooting', ago(30)); p1 = await shot(p1, ago(30, 7));
  p1 = await cut(p1, 'v1', 'Salma Al Busaidi', ago(24)); p1 = await decide(p1, 'changes_requested', 'Salma Al Busaidi', ago(22), 'Use the evening shots for the opening and shorten the logo sting.');
  p1 = await cut(p1, 'v2', 'Salma Al Busaidi', ago(19)); p1 = await decide(p1, 'approved', 'Salma Al Busaidi', ago(17));
  p1 = await run('media_handoff', { productionId: p1.id, version: p1.version, media: { link: 'https://files.noorframes.example/PRJ-001/final' } }, ago(12));
  await cost(p1, 'crew_time', 'Crew A, one shoot day', 240 * OMR, ago(30), { hours: 8 }); await cost(p1, 'editing', 'Edit and grade, 3 days', 360 * OMR, ago(20));
  await cost(p1, 'licensing', 'Music licence (web and social, GCC)', 85 * OMR, ago(18));
  p1 = await run('media_production', { productionId: p1.id }, ago(11));
  p1 = await run('media_costs_final', { productionId: p1.id, version: p1.version, media: { final: true } }, ago(11));
  await pay(p1, 1440 * OMR, ago(8));

  // 2. Delivered three days late; a balance is still owed.
  const hamad = await person('حمد الرواحي', 'instagram', ago(50), 'نحتاج باقة سوشيال لحملة رمضان، ١٢ مقطع.');
  let p2 = await brief(hamad, { title: 'Ramadan social package', productionType: 'social_package', deliverables: [deliverable('social_cut', 12, 20)], shootStartsAt: ago(35), shootEndsAt: ago(35, 8),
    location: 'Studio 1, Al Khuwair', deliveryDueAt: ago(20), revisionAllowance: 2, usageRights: { channels: ['social'], territory: 'Oman', clearance: 'cleared' } }, ago(49));
  p2 = await book(p2, 'حمد الرواحي', 1200 * OMR, [R.crewB, R.studio], ago(35), ago(35, 8), ago(47));
  p2 = await move(p2, 'preproduction', ago(40)); p2 = await prep(p2, PREP, ago(37)); p2 = await move(p2, 'shooting', ago(35)); p2 = await shot(p2, ago(35, 9));
  p2 = await cut(p2, 'v1', 'حمد الرواحي', ago(26)); p2 = await decide(p2, 'approved', 'حمد الرواحي', ago(19));
  p2 = await run('media_handoff', { productionId: p2.id, version: p2.version, media: { link: 'https://files.noorframes.example/PRJ-002/final' } }, ago(17));
  await cost(p2, 'crew_time', 'Crew B, one studio day', 220 * OMR, ago(35)); await cost(p2, 'location', 'Studio 1 day rate', 80 * OMR, ago(35));

  // 3. Accepted; handoff waits for usage rights to be cleared.
  const muscatFest = await person('Muscat Events Co.', 'whatsapp', ago(30), 'Highlights film for the festival opening night, please.');
  let p3 = await brief(muscatFest, { title: 'Festival highlights film', productionType: 'live_capture', deliverables: [deliverable('video', 1, 120)], shootStartsAt: ago(14), shootEndsAt: ago(14, 5),
    location: 'Al Amerat park', deliveryDueAt: ahead(4), revisionAllowance: 1, usageRights: { channels: ['broadcast', 'social'], territory: 'Oman', clearance: 'pending' } }, ago(29));
  p3 = await book(p3, 'Muscat Events Co.', 2400 * OMR, [R.crewA, R.camera], ago(14), ago(14, 5), ago(27));
  p3 = await move(p3, 'preproduction', ago(20)); p3 = await prep(p3, PREP, ago(16)); p3 = await move(p3, 'shooting', ago(14)); p3 = await shot(p3, ago(14, 6));
  p3 = await cut(p3, 'v1', 'Muscat Events Co.', ago(6)); p3 = await decide(p3, 'approved', 'Muscat Events Co.', ago(2));

  // 4. The spec's journey: v1 sent, v2 replaces it before the client decides; v2 is in review now.
  const aisha = await person('عائشة البلوشية', 'whatsapp', ago(20), 'تصوير منتجات لمجموعة الخزف الجديدة.');
  let p4 = await brief(aisha, { title: 'Ceramics product shoot', productionType: 'photo', deliverables: [deliverable('stills_set', 40)], shootStartsAt: ago(9), shootEndsAt: ago(9, 5),
    location: 'Studio 1, Al Khuwair', deliveryDueAt: ahead(6), revisionAllowance: 2, producerId: String(producerId), usageRights: { channels: ['web', 'print'], territory: 'Oman', clearance: 'cleared' } }, ago(19));
  p4 = await book(p4, 'عائشة البلوشية', 1000 * OMR, [R.crewB, R.lights, R.studio], ago(9), ago(9, 5), ago(17));
  p4 = await move(p4, 'preproduction', ago(13)); p4 = await prep(p4, PREP, ago(11)); p4 = await move(p4, 'shooting', ago(9)); p4 = await shot(p4, ago(9, 6));
  p4 = await cut(p4, 'v1', 'عائشة البلوشية', ago(3)); p4 = await cut(p4, 'v2', 'عائشة البلوشية', ago(1), ahead(0, 10));

  // 5. Editing after a third revision request: one priced change order waits for the manager.
  const clinic = await person('Bayan Dental Clinic', 'whatsapp', ago(34), 'An explainer video for our new implant service.');
  let p5 = await brief(clinic, { title: 'Implant explainer video', productionType: 'video', deliverables: [deliverable('video', 1, 60)], shootStartsAt: ago(22), shootEndsAt: ago(22, 4),
    location: 'Bayan Dental Clinic, Qurum', deliveryDueAt: ahead(2), revisionAllowance: 2, producerId: String(producerId) }, ago(33));
  p5 = await book(p5, 'Bayan Dental Clinic', 900 * OMR, [R.crewA, R.camera], ago(22), ago(22, 4), ago(31));
  p5 = await move(p5, 'preproduction', ago(26)); p5 = await prep(p5, PREP, ago(24)); p5 = await move(p5, 'shooting', ago(22)); p5 = await shot(p5, ago(22, 5));
  for (const [i, note] of [[1, 'Make the voiceover warmer'], [2, 'Swap the second scene for the new X-ray room'], [3, 'Add Arabic subtitles to every scene']].entries())
    { p5 = await cut(p5, `v${note[0]}`, 'Bayan Dental Clinic', ago(15 - i * 3)); p5 = await decide(p5, 'changes_requested', 'Bayan Dental Clinic', ago(14 - i * 3), note[1]); }
  await cost(p5, 'editing', 'Subtitle work started before agreement', 40 * OMR, ago(4), { extraScope: true });

  // 6. Shooting now; the crew records completion when they wrap.
  const ruwi = await person('Ruwi Motors', 'whatsapp', ago(12), 'Showroom walkaround videos for five models.');
  let p6 = await brief(ruwi, { title: 'Showroom walkarounds', productionType: 'video', deliverables: [deliverable('video', 5, 45)], shootStartsAt: ago(0, -2), shootEndsAt: ahead(0, 3),
    location: 'Ruwi Motors showroom', deliveryDueAt: ahead(10), revisionAllowance: 2 }, ago(11));
  p6 = await book(p6, 'Ruwi Motors', 1500 * OMR, [R.crewB, R.camera], ago(0, -2), ahead(0, 3), ago(9));
  p6 = await move(p6, 'preproduction', ago(5)); p6 = await prep(p6, PREP, ago(2)); p6 = await move(p6, 'shooting', ago(0, -2));

  // 7. Preproduction with the shoot tomorrow: location permission and talent releases still missing.
  const souq = await person('Mutrah Souq Traders', 'instagram', ago(10), 'A short film about the souq’s spice merchants.');
  let p7 = await brief(souq, { title: 'Spice merchants short film', productionType: 'video', deliverables: [deliverable('video', 1, 180)], shootStartsAt: ahead(1, 2), shootEndsAt: ahead(1, 8),
    location: 'Mutrah Souq', deliveryDueAt: ahead(14), revisionAllowance: 2, producerId: String(producerId), usageRights: { channels: ['web', 'social'], territory: 'Worldwide', clearance: 'pending' } }, ago(9));
  p7 = await book(p7, 'Mutrah Souq Traders', 2100 * OMR, [R.crewA, R.lights], ahead(1, 2), ahead(1, 8), ago(7));
  p7 = await move(p7, 'preproduction', ago(4)); p7 = await prep(p7, ['crew_confirmed', 'equipment_ready', 'client_assets'], ago(1));

  // 8. Booked for next week; another enquiry holds the same crew tentatively.
  const nizwa = await person('Nizwa Heritage Hotel', 'whatsapp', ago(8), 'Photography of our renovated rooms for the new website.');
  let p8 = await brief(nizwa, { title: 'Hotel rooms photography', productionType: 'photo', deliverables: [deliverable('stills_set', 60)], shootStartsAt: ahead(6, 1), shootEndsAt: ahead(6, 9),
    location: 'Nizwa Heritage Hotel', deliveryDueAt: ahead(16), revisionAllowance: 2 }, ago(7));
  p8 = await book(p8, 'Nizwa Heritage Hotel', 1300 * OMR, [R.crewB, R.camera], ahead(6, 1), ahead(6, 9), ago(5));

  // 9. Accepted, deposit not received yet.
  const sohar = await person('Sohar Port Logistics', 'whatsapp', ago(6), 'Corporate podcast, four episodes.');
  let p9 = await brief(sohar, { title: 'Corporate podcast series', productionType: 'podcast', deliverables: [deliverable('audio', 4, 1800), deliverable('social_cut', 8, 30)], shootStartsAt: ahead(9, 1), shootEndsAt: ahead(9, 6),
    location: 'Studio 1, Al Khuwair', deliveryDueAt: ahead(25), revisionAllowance: 1 }, ago(5));
  p9 = await quote(p9, 1600 * OMR, ago(4)); p9 = await present(p9, ago(4, 1)); p9 = await accept(p9, 'Sohar Port Logistics', ago(2));
  await create('media_reservation_save', { productionId: p9.id, mediaResourceId: R.studio.id, media: { startsAt: ahead(9, 1), endsAt: ahead(9, 6) } }, ago(1));
  await create('media_reservation_save', { productionId: p9.id, mediaResourceId: R.crewB.id, media: { startsAt: ahead(6, 3), endsAt: ahead(6, 6) } }, ago(1)).catch(() => null);

  // 10. Quoted, waiting to be presented. 11. A fresh brief from Layla's chat, still incomplete.
  const qurum = await person('Qurum Fitness', 'instagram', ago(4), 'Promo reel for our new studio.');
  let p10 = await brief(qurum, { title: 'Studio promo reel', productionType: 'social_package', deliverables: [deliverable('social_cut', 4, 30)], shootStartsAt: ahead(12, 2), shootEndsAt: ahead(12, 6),
    location: 'Qurum Fitness', deliveryDueAt: ahead(20), revisionAllowance: 2 }, ago(3));
  p10 = await quote(p10, 650 * OMR, ago(2));
  // Two enquiries want the lighting kit at the same time: both may hold it tentatively, the clash is shown.
  await create('media_reservation_save', { productionId: p9.id, mediaResourceId: R.lights.id, media: { startsAt: ahead(9, 1), endsAt: ahead(9, 6) } }, ago(1));
  await create('media_reservation_save', { productionId: p10.id, mediaResourceId: R.lights.id, media: { startsAt: ahead(9, 2), endsAt: ahead(9, 5) } }, ago(0, -1));
  const huda = await person('هدى الكندية', 'whatsapp', ago(2), 'أريد تصوير حفل تخرج ابنتي الشهر القادم، كم السعر؟', 'شكراً لك! سيرسل لك المنتج موجزاً بالتفاصيل.');
  await brief(huda, { title: 'Graduation event film', productionType: 'live_capture', purpose: 'Graduation party film, next month', dateNeeded: 'Next month', location: 'Muscat' }, ago(2));

  // 12. Cancelled before booking: costs and history stay.
  const bank = await person('Gulf Bank', 'whatsapp', ago(25), 'Training videos for our branches.');
  let p12 = await brief(bank, { title: 'Branch training videos', productionType: 'video', deliverables: [deliverable('video', 6, 240)], shootStartsAt: ago(5), shootEndsAt: ago(5, 8),
    location: 'Gulf Bank HQ', deliveryDueAt: ago(1), revisionAllowance: 2 }, ago(24));
  p12 = await quote(p12, 3200 * OMR, ago(23)); p12 = await present(p12, ago(23, 1));
  await move(p12, 'cancelled', ago(15), 'The bank moved the training budget to next year');

  // A dated follow-up the producer set, and the rules switched on as an owner would.
  await create('followup_save', { contactId: souq.contactId, conversationId: souq.conversationId, dueAt: ahead(0, 4), reason: 'Call the souq office about the filming permit', linkedType: 'production', linkedId: p7.id }, ago(1));
  await run('settings_update', { mediaSettings: { revisionWindowDays: 14, rules: [
    { id: 'prep_request', enabled: true, mode: 'draft', offsetMinutes: 2880 },
    { id: 'cut_approval', enabled: true, mode: 'draft', offsetMinutes: 720 },
    { id: 'delivery_balance', enabled: true, mode: 'task', offsetMinutes: 1440 },
  ] } });
  await run('media_overview', {});
  return { producerId, memberId: member.id };
}
