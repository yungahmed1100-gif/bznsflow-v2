import React, { useEffect, useMemo } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { hasib, dashboard } from '../../lib/dashboard/api';
import { metricSearch, insightsReturn } from '../../lib/hasib/workspaceLinks.js';
import { MEDIA_QUICK, CLOSED_FILTERS, mediaQuickFilter, buildMediaSubmission } from '../../lib/hasib/mediaWork.js';
import { PageHeader } from './DashboardVisuals';
import { AttentionStrip } from './workspace/AttentionStrip.jsx';
import { useWorkspaceActions } from './workspace/useWorkspaceActions.jsx';
import { useWorkspaceShell, backLabel as shellBack } from './workspace/useWorkspaceShell.jsx';
import { TeamView } from './workspace/TeamView.jsx';
import { ProductionBoard, ProductionPreview, ClosedList } from './media/BoardView.jsx';
import { CalendarView } from './media/CalendarView.jsx';
import { ResourcesView } from './media/ResourcesView.jsx';
import { FollowupsView, MEDIA_FILTERS } from './media/FollowupsView.jsx';
import { InsightsView } from './media/InsightsView.jsx';
import { MetricRecords } from './media/MetricRecords.jsx';
import { RulesView } from './media/RulesView.jsx';
import { ProductionRecord } from './media/ProductionRecord.jsx';
import { MediaForm } from './media/MediaForm.jsx';
import { label } from './media/labels.js';

const PRODUCER_WORDS = { invite: ['Invite a producer', 'دعوة منتج'], none: ['No producers yet', 'لا يوجد منتجون بعد'], hint: ['Invite your producers by email.', 'ادعُ منتجيك بالبريد الإلكتروني.'],
  scope: limit => [`One manager and up to ${limit} producers. Producers see their own productions; quotes, money, costs and approvals stay with you.`, `مدير واحد وحتى ${limit} منتجين. يرى المنتجون إنتاجاتهم فقط، وتبقى العروض والمال والتكاليف والموافقات لك.`] };
const BRIEF_DEFAULTS = { productionType: 'video', format: 'video', quantity: 1, language: 'ar', clearance: 'unknown', channels: [] };

async function load(section, view, manager, params) {
  if (section === 'insights') return { insights: await hasib('media_insights', { period: params.get('period') || '30d', ...(params.get('segment') ? { segment: params.get('segment') } : {}) }), team: await hasib('team_list') };
  if (section === 'settings') return { team: await hasib('team_list') };
  const [summary, team] = await Promise.all([hasib('media_overview'), manager ? hasib('team_list') : Promise.resolve({ members: [] })]);
  if (params.get('metric') && params.get('from') === 'insights' && manager)
    return { summary, team, records: await hasib('media_metric_records', { metric: params.get('metric'), period: params.get('period') || '30d', ...(params.get('segment') ? { segment: params.get('segment') } : {}) }) };
  if (view === 'calendar') return { summary, team, calendar: await hasib('media_calendar', {}) };
  if (view === 'resources') return { summary, team, resources: await hasib('media_resources') };
  if (view === 'followups') return { summary, team, followups: await hasib('media_followups', { filter: params.get('filter') || 'today', ...(params.get('production') ? { productionId: params.get('production') } : {}) }) };
  return { summary, team, productions: await hasib('media_productions') };
}

/** The forms pick clients and crew; they load once, when a form first opens. */
const formLists = () => Promise.all([dashboard('contacts', { limit: 50 }), hasib('media_resources')]).then(([contacts, resources]) => ({ contacts, resources }));

