import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { useWorkContext, ContextFollowups, ContextFollowupsButton } from '../workspace/contextCard.jsx';
import { label, BUCKET_TONE } from './labels.js';

const TONE = { awaiting_approval: 'yellow', ready: 'green', quality_check: 'orange', in_progress: 'blue', approved: 'blue' };

/** The customer's vehicles in the workshop beside a chat or a customer record: stage, promise, estimate and open follow-ups. */
export function AutomotiveContext({ s, conversationId, contactId }) {
  const ctx = useWorkContext({ packId: 'automotive', operation: 'automotive_context', conversationId, contactId });
  if (!ctx) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { hb, go } = ctx, { h } = hb;
  return <section className="hb-deal-context" aria-label={tr('Vehicles in the workshop', 'المركبات في الورشة')}>
    {ctx.items.map(w => <article key={w.id} className="hb-deal-context-card" data-tone={TONE[w.status]}>
      <div className="hb-status-line"><b><bdi>{w.ref} · {w.title}</bdi></b><span className="ld-chip" data-tone={TONE[w.status]}>{label('status', w.status, ar)}</span></div>
      <p className="ld-help">
        {w.promisedAt ? <>{tr('promised', 'الموعد')} {formatDateTime(w.promisedAt, s.lang, hb.timezone)}</> : tr('no promised time', 'بلا موعد')}
        {w.estimate ? <> · {tr('estimate', 'عرض السعر')} {w.estimate.number}{Number.isInteger(w.estimate.totalMinor) ? <> · <Money h={h} minor={w.estimate.totalMinor} /></> : null}</> : null}
      </p>
      <ContextFollowups followups={w.followups} kindLabel={f => label('task', f.kind, ar)} bucketLabel={b => label('bucket', b, ar)} tones={BUCKET_TONE} />
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => go({ view: 'board', workorder: w.id })}>{tr('Open work order', 'فتح أمر العمل')}</button>
        <ContextFollowupsButton ar={ar} count={w.openFollowups} onOpen={() => go({ view: 'followups' })} />
      </div>
    </article>)}
  </section>;
}
