import React, { useEffect } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { hasib, dashboard } from '../../lib/dashboard/api';
import { insightsReturn } from '../../lib/hasib/workspaceLinks.js';
import { buildHvacSubmission } from '../../lib/hasib/hvacWork.js';
import { formatLocal, zonedLocalToUtc } from '../../lib/timezone.js';
import { PageHeader } from './DashboardVisuals';
import { AttentionStrip } from './workspace/AttentionStrip.jsx';
import { useWorkspaceActions } from './workspace/useWorkspaceActions.jsx';
import { useWorkspaceShell, backLabel as shellBack } from './workspace/useWorkspaceShell.jsx';
import { TeamView } from './workspace/TeamView.jsx';
import { ScheduleView, JobList, JobPreview } from './hvac/JobsView.jsx';
import { JobRecord } from './hvac/JobRecord.jsx';
import { ContractsView, ContractRecord } from './hvac/ContractsView.jsx';
import { UnitsView } from './hvac/UnitsView.jsx';
import { FollowupsView } from './hvac/FollowupsView.jsx';
import { InsightsView } from './hvac/InsightsView.jsx';
import { MetricRecords } from './hvac/MetricRecords.jsx';
import { RulesView } from './hvac/RulesView.jsx';
import { HvacForm } from './hvac/HvacForm.jsx';
import { QUICK, HVAC_FILTERS } from './hvac/labels.js';

const WIDE = '(min-width: 1100px)',
  DAY = 86400000;
const STAFF_WORDS = {
  invite: ['Invite a technician or service advisor', 'دعوة فني أو موظف خدمة'],
  none: ['No team members yet', 'لا أعضاء فريق بعد'],
  hint: ['Invite your technicians and front desk by email.', 'ادعُ الفنيين وموظفي الخدمة بالبريد الإلكتروني.'],
  scope: limit => [
    `One manager and up to ${limit} team members. Technicians see only their own visits and record arrival, checks and parts; advisors book jobs and write estimates. Prices, payments, messages and Insights stay with you.`,
    `مدير واحد وحتى ${limit} من الفريق. يرى الفنيون زياراتهم فقط ويسجلون الوصول والفحوص والقطع؛ ويحجز موظفو الخدمة الأعمال ويكتبون التسعيرات. وتبقى الأسعار والمدفوعات والرسائل والمؤشرات لك.`,
  ],
};
const metricSearch = ({ metric, period, segment }) => ({
  view: 'jobs',
  metric,
  from: 'insights',
  ...(period ? { period } : {}),
  ...(segment ? { segment } : {}),
});
const dayStartOf = (date, tz) => zonedLocalToUtc(`${date}T00:00`, tz);

async function load(section, view, manager, params, tz) {
  if (section === 'insights') {
    const period = params.get('period') || '30d';
    return {
      insights: await hasib('hvac_insights', {
        period,
        ...(params.get('segment') ? { segment: params.get('segment') } : {}),
      }),
      expenses: await hasib('expenses', { period: period === '7d' ? '7d' : '30d' }),
    };
  }
  if (section === 'settings') return { team: await hasib('team_list') };
  const summary = await hasib('hvac_overview');
  if (params.get('metric') && params.get('from') === 'insights' && manager)
    return {
      summary,
      records: await hasib('hvac_metric_records', {
        metric: params.get('metric'),
        period: params.get('period') || '30d',
        ...(params.get('segment') ? { segment: params.get('segment') } : {}),
      }),
    };
  const customer = params.get('customer') ? { contactId: params.get('customer') } : {};
  if (view === 'jobs') return { summary, jobs: await hasib('hvac_jobs', customer) };
  if (view === 'contracts')
    return {
      summary,
      contracts:
        manager || summary.operationalRole !== 'technician' ? await hasib('hvac_contracts', customer) : { items: [] },
    };
  if (view === 'units') return { summary, units: await hasib('hvac_units', customer) };
  if (view === 'followups')
    return {
      summary,
      followups: await hasib('hvac_followups', { filter: params.get('filter') || 'today', ...customer }),
    };
  const date = params.get('day') || formatLocal(Date.now(), tz).slice(0, 10),
    fromAt = dayStartOf(date, tz);
  return { summary, schedule: await hasib('hvac_schedule', { fromAt, toAt: fromAt + DAY }), day: fromAt };
}

