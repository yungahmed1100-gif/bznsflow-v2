import React from 'react';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { EmptyState } from '../DashboardVisuals';
import { MEDIA_COLUMNS, MEDIA_MANUAL_NEXT, columnsOf, deliverablesLine } from '../../../lib/hasib/mediaWork.js';
import { label, STATUS_TONE } from './labels.js';

/** The spec's row: production/deliverable, current cut, shoot/delivery date, approval blocker, producer. */
function ProductionCard({ p, ar, s, timezone, producerName, busy, selected, onOpen, onMove }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const next = MEDIA_MANUAL_NEXT[p.status] || [];
  const late = p.deliveryDueAt && p.deliveryDueAt < Date.now() && !['delivered', 'closed', 'cancelled'].includes(p.status);
  return <li className="hb-deal-card hb-production-card" data-selected={selected ? '' : undefined} data-tone={STATUS_TONE[p.status]}>
    <button type="button" className="hb-deal-open" aria-current={selected ? 'true' : undefined} onClick={() => onOpen(p.id)}>
      <small className="ld-num">{p.ref}</small>
      <b><bdi>{p.title}</bdi></b>
      <span><bdi>{p.contactName || tr('Customer', 'عميل')}</bdi>{p.deliverables?.length ? ` · ${deliverablesLine(p.deliverables, f => label('format', f, ar))}` : ''}</span>
    </button>
    <dl className="hb-deal-card-facts">
      <div><dt>{tr('Cut', 'النسخة')}</dt><dd>{p.currentCut ? `${p.currentCut.label} · ${label('cut', p.currentCut.status, ar)}` : tr('None yet', 'لا شيء بعد')}</dd></div>
      <div><dt>{p.shootStartsAt && p.shootStartsAt > Date.now() ? tr('Shoot', 'التصوير') : tr('Delivery', 'التسليم')}</dt>
        <dd className={late ? 'hb-warn' : ''}>{p.shootStartsAt && p.shootStartsAt > Date.now() ? formatDateTime(p.shootStartsAt, s.lang, timezone) : p.deliveryDueAt ? formatDate(p.deliveryDueAt, s.lang, timezone) : '—'}</dd></div>
      {p.blocker && <div><dt>{tr('Blocker', 'العائق')}</dt><dd className="hb-blocker" data-blocker={p.blocker}>{label('blocker', p.blocker, ar)}</dd></div>}
      <div><dt>{tr('Producer', 'المنتج')}</dt><dd>{producerName || tr('Unassigned', 'غير مُسند')}</dd></div>
    </dl>
    {next.length > 0 && <label className="hb-deal-move">{tr('Move to', 'نقل إلى')}
      <select value="" disabled={busy} onChange={e => e.target.value && onMove(p, e.target.value)}>
        <option value="">{tr('Choose a stage…', 'اختر مرحلة…')}</option>
        {next.map(st => <option key={st} value={st}>{label('status', st, ar)}</option>)}
      </select>
    </label>}
  </li>;
}

/** The production stage board. Under 768px the same cards read as one list. */
export function ProductionBoard({ ar, s, timezone, rows, producers, busy, selectedId, emptyFilter, onOpen, onMove, onAdd }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  if (!rows.length) return <EmptyState icon="film" title={emptyFilter ? tr('No productions match this filter', 'لا إنتاجات تطابق هذا التصفية') : tr('No open productions', 'لا توجد إنتاجات مفتوحة')}
    description={tr('Briefs from Layla’s chats appear here, or add one yourself.', 'تظهر هنا الموجزات من محادثات ليلى، أو أضف موجزاً بنفسك.')} action={{ label: tr('New production brief', 'موجز إنتاج جديد'), onClick: onAdd }} />;
  const columns = columnsOf(rows);
  return <div className="hb-board hb-media-board" role="list" aria-label={tr('Productions by stage', 'الإنتاجات حسب المرحلة')} style={{ '--cols': MEDIA_COLUMNS.length }}>
    {MEDIA_COLUMNS.map(([id, , tone]) => <section key={id} className="hb-board-column" role="listitem" data-column={id} data-tone={tone} aria-labelledby={`md-col-${id}`}>
      <h2 id={`md-col-${id}`}><span>{label('column', id, ar)}</span><span className="ld-num" aria-label={tr(`${columns[id].length} productions`, `${columns[id].length} إنتاجات`)}>{columns[id].length}</span></h2>
      {columns[id].length ? <ul className="hb-board-cards">{columns[id].map(p => <ProductionCard key={p.id} p={p} ar={ar} s={s} timezone={timezone} busy={busy}
        producerName={producers.get(String(p.producerId))} selected={selectedId === p.id} onOpen={onOpen} onMove={onMove} />)}</ul>
        : <p className="ld-help">{tr('None', 'لا شيء')}</p>}
    </section>)}
  </div>;
}

