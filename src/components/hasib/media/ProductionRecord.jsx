import React from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { formatDate, formatDateTime, localInputValue } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { deliverablesLine, PREP_KEYS } from '../../../lib/hasib/mediaWork.js';
import { label, STATUS_TONE, BUCKET_TONE } from './labels.js';

const EVENT_TEXT = {
  created: ['Brief created', 'أُنشئ الموجز'], quote_issued: ['Quote issued', 'صدر عرض السعر'], quote_accepted: ['Quote accepted', 'قُبل العرض'], payment_recorded: ['Payment recorded', 'سُجلت دفعة'],
  status: ['Stage changed', 'تغيرت المرحلة'], prep_verified: ['Preparation verified', 'تم التحقق من بند تحضير'], prep_reopened: ['Preparation reopened', 'أُعيد فتح بند تحضير'], shoot_completed: ['Shoot recorded', 'سُجل التصوير'],
  cut_submitted: ['Cut sent for review', 'أُرسلت نسخة للمراجعة'], cut_approved: ['Cut approved', 'اعتُمدت النسخة'], changes_requested: ['Changes requested', 'طُلبت تعديلات'], extra_scope: ['Extra scope raised', 'طُرح نطاق إضافي'],
  change_approved: ['Extra scope approved', 'اعتُمد النطاق الإضافي'], change_waived: ['Extra scope waived', 'أُعفي النطاق الإضافي'], change_declined: ['Extra scope declined', 'رُفض النطاق الإضافي'],
  delivered: ['Delivered', 'سُلّم'], costs_final: ['Costs confirmed', 'أُكدت التكاليف'], costs_reopened: ['Costs reopened', 'أُعيد فتح التكاليف'],
};

/** Form values for editing a brief, from the saved production. */
export function briefValues(p, timezone) {
  const local = ms => ms ? localInputValue(ms, timezone) : '';
  const d = p.deliverables?.[0] || {};
  return { productionId: p.id, version: p.version, locked: p.acceptedQuoteVersion !== undefined, title: p.title, productionType: p.productionType, purpose: p.purpose || '',
    format: d.format || 'video', quantity: d.quantity || 1, durationSeconds: d.durationSeconds || '', language: d.language || 'ar',
    shootStartsAt: local(p.shootStartsAt), shootEndsAt: local(p.shootEndsAt), location: p.location || '', deliveryDueAt: local(p.deliveryDueAt), firstCutDueAt: local(p.firstCutDueAt),
    revisionAllowance: p.revisionAllowance, producerId: p.producerId || '', channels: p.usageRights?.channels || [], clearance: p.usageRights?.clearance || 'unknown',
    territory: p.usageRights?.territory || '', termEndsAt: p.usageRights?.termEndsAt ? localInputValue(p.usageRights.termEndsAt, timezone).slice(0, 10) : '', nextAction: p.nextAction || '' };
}

/**
 * One production's full record, read by its id: the brief and money, holds, cuts with exact-version
 * decisions, revisions and change orders, costs (managers), follow-ups and activity.
 */
