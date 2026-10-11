import React, { useEffect, useMemo } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { hasib, dashboard } from '../../lib/dashboard/api';
import { insightsReturn } from '../../lib/hasib/workspaceLinks.js';
import { buildFitnessSubmission } from '../../lib/hasib/fitnessWork.js';
import { PageHeader } from './DashboardVisuals';
import { AttentionStrip } from './workspace/AttentionStrip.jsx';
import { useWorkspaceActions } from './workspace/useWorkspaceActions.jsx';
import { useWorkspaceShell, backLabel as shellBack } from './workspace/useWorkspaceShell.jsx';
import { TeamView } from './workspace/TeamView.jsx';
import { MembersView, MemberPreview } from './fitness/MembersView.jsx';
import { MemberRecord } from './fitness/MemberRecord.jsx';
import { ClassesView, PlansView } from './fitness/ClassesView.jsx';
import { FollowupsView } from './fitness/FollowupsView.jsx';
import { InsightsView } from './fitness/InsightsView.jsx';
import { MetricRecords } from './fitness/MetricRecords.jsx';
import { RulesView } from './fitness/RulesView.jsx';
import { FitnessForm } from './fitness/FitnessForm.jsx';
import { QUICK, FITNESS_FILTERS } from './fitness/labels.js';

const DAY = 86400000;
const STAFF_WORDS = { invite: ['Invite a coach or front desk', 'دعوة مدرب أو موظف استقبال'], none: ['No team members yet', 'لا أعضاء فريق بعد'], hint: ['Invite your coaches and front desk by email.', 'ادعُ مدربيك وموظفي الاستقبال بالبريد الإلكتروني.'],
  scope: limit => [`One manager and up to ${limit} team members. They book classes and check people in; prices, payments, freezes, renewals and Insights stay with you.`, `مدير واحد وحتى ${limit} من الفريق. يحجزون الحصص ويسجلون الحضور، وتبقى الأسعار والمدفوعات والتجميد والتجديد والمؤشرات لك.`] };
const metricSearch = ({ metric, period, segment }) => ({ view: 'members', metric, from: 'insights', ...(period ? { period } : {}), ...(segment ? { segment } : {}) });

async function load(section, view, manager, params) {
  if (section === 'insights') return { insights: await hasib('fitness_insights', { period: params.get('period') || '30d', ...(params.get('segment') ? { segment: params.get('segment') } : {}) }), team: await hasib('team_list') };
  if (section === 'settings') return { team: await hasib('team_list') };
  const [summary, team] = await Promise.all([hasib('fitness_overview'), manager ? hasib('team_list') : Promise.resolve({ members: [] })]);
  if (params.get('metric') && params.get('from') === 'insights' && manager)
    return { summary, team, records: await hasib('fitness_metric_records', { metric: params.get('metric'), period: params.get('period') || '30d', ...(params.get('segment') ? { segment: params.get('segment') } : {}) }) };
  if (view === 'classes') { const now = Date.now(); return { summary, team, classes: await hasib('fitness_classes', { fromAt: now - (params.get('past') ? 7 * DAY : DAY / 2), toAt: now + 14 * DAY }) }; }
  if (view === 'plans') return { summary, team, plans: await hasib('fitness_plans') };
  if (view === 'followups') return { summary, team, followups: await hasib('fitness_followups', { filter: params.get('filter') || 'today', ...(params.get('member') ? { contactId: params.get('member') } : {}) }) };
  return { summary, team, members: await hasib('fitness_members') };
}

/** The forms pick customers and plans; they load once, when a form first opens. */
const formLists = () => Promise.all([dashboard('contacts', { limit: 50 }), hasib('fitness_plans')]).then(([contacts, plans]) => ({ contacts, plans }));

