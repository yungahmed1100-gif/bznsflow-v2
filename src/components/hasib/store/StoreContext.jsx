import React from 'react';
import { Money } from '../Badges';
import { useWorkContext, ContextFollowups, ContextFollowupsButton } from '../workspace/contextCard.jsx';
import { label, BUCKET_TONE } from './labels.js';

const TONE = { pending: 'yellow', ready: 'green', diagnosing: 'orange', waiting_parts: 'orange', repairing: 'blue', confirmed: 'blue' };

/** The customer's open orders and repairs beside a chat or a customer record, with their open follow-ups. */
export function StoreContext({ s, packId, conversationId, contactId }) {
  const ctx = useWorkContext({ packId, operation: 'store_context', conversationId, contactId });
  if (!ctx) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { hb, go } = ctx, { h } = hb, tech = packId === 'retail-tech';
  return <section className="hb-deal-context" aria-label={tr('Open orders and repairs', 'الطلبات والصيانة المفتوحة')}>
    {ctx.items.map(x => <article key={x.id} className="hb-deal-context-card" data-tone={TONE[x.status]}>
      <div className="hb-status-line"><b><bdi>{x.type === 'repair' ? tr('Repair', 'صيانة') : tr('Order', 'طلب')} {x.ref}{x.title ? ` · ${x.title}` : ''}</bdi></b><span className="ld-chip" data-tone={TONE[x.status]}>{label('status', x.status, ar)}</span></div>
      {(Number.isInteger(x.totalMinor) || x.type === 'repair') && <p className="ld-help">
        {Number.isInteger(x.totalMinor) ? <Money h={h} minor={x.totalMinor} /> : null}
        {x.type === 'repair' ? (x.approvalStatus === 'approved' ? tr('quote approved', 'العرض معتمد') : tr('quote awaiting approval', 'العرض بانتظار الموافقة')) : null}
      </p>}
      <ContextFollowups followups={x.followups} kindLabel={f => label('task', f.kind, ar)} bucketLabel={b => label('bucket', b, ar)} tones={BUCKET_TONE} />
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => go(x.type === 'repair' ? { view: 'repairs', repair: x.id } : { view: tech ? 'sales' : 'orders', order: x.id })}>{x.type === 'repair' ? tr('Open repair', 'فتح الصيانة') : tr('Open order', 'فتح الطلب')}</button>
        <ContextFollowupsButton ar={ar} count={x.openFollowups} onOpen={() => go({ view: 'followups' })} />
      </div>
    </article>)}
  </section>;
}
