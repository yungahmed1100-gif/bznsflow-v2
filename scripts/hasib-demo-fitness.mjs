// A synthetic Muscat gym for the local Fitness & wellness demo: three plans, a coach, two weeks of
// classes, and members in every state: attending, absent, frozen, expiring, renewed, in grace,
// waiting for payment, on a class pack and cancelled, plus trials booked, attended and missed and a
// fresh enquiry from Layla. Every record is written through the same Hasib API the dashboard uses,
// at the time it happened. Nothing is sent.
import { randomUUID } from 'node:crypto';

const MIN = 60000, OMR = 1000;

export async function seedFitness({ m, tenant, hasib, DAY, HOUR }) {
  if (m.now() < Date.now()) m.advance(Date.now() - m.now());
  m.advance(HOUR - (m.now() % HOUR));
  const now = m.now(), ago = (days, hours = 0) => now - days * DAY - hours * HOUR, ahead = (days, hours = 0) => now + days * DAY + hours * HOUR;
  const run = (operation, args, at = m.now()) => hasib(operation, args, at);
  const create = (operation, args, at) => run(operation, { requestId: randomUUID(), ...args }, at);
  const session = await m.db.get(tenant.rowId);
  await m.db.patch(tenant.rowId, { profile: { ...session.profile, businessName: 'Wave Fitness Muscat', sector: 'Fitness & wellness', services: 'HIIT, yoga, spin and open gym; monthly and quarterly memberships, class packs', location: 'Al Mouj, Muscat', reviewed: true } });
  await run('settings_update', { packId: 'fitness' }, ago(60));

  // The team: one coach at the front desk.
  const member = await run('team_invite', { email: 'staff@noor.example' }, ago(60));
  const coachId = await m.db.insert('accounts', { email: 'staff@noor.example', role: 'customer', createdAt: ago(60) });
  await m.db.patch(member.id, { accountId: coachId, status: 'active', activatedAt: ago(60) });

  const plan = fitness => create('fitness_plan_save', { fitness }, ago(60));
  const P = { monthly: await plan({ name: 'Monthly', kind: 'membership', termDays: 30, billingMonths: 1, priceMinor: 30 * OMR, freezeMaxDays: 14, graceDays: 7 }),
    quarterly: await plan({ name: 'Quarterly', kind: 'membership', termDays: 90, billingMonths: 3, priceMinor: 81 * OMR, freezeMaxDays: 30, graceDays: 7 }),
    pack: await plan({ name: '10-class pack', kind: 'class_pack', termDays: 60, billingMonths: 1, priceMinor: 45 * OMR, credits: 10, freezeMaxDays: 0, graceDays: 0 }) };

  // Customers write in on WhatsApp or Instagram; each has a conversation and real messages.
  let n = 0;
  const say = async (conversationId, direction, text, at) => {
    await m.db.insert('blueMessages', { key: `demo-ft:${randomUUID()}`, integrationId: tenant.integration.id, accountId: tenant.accountId, conversationId, direction, text, at,
      expiresAt: at + 60 * DAY, textExpiresAt: at + 60 * DAY, status: direction === 'in' ? 'received' : 'delivered' });
    if (direction === 'in') { const c = await m.db.get(conversationId); await m.db.patch(conversationId, { lastInbound: Math.max(c.lastInbound, at), updatedAt: at }); }
  };
  const person = async (name, channel, firstAt, text, reply = 'Welcome to Wave! A coach will share the class schedule with you.') => {
    const suffix = String(++n).padStart(2, '0'), waId = `968917000${suffix}`;
    const contactId = await m.db.insert('blueContacts', { accountId: tenant.accountId, key: `demo-ft:${suffix}`, state: 'active', channel, waId, numberHash: `${suffix}`.repeat(32), ownerName: name, source: 'inbound',
      sectorId: 'fitness', fields: [], qualificationStatus: 'in_progress', consent: { status: 'unknown' }, optout: false, searchText: `${name} ${waId}`, lastInboundAt: firstAt, lastActivityAt: firstAt, createdAt: firstAt, updatedAt: firstAt });
    const conversationId = await m.db.insert('blueConversations', { accountId: tenant.accountId, key: `demo-ft:${suffix}`, integrationId: tenant.integration.id, channel, number: waId, contactId, version: 1,
      lastInbound: firstAt, takeover: false, optout: false, createdAt: firstAt, updatedAt: firstAt });
    await say(conversationId, 'in', text, firstAt);
    if (reply) await say(conversationId, 'out', reply, firstAt + 2 * MIN);
    return { contactId, conversationId };
  };

  // Two weeks of classes behind, one ahead: HIIT at 6am, yoga at 6pm, spin at 8pm.
  const SLOTS = [['HIIT Express', 'hiit', 2, 12, 'Coach Salim'], ['Sunset Yoga', 'yoga', 14, 15, 'Coach Mariam'], ['Spin 45', 'spin', 16, 10, 'Coach Salim']];
  const day0 = now - (now % DAY); // midnight UTC; the slots are UTC hours (6am, 6pm and 8pm in Muscat)
  const classes = [];
  for (let d = -14; d <= 7; d++) for (const [title, classType, hour, capacity, coachName] of SLOTS) {
    const startsAt = day0 + d * DAY + hour * HOUR;
    classes.push({ ...(await create('fitness_class_save', { fitness: { title, classType, startsAt, endsAt: startsAt + 50 * MIN, capacity, coachName } }, Math.min(startsAt, now) - 3 * DAY)), classType });
  }
  const at = (d, type) => classes.find(c => c.startsAt >= day0 + d * DAY && c.startsAt < day0 + (d + 1) * DAY && c.classType === type);
  const book = (c, who, fitness = {}) => create('fitness_seat_book', { classId: c.id, contactId: who.contactId, fitness }, Math.min(c.startsAt, now) - DAY);
  const attend = (seat, c) => run('fitness_checkin', { seatId: seat.id, fitness: { source: 'scan', sourceEventId: `door-${seat.id}` } }, c.startsAt + 5 * MIN);
  const join = async (who, p, when, paid = true) => {
    const ms = await create('fitness_membership_save', { contactId: who.contactId, planId: p.id }, when);
    return paid ? create('fitness_payment_record', { membershipId: ms.id, amountMinor: p.priceMinor, method: 'card' }, when + 10 * MIN) : ms;
  };
  // A membership's current version, after check-ins have moved it on.
  const fresh = async (who, id, when) => (await run('fitness_member', { contactId: who.contactId }, when)).memberships.find(x => x.id === id);
  const regular = async (who, days, types = ['hiit']) => { for (const d of days) for (const t of types) { const c = at(d, t); if (c && c.startsAt < now) await attend(await book(c, who), c); } };

  // 1. A regular: monthly, three classes a week.
  const aisha = await person('Aisha Al Habsi', 'instagram', ago(40), 'Hi! Do you have early morning classes?');
  await join(aisha, P.monthly, ago(20)); await regular(aisha, [-12, -10, -8, -5, -3, -1], ['hiit']);
  // 2. Quarterly, absent for three weeks: the attendance gap and its invitation.
  const khalid = await person('خالد الرواحي', 'whatsapp', ago(60), 'أبغى اشتراك ثلاث شهور');
  await join(khalid, P.quarterly, ago(45));
  await run('fitness_checkin', { contactId: khalid.contactId, fitness: { source: 'scan', sourceEventId: 'gate-khalid-1' } }, ago(21));
  // 3. Frozen for ten days while travelling: not counted as absent.
  const lina = await person('Lina Haddad', 'whatsapp', ago(35), 'Can I pause my membership when I travel?');
  const linaM = await join(lina, P.quarterly, ago(30)); await regular(lina, [-13, -11], ['yoga']);
  await run('fitness_freeze', { membershipId: linaM.id, version: (await fresh(lina, linaM.id, ago(3))).version, reason: 'Travelling', fitness: { days: 10 } }, ago(3));
  // 4. Expiring in five days: the renewal reminder is written.
  const omar = await person('Omar Al Lawati', 'whatsapp', ago(30), 'Monthly price please');
  await join(omar, P.monthly, ago(25)); await regular(omar, [-9, -6, -2], ['spin']);
  // 5. Renewed early: the successor starts when the current term ends.
  const salma = await person('Salma Al Kindi', 'instagram', ago(32), 'Sunset yoga looks lovely');
  const salmaM = await join(salma, P.monthly, ago(28)); await regular(salma, [-7, -4, -1], ['yoga']);
  const next = await create('fitness_renew', { membershipId: salmaM.id, version: (await fresh(salma, salmaM.id, ago(2))).version }, ago(2));
  await create('fitness_payment_record', { membershipId: next.id, amountMinor: P.monthly.priceMinor, method: 'bank_transfer' }, ago(2, -1));
  // 6. Ended three days ago with no renewal: in grace.
  const yousef = await person('Yousef Al Balushi', 'whatsapp', ago(40), 'Is there parking?');
  await join(yousef, P.monthly, ago(33)); await regular(yousef, [-14, -12], ['hiit']);
  // 7. Signed up at the desk, waiting for payment.
  const noura = await person('Noura Al Siyabi', 'whatsapp', ago(1), 'I’ll pay at reception tomorrow');
  await join(noura, P.monthly, ago(1), false);
  // 8. A class pack, four classes used.
  const dana = await person('Dana Saleh', 'instagram', ago(18), 'Do you sell class packs?');
  await join(dana, P.pack, ago(16)); await regular(dana, [-14, -10, -6, -3], ['spin']);
  // 9. Cancelled: moving abroad.
  const rashid = await person('Rashid Al Amri', 'whatsapp', ago(50), 'Annual?');
  const rashidM = await join(rashid, P.monthly, ago(20));
  await run('fitness_cancel', { membershipId: rashidM.id, version: (await fresh(rashid, rashidM.id, ago(5))).version, reason: 'Moving abroad' }, ago(5));

  // Eight regulars on monthly plans, each in about a third of the past classes, so occupancy reads like a real gym.
  const REGULARS = ['Hamed Al Saadi', 'Zainab Al Jabri', 'Talal Al Maskari', 'ريم الشكيلية', 'Faisal Al Riyami', 'Muna Al Hinai', 'سالم المعمري', 'Nadia Al Wahaibi'];
  for (const [i, name] of REGULARS.entries()) {
    const who = await person(name, i % 2 ? 'instagram' : 'whatsapp', ago(9 + 2 * i), 'Monthly membership please');
    const joined = ago(8 + 2 * i); // staggered, so renewals fall due across the coming weeks
    await join(who, P.monthly, joined);
    for (const c of classes.filter(c => c.startsAt < now - HOUR && c.startsAt > joined + HOUR)) if ((Math.floor((c.startsAt - day0) / DAY) + i + c.classType.length) % 3 === 0) await attend(await book(c, who), c);
  }

  // Trials: one attended (offer a membership), one missed, one tomorrow (reminder written), and a full class with a waitlist.
  const huda = await person('هدى البوسعيدية', 'whatsapp', ago(4), 'أريد أجرب حصة يوغا قبل الاشتراك');
  const hudaClass = at(-2, 'yoga'), hudaSeat = await book(hudaClass, huda, { trial: true, source: 'whatsapp' });
  await attend(hudaSeat, hudaClass);
  const badr = await person('Badr Al Harthy', 'instagram', ago(6), 'Free trial?');
  const badrClass = at(-3, 'hiit'), badrSeat = await book(badrClass, badr, { trial: true, source: 'instagram' });
  await run('fitness_seat_status', { seatId: badrSeat.id, version: badrSeat.version, status: 'no_show' }, badrClass.endsAt + HOUR);
  const fatma = await person('Fatma Al Zadjali', 'instagram', ago(0, 3), 'Can I try spin tomorrow?');
  // The next spin class within a day, so its reminder is already written.
  await book(classes.find(c => c.classType === 'spin' && c.startsAt > now + HOUR && c.startsAt - now < DAY) || at(1, 'spin'), fatma, { trial: true, source: 'referral' });
  const full = at(2, 'spin');
  for (const who of [aisha, omar, salma, dana]) await book(full, who);
  for (let i = 0; i < 6; i++) await book(full, await person(`Spin guest ${i + 1}`, 'whatsapp', ago(10), 'Spin class please'), { trial: true, source: 'partner' });
  await book(full, khalid); // the class is full: Khalid waits
  // A fresh enquiry Layla turned into a trial request.
  const maryam = await person('Maryam Al Farsi', 'whatsapp', ago(0, 1), 'What are your prices? I want to start next week');
  await m.db.insert('fitnessTasks', { accountId: tenant.accountId, kind: 'trial_request', entityType: 'contact', entityId: String(maryam.contactId), status: 'open', reason: 'New enquiry from Layla: book a trial class', createdAt: ago(0, 1), updatedAt: ago(0, 1) });

  await run('fitness_overview', {});
  return { coachId, memberId: member.id };
}
