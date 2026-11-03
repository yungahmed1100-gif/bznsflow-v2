import React from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { formatLocal } from '../../../lib/timezone.js';
import { Money } from '../Badges';
import { label, activityLabel, defaultChecks, STATUS_TONE, PAYMENT_TONE, MOVES, MOVE_VERB } from './labels.js';

const SECTIONS = [['overview', 'Overview', 'نظرة عامة'], ['visits', 'Visits', 'الزيارات'], ['estimate', 'Estimate', 'التسعيرة'], ['checks', 'Checks', 'الفحوص'], ['money', 'Money', 'المال'],
  ['followups', 'Follow-ups', 'المتابعات'], ['activity', 'Activity', 'النشاط']];
const HOUR = 3600000;

/** Which steps a job offers from its state, for this person. A technician records only their visit's facts. */
function actionsFor(j, { manager, tech }) {
  const visit = j.visits.find(v => ['scheduled', 'arrived'].includes(v.status)), onSite = visit?.status === 'arrived', open = !['completed', 'cancelled'].includes(j.status);
  const sent = j.estimates.find(e => ['issued', 'approved', 'expired'].includes(e.status)), draft = j.estimates.find(e => e.status === 'draft');
  const scope = j.jobType === 'amc_visit' || (sent?.status === 'approved' && sent.number === j.approvedEstimateNumber);
  const moves = (MOVES[j.status] || []).filter(to => !(to === 'triaged' && tech) && !(to === 'repairing' && !scope) && !(to === 'tested' && j.status === 'on_site' && !scope && !['inspection', 'amc_visit'].includes(j.jobType)));
  if (j.status === 'approved' && onSite) moves.push('repairing');
  return { visit, onSite, open, sent, draft, moves,
    book: !tech && open && !visit && ['triaged', 'approved', 'waiting_parts', 'repairing', 'on_hold'].includes(j.status),
    arrive: visit?.status === 'scheduled' && Date.now() >= visit.startsAt - 2 * HOUR,
    estimate: !tech && ['triaged', 'on_site', 'estimate_pending', 'approved'].includes(j.status),
    issue: manager && draft && ['triaged', 'on_site', 'estimate_pending', 'approved'].includes(j.status),
    approve: !tech && j.status === 'estimate_pending' && sent?.status === 'issued',
    checks: ['on_site', 'repairing', 'waiting_parts', 'on_hold', 'tested'].includes(j.status),
    parts: ['on_site', 'repairing'].includes(j.status), cancel: !tech && open };
}

/**
 * One job's record: the customer's units and their history, every estimate version and the yes behind
 * it, the visits, the technician's checks, the money (managers) and the messages Hasib wrote.
 */
