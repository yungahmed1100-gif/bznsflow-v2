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
 * The customer's productions beside a chat or a customer record: stage, current cut, next shoot,
 * balance (managers) and open follow-ups, each opening the same record in Productions.
 */
export function MediaContext({ s, conversationId, contactId }) {
  const hb = useHasib();
  const [params, setParams] = useSearchParams();
  const enabled = hb?.overview?.pack?.id === 'media' && !hb.overview.readOnly && !!(conversationId || contactId);
  const state = usePolling(() => hasib('media_context', conversationId ? { conversationId } : { contactId }), [conversationId, contactId], { interval: 30000, enabled });
  if (!enabled || !state.data?.items?.length) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { h } = hb;
  const from = conversationId ? { from: 'chat', chat: conversationId } : { from: 'customers' };
  const open = p => setParams(dashboardSearch(params, 'work', { view: 'board', production: p.id, ...from }));
  return <section className="hb-deal-context" aria-label={tr('Productions with this customer', 'إنتاجات هذا العميل')}>
    {state.data.items.map(p => <article key={p.id} className="hb-deal-context-card" data-tone={STATUS_TONE[p.status]}>
      <div className="hb-status-line"><b><bdi>{p.ref} · {p.title}</bdi></b><span className="ld-chip" data-tone={STATUS_TONE[p.status]}>{label('status', p.status, ar)}</span></div>
      <p className="ld-help">
        {p.currentCut ? <>{tr('cut', 'النسخة')} {p.currentCut.label} · {label('cut', p.currentCut.status, ar)}</> : tr('no cut yet', 'لا نسخة بعد')}
        {p.shootStartsAt && p.shootStartsAt > Date.now() ? <> · {tr('shoot', 'تصوير')} {formatDateTime(p.shootStartsAt, s.lang, hb.timezone)}</> : p.deliveryDueAt ? <> · {tr('due', 'التسليم')} {formatDate(p.deliveryDueAt, s.lang, hb.timezone)}</> : null}
        {p.money?.balanceMinor ? <> · {tr('owes', 'متبقٍ')} <Money h={h} minor={p.money.balanceMinor} /></> : null}
        {p.blocker ? <> · <b>{label('blocker', p.blocker, ar)}</b></> : null}
      </p>
      {p.followups.length > 0 && <ul className="hb-deal-context-followups">{p.followups.map(f => <li key={`${f.source}:${f.id}`} data-bucket={f.bucket}>
        {f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar)} · <span data-tone={BUCKET_TONE[f.bucket]}>{label('bucket', f.bucket, ar)}</span></li>)}</ul>}
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => open(p)}>{tr('Open production', 'فتح الإنتاج')}</button>
        {p.openFollowups > 0 && <button type="button" className="ld-button ld-quiet" onClick={() => setParams(dashboardSearch(params, 'work', { view: 'followups', production: p.id, ...from }))}>
          {tr(`Follow-ups (${p.openFollowups})`, `المتابعات (${p.openFollowups})`)}</button>}
      </div>
    </article>)}
  </section>;
}