/** The forms pick customers, technicians, units and catalog services; they load once, when a form first opens. */
const formLists = () => {
  const now = Date.now();
  return Promise.all([
    dashboard('contacts', { limit: 50 }),
    hasib('items', { limit: 200 }),
    hasib('hvac_units'),
    hasib('hvac_schedule', { fromAt: now, toAt: now + DAY }),
  ]).then(([contacts, items, units, schedule]) => ({ contacts, items, units, technicians: schedule.technicians }));
};

/** The strip above Jobs: exceptions that need someone, each opening the view that holds them. */
function NeedsAttention({ ar, summary, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const f = summary?.followups?.counts || {},
    a = summary?.attention || {};
  return (
    <AttentionStrip
      ar={ar}
      onGo={onGo}
      items={[
        [
          'overdue',
          f.overdue,
          tr('Overdue follow-ups', 'متابعات متأخرة'),
          'coral',
          { view: 'followups', filter: 'overdue' },
        ],
        [
          'pastWindow',
          a.pastWindow,
          tr('Visits with no arrival recorded', 'زيارات بلا وصول مسجل'),
          'coral',
          { view: 'followups', filter: 'today' },
        ],
        [
          'requests',
          a.requests,
          tr('Requests to triage', 'طلبات للفرز'),
          'blue',
          { view: 'followups', filter: 'today' },
        ],
        [
          'unscheduled',
          a.unscheduled,
          tr('Approved jobs to book', 'أعمال معتمدة للحجز'),
          'orange',
          { view: 'schedule' },
        ],
        [
          'parts',
          a.partsWaiting,
          tr('Waiting for parts', 'بانتظار القطع'),
          'orange',
          { view: 'jobs', quick: 'partsNeeded' },
        ],
        [
          'estimates',
          a.estimatesOut,
          tr('Estimates with customers', 'تسعيرات لدى العملاء'),
          'yellow',
          { view: 'jobs' },
        ],
        [
          'approvals',
          a.approvals,
          tr('Messages to approve', 'رسائل بانتظار الموافقة'),
          'yellow',
          { view: 'followups', filter: 'decision' },
        ],
        ['renewals', a.renewalsDue, tr('Contracts to renew', 'عقود للتجديد'), 'yellow', { view: 'contracts' }],
        [
          'balances',
          a.balancesOverdue,
          tr('Balances past due', 'أرصدة متأخرة'),
          'coral',
          { view: 'followups', filter: 'decision' },
        ],
      ]}
    />
  );
}

/**
 * AC service businesses on Ascend (ascend/hvac.md): Jobs (schedule, job list, contracts, units,
 * follow-ups), Insights and the rules and team in Settings. A job is the same record everywhere.
 */
export function HvacDashboard({
  section,
  view,
  s,
  h,
  overview,
  timezone = 'Asia/Muscat',
  onChanged,
  onGo,
  initialAction = '',
  tabs = null,
}) {
  const ar = s.ar,
    tr = (en, arabic) => (ar ? arabic : en);
  const manager = overview.workspaceRole === 'manager',
    tech = overview.teamSummary?.operationalRole === 'technician';
  const shell = useWorkspaceShell({
    recordParam: 'job',
    loadLists: formLists,
    setError: message => setError(message),
    reasonOf: reason => h.reason(reason) || s.reason(reason),
    onGo,
  });
  const {
    params,
    setParam,
    form,
    values,
    setValues,
    lists,
    setLists,
    preview,
    setPreview,
    openForm,
    closeForm,
    openRecord: openJob,
    back,
    recordId: jobId,
  } = shell;
  const contractId = params.get('contract');
  const key = [
    section,
    view,
    params.get('metric'),
    params.get('period'),
    params.get('segment'),
    params.get('filter'),
    params.get('day'),
    params.get('customer'),
  ].join('|');
  const state = usePolling(() => load(section, view, manager, params, timezone), [key, manager], { interval: 30000 });
  const { busy, setError, perform, act, notices, changes, clear } = useWorkspaceActions({
    ar,
    s,
    h,
    refresh: state.refresh,
    onChanged,
  });
  const data = { ...(lists || {}), ...(state.data || {}), expenseCategories: overview.pack?.expenseCategories || [] };
  useEffect(() => {
    clear();
    if (initialAction === 'job') openForm('job', { jobType: 'repair' });
    else closeForm();
  }, [section, view, initialAction]);

  const openContract = id => setParam({ contract: id, job: null });
  const openRow = id => (window.matchMedia?.(WIDE).matches && view === 'jobs' ? setPreview(id) : openJob(id));
  const submit = async e => {
    e.preventDefault();
    let submission;
    try {
      submission = buildHvacSubmission(form, values, { requestId: crypto.randomUUID(), timezone });
    } catch {
      setError(tr('Enter a valid date and time.', 'أدخل تاريخاً ووقتاً صالحين.'));
      return;
    }
    let saved = null;
    if (
      !submission ||
      !(await perform(submission.operation, submission.body, result => {
        saved = result;
      }))
    )
      return;
    // A unit added from a job's record is linked to that job too.
    if (form === 'unit' && values.jobId && saved?.id)
      await perform('hvac_job_save', {
        jobId: values.jobId,
        version: values.jobVersion,
        hvac: { unitIds: [...(values.jobUnitIds || []), saved.id] },
      });
    closeForm();
    if (['unit', 'invite'].includes(form)) setLists(null);
  };
  const backLabel = shellBack(params, ar, {
    customers: ['Back to customers', 'العودة إلى العملاء'],
    fallback:
      view === 'schedule'
        ? ['Back to schedule', 'العودة إلى الجدول']
        : view === 'followups'
          ? ['Back to follow-ups', 'العودة إلى المتابعات']
          : view === 'contracts'
            ? ['Back to contracts', 'العودة إلى العقود']
            : ['Back to jobs', 'العودة إلى الأعمال'],
  });

  const formPanel = form && (
    <HvacForm
      form={form}
      values={values}
      setValues={setValues}
      ar={ar}
      h={h}
      busy={busy}
      data={data}
      onSubmit={submit}
      onCancel={closeForm}
    />
  );
  const wrap = body => (
    <div className="hb-workspace hb-hvac">
      {notices}
      {formPanel}
      {body}
    </div>
  );
  if (section === 'work' && jobId)
    return wrap(
      <JobRecord
        jobId={jobId}
        ar={ar}
        h={h}
        s={s}
        timezone={timezone}
        manager={manager}
        tech={tech}
        busy={busy}
        version={changes}
        backLabel={backLabel}
        act={act}
        openForm={openForm}
        onGo={onGo}
        onClose={back}
        onOpenJob={openJob}
        onFollowups={() => onGo('work', { view: 'followups', filter: 'today' })}
      />,
    );
  if (section === 'work' && contractId)
    return wrap(
      <ContractRecord
        contractId={contractId}
        ar={ar}
        h={h}
        s={s}
        timezone={timezone}
        manager={manager}
        busy={busy}
        version={changes}
        backLabel={tr('Back to contracts', 'العودة إلى العقود')}
        act={act}
        openForm={openForm}
        onGo={onGo}
        onClose={() => setParam({ contract: null })}
        onOpenJob={openJob}
        onOpenContract={openContract}
      />,
    );
  if (state.loading && !state.data)
    return (
      <p className="ld-state" role="status">
        {s.t('loading')}
      </p>
    );
  if (state.error && !state.data)
    return (
      <div className="ld-state" role="alert">
        <p>{h.reason(state.error.reason) || s.reason(state.error.reason)}</p>
        <button type="button" className="ld-button" onClick={() => state.refresh()}>
          {h.t('retry')}
        </button>
      </div>
    );
  const shared = { ar, h, s, data, busy, timezone };

  if (section === 'insights')
    return wrap(
      <InsightsView
        {...shared}
        params={params}
        categories={data.expenseCategories}
        onParams={patch => setParam(patch)}
        onAddExpense={
          manager
            ? () =>
                openForm('expense', { method: 'bank_transfer', paidOn: formatLocal(Date.now(), timezone).slice(0, 10) })
            : null
        }
        onRecords={(metric, segment) =>
          onGo('work', metricSearch({ metric, period: params.get('period') || '30d', segment }))
        }
      />,
    );
  if (section === 'settings')
    return wrap(
      view === 'team' ? (
        <TeamView {...shared} act={act} openForm={openForm} words={STAFF_WORDS} />
      ) : (
        <RulesView
          ar={ar}
          h={h}
          settings={overview.settings}
          busy={busy}
          onSave={body => perform('settings_update', body)}
        />
      ),
    );

  const header = (
    <PageHeader
      icon="snowflake"
      title={overview.pack?.ownerUi?.work?.[ar ? 'ar' : 'en'] || tr('Jobs', 'الأعمال')}
      description={tr(
        'Requests, visits, estimates and maintenance contracts. Record what happened on site; reminders, follow-ups and figures follow by themselves.',
        'الطلبات والزيارات والتسعيرات وعقود الصيانة. سجّل ما حدث في الموقع، وتتبعه التذكيرات والمتابعات والأرقام تلقائياً.',
      )}
      primary={
        tech ? null : { label: tr('New job', 'عمل جديد'), onClick: () => openForm('job', { jobType: 'repair' }) }
      }
    />
  );
  const strip = <NeedsAttention ar={ar} summary={data.summary} onGo={onGo} />;
  const bookFor = job =>
    openForm('visit', {
      jobId: job.id,
      technicianAccountId: job.technicianAccountId || '',
      date: formatLocal(data.day || Date.now(), timezone).slice(0, 10),
      from: '09:00',
      to: '11:00',
      subject: `#${job.number} · ${job.contactName || ''}`,
    });
  let body;
  if (data.records)
    body = (
      <MetricRecords
        ar={ar}
        h={h}
        s={s}
        timezone={timezone}
        data={data.records}
        onOpen={openJob}
        onOpenContract={openContract}
        onBack={() => onGo('insights', insightsReturn(params))}
      />
    );
  else if (view === 'contracts')
    body = (
      <ContractsView
        {...shared}
        manager={manager}
        onOpen={openContract}
        onAdd={() =>
          openForm('contract', { visitsPerYear: 4, startsOn: formatLocal(Date.now(), timezone).slice(0, 10) })
        }
      />
    );
  else if (view === 'units')
    body = (
      <UnitsView
        {...shared}
        onAdd={tech ? null : () => openForm('unit', { unitType: 'split' })}
        onService={openForm.bind(null, 'service')}
        onOpenCustomer={id => setParam({ customer: id, view: 'jobs' })}
      />
    );
  else if (view === 'followups')
    body = (
      <FollowupsView
        {...shared}
        manager={manager}
        filter={HVAC_FILTERS.includes(params.get('filter')) ? params.get('filter') : 'today'}
        onFilter={f => setParam({ filter: f })}
        act={act}
        onOpenJob={openJob}
        onOpenCustomer={id => onGo('work', { view: 'jobs', customer: id })}
        onTriage={tech ? null : openJob}
        customerFilter={params.get('customer')}
        onClearCustomer={() => setParam({ customer: null })}
      />
    );
  else if (view === 'jobs') {
    const quick = QUICK.includes(params.get('quick')) ? params.get('quick') : 'all';
    const rows = data.jobs?.items || [];
    const selected = preview && rows.find(r => String(r.id) === String(preview));
    body = (
      <div className={`hb-board-layout ${selected ? 'has-preview' : ''}`}>
        <div>
          {params.get('customer') && (
            <p className="hb-filter-note" role="status">
              {tr('Showing one customer’s jobs.', 'تُعرض أعمال عميل واحد.')}{' '}
              <button type="button" className="ld-link" onClick={() => setParam({ customer: null })}>
                {tr('Show all', 'عرض الكل')}
              </button>
            </p>
          )}
          <JobList
            ar={ar}
            s={s}
            h={h}
            timezone={timezone}
            data={data}
            quick={quick}
            onQuick={q => setParam({ quick: q === 'all' ? null : q })}
            onOpen={openRow}
            selectedId={preview}
            onAdd={tech ? null : () => openForm('job', { jobType: 'repair' })}
          />
        </div>
        {selected && (
          <JobPreview
            row={selected}
            ar={ar}
            s={s}
            timezone={timezone}
            onOpenFull={openJob}
            onClose={() => setPreview(null)}
          />
        )}
      </div>
    );
  } else
    body = (
      <ScheduleView
        ar={ar}
        s={s}
        timezone={timezone}
        data={data}
        busy={busy}
        act={act}
        day={data.day || Date.now()}
        onOpen={openJob}
        onBook={tech ? null : bookFor}
        manager={tech ? null : manager}
        onDay={ms => setParam({ day: ms === null ? null : formatLocal(ms, timezone).slice(0, 10) })}
      />
    );
  return (
    <div className="hb-workspace hb-hvac">
      {header}
      {strip}
      {tabs}
      {notices}
      {formPanel}
      {body}
    </div>
  );
}
