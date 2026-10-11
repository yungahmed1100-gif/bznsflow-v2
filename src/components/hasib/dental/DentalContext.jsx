import React from 'react';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { useWorkContext, ContextFollowups, ContextFollowupsButton } from '../workspace/contextCard.jsx';
import { label, STATUS_TONE, BUCKET_TONE } from './labels.js';

/**
 * The patient's visits beside a chat or a patient record: next visit, last visit, recall date,
 * balance (managers) and open follow-ups, each opening the same record in Visits.
 */
export function DentalContext({ s, conversationId, contactId }) {
  const ctx = useWorkContext({ packId: 'dental', operation: 'dental_context', conversationId, contactId });
  if (!ctx) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { hb, go } = ctx, { h } = hb;
  return <section className="hb-deal-context" aria-label={tr('Visits', 'الزيارات')}>
    {ctx.items.map(p => { const v = p.nextVisit || p.lastVisit; return <article key={p.contactId} className="hb-deal-context-card" data-tone={v ? STATUS_TONE[v.outcome] : 'blue'}>
      <div className="hb-status-line"><b>{p.nextVisit ? tr('Next visit', 'الزيارة القادمة') : p.lastVisit ? tr('Last visit', 'آخر زيارة') : tr('Visit request', 'طلب زيارة')}</b>
        {v && <span className="ld-chip" data-tone={STATUS_TONE[v.outcome]}>{label('status', v.outcome, ar)}</span>}</div>
      <p className="ld-help">
        {v ? <>{formatDateTime(v.startsAt, s.lang, hb.timezone)} · <bdi>{v.providerName}</bdi></> : tr('no visit booked yet', 'لم تُحجز زيارة بعد')}
        {p.recallDueAt ? <> · {tr('recall', 'المراجعة')} {formatDate(p.recallDueAt, s.lang, hb.timezone)}</> : null}
        {p.lastVisit?.money?.balanceMinor ? <> · {tr('owes', 'متبقٍ')} <Money h={h} minor={p.lastVisit.money.balanceMinor} /></> : null}
      </p>
      <ContextFollowups followups={p.followups} kindLabel={f => f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar)} bucketLabel={b => label('bucket', b, ar)} tones={BUCKET_TONE} />
      <div className="ld-actions">
        {v && <button type="button" className="ld-button" onClick={() => go({ view: 'visits', visit: v.id })}>{tr('Open visit', 'فتح الزيارة')}</button>}
        <ContextFollowupsButton ar={ar} count={p.openFollowups} onOpen={() => go({ view: 'followups', patient: p.contactId })} />
      </div>
    </article>; })}
  </section>;
}
