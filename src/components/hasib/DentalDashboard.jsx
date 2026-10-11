import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePolling } from '../../hooks/usePolling';
import { hasib, dashboard } from '../../lib/dashboard/api';
import { insightsReturn } from '../../lib/hasib/realEstateWork.js';
import { buildDentalSubmission } from '../../lib/hasib/dentalWork.js';
import { formatLocal, zonedLocalToUtc } from '../../lib/timezone.js';
import { PageHeader } from './DashboardVisuals';
import { AttentionStrip } from './workspace/AttentionStrip.jsx';
import { useWorkspaceActions } from './workspace/useWorkspaceActions.jsx';
import { TeamView } from './realestate/TeamView.jsx';
import { ScheduleView, VisitList, VisitPreview } from './dental/VisitsView.jsx';
import { VisitRecord } from './dental/VisitRecord.jsx';
import { ServicesView } from './dental/ServicesView.jsx';
import { FollowupsView } from './dental/FollowupsView.jsx';
import { InsightsView } from './dental/InsightsView.jsx';
import { MetricRecords } from './dental/MetricRecords.jsx';
import { RulesView } from './dental/RulesView.jsx';
import { DentalForm } from './dental/DentalForm.jsx';
import { QUICK, DENTAL_FILTERS } from './dental/labels.js';

const WIDE = '(min-width: 1100px)', DAY = 86400000;
const STAFF_WORDS = { invite: ['Invite a receptionist or dentist', 'دعوة موظف استقبال أو طبيب'], none: ['No team members yet', 'لا أعضاء فريق بعد'], hint: ['Invite your front desk and dentists by email.', 'ادعُ موظفي الاستقبال والأطباء بالبريد الإلكتروني.'],
  scope: limit => [`One manager and up to ${limit} team members. They book visits, record attendance and set recall dates; charges, payments, messages and Insights stay with you.`, `مدير واحد وحتى ${limit} من الفريق. يحجزون الزيارات ويسجلون الحضور ومواعيد المراجعة، وتبقى الرسوم والمدفوعات والرسائل والمؤشرات لك.`] };
const metricSearch = ({ metric, period, segment }) => ({ view: 'visits', metric, from: 'insights', ...(period ? { period } : {}), ...(segment ? { segment } : {}) });
const dayStartOf = (date, tz) => zonedLocalToUtc(`${date}T00:00`, tz);

async function load(section, view, manager, params, tz) {
  if (section === 'insights') {
    const period = params.get('period') || '30d';
    return { insights: await hasib('dental_insights', { period, ...(params.get('segment') ? { segment: params.get('segment') } : {}) }), expenses: await hasib('expenses', { period: period === '7d' ? '7d' : '30d' }) };
  }
  if (section === 'settings') return { team: await hasib('team_list') };
  const summary = await hasib('dental_overview');
  if (params.get('metric') && params.get('from') === 'insights' && manager)
    return { summary, records: await hasib('dental_metric_records', { metric: params.get('metric'), period: params.get('period') || '30d', ...(params.get('segment') ? { segment: params.get('segment') } : {}) }) };
  if (view === 'visits') return { summary, visits: await hasib('dental_visits', params.get('patient') ? { contactId: params.get('patient') } : {}) };
  if (view === 'services') { const [resources, items] = await Promise.all([hasib('dental_resources'), hasib('items', { limit: 200 })]); return { summary, resources, items }; }
  if (view === 'followups') return { summary, followups: await hasib('dental_followups', { filter: params.get('filter') || 'today', ...(params.get('patient') ? { contactId: params.get('patient') } : {}) }) };
  const date = params.get('day') || formatLocal(Date.now(), tz).slice(0, 10), fromAt = dayStartOf(date, tz);
  return { summary, visits: await hasib('dental_visits', { fromAt, toAt: fromAt + DAY }), day: fromAt };
}

/** The forms pick patients, providers, chairs and treatments; they load once, when a form first opens. */
const formLists = () => Promise.all([dashboard('contacts', { limit: 50 }), hasib('dental_resources'), hasib('items', { limit: 200 })]).then(([contacts, resources, items]) => ({ contacts, resources, items }));