export function JobRecord({ jobId, ar, h, s, timezone, manager, tech, busy, version, backLabel, act, openForm, onGo, onClose, onOpenJob, onFollowups }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const state = usePolling(() => hasib('hvac_job', { jobId }), [jobId, version], { interval: 30000 });
  const j = state.data;
  if (!j) return <p className="ld-state" role={state.error ? 'alert' : 'status'}>{state.error ? (h.reason(state.error.reason) || s.reason(state.error.reason)) : s.t('loading')}</p>;
  const when = ms => ms ? formatDateTime(ms, s.lang, timezone) : '—', date = ms => ms ? formatDate(ms, s.lang, timezone) : '—';
  const subject = `#${j.number} · ${j.contactName || tr('Customer', 'عميل')}`, a = actionsFor(j, { manager, tech });
  const local = ms => formatLocal(ms, timezone);
  const move = to => act('hvac_job_status', { jobId: j.id, version: j.version, status: to });
  return <article className="hb-production-record hb-visit-record hb-hvac-record" aria-labelledby="hv-record-title">
    <div className="hb-status-line">
      <button type="button" className="ld-button ld-quiet" onClick={onClose}>{backLabel}</button>
      {j.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: j.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
    </div>
    <header className="hb-panel" data-tone={STATUS_TONE[j.status]}>
      <h2 id="hv-record-title"><span className="ld-num">#{j.number}</span> <bdi>{j.contactName || tr('Customer', 'عميل')}</bdi> <span className="ld-chip" data-tone={STATUS_TONE[j.status]}>{label('status', j.status, ar)}</span>
        {j.urgent && <span className="ld-chip" data-tone="coral">{tr('Urgent', 'عاجل')}</span>}{j.outOfArea && <span className="ld-chip" data-tone="orange">{tr('Outside our areas', 'خارج مناطقنا')}</span>}</h2>
      <p className="ld-help">{label('jobType', j.jobType, ar)} · {label('source', j.source, ar)}{j.visit ? <> · {when(j.visit.startsAt)}</> : null}{j.nextAction ? <> · {label('next', j.nextAction, ar)}</> : null}</p>
      <nav className="hb-record-nav" aria-label={tr('Sections', 'الأقسام')}>{SECTIONS.filter(([id]) => (id !== 'money' || manager) && (id !== 'estimate' || !tech)).map(([id, en, arabic]) => <a key={id} href={`#hv-${id}`}>{ar ? arabic : en}</a>)}</nav>
      <div className="ld-actions">
        {a.arrive && <button type="button" className="ld-button ld-primary" disabled={busy} data-to="arrived" onClick={() => act('hvac_visit_status', { visitId: a.visit.id, version: a.visit.version, status: 'arrived' })}>{tr('Technician arrived', 'وصل الفني')}</button>}
        {a.moves.map(to => <button key={to} type="button" className="ld-button ld-primary" disabled={busy} data-to={to} onClick={() => move(to)}>{MOVE_VERB[to][ar ? 1 : 0]}</button>)}
        {a.book && <button type="button" className="ld-button ld-primary" onClick={() => openForm('visit', { jobId: j.id, technicianAccountId: j.technicianAccountId || '', date: local(Date.now() + 86400000).slice(0, 10), from: '09:00', to: '11:00', subject })}>{tr('Book a visit', 'حجز زيارة')}</button>}
        {a.approve && <button type="button" className="ld-button ld-primary" onClick={() => openForm('approval', { jobId: j.id, version: j.version, estimateId: a.sent.id, approvedBy: j.contactName || '', subject })}>{tr('Record the customer’s yes', 'تسجيل موافقة العميل')}</button>}
        {a.issue && <button type="button" className="ld-button ld-primary" disabled={busy} onClick={() => act('hvac_estimate_status', { estimateId: a.draft.id, version: a.draft.version, status: 'issued' }, null, tr('Send this estimate to the customer?', 'إرسال هذه التسعيرة إلى العميل؟'))}>{tr('Send estimate', 'إرسال التسعيرة')}</button>}
        {a.estimate && <button type="button" className="ld-button" onClick={() => openForm('estimate', { jobId: j.id, subject, lines: (a.draft || a.sent)?.lines.map(l => ({ ...l, variantId: l.variantId || '', price: String(l.unitPriceMinor / 1000) })) })}>{a.sent || a.draft ? tr('New estimate version', 'نسخة تسعيرة جديدة') : tr('Write estimate', 'كتابة تسعيرة')}</button>}
        {a.checks && <button type="button" className="ld-button" onClick={() => openForm('checklist', { jobId: j.id, version: j.version, subject, checks: j.checklist.length ? j.checklist : defaultChecks(ar), findings: j.findings || '' })}>{tr('Record checks', 'تسجيل الفحوص')}</button>}
        {a.parts && <button type="button" className="ld-button" onClick={() => openForm('parts', { jobId: j.id, version: j.version, subject })}>{tr('Waiting for parts', 'بانتظار القطع')}</button>}
        {a.visit?.status === 'arrived' && <button type="button" className="ld-button" onClick={() => openForm('visitDone', { visitId: a.visit.id, version: a.visit.version, subject })}>{tr('End the visit', 'إنهاء الزيارة')}</button>}
        {a.visit?.status === 'scheduled' && !tech && <button type="button" className="ld-button" onClick={() => openForm('visit', { visitId: a.visit.id, version: a.visit.version, technicianAccountId: a.visit.technicianAccountId,
          date: local(a.visit.startsAt).slice(0, 10), from: local(a.visit.startsAt).slice(11, 16), to: local(a.visit.endsAt).slice(11, 16), subject })}>{tr('Move the visit', 'نقل الزيارة')}</button>}
        {manager && j.money?.balanceMinor > 0 && <button type="button" className="ld-button ld-primary" onClick={() => openForm('payment', { jobId: j.id, amount: j.money.balanceMinor / 1000, method: 'cash', subject })}>{tr('Record payment', 'تسجيل دفعة')}</button>}
        {j.status === 'completed' && !tech && <button type="button" className="ld-button" onClick={() => openForm('job', { contactId: j.contactId, repeatOfId: j.id, unitIds: j.units.map(u => u.id), jobType: 'repair', subject })}>{tr('Customer is back with the same fault', 'العميل عاد بنفس العطل')}</button>}
        {a.cancel && <button type="button" className="ld-button" onClick={() => openForm('job', { jobId: j.id, version: j.version, contactId: j.contactId, jobType: j.jobType, unitIds: j.units.map(u => u.id), area: j.area || '', urgent: j.urgent, reportedSymptom: j.reportedSymptom || '', subject })}>{tr('Edit job', 'تعديل العمل')}</button>}
        {a.cancel && <button type="button" className="ld-button ld-quiet" onClick={() => openForm('cancelJob', { jobId: j.id, version: j.version, subject })}>{tr('Cancel job', 'إلغاء العمل')}</button>}
      </div>
    </header>

    <section id="hv-overview" aria-labelledby="hv-overview-h"><h3 id="hv-overview-h">{tr('Overview', 'نظرة عامة')}</h3>
      <dl className="hb-deal-detail">
        <div><dt>{tr('Job type', 'نوع العمل')}</dt><dd>{label('jobType', j.jobType, ar)}</dd></div>
        {j.reportedSymptom && <div><dt>{tr('Customer reported', 'ذكر العميل')}</dt><dd>{label('symptom', j.reportedSymptom, ar)}</dd></div>}
        {j.area && <div><dt>{tr('Area', 'المنطقة')}</dt><dd><bdi>{j.area}</bdi></dd></div>}
        {j.contract && <div><dt>{tr('Contract', 'العقد')}</dt><dd><bdi>{j.contract.reference}</bdi>{j.contract.dueAt ? <> · {tr('due', 'مستحقة')} {date(j.contract.dueAt)}</> : null}</dd></div>}
        {j.repeatOfId && <div><dt>{tr('Back after', 'عودة بعد')}</dt><dd><button type="button" className="ld-link" onClick={() => onOpenJob(j.repeatOfId)}>{tr('the earlier job', 'العمل السابق')}</button></dd></div>}
        {j.partsLabel && <div><dt>{tr('Waiting for', 'بانتظار')}</dt><dd><bdi>{j.partsLabel}</bdi>{j.partsExpectedAt ? <> · {date(j.partsExpectedAt)}</> : null}</dd></div>}
        {j.cancelReason && <div><dt>{tr('Cancelled', 'أُلغي')}</dt><dd>{label('cancel', j.cancelReason, ar)}</dd></div>}
      </dl>
      {j.units.length ? <ul className="hb-re-list">{j.units.map(u => <li key={u.id}><b><bdi>{u.label}</bdi></b> · {label('unitType', u.unitType, ar)}{u.brand ? <> · <bdi>{u.brand}</bdi></> : null}{u.capacityBtu ? <> · <span className="ld-num">{u.capacityBtu}</span> BTU</> : null}
        {' · '}{u.nextServiceAt ? <>{tr('next service', 'الصيانة القادمة')} {date(u.nextServiceAt)}</> : tr('no service date', 'لا موعد صيانة')}
        {j.status === 'completed' && <> <button type="button" className="ld-button ld-quiet" onClick={() => openForm('service', { unitId: u.id, version: u.version, hasDate: !!u.nextServiceAt, serviceOn: u.nextServiceAt ? local(u.nextServiceAt).slice(0, 10) : '', subject: u.label })}>{u.nextServiceAt ? tr('Change service date', 'تغيير موعد الصيانة') : tr('Set next service date', 'تحديد موعد الصيانة')}</button></>}
        {u.jobs.length > 0 && <small> · {tr('earlier jobs', 'أعمال سابقة')}: {u.jobs.map(o => <button key={o.id} type="button" className="ld-link" onClick={() => onOpenJob(o.id)}>#{o.number}</button>).reduce((acc, el, i) => i ? [...acc, ', ', el] : [el], [])}</small>}</li>)}</ul>
        : <p className="ld-help">{tr('No unit linked yet. Add the customer’s units so their history and service dates follow them.', 'لا وحدة مرتبطة بعد. أضف وحدات العميل ليتبعها سجلها ومواعيد صيانتها.')}</p>}
      {!tech && a.open && <button type="button" className="ld-button ld-quiet" onClick={() => openForm('unit', { contactId: j.contactId, unitType: 'split', jobId: j.id, jobVersion: j.version, jobUnitIds: j.units.map(u => u.id), subject })}>{tr('Add a unit', 'إضافة وحدة')}</button>}
    </section>

    <section id="hv-visits" aria-labelledby="hv-visits-h"><h3 id="hv-visits-h">{tr('Visits', 'الزيارات')}</h3>
      {j.visits.length ? <ul className="hb-re-list">{j.visits.map(v => <li key={v.id}>{when(v.startsAt)}–{formatDateTime(v.endsAt, s.lang, timezone).slice(-5)} · <bdi>{v.technicianName || '—'}</bdi> · <span className="ld-chip">{label('visit', v.status, ar)}</span>
        {v.arrivedAt ? <> · {tr('arrived', 'وصل')} {when(v.arrivedAt)}</> : null}{v.outcome ? <> · {label('outcome', v.outcome, ar)}</> : null}
        {v.status === 'scheduled' && !tech && <button type="button" className="ld-button ld-quiet" onClick={() => openForm('visitCancel', { visitId: v.id, version: v.version, subject })}>{tr('Cancel visit', 'إلغاء الزيارة')}</button>}</li>)}</ul>
        : <p className="ld-help">{tr('No visit booked yet.', 'لم تُحجز زيارة بعد.')}</p>}
    </section>

    {!tech && <section id="hv-estimate" aria-labelledby="hv-estimate-h"><h3 id="hv-estimate-h">{tr('Estimate', 'التسعيرة')}</h3>
      {j.estimates.length ? <ul className="hb-re-list">{j.estimates.map(e => <li key={e.id} data-estimate={e.number}><b>{tr('Version', 'نسخة')} <span className="ld-num">{e.number}</span></b> · <span className="ld-chip">{label('estimate', e.status, ar)}</span> · <Money h={h} minor={e.totalMinor} />
        {e.validUntil && e.status === 'issued' ? <> · {tr('valid until', 'صالحة حتى')} {date(e.validUntil)}</> : null}{e.approvedBy ? <> · {tr('yes from', 'موافقة')} <bdi>{e.approvedBy}</bdi> ({label('evidence', e.evidenceSource, ar)})</> : null}
        <ul>{e.lines.map((l, i) => <li key={i}><bdi>{l.name}</bdi> × <span className="ld-num">{l.qty}</span> · <Money h={h} minor={l.unitPriceMinor * l.qty} />{l.variantId ? <small> · {tr('catalog price', 'سعر الكتالوج')}</small> : null}</li>)}</ul>
        {e.status === 'issued' && !tech && <button type="button" className="ld-button ld-quiet" disabled={busy} onClick={() => act('hvac_estimate_status', { estimateId: e.id, version: e.version, status: 'rejected' }, null, tr('Record that the customer declined this estimate?', 'تسجيل أن العميل رفض هذه التسعيرة؟'))}>{tr('Customer declined', 'رفض العميل')}</button>}</li>)}</ul>
        : <p className="ld-help">{tr('No estimate yet. Lines from the catalog keep their fixed prices; Adiba offers it in the chat for your approval.', 'لا تسعيرة بعد. بنود الكتالوج تحتفظ بأسعارها الثابتة؛ وتعرضها أديبة في المحادثة بعد موافقتك.')}</p>}
    </section>}

    <section id="hv-checks" aria-labelledby="hv-checks-h"><h3 id="hv-checks-h">{tr('Checks', 'الفحوص')}</h3>
      {j.checklist.length ? <ul className="hb-re-list">{j.checklist.map((c, i) => <li key={i} data-result={c.result}><bdi>{c.text}</bdi> · <span className="ld-chip" data-tone={c.result === 'fail' ? 'coral' : c.result === 'pass' ? 'green' : undefined}>{label('check', c.result, ar)}</span></li>)}</ul>
        : <p className="ld-help">{tr('The technician records the checks on site. A job is tested only with checks, and completed only with none failed.', 'يسجل الفني الفحوص في الموقع. لا يُختبر العمل إلا بالفحوص، ولا يكتمل وفيها فحص غير سليم.')}</p>}
      {j.findings && <blockquote className="hb-draft-text" dir="auto">{j.findings}</blockquote>}
    </section>

    {manager && j.money && <section id="hv-money" aria-labelledby="hv-money-h"><div className="hb-status-line"><h3 id="hv-money-h">{tr('Money', 'المال')}</h3>
      <button type="button" className="ld-button ld-quiet" onClick={() => openForm('costs', { jobId: j.id, version: j.version, subject, costsComplete: j.money.costsComplete, ...(j.money.costs.length ? { costs: j.money.costs.map(c => ({ ...c, amount: String(c.amountMinor / 1000) })) } : {}) })}>{tr('Record costs', 'تسجيل التكاليف')}</button></div>
      {j.money.orderId ? <p className="ld-help">{tr('Charged', 'المفوتر')} <Money h={h} minor={j.money.totalMinor} /> · {tr('paid', 'المدفوع')} <Money h={h} minor={j.money.paidMinor} /> · <span className="ld-chip" data-tone={PAYMENT_TONE[j.money.paymentStatus]}>{label('payment', j.money.paymentStatus, ar)}</span></p>
        : <p className="ld-help">{j.jobType === 'amc_visit' ? tr('Paid by its maintenance contract.', 'مدفوع بعقد الصيانة.') : tr('Charged from the approved estimate when the job is completed.', 'تُصدر الفاتورة من التسعيرة المعتمدة عند اكتمال العمل.')}</p>}
      {j.money.payments.length > 0 && <ul className="hb-re-list">{j.money.payments.map(p => <li key={p.id}><Money h={h} minor={p.amountMinor} /> · {label('method', p.method, ar)} · {when(p.at)}</li>)}</ul>}
      <p className="ld-help">{j.money.costs.length ? <>{tr('Costs', 'التكاليف')}: {j.money.costs.map((c, i) => <span key={i}>{i ? ' · ' : ''}<bdi>{c.label}</bdi> <Money h={h} minor={c.amountMinor} /></span>)}</> : tr('No costs recorded.', 'لا تكاليف مسجلة.')}
        {j.money.costsComplete ? ` · ${tr('complete', 'مكتملة')}` : ''}</p>
    </section>}

    <section id="hv-followups" aria-labelledby="hv-followups-h"><div className="hb-status-line"><h3 id="hv-followups-h">{tr('Follow-ups', 'المتابعات')}</h3>
      <button type="button" className="ld-button ld-quiet" onClick={onFollowups}>{tr('Open in Follow-ups', 'فتح في المتابعات')}</button></div>
      {j.drafts?.length ? <ul className="hb-re-list">{j.drafts.slice(0, 10).map(d => <li key={d.id}>{label('draftKind', d.kind, ar)} · {label('draft', d.status, ar)} · {when(d.createdAt)}
        <blockquote className="hb-draft-text" dir="auto">{d.text}</blockquote></li>)}</ul> : <p className="ld-help">{tr('No messages for this job.', 'لا رسائل لهذا العمل.')}</p>}
    </section>

    <section id="hv-activity" aria-labelledby="hv-activity-h"><h3 id="hv-activity-h">{tr('Activity', 'النشاط')}</h3>
      {j.activity?.length ? <ol className="hb-re-list">{j.activity.map((x, i) => <li key={i}>{when(x.at)} · {activityLabel(x.kind, ar)}{x.kind === 'cancelled' && x.detail ? <> · {label('cancel', x.detail, ar)}</> : null}</li>)}</ol>
        : <p className="ld-help">{tr('Nothing yet.', 'لا شيء بعد.')}</p>}
    </section>
  </article>;
}
