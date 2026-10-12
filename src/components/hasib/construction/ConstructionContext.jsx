import React from 'react';
import { formatDate } from '../../../lib/dashboard/format';
import { useWorkContext, ContextFollowups, ContextFollowupsButton } from '../workspace/contextCard.jsx';
import { label, BUCKET_TONE } from './labels.js';

/** The client's live projects beside a chat or a customer record: stage, forecast finish and open follow-ups. */
export function ConstructionContext({ s, conversationId, contactId }) {
  const ctx = useWorkContext({ packId: 'construction', operation: 'construction_context', conversationId, contactId });
  if (!ctx) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { hb, go } = ctx;
  return <section className="hb-deal-context" aria-label={tr('Projects with this client', 'مشاريع هذا العميل')}>
    {ctx.items.map(p => <article key={p.id} className="hb-deal-context-card">
      <div className="hb-status-line"><b><bdi>{p.ref} · {p.title}</bdi></b><span className="ld-chip">{label('status', p.status, ar)}</span></div>
      <p className="ld-help">{tr('forecast finish', 'الإنجاز المتوقع')} {formatDate(p.forecastFinishAt, s.lang, hb.timezone)}</p>
      <ContextFollowups followups={p.followups} kindLabel={f => label('task', f.kind, ar)} bucketLabel={b => label('bucket', b, ar)} tones={BUCKET_TONE} />
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => go({ view: 'projects' })}>{tr('Open projects', 'فتح المشاريع')}</button>
        <ContextFollowupsButton ar={ar} count={p.openFollowups} onOpen={() => go({ view: 'followups' })} />
      </div>
    </article>)}
  </section>;
}