/** The strip above Visits: exceptions that need someone, each opening the view that holds them. */
function NeedsAttention({ ar, summary, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const f = summary?.followups?.counts || {}, a = summary?.attention || {};
  return <AttentionStrip ar={ar} onGo={onGo} items={[
    ['overdue', f.overdue, tr('Overdue follow-ups', 'متابعات متأخرة'), 'coral', { view: 'followups', filter: 'overdue' }],
    ['unrecorded', a.attendanceUnrecorded, tr('Visits to record attendance', 'زيارات تحتاج تسجيل الحضور'), 'coral', { view: 'visits', quick: 'followupDue' }],
    ['requests', a.requests, tr('Visit requests from Layla', 'طلبات زيارة من ليلى'), 'blue', { view: 'followups', filter: 'today' }],
    ['rebook', a.rebook, tr('Missed visits to rebook', 'زيارات فائتة لإعادة الحجز'), 'orange', { view: 'visits', quick: 'missed' }],
    ['approvals', a.approvals, tr('Messages to approve', 'رسائل بانتظار الموافقة'), 'yellow', { view: 'followups', filter: 'decision' }],
    ['charges', a.chargesUnrecorded, tr('Visits without charges', 'زيارات بلا رسوم'), 'orange', { view: 'followups', filter: 'today' }],
    ['balances', a.balancesOverdue, tr('Balances past due', 'أرصدة متأخرة'), 'yellow', { view: 'followups', filter: 'waiting' }],
  ]} />;
}

/**
 * Dental clinics on Ascend (ascend/dental.md): Visits (schedule, visit list, services, follow-ups),
 * Insights and the rules and team in Settings. A visit is the same record everywhere.
 */
export function DentalDashboard({ section, view, s, h, overview, timezone = 'Asia/Muscat', onChanged, onGo, initialAction = '', tabs = null }) {
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en);
  const manager = overview.workspaceRole === 'manager';
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null), [values, setValues] = useState({}), [lists, setLists] = useState(null), [preview, setPreview] = useState(null);
  const scroll = useRef(0);
  const visitId = params.get('visit');
  const key = [section, view, params.get('metric'), params.get('period'), params.get('segment'), params.get('filter'), params.get('day'), params.get('patient')].join('|');
  const state = usePolling(() => load(section, view, manager, params, timezone), [key, manager], { interval: 30000 });
  const { busy, setError, perform, act, notices, changes, clear } = useWorkspaceActions({ ar, s, h, refresh: state.refresh, onChanged });
  const data = { ...(lists || {}), ...(state.data || {}), expenseCategories: overview.pack?.expenseCategories || [] };
  const setParam = patch => { const next = new URLSearchParams(params); for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); } setParams(next); };

  const openForm = (type, preset = {}) => {
    setError(''); setValues(preset); setForm(type);
    if (!lists) formLists().then(setLists).catch(e => setError(h.reason(e.reason) || s.reason(e.reason)));
    window.requestAnimationFrame?.(() => document.querySelector('.hb-action-fields')?.scrollIntoView({ block: 'start' }));
  };
  const closeForm = () => { setForm(null); setValues({}); };
  useEffect(() => { clear(); if (initialAction === 'visit') openForm('visit'); else closeForm(); }, [section, view, initialAction]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening a record remembers where the list was; Back returns there with its filters.
  const openVisit = id => { scroll.current = window.scrollY; setPreview(null); setParam({ visit: id }); };
  const openRow = id => (window.matchMedia?.(WIDE).matches && view === 'visits' ? setPreview(id) : openVisit(id));
  const submit = async e => {
    e.preventDefault();
    let submission;
    try { submission = buildDentalSubmission(form, values, { requestId: crypto.randomUUID(), timezone }); }
    catch { setError(tr('Enter a valid date and time.', 'أدخل تاريخاً ووقتاً صالحين.')); return; }
    if (submission && await perform(submission.operation, submission.body)) { closeForm(); if (form === 'resource') setLists(null); }
  };
  const back = () => {
    const from = params.get('from');
    if (from === 'chat' && params.get('chat')) return onGo('chats', { chat: params.get('chat') });
    if (from === 'customers') return onGo('customers');
    setParam({ visit: null });
  };
  useLayoutEffect(() => { if (!visitId && scroll.current) { window.scrollTo(0, scroll.current); scroll.current = 0; } }, [visitId]);
  const backLabel = params.get('from') === 'chat' ? tr('Back to chat', 'العودة إلى المحادثة') : params.get('from') === 'customers' ? tr('Back to patients', 'العودة إلى المرضى')
    : params.get('metric') ? tr('Back to source records', 'العودة إلى السجلات المصدرية') : view === 'schedule' ? tr('Back to schedule', 'العودة إلى الجدول')
    : view === 'followups' ? tr('Back to follow-ups', 'العودة إلى المتابعات') : tr('Back to visits', 'العودة إلى الزيارات');

  const formPanel = form && <DentalForm form={form} values={values} setValues={setValues} ar={ar} h={h} busy={busy} data={data} onSubmit={submit} onCancel={closeForm} />;
  if (section === 'work' && visitId) return <div className="hb-workspace hb-dental">{notices}{formPanel}
    <VisitRecord visitId={visitId} ar={ar} h={h} s={s} timezone={timezone} manager={manager} busy={busy} version={changes} backLabel={backLabel}
      act={act} openForm={openForm} onGo={onGo} onClose={back} onOpenVisit={openVisit} onFollowups={() => onGo('work', { view: 'followups', filter: 'today' })} /></div>;
  if (state.loading && !state.data) return <p className="ld-state" role="status">{s.t('loading')}</p>;
  if (state.error && !state.data) return <div className="ld-state" role="alert"><p>{h.reason(state.error.reason) || s.reason(state.error.reason)}</p><button type="button" className="ld-button" onClick={() => state.refresh()}>{h.t('retry')}</button></div>;
  const shared = { ar, h, s, data, busy, timezone };

  if (section === 'insights') return <div className="hb-workspace hb-dental">{notices}{formPanel}
    <InsightsView {...shared} params={params} categories={data.expenseCategories} onParams={patch => setParam(patch)} onAddExpense={manager ? () => openForm('expense', { method: 'bank_transfer', paidOn: formatLocal(Date.now(), timezone).slice(0, 10) }) : null}
      onRecords={(metric, segment) => onGo('work', metricSearch({ metric, period: params.get('period') || '30d', segment }))} /></div>;
  if (section === 'settings') return <div className="hb-workspace hb-dental">{notices}{formPanel}
    {view === 'team' ? <TeamView {...shared} act={act} openForm={openForm} words={STAFF_WORDS} />
      : <RulesView ar={ar} h={h} settings={overview.settings} busy={busy} onSave={body => perform('settings_update', body)} />}</div>;

  const header = <PageHeader icon="tooth" title={overview.pack?.ownerUi?.work?.[ar ? 'ar' : 'en'] || tr('Visits', 'الزيارات')}
    description={tr('Appointments, attendance and charges. Record what happened; reminders, follow-ups and figures follow by themselves. Nothing clinical is kept here.', 'المواعيد والحضور والرسوم. سجّل ما حدث، وتتبعه التذكيرات والمتابعات والأرقام تلقائياً. لا يُحفظ هنا أي شيء طبي.')}
    primary={{ label: tr('Add visit', 'إضافة زيارة'), onClick: () => openForm('visit') }} />;
  const strip = <NeedsAttention ar={ar} summary={data.summary} onGo={onGo} />;
  const addVisit = preset => openForm('visit', preset);
  let body;
  if (data.records) body = <MetricRecords ar={ar} h={h} s={s} timezone={timezone} data={data.records} onOpen={openVisit} onBack={() => onGo('insights', insightsReturn(params))} />;
  else if (view === 'services') body = <ServicesView ar={ar} h={h} data={data} manager={manager} busy={busy} act={act} openForm={openForm} onBrain={() => onGo('settings', { view: 'brain', part: 'catalog' })} />;
  else if (view === 'followups') body = <FollowupsView {...shared} manager={manager} filter={DENTAL_FILTERS.includes(params.get('filter')) ? params.get('filter') : 'today'} onFilter={f => setParam({ filter: f })}
    act={act} onOpenVisit={openVisit} onOpenPatient={id => onGo('work', { view: 'visits', patient: id })} onBook={contactId => addVisit({ contactId, source: 'layla' })}
    patientFilter={params.get('patient')} onClearPatient={() => setParam({ patient: null })} />;
  else if (view === 'visits') {
    const quick = QUICK.includes(params.get('quick')) ? params.get('quick') : 'all';
    const rows = data.visits?.items || [];
    const selected = preview && rows.find(r => String(r.id) === String(preview));
    body = <div className={`hb-board-layout ${selected ? 'has-preview' : ''}`}>
      <div>{params.get('patient') && <p className="hb-filter-note" role="status">{tr('Showing one patient’s visits.', 'تُعرض زيارات مريض واحد.')} <button type="button" className="ld-link" onClick={() => setParam({ patient: null })}>{tr('Show all', 'عرض الكل')}</button></p>}
        <VisitList ar={ar} s={s} h={h} timezone={timezone} data={data} quick={quick} onQuick={q => setParam({ quick: q === 'all' ? null : q })} onOpen={openRow} selectedId={preview} busy={busy} act={act} onAdd={() => addVisit()} /></div>
      {selected && <VisitPreview row={selected} ar={ar} s={s} timezone={timezone} onOpenFull={openVisit} onClose={() => setPreview(null)} />}
    </div>;
  } else body = <ScheduleView ar={ar} s={s} timezone={timezone} data={data} busy={busy} act={act} day={data.day || Date.now()} onOpen={openVisit} onAdd={() => addVisit()}
    onDay={ms => setParam({ day: ms === null ? null : formatLocal(ms, timezone).slice(0, 10) })} />;
  return <div className="hb-workspace hb-dental">{header}{strip}{tabs}{notices}{formPanel}{body}</div>;
}
