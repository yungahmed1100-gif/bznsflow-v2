import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { formatDateTime } from '../../../lib/dashboard/format';
import { dashboardSearch } from '../../../lib/dashboard/navigation';
import { Money } from '../Badges';
import { useHasib } from '../HasibContext';
import { label } from './labels.js';

/**
 * The customer's deals beside a chat or a customer record: stage, next viewing, latest offer and
 * message, and open follow-ups, each opening the same record in Deals. Real Estate only.
 */
export function DealContext({ s, conversationId, contactId }) {
  const hb = useHasib();
  const [params, setParams] = useSearchParams();
  const enabled = hb?.overview?.pack?.id === 'real-estate' && !hb.overview.readOnly && !!(conversationId || contactId);
  const state = usePolling(() => hasib('real_estate_context', conversationId ? { conversationId } : { contactId }), [conversationId, contactId], { interval: 30000, enabled });
  if (!enabled || !state.data?.items?.length) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { h } = hb;
  const from = conversationId ? { from: 'chat', chat: conversationId } : { from: 'customers' };
  const open = (deal, extra = {}) => setParams(dashboardSearch(params, 'work', { view: 'board', deal: deal.id, ...from, ...extra }));
  return <section className="hb-deal-context" aria-label={tr('Deals with this customer', 'صفقات هذا العميل')}>
    {state.data.items.map(deal => <article key={deal.id} className="hb-deal-context-card" data-stage={deal.stage}>
      <div className="hb-status-line"><b>{label('need', deal.need, ar)} · {deal.areas.join('، ') || tr('area not given', 'المنطقة غير محددة')}</b><span className="ld-chip" data-stage={deal.stage}>{label('stage', deal.stage, ar)}</span></div>
      <p className="ld-help">
        {deal.budgetMaxMinor ? <>{tr('up to', 'حتى')} <Money h={h} minor={deal.budgetMaxMinor} /> · </> : null}
        {deal.nextViewing ? <>{tr('viewing', 'معاينة')} <bdi>{deal.nextViewing.propertyLabel}</bdi> {formatDateTime(deal.nextViewing.scheduledAt, s.lang, hb.timezone)}</> : tr('no viewing booked', 'لا معاينة محجوزة')}
        {deal.latestOffer ? <> · {tr('offer', 'عرض')} {label('offer', deal.latestOffer.status, ar)}</> : null}
        {deal.latestDraft ? <> · {tr('message', 'رسالة')} {label('draft', deal.latestDraft.status, ar)}</> : null}
      </p>
      {deal.followups.length > 0 && <ul className="hb-deal-context-followups">{deal.followups.map(f => <li key={`${f.source}:${f.id}`} data-bucket={f.bucket}>
        {f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar)} · {label('bucket', f.bucket, ar)}</li>)}</ul>}
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => open(deal)}>{tr('Open deal', 'فتح الصفقة')}</button>
        {deal.openFollowups > 0 && <button type="button" className="ld-button ld-quiet" onClick={() => setParams(dashboardSearch(params, 'work', { view: 'followups', deal: deal.id, ...from }))}>
          {tr(`Follow-ups (${deal.openFollowups})`, `المتابعات (${deal.openFollowups})`)}</button>}
      </div>
    </article>)}
  </section>;
}