export function ProductionRecord({ productionId, ar, h, s, timezone, manager, busy, version, backLabel, producers, act, openForm, onGo, onClose, onFollowups }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const state = usePolling(async () => {
    const [p, followups] = await Promise.all([hasib('media_production', { productionId }), hasib('media_followups', { productionId })]);
    return { p, followups: followups.items };
  }, [productionId, version], { interval: 30000 });
  if (state.loading && !state.data) return <p className="ld-state" role="status">{s.t('loading')}</p>;
  if (state.error && !state.data) return <div className="ld-state" role="alert"><p>{h.reason(state.error.reason) || s.reason(state.error.reason)}</p>
    <button type="button" className="ld-button" onClick={onClose}>{backLabel}</button></div>;
  const { p, followups } = state.data;
  const actHere = (operation, body, after, question) => act(operation, body, () => { state.refresh({ quiet: true }); after?.(); }, question);
  const v = { productionId: p.id, version: p.version, subject: `${p.ref} · ${p.title}` };
  const cut = p.cuts?.find(c => c.status === 'in_review');
  const live = !['delivered', 'closed', 'cancelled'].includes(p.status);
  const approvedChanges = (p.changeOrders || []).filter(c => c.status === 'approved');
  const move = (status, question) => actHere('media_production_status', { productionId: p.id, version: p.version, status }, null, question);
  const openFollowups = followups.filter(f => f.bucket !== 'completed');
  const step = {
    brief_incomplete: <>{manager && <button type="button" className="ld-button ld-primary" onClick={() => openForm('quote', { ...v, quote: p.quoteMinor ? p.quoteMinor / 1000 : '' })}>{tr('Issue the quote', 'إصدار عرض السعر')}</button>}</>,
    quoted: <><button type="button" className="ld-button ld-primary" disabled={busy} onClick={() => move('awaiting_acceptance')}>{tr('Mark as presented to the client', 'تسجيل عرضه على العميل')}</button>
      {manager && <button type="button" className="ld-button" onClick={() => openForm('quote', { ...v, quote: p.quoteMinor / 1000, deposit: p.depositMinor / 1000 })}>{tr('Revise the quote', 'تعديل العرض')}</button>}</>,
    awaiting_acceptance: <>{manager && p.acceptedQuoteVersion === undefined && <button type="button" className="ld-button ld-primary" onClick={() => openForm('accept', { ...v, quoteVersion: p.quoteVersion })}>{tr('Record acceptance', 'تسجيل القبول')}</button>}
      {manager && p.acceptedQuoteVersion !== undefined && !p.money?.depositMet && <button type="button" className="ld-button ld-primary" onClick={() => openForm('payment', { ...v, amount: (p.money.depositMinor - p.money.paidMinor) / 1000, method: 'bank_transfer' })}>{tr('Record the deposit', 'تسجيل الدفعة المقدمة')}</button>}
      <button type="button" className="ld-button" disabled={busy} onClick={() => move('booked', tr('Book this production? Its holds become the booking.', 'حجز هذا الإنتاج؟ تصبح حجوزاته هي الحجز.'))}>{tr('Book', 'حجز')}</button></>,
    booked: <button type="button" className="ld-button ld-primary" disabled={busy} onClick={() => move('preproduction')}>{tr('Start preproduction', 'بدء ما قبل الإنتاج')}</button>,
    preproduction: <button type="button" className="ld-button ld-primary" disabled={busy} onClick={() => move('shooting')}>{tr('Start the shoot', 'بدء التصوير')}</button>,
    shooting: <button type="button" className="ld-button ld-primary" disabled={busy} onClick={() => actHere('media_shoot_complete', { productionId: p.id, version: p.version, media: { mediaReceived: true } }, null,
      tr('Record that the shoot is done and the footage has been received?', 'تسجيل انتهاء التصوير واستلام المادة المصورة؟'))}>{tr('Record shoot done and footage received', 'تسجيل انتهاء التصوير واستلام المادة')}</button>,
    editing: <button type="button" className="ld-button ld-primary" onClick={() => openForm('cut', { ...v, label: `v${(p.cuts?.[0]?.revision || 0) + 1}`, approverName: p.cuts?.[0]?.approverName || '' })}>{tr('Send a cut for review', 'إرسال نسخة للمراجعة')}</button>,
    review: <>{cut && <button type="button" className="ld-button ld-primary" onClick={() => openForm('decision', { cutId: cut.id, version: cut.version, subject: `${p.ref} · ${cut.label}`, approverName: cut.approverName, decision: 'approved', roundsLeft: Math.max(0, p.revisionAllowance - p.roundsUsed) })}>{tr('Record the client’s decision', 'تسجيل قرار العميل')}</button>}
      <button type="button" className="ld-button" onClick={() => openForm('cut', { ...v, label: `v${(p.cuts?.[0]?.revision || 0) + 1}`, approverName: cut?.approverName || '' })}>{tr('Replace with a new cut', 'استبدال بنسخة جديدة')}</button></>,
    accepted: <button type="button" className="ld-button ld-primary" onClick={() => openForm('handoff', v)}>{tr('Final handoff', 'التسليم النهائي')}</button>,
    delivered: <><button type="button" className="ld-button" disabled={busy} onClick={() => move('closed')}>{tr('Close', 'إغلاق')}</button></>,
    on_hold: <button type="button" className="ld-button ld-primary" disabled={busy} onClick={() => move(p.holdFrom)}>{tr('Resume', 'استئناف')} · {label('status', p.holdFrom, ar)}</button>,
  }[p.status];
  return <section className="hb-panel hb-deal-detail hb-production-record" aria-labelledby="md-record-title">
    <div className="hb-status-line">
      <h2 id="md-record-title"><bdi>{p.ref} · {p.title}</bdi></h2>
      <span className="ld-chip" data-tone={STATUS_TONE[p.status]}>{label('status', p.status, ar)}</span>
      <button type="button" className="ld-button ld-quiet" onClick={onClose}>{backLabel}</button>
    </div>
    {p.blocker && <p className="hb-blocker-line" data-blocker={p.blocker}><b>{tr('Blocking the next step', 'يعيق الخطوة التالية')}:</b> {label('blocker', p.blocker, ar)}</p>}
    <nav className="hb-record-nav" aria-label={tr('Sections of this production', 'أقسام هذا الإنتاج')}>
      <a href="#md-overview">{tr('Overview', 'نظرة عامة')}</a><a href="#md-holds">{tr('Holds', 'الحجوزات')}</a><a href="#md-cuts">{tr('Cuts & feedback', 'النسخ والملاحظات')}</a>
      <a href="#md-revisions">{tr('Revisions & costs', 'التعديلات والتكاليف')}</a><a href="#md-followups">{tr('Follow-ups', 'المتابعات')} <span className="ld-num">{openFollowups.length}</span></a><a href="#md-activity">{tr('Activity', 'النشاط')}</a>
    </nav>

    <h3 id="md-overview">{tr('Overview', 'نظرة عامة')}</h3>
    <dl className="hb-deal-facts">
      <div><dt>{tr('Client', 'العميل')}</dt><dd><bdi>{p.contactName || '—'}</bdi></dd></div>
      <div><dt>{tr('Type', 'النوع')}</dt><dd>{label('type', p.productionType, ar)}</dd></div>
      <div><dt>{tr('Deliverables', 'المخرجات')}</dt><dd>{deliverablesLine(p.deliverables, f => label('format', f, ar)) || '—'}</dd></div>
      {p.purpose && <div><dt>{tr('Purpose', 'الغرض')}</dt><dd>{p.purpose}</dd></div>}
      {p.dateNeeded && <div><dt>{tr('Client said', 'قال العميل')}</dt><dd>{p.dateNeeded}</dd></div>}
      <div><dt>{tr('Shoot', 'التصوير')}</dt><dd>{p.shootStartsAt ? `${formatDateTime(p.shootStartsAt, s.lang, timezone)} – ${formatDateTime(p.shootEndsAt, s.lang, timezone)}` : '—'}{p.location ? ` · ${p.location}` : ''}</dd></div>
      <div><dt>{tr('Delivery due', 'موعد التسليم')}</dt><dd>{p.deliveryDueAt ? formatDate(p.deliveryDueAt, s.lang, timezone) : '—'}{p.originalDueAt && p.originalDueAt !== p.deliveryDueAt ? ` (${tr('originally', 'أصلاً')} ${formatDate(p.originalDueAt, s.lang, timezone)})` : ''}</dd></div>
      <div><dt>{tr('Producer', 'المنتج')}</dt><dd>{producers.get(String(p.producerId)) || tr('Unassigned', 'غير مُسند')}</dd></div>
      <div><dt>{tr('Usage rights', 'حقوق الاستخدام')}</dt><dd>{p.usageRights.channels.length ? `${p.usageRights.channels.map(c => label('channel', c, ar)).join('، ')}${p.usageRights.territory ? ` · ${p.usageRights.territory}` : ''} · ${label('clearance', p.usageRights.clearance, ar)}` : tr('No public usage set', 'لا استخدام عام محدد')}</dd></div>
      {p.budgetMinor ? <div><dt>{tr('Client budget', 'ميزانية العميل')}</dt><dd><Money h={h} minor={p.budgetMinor} /></dd></div> : null}
      {p.money && <>
        <div><dt>{tr('Quote', 'العرض')}</dt><dd>{p.quoteMinor ? <><Money h={h} minor={p.quoteMinor} /> · v{p.quoteVersion}{p.acceptedQuoteVersion !== undefined ? ` · ${tr('accepted by', 'قبله')} ${p.acceptedBy}` : ''}</> : tr('Not quoted yet', 'لم يُسعّر بعد')}</dd></div>
        <div><dt>{tr('Deposit', 'الدفعة المقدمة')}</dt><dd>{p.depositMinor ? <><Money h={h} minor={p.depositMinor} /> · {p.money.depositMet ? tr('received', 'مستلمة') : tr('not received', 'غير مستلمة')}</> : '—'}</dd></div>
        <div><dt>{tr('Paid / balance', 'المدفوع / المتبقي')}</dt><dd><Money h={h} minor={p.money.paidMinor} /> / <Money h={h} minor={p.money.balanceMinor} /></dd></div>
      </>}
      {p.handoff && <div><dt>{tr('Handoff', 'التسليم')}</dt><dd><a href={p.handoff.link} target="_blank" rel="noreferrer noopener">{tr('Final link', 'الرابط النهائي')}</a> · {formatDateTime(p.handoff.at, s.lang, timezone)}</dd></div>}
      {p.cancelReason && <div><dt>{tr('Cancelled because', 'سبب الإلغاء')}</dt><dd>{p.cancelReason}</dd></div>}
    </dl>
    <div className="ld-actions">
      {step}
      {live && <button type="button" className="ld-button" onClick={() => openForm('brief', briefValues(p, timezone))}>{tr('Edit brief', 'تعديل الموجز')}</button>}
      {manager && p.orderId && p.money?.balanceMinor > 0 && p.status !== 'awaiting_acceptance' && <button type="button" className="ld-button" onClick={() => openForm('payment', { ...v, amount: p.money.balanceMinor / 1000, method: 'bank_transfer', changeOrders: approvedChanges })}>{tr('Record payment', 'تسجيل دفعة')}</button>}
      {p.conversationId && <button type="button" className="ld-button" onClick={() => onGo('chats', { chat: p.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
      {live && p.status !== 'on_hold' && <button type="button" className="ld-button ld-quiet" disabled={busy} onClick={() => move('on_hold', tr('Put this production on hold?', 'إيقاف هذا الإنتاج مؤقتاً؟'))}>{tr('Put on hold', 'إيقاف مؤقت')}</button>}
      {live && <button type="button" className="ld-button ld-danger" onClick={() => openForm('cancel', v)}>{tr('Cancel production', 'إلغاء الإنتاج')}</button>}
    </div>

    {['booked', 'preproduction', 'awaiting_acceptance', 'shooting'].includes(p.status) && <><h4>{tr('Preparation checklist', 'قائمة التحضير')}</h4>
      <ul className="hb-prep">{PREP_KEYS.map(key => { const item = p.prep.find(i => i.key === key); if (!item) return null;
        return <li key={key} data-done={item.verifiedAt ? '' : undefined} data-critical={item.critical ? '' : undefined}>
          <label className="ld-check"><input type="checkbox" checked={!!item.verifiedAt} disabled={busy} onChange={e => actHere('media_prep_verify', { productionId: p.id, version: p.version, media: { key, verified: e.target.checked } })} />
            {' '}{label('prep', key, ar)}{item.critical ? <b className="hb-critical"> · {tr('critical', 'حرج')}</b> : null}{item.clientInput ? <span className="ld-help"> · {tr('from the client', 'من العميل')}</span> : null}</label>
          {item.verifiedAt && <small className="ld-help">{formatDateTime(item.verifiedAt, s.lang, timezone)}</small>}</li>; })}</ul></>}

    <h3 id="md-holds">{tr('Crew and equipment holds', 'حجوزات الطاقم والمعدات')}</h3>
    {(p.reservations || []).length ? <ul className="hb-re-list">{p.reservations.map(r => <li key={r.id} data-hold={r.status}>
      <b><bdi>{r.resourceName}</bdi></b> · {label('category', r.resourceCategory, ar)} · {formatDateTime(r.startsAt, s.lang, timezone)} – {formatDateTime(r.endsAt, s.lang, timezone)}
      {' '}<span className="ld-chip" data-tone={r.status === 'confirmed' ? 'green' : r.status === 'held' ? 'yellow' : undefined}>{label('hold', r.status, ar)}</span>
      {r.status === 'held' && r.holdExpiresAt && <small className="ld-help"> · {tr('expires', 'ينتهي')} {formatDateTime(r.holdExpiresAt, s.lang, timezone)}</small>}
      <span className="ld-actions">
        {live && r.status === 'held' && <button type="button" className="ld-button" disabled={busy} onClick={() => actHere('media_reservation_status', { reservationId: r.id, version: r.version, status: 'confirmed' })}>{tr('Confirm', 'تأكيد')}</button>}
        {live && ['held', 'confirmed'].includes(r.status) && <button type="button" className="ld-button ld-quiet" disabled={busy} onClick={() => actHere('media_reservation_status', { reservationId: r.id, version: r.version, status: 'released' }, null, tr('Release this hold?', 'تحرير هذا الحجز؟'))}>{tr('Release', 'تحرير')}</button>}
      </span></li>)}</ul> : <p className="ld-help">{tr('No crew or equipment held yet.', 'لم يُحجز طاقم أو معدات بعد.')}</p>}
    {live && p.status !== 'accepted' && <button type="button" className="ld-button" onClick={() => openForm('hold', { ...v, startsAt: p.shootStartsAt ? localInputValue(p.shootStartsAt, timezone) : '', endsAt: p.shootEndsAt ? localInputValue(p.shootEndsAt, timezone) : '' })}>{tr('Hold crew or equipment', 'حجز طاقم أو معدات')}</button>}

    <h3 id="md-cuts">{tr('Cuts and feedback', 'النسخ والملاحظات')}</h3>
    {(p.cuts || []).length ? <ol className="hb-cuts">{p.cuts.map(c => <li key={c.id} data-cut={c.status}>
      <div className="hb-status-line"><b>{c.label}</b><span className="ld-chip" data-tone={c.status === 'approved' ? 'green' : c.status === 'in_review' ? 'orange' : c.status === 'changes_requested' ? 'yellow' : undefined}>{label('cut', c.status, ar)}</span></div>
      <p className="ld-help">{tr('Sent', 'أُرسلت')} {formatDateTime(c.submittedAt, s.lang, timezone)} · {tr('approver', 'المعتمد')} <bdi>{c.approverName}</bdi>
        {c.status === 'in_review' ? <> · {tr('decision due', 'موعد القرار')} {formatDateTime(c.decisionDueAt, s.lang, timezone)}</> : c.decisionAt ? <> · {tr('decided', 'حُسمت')} {formatDateTime(c.decisionAt, s.lang, timezone)}</> : null}
        {' · '}<a href={c.assetRef} target="_blank" rel="noreferrer noopener">{tr('Review link', 'رابط المراجعة')}</a></p>
      {c.feedback && <blockquote className="hb-draft-text" dir="auto">{c.feedback}</blockquote>}
    </li>)}</ol> : <p className="ld-help">{tr('No cut has been sent yet.', 'لم تُرسل أي نسخة بعد.')}</p>}

    <h3 id="md-revisions">{tr('Revisions and costs', 'التعديلات والتكاليف')}</h3>
    <p><b className="ld-num">{p.roundsUsed}</b> {tr(`of ${p.revisionAllowance} included revision rounds used`, `من ${p.revisionAllowance} جولات تعديل مشمولة مستخدمة`)}{p.roundsUsed > p.revisionAllowance ? <b className="hb-warn"> · {tr('over the allowance', 'تجاوز المشمول')}</b> : null}</p>
    {(p.changeOrders || []).length ? <ul className="hb-re-list">{p.changeOrders.map(c => <li key={c.id} data-change={c.status}>
      <b>{label('changeKind', c.kind, ar)}</b> · {c.description}{c.priceMinor !== undefined ? <> · <Money h={h} minor={c.priceMinor} /></> : null}
      {' '}<span className="ld-chip" data-tone={c.status === 'proposed' ? 'yellow' : c.status === 'approved' ? 'green' : undefined}>{label('change', c.status, ar)}</span>
      {manager && c.status === 'proposed' && <span className="ld-actions"><button type="button" className="ld-button" onClick={() => openForm('change_decide', { changeOrderId: c.id, version: c.version, subject: c.description, decision: 'approved' })}>{tr('Decide', 'اتخاذ القرار')}</button></span>}
    </li>)}</ul> : null}
    {live && p.acceptedQuoteVersion !== undefined && <button type="button" className="ld-button" onClick={() => openForm('change', { ...v, kind: 'new_deliverable', format: 'video', quantity: 1 })}>{tr('Propose extra scope', 'اقتراح نطاق إضافي')}</button>}
    {manager && <>
      <h4>{tr('Direct costs', 'التكاليف المباشرة')}</h4>
      {(p.costs || []).length ? <div className="ld-table-wrap"><table className="ld-table">
        <thead><tr><th>{tr('Cost', 'التكلفة')}</th><th>{tr('Amount', 'المبلغ')}</th><th>{tr('Kind', 'النوع')}</th><th><span className="ld-visually-hidden">{tr('Action', 'إجراء')}</span></th></tr></thead>
        <tbody>{p.costs.map(c => <tr key={c.id} data-voided={c.voidedAt ? 'yes' : 'no'}>
          <td data-label={tr('Cost', 'التكلفة')}>{label('cost', c.category, ar)} · <bdi>{c.label}</bdi>{c.extraScope ? <b className="hb-warn"> · {tr('extra scope', 'نطاق إضافي')}</b> : null}</td>
          <td data-label={tr('Amount', 'المبلغ')}>{c.voidedAt ? <s><Money h={h} minor={c.amountMinor} /></s> : <Money h={h} minor={c.amountMinor} />}</td>
          <td data-label={tr('Kind', 'النوع')}>{c.voidedAt ? tr('Voided', 'ملغاة') : label('note', c.kind, ar)}</td>
          <td data-label={tr('Action', 'إجراء')}>{!c.voidedAt && <button type="button" className="ld-button ld-quiet" disabled={busy} onClick={() => actHere('media_cost_void', { costId: c.id }, null, tr('Void this cost? It stays on the record but leaves every total.', 'إلغاء هذه التكلفة؟ تبقى في السجل لكن تخرج من كل الإجماليات.'))}>{tr('Void', 'إلغاء')}</button>}</td>
        </tr>)}</tbody></table></div> : <p className="ld-help">{tr('No costs recorded yet.', 'لم تُسجل تكاليف بعد.')}</p>}
      <p>{tr('Contribution so far', 'المساهمة حتى الآن')}: <Money h={h} minor={p.money.revenueNetMinor - p.money.actualCostMinor} /> <small className="ld-help">({tr('net revenue', 'الإيراد الصافي')} <Money h={h} minor={p.money.revenueNetMinor} /> − {tr('actual costs', 'التكاليف الفعلية')} <Money h={h} minor={p.money.actualCostMinor} />)</small>
        {' '}<span className="ld-chip" data-tone={p.costsFinal ? 'green' : 'yellow'}>{p.costsFinal ? tr('Costs confirmed', 'التكاليف مؤكدة') : tr('Costs not confirmed', 'التكاليف غير مؤكدة')}</span></p>
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => openForm('cost', { ...v, category: 'crew_time', costKind: 'actual', changeOrders: p.changeOrders || [] })}>{tr('Record a cost', 'تسجيل تكلفة')}</button>
        <button type="button" className="ld-button ld-quiet" disabled={busy} onClick={() => actHere('media_costs_final', { productionId: p.id, version: p.version, media: { final: !p.costsFinal } })}>{p.costsFinal ? tr('Reopen costs', 'إعادة فتح التكاليف') : tr('Confirm costs are complete', 'تأكيد اكتمال التكاليف')}</button>
      </div>
    </>}

    <h3 id="md-followups">{tr('Follow-ups', 'المتابعات')}</h3>
    {openFollowups.length ? <ul className="hb-re-list">{openFollowups.map(f => <li key={`${f.source}:${f.id}`} data-bucket={f.bucket}>
      {f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar)} · <span className="ld-chip" data-tone={BUCKET_TONE[f.bucket]}>{label('bucket', f.bucket, ar)}</span> · {formatDateTime(f.dueAt, s.lang, timezone)}</li>)}</ul>
      : <p className="ld-help">{tr('Nothing open for this production.', 'لا شيء مفتوح لهذا الإنتاج.')}</p>}
    <div className="ld-actions">
      <button type="button" className="ld-button" onClick={onFollowups}>{tr('Open in Follow-ups', 'فتح في المتابعات')}</button>
      <button type="button" className="ld-button ld-quiet" onClick={() => openForm('followup', { ...v, contactId: p.contactId })}>{tr('Add a dated follow-up', 'إضافة متابعة بموعد')}</button>
      {p.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => openForm('draft', v)}>{tr('Draft a message', 'مسودة رسالة')}</button>}
    </div>

    <h3 id="md-activity">{tr('Activity', 'النشاط')}</h3>
    <ol className="hb-re-history">{(p.events || []).map(e => <li key={e.id}><span className="ld-num">{formatDateTime(e.at, s.lang, timezone)}</span> · {(EVENT_TEXT[e.kind] || [e.kind, e.kind])[ar ? 1 : 0]}
      {e.to ? ` → ${label('status', e.to, ar)}` : ''}{e.detail && !/^\d+$/.test(e.detail) ? ` · ${e.detail}` : ''}</li>)}</ol>
  </section>;
}
