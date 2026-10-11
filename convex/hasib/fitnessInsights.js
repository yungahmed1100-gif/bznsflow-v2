// Fitness Insights (ascend/fitness.md, "KPI definitions"): four headline cards and four
// diagnostics. Each metric names its numerator, denominator, window and coverage; an empty
// population is "no eligible records", never 0%. Drill-down returns the exact population.
import { ok, fail, settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { insightsPeriod as periodOf, segmentRows, contactNames } from './workspace/insights.js';
import { rate, summarizeRows, weeks } from './workspace/metrics.js';
import { fitnessSettings } from './fitnessSettings.js';
import { loadGym } from './fitnessGym.js';
import { DAY, effectiveEnd, frozenAt, inAttendanceGap, monthlyMinor } from './fitnessDomain.js';

export const FITNESS_HEADLINE = ['trial_to_member', 'membership_renewal', 'attendance_gap', 'class_occupancy'];
export const FITNESS_DIAGNOSTIC = ['opening_retention', 'net_growth', 'recurring_revenue', 'no_show'];
export const FITNESS_SEGMENTS = ['plan', 'source', 'class_type', 'member_state'];
const KIND = { trial_to_member: 'rate', membership_renewal: 'rate', attendance_gap: 'count', class_occupancy: 'rate', opening_retention: 'rate', net_growth: 'count', recurring_revenue: 'money', no_show: 'rate' };
const AS_OF_NOW = new Set(['attendance_gap', 'recurring_revenue']);
const TRENDED = ['trial_to_member', 'membership_renewal', 'class_occupancy', 'no_show'];

// Active at time t: started, paid, inside its (freeze-extended) term and not cancelled by then.
const activeAt = (m, t) => !!m.activatedAt && m.startsAt <= t && t < effectiveEnd(m) && !(m.cancelledAt && m.cancelledAt <= t);
const firstPaid = (memberships, contactId) => (memberships.get(String(contactId)) || []).filter(m => m.activatedAt && !m.renewalOfId).sort((x, y) => x.activatedAt - y.activatedAt);

/** Each metric's population: [{ entityType, entity, contactId, counts, inNumerator, amountMinor?, attended?, capacity?, delta?, note?, plan?, classType?, memberState? }]. */
function populations(gym, s, range, now) {
  const inRange = t => t >= range.from && t < range.to, out = {};
  const planOf = m => m ? gym.planById.get(String(m.planId))?.name || m.name : 'trial';
  const held = c => c.status !== 'cancelled' && c.endsAt <= now && inRange(c.startsAt);

  // K01: attended trials whose conversion window has matured (or already converted); first paid membership within W.
  out.trial_to_member = gym.seats.filter(x => x.trial && x.status === 'attended' && x.attendedAt && inRange(x.attendedAt)).flatMap(x => {
    const joined = firstPaid(gym.membershipsOf, x.contactId).find(m => m.activatedAt >= x.attendedAt - DAY && m.activatedAt <= x.attendedAt + s.conversionWindowDays * DAY);
    if (!joined && x.attendedAt + s.conversionWindowDays * DAY > now) return [];
    return [{ entityType: 'seat', entity: x, contactId: x.contactId, counts: true, inNumerator: !!joined, plan: joined ? planOf(joined) : 'not_joined', classType: gym.classById.get(String(x.classId))?.classType }];
  });
  // K02: memberships whose (freeze-moved) end fell in the period, once the grace window has passed; renewed by end + grace.
  out.membership_renewal = gym.memberships.filter(m => m.activatedAt && !(m.cancelledAt && m.cancelledAt < m.startsAt)).flatMap(m => {
    const end = effectiveEnd(m), grace = gym.graceOf(m) * DAY;
    if (!inRange(end) || end + grace > now) return [];
    const next = gym.successorOf.get(String(m._id)), renewed = !!next?.activatedAt && next.activatedAt <= end + grace;
    return [{ entityType: 'membership', entity: m, contactId: m.contactId, counts: true, inNumerator: renewed && !(m.cancelledAt && m.cancelledAt < end),
      note: m.cancelledAt && m.cancelledAt < end ? 'cancelled' : (m.freezes || []).length ? 'freeze_moved_end' : null, plan: planOf(m) }];
  });
  // K03, as of now: active members past the minimum observation time; frozen members are left out and disclosed.
  out.attendance_gap = gym.memberships.flatMap(m => {
    const state = gym.stateOf(m);
    if (state === 'frozen') return [{ entityType: 'membership', entity: m, contactId: m.contactId, counts: false, inNumerator: false, note: 'frozen', plan: planOf(m), memberState: 'frozen' }];
    if (state !== 'active') return [];
    if (now - (m.activatedAt || m.startsAt) < s.minObservationDays * DAY) return [{ entityType: 'membership', entity: m, contactId: m.contactId, counts: false, inNumerator: false, note: 'new_member', plan: planOf(m), memberState: 'active' }];
    return [{ entityType: 'membership', entity: m, contactId: m.contactId, counts: true, inNumerator: inAttendanceGap(m, state, s, now), note: m.lastAttendanceAt ? null : 'no_visit_recorded', plan: planOf(m), memberState: 'active' }];
  });
  // K04: attended seats ÷ capacity across classes held in the period; a cancelled class leaves both sides.
  out.class_occupancy = gym.classes.filter(c => inRange(c.startsAt) && c.endsAt <= now).map(c => {
    const seats = gym.seatsOf.get(String(c._id)) || [], attended = seats.filter(x => x.status === 'attended').length;
    return { entityType: 'class', entity: c, contactId: null, counts: held(c), inNumerator: held(c), attended: held(c) ? attended : 0, capacity: held(c) ? c.capacity : 0, note: c.status === 'cancelled' ? 'cancelled' : null, classType: c.classType };
  });
  // K05: members active at the start of the period who are still active (or renewed) at its end; frozen counts as retained.
  const end = Math.min(range.to, now), contacts = [...gym.membershipsOf.entries()];
  out.opening_retention = contacts.filter(([, rows]) => rows.some(m => activeAt(m, range.from))).map(([contactId, rows]) => {
    const live = rows.find(m => activeAt(m, end));
    return { entityType: 'contact', entity: { _id: contactId }, contactId, counts: true, inNumerator: !!live, note: live && frozenAt(live, end) ? 'frozen' : null, plan: planOf(rows.find(m => activeAt(m, range.from))) };
  });
  // K06: new + reactivated − ended without renewal (cancelled, or lapsed after grace) in the period. A renewal is neither.
  out.net_growth = [];
  for (const [contactId, rows] of contacts) for (const m of rows) {
    if (m.activatedAt && !m.renewalOfId && inRange(m.activatedAt)) {
      const earlier = rows.some(o => o !== m && o.activatedAt && o.activatedAt < m.activatedAt);
      out.net_growth.push({ entityType: 'membership', entity: m, contactId, counts: true, inNumerator: true, delta: 1, note: earlier ? 'reactivated' : 'new', plan: planOf(m) });
    }
    const lapse = effectiveEnd(m) + gym.graceOf(m) * DAY;
    if (m.cancelledAt && m.activatedAt && inRange(m.cancelledAt)) out.net_growth.push({ entityType: 'membership', entity: m, contactId, counts: true, inNumerator: true, delta: -1, note: 'cancelled', plan: planOf(m) });
    else if (m.activatedAt && !m.cancelledAt && !gym.successorOf.has(String(m._id)) && inRange(lapse) && lapse <= now) out.net_growth.push({ entityType: 'membership', entity: m, contactId, counts: true, inNumerator: true, delta: -1, note: 'lapsed', plan: planOf(m) });
  }
  out.net_growth.openingBase = out.opening_retention.length;
  // K07, as of now: contracted monthly fee of active memberships (a run rate, not recognised revenue).
  out.recurring_revenue = gym.memberships.filter(m => ['active', 'frozen'].includes(gym.stateOf(m))).map(m => ({ entityType: 'membership', entity: m, contactId: m.contactId,
    counts: gym.stateOf(m) === 'active', inNumerator: gym.stateOf(m) === 'active', amountMinor: monthlyMinor(m), note: gym.stateOf(m) === 'frozen' ? 'frozen' : null, plan: planOf(m), memberState: gym.stateOf(m) }));
  // K08: no-shows ÷ recorded outcomes for seats in classes held in the period; an unrecorded seat stays unknown.
  out.no_show = gym.classes.filter(held).flatMap(c => (gym.seatsOf.get(String(c._id)) || []).filter(x => ['attended', 'no_show', 'confirmed'].includes(x.status)).map(x => ({
    entityType: 'seat', entity: x, contactId: x.contactId, counts: x.status !== 'confirmed', inNumerator: x.status === 'no_show', note: x.status === 'confirmed' ? 'unknown' : x.trial ? 'trial' : null, classType: c.classType })));
  return out;
}

function summarize(id, rows) {
  if (id === 'class_occupancy') {
    const attended = rows.reduce((s, r) => s + r.attended, 0), capacity = rows.reduce((s, r) => s + r.capacity, 0);
    return { value: rate(attended, capacity), numerator: attended, denominator: capacity, notes: { cancelled: rows.filter(r => r.note === 'cancelled').length, classes: rows.filter(r => r.counts).length } };
  }
  if (id === 'net_growth') {
    const value = rows.reduce((s, r) => s + r.delta, 0), base = rows.openingBase || 0;
    const notes = rows.reduce((acc, r) => ({ ...acc, [r.note]: (acc[r.note] || 0) + 1 }), {});
    return { value: rows.length ? value : null, numerator: value, denominator: base, rateOfBase: rate(value, base), notes };
  }
  const base = summarizeRows(KIND[id], rows);
  if (id === 'attendance_gap') return { ...base, coverage: { withVisit: rows.filter(r => r.counts && r.note !== 'no_visit_recorded').length, eligible: rows.filter(r => r.counts).length } };
  return base;
}

/** Trial funnel for the acquisition view: booked trials in held classes → attended → paid within W. */
function trialFunnel(gym, s, range, now) {
  const trials = gym.seats.filter(x => x.trial && x.status !== 'cancelled' && x.status !== 'waitlisted').map(x => ({ x, c: gym.classById.get(String(x.classId)) }))
    .filter(({ c }) => c && c.status !== 'cancelled' && c.endsAt <= now && c.startsAt >= range.from && c.startsAt < range.to);
  const attended = trials.filter(({ x }) => x.status === 'attended');
  const paid = attended.filter(({ x }) => firstPaid(gym.membershipsOf, x.contactId).some(m => m.activatedAt >= x.attendedAt - DAY && m.activatedAt <= x.attendedAt + s.conversionWindowDays * DAY));
  const bySource = {};
  for (const { x } of trials) { const k = x.source || 'unknown'; bySource[k] = bySource[k] || { booked: 0, attended: 0, paid: 0 }; bySource[k].booked++; }
  for (const { x } of attended) bySource[x.source || 'unknown'].attended++;
  for (const { x } of paid) bySource[x.source || 'unknown'].paid++;
  return { booked: trials.length, attended: attended.length, paid: paid.length, attendanceRate: rate(attended.length, trials.length), attendedToPaid: rate(paid.length, attended.length),
    bySource: Object.entries(bySource).map(([source, v]) => ({ source, ...v })), costPerAttendedTrial: null };
}

export const segmentOf = (dimension, row, gym) => {
  if (dimension === 'plan') return row.plan || 'unknown';
  if (dimension === 'class_type') return row.classType || 'not_applicable';
  if (dimension === 'member_state') return row.memberState || 'not_applicable';
  const trial = (gym.seatsByContact.get(String(row.contactId)) || []).find(x => x.trial);
  return trial ? trial.source || 'unknown' : row.contactId ? 'direct' : 'not_applicable';
};


export async function fitnessInsights(ctx, tenant, a, now) {
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId), s = fitnessSettings(await settingsFor(ctx, accountId));
  if (a.segment && !FITNESS_SEGMENTS.includes(a.segment)) return fail('invalid_segment');
  const range = periodOf(a, now, tz), gym = await loadGym(ctx, accountId, now), pops = populations(gym, s, range, now);
  const metric = id => ({ id, kind: KIND[id], ...(AS_OF_NOW.has(id) ? { asOf: now } : { period: { period: range.period, from: range.from, to: range.to } }), complete: gym.complete,
    ...summarize(id, pops[id]), ...(id === 'recurring_revenue' && !pops[id].length ? { value: null } : {}) });
  const trend = {};
  for (const id of TRENDED) {
    const end = id === 'trial_to_member' ? now - s.conversionWindowDays * DAY : now;
    trend[id] = weeks(end).map(week => { const { value, numerator, denominator } = summarize(id, populations(gym, s, week, now)[id]); return { ...week, value, numerator, denominator }; });
  }
  return ok({ period: { period: range.period, from: range.from, to: range.to }, settings: s, complete: gym.complete,
    headline: FITNESS_HEADLINE.map(id => ({ ...metric(id), ...(trend[id] ? { trend: trend[id] } : {}) })), diagnostics: FITNESS_DIAGNOSTIC.map(id => ({ ...metric(id), ...(trend[id] ? { trend: trend[id] } : {}) })),
    trials: trialFunnel(gym, s, range, now), segments: a.segment ? segmentTable(a.segment, pops, gym) : null });
}

