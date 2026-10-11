import React from 'react';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { useWorkContext, ContextFollowups, ContextFollowupsButton } from '../workspace/contextCard.jsx';
import { label, STATUS_TONE, BUCKET_TONE } from './labels.js';

/**
 * The customer's productions beside a chat or a customer record: stage, current cut, next shoot,
 * balance (managers) and open follow-ups, each opening the same record in Productions.
 */
export function MediaContext({ s, conversationId, contactId }) {
  const ctx = useWorkContext({ packId: 'media', operation: 'media_context', conversationId, contactId });
  if (!ctx) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { hb, go } = ctx, { h } = hb;
  return <section className="hb-deal-context" aria-label={tr('Productions with this customer', 'إنتاجات هذا العميل')}>
    {ctx.items.map(p => <article key={p.id} className="hb-deal-context-card" data-tone={STATUS_TONE[p.status]}>
      <div className="hb-status-line"><b><bdi>{p.ref} · {p.title}</bdi></b><span className="ld-chip" data-tone={STATUS_TONE[p.status]}>{label('status', p.status, ar)}</span></div>
      <p className="ld-help">
        {p.currentCut ? <>{tr('cut', 'النسخة')} {p.currentCut.label} · {label('cut', p.currentCut.status, ar)}</> : tr('no cut yet', 'لا نسخة بعد')}
        {p.shootStartsAt && p.shootStartsAt > Date.now() ? <> · {tr('shoot', 'تصوير')} {formatDateTime(p.shootStartsAt, s.lang, hb.timezone)}</> : p.deliveryDueAt ? <> · {tr('due', 'التسليم')} {formatDate(p.deliveryDueAt, s.lang, hb.timezone)}</> : null}
        {p.money?.balanceMinor ? <> · {tr('owes', 'متبقٍ')} <Money h={h} minor={p.money.balanceMinor} /></> : null}
        {p.blocker ? <> · <b>{label('blocker', p.blocker, ar)}</b></> : null}
      </p>
      <ContextFollowups followups={p.followups} kindLabel={f => f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar)} bucketLabel={b => label('bucket', b, ar)} tones={BUCKET_TONE} />
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => go({ view: 'board', production: p.id })}>{tr('Open production', 'فتح الإنتاج')}</button>
        <ContextFollowupsButton ar={ar} count={p.openFollowups} onOpen={() => go({ view: 'followups', production: p.id })} />
      </div>
    </article>)}
  </section>;
}