/** The strip above Memberships: exceptions that need someone, each opening the view that holds them. */
function NeedsAttention({ ar, summary, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const f = summary?.followups?.counts || {}, a = summary?.attention || {};
  return <AttentionStrip ar={ar} onGo={onGo} items={[
    ['overdue', f.overdue, tr('Overdue follow-ups', 'متابعات متأخرة'), 'coral', { view: 'followups', filter: 'overdue' }],
    ['gap', a.attendanceGap, tr('Members with an attendance gap', 'أعضاء انقطعوا عن الحضور'), 'coral', { view: 'members', quick: 'attendanceGap' }],
    ['approvals', a.approvals, tr('Messages to approve', 'رسائل بانتظار الموافقة'), 'yellow', { view: 'followups', filter: 'decision' }],
    ['expiring', a.expiring, tr('Memberships expiring', 'عضويات تنتهي قريباً'), 'orange', { view: 'members', quick: 'expiring' }],
    ['unrecorded', a.attendanceUnrecorded, tr('Classes to record attendance', 'حصص تحتاج تسجيل الحضور'), 'orange', { view: 'classes', past: '1' }],
    ['payments', a.paymentsDue, tr('Memberships waiting for payment', 'عضويات بانتظار الدفع'), 'yellow', { view: 'followups', filter: 'waiting' }],
    ['trials', a.trialFollowUp, tr('Trials to follow up', 'تجارب تحتاج متابعة'), 'blue', { view: 'members', quick: 'trialFollowUp' }],
  ]} />;
}

/**
 * Fitness & wellness on Ascend (ascend/fitness.md): Memberships (members, classes, plans,
 * follow-ups), Insights and the rules and team in Settings. A member is the same record everywhere.
 */
export function FitnessDashboard({ section, view, s, h, overview, timezone = 'Asia/Muscat', onChanged, onGo, initialAction = '', tabs = null }) {
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en);
  const manager = overview.workspaceRole === 'manager';
  const { params, setParam, form, values, setValues, lists, setLists, preview, setPreview, openForm, closeForm, openRecord: openMember, openRow, back, recordId: memberId } =
    useWorkspaceShell({ recordParam: 'member', loadLists: formLists, setError: message => setError(message), reasonOf: reason => h.reason(reason) || s.reason(reason), onGo });
  const key = [section, view, params.get('metric'), params.get('period'), params.get('segment'), params.get('filter'), params.get('past'), view === 'followups' ? memberId : ''].join('|');
  const state = usePolling(() => load(section, view, manager, params), [key, manager], { interval: 30000 });
  const { busy, setError, perform, act, notices, changes, clear } = useWorkspaceActions({ ar, s, h, refresh: state.refresh, onChanged });
  const data = { ...(lists || {}), ...(state.data || {}) };
  const actorAccountId = overview.teamSummary?.actorAccountId;
  const owners = useMemo(() => new Map([...(data.team?.members || []).filter(m => m.accountId).map(m => [String(m.accountId), m.email]), ...(manager ? [] : [[String(actorAccountId), tr('Me', 'أنا')]])]), [data.team, manager, actorAccountId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { clear(); if (initialAction === 'membership' && manager) openForm('membership'); else if (initialAction === 'class' && manager) openForm('class', { minutes: 60, capacity: 12, classType: 'class' }); else closeForm(); }, [section, view, initialAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async e => {
    e.preventDefault();
    let submission;
    try { submission = buildFitnessSubmission(form, values, { requestId: crypto.randomUUID(), timezone }); }
    catch { setError(tr('Enter a valid date and time.', 'أدخل تاريخاً ووقتاً صالحين.')); return; }
    if (submission && await perform(submission.operation, submission.body)) { closeForm(); if (form === 'plan') setLists(null); }
  };
  const backLabel = shellBack(params, ar, { fallback: view === 'classes' ? ['Back to classes', 'العودة إلى الحصص'] : ['Back to members', 'العودة إلى الأعضاء'] });

  const formPanel = form && <FitnessForm form={form} values={values} setValues={setValues} ar={ar} h={h} busy={busy} data={data} onSubmit={submit} onCancel={closeForm} />;
  if (section === 'work' && memberId && view !== 'followups') return <div className="hb-workspace hb-fitness">{notices}{formPanel}
    <MemberRecord contactId={memberId} ar={ar} h={h} s={s} timezone={timezone} manager={manager} busy={busy} version={changes} backLabel={backLabel}
      act={act} openForm={openForm} onGo={onGo} onClose={back} onFollowups={() => onGo('work', { view: 'followups', filter: 'today', member: memberId })} /></div>;
  if (state.loading && !state.data) return <p className="ld-state" role="status">{s.t('loading')}</p>;
  if (state.error && !state.data) return <div className="ld-state" role="alert"><p>{h.reason(state.error.reason) || s.reason(state.error.reason)}</p><button type="button" className="ld-button" onClick={() => state.refresh()}>{h.t('retry')}</button></div>;
  const shared = { ar, h, s, data, busy, timezone };

  if (section === 'insights') return <div className="hb-workspace hb-fitness">{notices}
    <InsightsView {...shared} params={params} onParams={patch => setParam(patch)} onRecords={(metric, segment) => onGo('work', metricSearch({ metric, period: params.get('period') || '30d', segment }))} /></div>;
  if (section === 'settings') return <div className="hb-workspace hb-fitness">{notices}{formPanel}
    {view === 'team' ? <TeamView {...shared} act={act} openForm={openForm} words={STAFF_WORDS} />
      : <RulesView ar={ar} h={h} settings={overview.settings} busy={busy} onSave={body => perform('settings_update', body)} />}</div>;

  const header = <PageHeader icon="dumbbell" title={overview.pack?.ownerUi?.work?.[ar ? 'ar' : 'en'] || tr('Memberships', 'العضويات')}
    description={tr('Trials, members and classes. Payments start memberships, check-ins count visits, and freed places go to the waitlist by themselves.', 'التجارب والأعضاء والحصص. الدفع يبدأ العضوية، والحضور يُحتسب زيارة، والمكان المتاح يذهب لقائمة الانتظار تلقائياً.')}
    primary={manager ? { label: tr('Add membership', 'إضافة عضوية'), onClick: () => openForm('membership') } : undefined} />;
  const strip = <NeedsAttention ar={ar} summary={data.summary} onGo={onGo} />;
  let body;
  if (data.records) body = <MetricRecords ar={ar} h={h} s={s} timezone={timezone} data={data.records} onOpen={openMember} onBack={() => onGo('insights', insightsReturn(params))} />;
  else if (view === 'classes') body = <ClassesView {...shared} manager={manager} act={act} openForm={openForm} onOpenMember={openMember} past={!!params.get('past')} onPast={on => setParam({ past: on ? '1' : null })} />;
  else if (view === 'plans') body = <PlansView ar={ar} h={h} data={data} manager={manager} openForm={openForm} />;
  else if (view === 'followups') body = <FollowupsView {...shared} manager={manager} filter={FITNESS_FILTERS.includes(params.get('filter')) ? params.get('filter') : 'today'} onFilter={f => setParam({ filter: f })}
    act={act} onOpenMember={id => onGo('work', { view: 'members', member: id })} onGo={onGo} memberFilter={memberId} onClearMember={() => setParam({ member: null })} />;
  else {
    const quick = QUICK.includes(params.get('quick')) ? params.get('quick') : 'all';
    const rows = data.members?.items || [];
    const selected = preview && rows.find(r => r.id === preview);
    body = <div className={`hb-board-layout ${selected ? 'has-preview' : ''}`}>
      <div><MembersView ar={ar} s={s} h={h} timezone={timezone} rows={rows} quick={quick} onQuick={q => setParam({ quick: q === 'all' ? null : q })} onOpen={openRow} owners={owners}
        selectedId={preview} onAdd={manager ? () => openForm('membership') : null} complete={data.members?.complete} /></div>
      {selected && <MemberPreview row={selected} ar={ar} s={s} timezone={timezone} onOpenFull={openMember} onClose={() => setPreview(null)} />}
    </div>;
  }
  return <div className="hb-workspace hb-fitness">{header}{strip}{tabs}{notices}{formPanel}{body}</div>;
}