function segmentTable(dimension, pops, gym) {
  const ids = [...FITNESS_HEADLINE, ...FITNESS_DIAGNOSTIC].filter(id => id !== 'net_growth');
  return { dimension, metrics: ids, rows: segmentRows(ids, pops, r => segmentOf(dimension, r, gym), summarize) };
}

/** The exact records behind a metric (optionally one segment), marking which ones the numerator counts. */
export async function fitnessMetricRecords(ctx, tenant, actor, a, now) {
  if (!FITNESS_HEADLINE.includes(a.metric) && !FITNESS_DIAGNOSTIC.includes(a.metric)) return fail('invalid_metric');
  const [dimension, key] = String(a.segment || '').split(':');
  if (a.segment && (!FITNESS_SEGMENTS.includes(dimension) || !key)) return fail('invalid_segment');
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId), s = fitnessSettings(await settingsFor(ctx, accountId));
  const range = periodOf(a, now, tz), gym = await loadGym(ctx, accountId, now);
  const rows = populations(gym, s, range, now)[a.metric].filter(r => !a.segment || segmentOf(dimension, r, gym) === key).slice(0, 300);
  const nameOf = contactNames(ctx), items = [];
  for (const r of rows) {
    const klass = r.entityType === 'class' ? r.entity : r.entityType === 'seat' ? gym.classById.get(String(r.entity.classId)) : null;
    items.push({ id: r.entity._id, entityType: r.entityType, counts: r.counts, inNumerator: r.inNumerator, ...(r.note ? { note: r.note } : {}), ...(r.amountMinor !== undefined ? { amountMinor: r.amountMinor } : {}),
      ...(r.delta !== undefined ? { delta: r.delta } : {}), ...(r.capacity !== undefined ? { attended: r.attended, capacity: r.capacity } : {}),
      contactId: r.contactId ? String(r.contactId) : null, contactName: await nameOf(r.contactId), plan: r.plan || null,
      ...(klass ? { classTitle: klass.title, classStartsAt: klass.startsAt } : {}) });
  }
  return ok({ metric: a.metric, complete: gym.complete, items });
}