/** Delivered, closed, held or cancelled productions as a plain list. */
export function ClosedList({ ar, s, timezone, rows, h, onOpen }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  if (!rows.length) return <p className="ld-help">{tr('Nothing here.', 'لا شيء هنا.')}</p>;
  return <ul className="hb-re-deals">{rows.map(p => <li key={p.id} className="hb-panel">
    <div className="hb-status-line"><b><bdi>{p.ref} · {p.title}</bdi></b><span className="ld-chip" data-tone={STATUS_TONE[p.status]}>{label('status', p.status, ar)}</span></div>
    <p><bdi>{p.contactName || tr('Customer', 'عميل')}</bdi>{p.deliveredAt ? ` · ${tr('delivered', 'سُلّم')} ${formatDate(p.deliveredAt, s.lang, timezone)}` : ''}{p.cancelReason ? ` · ${p.cancelReason}` : ''}
      {p.money?.balanceMinor ? <> · {tr('owes', 'متبقٍ')} <Money h={h} minor={p.money.balanceMinor} /></> : null}</p>
    <button type="button" className="ld-button" onClick={() => onOpen(p.id)}>{tr('Open production', 'فتح الإنتاج')}</button></li>)}</ul>;
}

/** The production beside the board on wide screens, with the way into the full record. */
export function ProductionPreview({ p, ar, h, s, timezone, producerName, onOpenFull, onClose, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <aside className="hb-panel hb-deal-preview" aria-labelledby="md-preview-title">
    <div className="hb-status-line"><h2 id="md-preview-title"><bdi>{p.ref} · {p.title}</bdi></h2><span className="ld-chip" data-tone={STATUS_TONE[p.status]}>{label('status', p.status, ar)}</span></div>
    <dl className="hb-deal-facts">
      <div><dt>{tr('Customer', 'العميل')}</dt><dd><bdi>{p.contactName || '—'}</bdi></dd></div>
      <div><dt>{tr('Deliverables', 'المخرجات')}</dt><dd>{deliverablesLine(p.deliverables, f => label('format', f, ar)) || '—'}</dd></div>
      <div><dt>{tr('Shoot', 'التصوير')}</dt><dd>{p.shootStartsAt ? `${formatDateTime(p.shootStartsAt, s.lang, timezone)}${p.location ? ` · ${p.location}` : ''}` : '—'}</dd></div>
      <div><dt>{tr('Delivery due', 'موعد التسليم')}</dt><dd>{p.deliveryDueAt ? formatDate(p.deliveryDueAt, s.lang, timezone) : '—'}</dd></div>
      <div><dt>{tr('Current cut', 'النسخة الحالية')}</dt><dd>{p.currentCut ? `${p.currentCut.label} · ${label('cut', p.currentCut.status, ar)}` : '—'}</dd></div>
      <div><dt>{tr('Revisions', 'جولات التعديل')}</dt><dd className="ld-num">{p.roundsUsed} / {p.revisionAllowance}</dd></div>
      <div><dt>{tr('Holds', 'الحجوزات')}</dt><dd>{tr(`${p.holds.confirmed} confirmed, ${p.holds.held} tentative`, `${p.holds.confirmed} مؤكدة، ${p.holds.held} مبدئية`)}</dd></div>
      {p.blocker && <div><dt>{tr('Blocker', 'العائق')}</dt><dd>{label('blocker', p.blocker, ar)}</dd></div>}
      <div><dt>{tr('Producer', 'المنتج')}</dt><dd>{producerName || tr('Unassigned', 'غير مُسند')}</dd></div>
      {p.money && <div><dt>{tr('Balance', 'الرصيد')}</dt><dd><Money h={h} minor={p.money.balanceMinor} /></dd></div>}
    </dl>
    <div className="ld-actions">
      <button type="button" className="ld-button ld-primary" onClick={() => onOpenFull(p.id)}>{tr('Open full record', 'فتح السجل الكامل')}</button>
      {p.conversationId && <button type="button" className="ld-button" onClick={() => onGo('chats', { chat: p.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
      <button type="button" className="ld-button ld-quiet" onClick={onClose}>{tr('Close', 'إغلاق')}</button>
    </div>
  </aside>;
}