/** The strip above Productions: exceptions that need someone, each opening the view that holds them. */
function NeedsAttention({ ar, summary, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const f = summary?.followups?.counts || {}, a = summary?.attention || {};
  return <AttentionStrip ar={ar} onGo={onGo} items={[
    ['overdue', f.overdue, tr('Overdue follow-ups', 'متابعات متأخرة'), 'coral', { view: 'followups', filter: 'overdue' }],
    ['risk', a.shootAtRisk, tr('Shoots at risk', 'تصويرات معرّضة للخطر'), 'coral', { view: 'board', quick: 'shoot_at_risk' }],
    ['decision', f.decision, tr('Needs a decision', 'تحتاج قراراً'), 'yellow', { view: 'followups', filter: 'decision' }],
    ['cuts', a.cutAwaitingApproval, tr('Cuts awaiting the client', 'نسخ بانتظار العميل'), 'orange', { view: 'board', quick: 'cut_awaiting' }],
    ['scope', a.extraScope, tr('Extra scope to decide', 'نطاق إضافي بانتظار القرار'), 'yellow', { view: 'board', quick: 'extra_scope' }],
    ['holds', a.holdsExpiring, tr('Holds expiring', 'حجوزات مبدئية تنتهي'), 'orange', { view: 'calendar' }],
    ['today', f.today, tr('Due today', 'مستحقة اليوم'), 'orange', { view: 'followups', filter: 'today' }],
    ['brief', a.briefIncomplete, tr('Briefs to complete', 'موجزات تحتاج إكمالاً'), 'blue', { view: 'board', quick: 'brief_incomplete' }],
  ]} />;
}

/**
 * Media & production on Ascend (ascend/media.md): Productions (board, shoot calendar, resources,
 * follow-ups), Insights and the rules and team in Settings. Every record is the same production id everywhere.
 */
export function MediaDashboard({ section, view, s, h, overview, timezone = 'Asia/Muscat', onChanged, onGo, initialAction = '', tabs = null }) {
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en);
  const manager = overview.workspaceRole === 'manager';
  const { params, setParam, form, values, setValues, lists, setLists, preview, setPreview, openForm, closeForm, openRecord: openProduction, openRow: openCard, back, recordId: productionId } =
    useWorkspaceShell({ recordParam: 'production', loadLists: formLists, setError: message => setError(message), reasonOf: reason => h.reason(reason) || s.reason(reason), onGo });
  const key = [section, view, params.get('metric'), params.get('period'), params.get('segment'), params.get('filter'), view === 'followups' ? productionId : ''].join('|');
  const state = usePolling(() => load(section, view, manager, params), [key, manager], { interval: 30000 });
  const { busy, setError, perform, act, notices, changes, clear } = useWorkspaceActions({ ar, s, h, refresh: state.refresh, onChanged });
  const data = { ...(lists || {}), ...(state.data || {}) };
  const actorAccountId = overview.teamSummary?.actorAccountId;
  const producers = useMemo(() => new Map([...(data.team?.members || []).filter(m => m.accountId).map(m => [String(m.accountId), m.email]), ...(manager ? [] : [[String(actorAccountId), tr('Me', 'أنا')]])]), [data.team, manager, actorAccountId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { clear(); if (initialAction === 'brief') openForm('brief', BRIEF_DEFAULTS); else closeForm(); }, [section, view, initialAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async e => {
    e.preventDefault();
    const submission = buildMediaSubmission(form, values, { requestId: crypto.randomUUID(), timezone });
    const created = form === 'brief' && !values.productionId;
    if (submission && await perform(submission.operation, submission.body, result => { if (created && result?.id) openProduction(result.id); })) { closeForm(); if (form === 'resource') setLists(null); }
  };
  const backLabel = shellBack(params, ar, { fallback: view === 'followups' ? ['Back to follow-ups', 'العودة إلى المتابعات'] : view === 'calendar' ? ['Back to the calendar', 'العودة إلى الجدول'] : ['Back to the board', 'العودة إلى اللوحة'] });

  const formPanel = form && <MediaForm form={form} values={values} setValues={setValues} ar={ar} h={h} s={s} busy={busy} data={data} manager={manager} actorAccountId={actorAccountId} onSubmit={submit} onCancel={closeForm} />;
  if (section === 'work' && productionId && view !== 'followups') return <div className="hb-workspace hb-media">{notices}{formPanel}
    <ProductionRecord productionId={productionId} ar={ar} h={h} s={s} timezone={timezone} manager={manager} busy={busy} version={changes} backLabel={backLabel} producers={producers}
      act={act} openForm={openForm} onGo={onGo} onClose={back} onFollowups={() => onGo('work', { view: 'followups', filter: 'today', production: productionId })} /></div>;
  if (state.loading && !state.data) return <p className="ld-state" role="status">{s.t('loading')}</p>;
  if (state.error && !state.data) return <div className="ld-state" role="alert"><p>{h.reason(state.error.reason) || s.reason(state.error.reason)}</p><button type="button" className="ld-button" onClick={() => state.refresh()}>{h.t('retry')}</button></div>;
  const shared = { ar, h, s, data, busy, timezone };

  if (section === 'insights') return <div className="hb-workspace hb-media">{notices}
    <InsightsView {...shared} params={params} onParams={patch => setParam(patch)} onRecords={(metric, segment) => onGo('work', metricSearch({ metric, period: params.get('period') || '30d', segment }))} /></div>;
  if (section === 'settings') return <div className="hb-workspace hb-media">{notices}{formPanel}
    {view === 'team' ? <TeamView {...shared} act={act} openForm={openForm} words={PRODUCER_WORDS} />
      : <RulesView ar={ar} h={h} settings={overview.settings} busy={busy} onSave={body => perform('settings_update', body)} />}</div>;

  const header = <PageHeader icon="film" title={overview.pack?.ownerUi?.work?.[ar ? 'ar' : 'en'] || tr('Productions', 'الإنتاج')}
    description={tr('Every production from brief to final handoff, with what needs someone now at the top.', 'كل إنتاج من الموجز حتى التسليم النهائي، وفي الأعلى ما يحتاج أحداً الآن.')}
    primary={{ label: tr('New production brief', 'موجز إنتاج جديد'), onClick: () => openForm('brief', BRIEF_DEFAULTS) }}>
    {manager && <div className="hb-header-actions"><button type="button" className="ld-button ld-quiet" onClick={() => openForm('resource', { category: 'crew' })}>{tr('Add crew or equipment', 'إضافة طاقم أو معدات')}</button></div>}
  </PageHeader>;
  const strip = <NeedsAttention ar={ar} summary={data.summary} onGo={onGo} />;
  let body;
  if (data.records) body = <MetricRecords ar={ar} h={h} s={s} timezone={timezone} data={data.records} onOpen={openProduction} onBack={() => onGo('insights', insightsReturn(params))} />;
  else if (view === 'calendar') body = <CalendarView {...shared} onOpen={openProduction} />;
  else if (view === 'resources') body = <ResourcesView {...shared} manager={manager} onAdd={() => openForm('resource', { category: 'crew' })}
    onEdit={r => openForm('resource', { mediaResourceId: r.id, version: r.version, name: r.name, category: r.category, active: r.active, rate: r.internalRateMinor ? r.internalRateMinor / 1000 : '' })} />;
  else if (view === 'followups') body = <FollowupsView {...shared} manager={manager} filter={MEDIA_FILTERS.includes(params.get('filter')) ? params.get('filter') : 'today'} onFilter={f => setParam({ filter: f })}
    act={act} onOpen={id => onGo('work', { view: 'board', production: id })} onGo={onGo} productionFilter={productionId} onClearProduction={() => setParam({ production: null })} />;
  else {
    const quick = MEDIA_QUICK.includes(params.get('quick')) ? params.get('quick') : 'all';
    const closed = CLOSED_FILTERS.includes(params.get('closed')) ? params.get('closed') : null;
    const all = data.productions?.items || [];
    const open = all.filter(p => !CLOSED_FILTERS.includes(p.status));
    const rows = closed ? all.filter(p => p.status === closed) : mediaQuickFilter(open, quick, { actorAccountId });
    const selected = preview && all.find(p => p.id === preview);
    body = <>
      <div className="hb-board-filters">
        <div className="ld-segmented" role="radiogroup" aria-label={tr('Show productions', 'عرض الإنتاجات')}>
          {MEDIA_QUICK.map(q => <label key={q}><input type="radio" name="md-quick" checked={!closed && quick === q} onChange={() => setParam({ quick: q === 'all' ? null : q, closed: null })} /><span>{label('quick', q, ar)}</span></label>)}
        </div>
        <div className="ld-segmented" role="radiogroup" aria-label={tr('Finished or paused', 'المنتهية أو المتوقفة')}>
          {CLOSED_FILTERS.map(st => <label key={st}><input type="radio" name="md-quick" checked={closed === st} onChange={() => setParam({ closed: st, quick: null })} /><span>{label('closed', st, ar)} <b className="ld-num">{data.summary?.pipeline?.[st] ?? 0}</b></span></label>)}
        </div>
      </div>
      {data.productions?.complete === false && <p className="hb-warn" role="status">{tr('Showing the newest 1,000 productions.', 'تُعرض أحدث ١٠٠٠ إنتاج.')}</p>}
      <div className={`hb-board-layout ${selected ? 'has-preview' : ''}`}>
        {closed ? <ClosedList ar={ar} s={s} h={h} timezone={timezone} rows={rows} onOpen={openProduction} />
          : <ProductionBoard ar={ar} s={s} timezone={timezone} rows={rows} producers={producers} busy={busy} selectedId={preview} emptyFilter={quick !== 'all'}
            onOpen={openCard} onAdd={() => openForm('brief', BRIEF_DEFAULTS)}
            onMove={(p, status) => act('media_production_status', { productionId: p.id, version: p.version, status }, null, tr(`Move ${p.ref} to ${label('status', status, false)}?`, `نقل ${p.ref} إلى «${label('status', status, true)}»؟`))} />}
        {selected && <ProductionPreview p={selected} ar={ar} h={h} s={s} timezone={timezone} producerName={producers.get(String(selected.producerId))}
          onOpenFull={openProduction} onClose={() => setPreview(null)} onGo={onGo} />}
      </div>
    </>;
  }
  return <div className="hb-workspace hb-media">{header}{strip}{tabs}{notices}{formPanel}{body}</div>;
}
