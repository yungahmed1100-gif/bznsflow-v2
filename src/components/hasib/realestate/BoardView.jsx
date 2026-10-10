import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { EmptyState } from '../DashboardVisuals';
import { BOARD_STAGES, forwardStages, groupByStage, requirementLine } from '../../../lib/hasib/realEstateWork.js';
import { label } from './labels.js';

/** One deal on the board: who, what they want, the property in play, the agent, the next viewing and step. */
function DealCard({ deal, ar, h, s, timezone, agentName, viewing, busy, selected, onOpen, onMove }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const next = forwardStages(deal.stage);
  return <li className="hb-deal-card" data-selected={selected ? '' : undefined}>
    <button type="button" className="hb-deal-open" aria-current={selected ? 'true' : undefined} onClick={() => onOpen(deal.id)}>
      <b><bdi>{deal.contactName || tr('Customer', 'عميل')}</bdi></b>
      <span>{label('need', deal.need, ar)}{requirementLine(deal, t => label('propertyType', t, ar)) ? ` · ${requirementLine(deal, t => label('propertyType', t, ar))}` : ''}</span>
      <span>{deal.budgetMaxMinor ? <>{tr('up to', 'حتى')} <Money h={h} minor={deal.budgetMaxMinor} /></> : tr('Budget not given', 'الميزانية غير محددة')}</span>
    </button>
    <dl className="hb-deal-card-facts">
      {viewing && <div><dt>{tr('Viewing', 'المعاينة')}</dt><dd className={viewing.scheduledAt < Date.now() ? 'hb-warn' : ''}><bdi>{viewing.propertyLabel}</bdi> · {formatDateTime(viewing.scheduledAt, s.lang, timezone)}</dd></div>}
      <div><dt>{tr('Agent', 'الوكيل')}</dt><dd>{agentName || tr('Unassigned', 'غير مُسندة')}</dd></div>
      <div><dt>{tr('Next step', 'الخطوة التالية')}</dt><dd>{deal.nextAction || tr('Not set', 'غير محددة')}</dd></div>
    </dl>
    {next.length > 0 && <label className="hb-deal-move">{tr('Move to', 'نقل إلى')}
      <select value="" disabled={busy} onChange={e => e.target.value && onMove(deal, e.target.value)}>
        <option value="">{tr('Choose a stage…', 'اختر مرحلة…')}</option>
        {next.map(stage => <option key={stage} value={stage}>{label('stage', stage, ar)}</option>)}
      </select>
    </label>}
  </li>;
}

/** The pipeline board. Columns are the real stages; under 768px the same cards read as one list. */
export function BoardView({ ar, h, s, timezone, deals, viewing, agentNames, busy, selectedId, onOpen, onMove, onAdd, emptyFilter }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  if (!deals.length) return <EmptyState icon="users" title={emptyFilter ? tr('No deals match this filter', 'لا صفقات تطابق هذا التصفية') : tr('No open deals', 'لا توجد صفقات مفتوحة')}
    description={tr('Deals from Layla’s chats appear here, or add an inquiry yourself.', 'تظهر هنا الصفقات من محادثات ليلى، أو أضف استفساراً بنفسك.')} action={{ label: tr('New inquiry', 'استفسار جديد'), onClick: onAdd }} />;
  const columns = groupByStage(deals);
  return <div className="hb-board" role="list" aria-label={tr('Deals by stage', 'الصفقات حسب المرحلة')}>
    {BOARD_STAGES.map(stage => <section key={stage} className="hb-board-column" role="listitem" data-stage={stage} aria-labelledby={`re-col-${stage}`}>
      <h2 id={`re-col-${stage}`}><span>{label('stage', stage, ar)}</span><span className="ld-num" aria-label={tr(`${columns[stage].length} deals`, `${columns[stage].length} صفقات`)}>{columns[stage].length}</span></h2>
      {columns[stage].length ? <ul className="hb-board-cards">{columns[stage].map(deal => <DealCard key={deal.id} deal={deal} ar={ar} h={h} s={s} timezone={timezone} busy={busy}
        agentName={agentNames.get(String(deal.assignedAccountId))} viewing={viewing.get(deal.id)} selected={selectedId === deal.id} onOpen={onOpen} onMove={onMove} />)}</ul>
        : <p className="ld-help">{tr('None', 'لا شيء')}</p>}
    </section>)}
  </div>;
}

/** The deal beside the board on wide screens: the facts that decide the next step, and the way into the full record. */
export function DealPreview({ deal, ar, h, s, timezone, viewing, agentName, onOpenFull, onClose, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <aside className="hb-panel hb-deal-preview" aria-labelledby="re-preview-title">
    <div className="hb-status-line"><h2 id="re-preview-title"><bdi>{deal.contactName || tr('Customer', 'عميل')}</bdi></h2><span className="ld-chip" data-stage={deal.stage}>{label('stage', deal.stage, ar)}</span></div>
    <dl className="hb-deal-facts">
      <div><dt>{tr('Wants to', 'يريد')}</dt><dd>{label('need', deal.need, ar)}</dd></div>
      <div><dt>{tr('Requirement', 'المتطلبات')}</dt><dd>{requirementLine(deal, t => label('propertyType', t, ar)) || '—'}</dd></div>
      <div><dt>{tr('Budget', 'الميزانية')}</dt><dd>{deal.budgetMaxMinor ? <Money h={h} minor={deal.budgetMaxMinor} /> : '—'}</dd></div>
      <div><dt>{tr('Agent', 'الوكيل')}</dt><dd>{agentName || tr('Unassigned', 'غير مُسندة')}</dd></div>
      <div><dt>{tr('Next viewing', 'المعاينة القادمة')}</dt><dd>{viewing ? <><bdi>{viewing.propertyLabel}</bdi> · {formatDateTime(viewing.scheduledAt, s.lang, timezone)}</> : '—'}</dd></div>
      <div><dt>{tr('Next step', 'الخطوة التالية')}</dt><dd>{deal.nextAction || '—'}</dd></div>
      <div><dt>{tr('Source', 'المصدر')}</dt><dd>{label('segmentKey', deal.source, ar)}</dd></div>
    </dl>
    <div className="ld-actions">
      <button type="button" className="ld-button ld-primary" onClick={() => onOpenFull(deal.id)}>{tr('Open full record', 'فتح السجل الكامل')}</button>
      {deal.conversationId && <button type="button" className="ld-button" onClick={() => onGo('chats', { chat: deal.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
      <button type="button" className="ld-button ld-quiet" onClick={onClose}>{tr('Close', 'إغلاق')}</button>
    </div>
  </aside>;
}
