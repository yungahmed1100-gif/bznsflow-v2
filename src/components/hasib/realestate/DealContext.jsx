import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { useWorkContext, ContextFollowups, ContextFollowupsButton } from '../workspace/contextCard.jsx';
import { label } from './labels.js';

/**
 * The customer's deals beside a chat or a customer record: stage, next viewing, latest offer and
 * message, and open follow-ups, each opening the same record in Deals. Real Estate only.
 */
export function DealContext({ s, conversationId, contactId }) {
  const ctx = useWorkContext({ packId: 'real-estate', operation: 'real_estate_context', conversationId, contactId });
  if (!ctx) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { hb, go } = ctx, { h } = hb;
  return <section className="hb-deal-context" aria-label={tr('Deals with this customer', 'صفقات هذا العميل')}>
    {ctx.items.map(deal => <article key={deal.id} className="hb-deal-context-card" data-stage={deal.stage}>
      <div className="hb-status-line"><b>{label('need', deal.need, ar)} · {deal.areas.join('، ') || tr('area not given', 'المنطقة غير محددة')}</b><span className="ld-chip" data-stage={deal.stage}>{label('stage', deal.stage, ar)}</span></div>
      <p className="ld-help">
        {deal.budgetMaxMinor ? <>{tr('up to', 'حتى')} <Money h={h} minor={deal.budgetMaxMinor} /> · </> : null}
        {deal.nextViewing ? <>{tr('viewing', 'معاينة')} <bdi>{deal.nextViewing.propertyLabel}</bdi> {formatDateTime(deal.nextViewing.scheduledAt, s.lang, hb.timezone)}</> : tr('no viewing booked', 'لا معاينة محجوزة')}
        {deal.latestOffer ? <> · {tr('offer', 'عرض')} {label('offer', deal.latestOffer.status, ar)}</> : null}
        {deal.latestDraft ? <> · {tr('message', 'رسالة')} {label('draft', deal.latestDraft.status, ar)}</> : null}
      </p>
      <ContextFollowups followups={deal.followups} kindLabel={f => f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar)} bucketLabel={b => label('bucket', b, ar)} />
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => go({ view: 'board', deal: deal.id })}>{tr('Open deal', 'فتح الصفقة')}</button>
        <ContextFollowupsButton ar={ar} count={deal.openFollowups} onOpen={() => go({ view: 'followups', deal: deal.id })} />
      </div>
    </article>)}
  </section>;
}
