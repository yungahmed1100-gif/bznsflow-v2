import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { dashboardSearch } from '../../../lib/dashboard/navigation';
import { Money } from '../Badges';
import { useHasib } from '../HasibContext';
import { label, STATUS_TONE, BUCKET_TONE } from './labels.js';

/**
 * The patient's visits beside a chat or a patient record: next visit, last visit, recall date,
 * balance (managers) and open follow-ups, each opening the same record in Visits.
 */
export function DentalContext({ s, conversationId, contactId }) {
  const hb = useHasib();
  const [params, setParams] = useSearchParams();
  const enabled = hb?.overview?.pack?.id === 'dental' && !hb.overview.readOnly && !!(conversationId || contactId);
  const state = usePolling(() => hasib('dental_context', conversationId ? { conversationId } : { contactId }), [conversationId, contactId], { interval: 30000, enabled });
  if (!enabled || !state.data?.items?.length) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { h } = hb;
  const from = conversationId ? { from: 'chat', chat: conversationId } : { from: 'customers' };
  return <section className="hb-deal-context" aria-label={tr('Visits', 'الزيارات')}>
    {state.data.items.map(p => { const v = p.nextVisit || p.lastVisit; return <article key={p.contactId} className="hb-deal-context-card" data-tone={v ? STATUS_TONE[v.outcome] : 'blue'}>
      <div className="hb-status-line"><b>{p.nextVisit ? tr('Next visit', 'الزيارة القادمة') : p.lastVisit ? tr('Last visit', 'آخر زيارة') : tr('Visit request', 'طلب زيارة')}</b>
        {v && <span className="ld-chip" data-tone={STATUS_TONE[v.outcome]}>{label('status', v.outcome, ar)}</span>}</div>
      <p className="ld-help">
        {v ? <>{formatDateTime(v.startsAt, s.lang, hb.timezone)} · <bdi>{v.providerName}</bdi></> : tr('no visit booked yet', 'لم تُحجز زيارة بعد')}
        {p.recallDueAt ? <> · {tr('recall', 'المراجعة')} {formatDate(p.recallDueAt, s.lang, hb.timezone)}</> : null}
        {p.lastVisit?.money?.balanceMinor ? <> · {tr('owes', 'متبقٍ')} <Money h={h} minor={p.lastVisit.money.balanceMinor} /></> : null}
      </p>
      {p.followups.length > 0 && <ul className="hb-deal-context-followups">{p.followups.map(f => <li key={`${f.source}:${f.id}`} data-bucket={f.bucket}>
        {f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar)} · <span data-tone={BUCKET_TONE[f.bucket]}>{label('bucket', f.bucket, ar)}</span></li>)}</ul>}
      <div className="ld-actions">
        {v && <button type="button" className="ld-button" onClick={() => setParams(dashboardSearch(params, 'work', { view: 'visits', visit: v.id, ...from }))}>{tr('Open visit', 'فتح الزيارة')}</button>}
        {p.openFollowups > 0 && <button type="button" className="ld-button ld-quiet" onClick={() => setParams(dashboardSearch(params, 'work', { view: 'followups', patient: p.contactId, ...from }))}>
          {tr(`Follow-ups (${p.openFollowups})`, `المتابعات (${p.openFollowups})`)}</button>}
      </div>
    </article>; })}
  </section>;
}
