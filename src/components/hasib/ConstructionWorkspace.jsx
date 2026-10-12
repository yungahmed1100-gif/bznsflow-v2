import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePolling } from '../../hooks/usePolling';
import { hasib } from '../../lib/dashboard/api';
import { PageHeader } from './DashboardVisuals';
import { AttentionStrip } from './workspace/AttentionStrip.jsx';
import { useWorkspaceActions } from './workspace/useWorkspaceActions.jsx';
import { ConstructionDashboard } from './ConstructionDashboard';
import { FollowupsView, CONSTRUCTION_FILTERS } from './construction/FollowupsView.jsx';
import { RulesView } from './construction/RulesView.jsx';

/** The strip above Projects: exceptions that need someone, each opening the view that holds them. Money is the manager's. */
function NeedsAttention({ ar, summary, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const f = summary?.followups?.counts || {}, a = summary?.attention || {};
  return <AttentionStrip ar={ar} onGo={onGo} items={[
    ['overdue', f.overdue, tr('Overdue follow-ups', 'متابعات متأخرة'), 'coral', { view: 'followups', filter: 'overdue' }],
    ['risk', a.atRisk, tr('Projects at schedule risk', 'مشاريع معرّضة لخطر الجدول'), 'coral', { view: 'projects' }],
    ['approvals', a.approvalsOverdue, tr('Variations waiting too long', 'أوامر تغيير طال انتظارها'), 'yellow', { view: 'followups', filter: 'waiting' }],
    ['decision', f.decision, tr('Needs a decision', 'تحتاج قراراً'), 'yellow', { view: 'followups', filter: 'decision' }],
    ['materials', a.materialsDue, tr('Materials due on site', 'مواد مطلوبة في الموقع'), 'orange', { view: 'procurement' }],
    ['receivables', a.receivablesOverdue, tr('Certified payments overdue', 'دفعات معتمدة متأخرة'), 'coral', { view: 'followups', filter: 'waiting' }],
    ['today', f.today, tr('Due today', 'مستحقة اليوم'), 'orange', { view: 'followups', filter: 'today' }],
  ]} />;
}

/**
 * Construction on Ascend's six tabs (ascend/construction.md): Projects (projects, procurement and
 * site controls, follow-ups), Insights, and the rules, team and project defaults in Settings. The
 * contractor's own screens are the ones it already had; the kit adds the strip, Follow-ups and Rules.
 */
export function ConstructionWorkspace({ section, view, s, h, overview, timezone = 'Asia/Muscat', onChanged, onGo, initialAction = '', tabs = null }) {
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en);
  const manager = overview.workspaceRole === 'manager';
  const [params, setParams] = useSearchParams();
  const filter = CONSTRUCTION_FILTERS.includes(params.get('filter')) ? params.get('filter') : 'today';
  const key = [section, view, view === 'followups' ? filter : ''].join('|');
  const state = usePolling(() => section !== 'work' ? Promise.resolve({}) : view === 'followups'
    ? Promise.all([hasib('construction_overview'), hasib('construction_followups', { filter })]).then(([summary, followups]) => ({ summary, followups }))
    : hasib('construction_overview').then(summary => ({ summary })), [key], { interval: 30000 });
  const { busy, perform, act, notices } = useWorkspaceActions({ ar, s, h, refresh: state.refresh, onChanged });
  const shared = { s, overview, onChanged, onGo, initialAction };
  const wrap = body => <div className="hb-workspace hb-construction-six">{notices}{body}</div>;

  if (section === 'insights') return wrap(<ConstructionDashboard mode="money" {...shared} />);
  if (section === 'settings') {
    if (view === 'team') return wrap(<ConstructionDashboard mode="team" {...shared} />);
    if (view === 'site') return wrap(<ConstructionDashboard mode="settings" {...shared} />);
    return wrap(<RulesView ar={ar} h={h} settings={overview.settings} busy={busy} onSave={body => perform('settings_update', body)} />);
  }
  const strip = <NeedsAttention ar={ar} summary={state.data?.summary} onGo={onGo} />;
  if (view === 'followups') {
    const header = <PageHeader icon="building-2" title={overview.pack?.ownerUi?.work?.[ar ? 'ar' : 'en'] || tr('Projects', 'المشاريع')}
      description={tr('What the projects need someone for, and the messages their rules wrote.', 'ما تحتاجه المشاريع من أحد، والرسائل التي كتبتها قواعدها.')} />;
    const body = state.loading && !state.data ? <p className="ld-state" role="status">{s.t('loading')}</p>
      : <FollowupsView ar={ar} s={s} timezone={timezone} data={state.data || {}} manager={manager} busy={busy} filter={filter}
        onFilter={f => { const next = new URLSearchParams(params); next.set('filter', f); setParams(next); }} act={act}
        onOpen={() => onGo('work', { view: 'projects' })} onGo={onGo} />;
    return <div className="hb-workspace hb-construction-six">{header}{strip}{tabs}{notices}{body}</div>;
  }
  return <div className="hb-workspace hb-construction-six">{tabs}<ConstructionDashboard mode={view === 'procurement' ? 'procurement' : 'projects'} strip={strip} {...shared} /></div>;
}
