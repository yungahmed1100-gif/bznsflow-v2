import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePolling } from '../../hooks/usePolling';
import { hasib } from '../../lib/dashboard/api';
import { PageHeader } from './DashboardVisuals';
import { AttentionStrip } from './workspace/AttentionStrip.jsx';
import { useWorkspaceActions } from './workspace/useWorkspaceActions.jsx';
import { AutomotiveDashboard } from './AutomotiveDashboard';
import { FollowupsView, AUTOMOTIVE_FILTERS } from './automotive/FollowupsView.jsx';
import { RulesView } from './automotive/RulesView.jsx';

/** The strip above the Workshop: exceptions that need someone, each opening the view that holds them. */
function NeedsAttention({ ar, summary, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const f = summary?.followups?.counts || {}, a = summary?.attention || {};
  return <AttentionStrip ar={ar} onGo={onGo} items={[
    ['overdue', f.overdue, tr('Overdue follow-ups', 'متابعات متأخرة'), 'coral', { view: 'followups', filter: 'overdue' }],
    ['promise', a.pastPromise, tr('Past the promised time', 'تجاوزت الموعد الموعود'), 'coral', { view: 'board', filter: 'overdue' }],
    ['approval', a.awaitingApproval, tr('Estimates with customers', 'عروض أسعار لدى العملاء'), 'yellow', { view: 'board', filter: 'awaiting_approval' }],
    ['decision', f.decision, tr('Needs a decision', 'تحتاج قراراً'), 'yellow', { view: 'followups', filter: 'decision' }],
    ['parts', a.partsNeeded, tr('Waiting on parts', 'بانتظار القطع'), 'orange', { view: 'parts' }],
    ['ready', a.ready, tr('Ready for collection', 'جاهزة للاستلام'), 'green', { view: 'board', filter: 'ready' }],
    ['today', f.today, tr('Due today', 'مستحقة اليوم'), 'orange', { view: 'followups', filter: 'today' }],
  ]} />;
}

/**
 * Automotive on Ascend's six tabs (ascend/automotive.md): Workshop (board, schedule, parts,
 * follow-ups), Insights, and the rules, team and workshop setup in Settings. The workshop's own
 * screens are the ones it already had; the kit adds the strip, Follow-ups and Rules around them.
 */
export function AutomotiveWorkspace({ section, view, s, h, overview, timezone = 'Asia/Muscat', connections = null, onChanged, onGo, initialAction = '', tabs = null }) {
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en);
  const manager = overview.workspaceRole === 'manager';
  const [params, setParams] = useSearchParams();
  const filter = AUTOMOTIVE_FILTERS.includes(params.get('filter')) ? params.get('filter') : 'today';
  const key = [section, view, view === 'followups' ? filter : ''].join('|');
  const state = usePolling(() => section !== 'work' ? Promise.resolve({}) : view === 'followups'
    ? Promise.all([hasib('automotive_overview'), hasib('automotive_followups', { filter })]).then(([summary, followups]) => ({ summary, followups }))
    : hasib('automotive_overview').then(summary => ({ summary })), [key], { interval: 30000 });
  const { busy, perform, act, notices } = useWorkspaceActions({ ar, s, h, refresh: state.refresh, onChanged });
  const shared = { s, h, overview, timezone, connections, onChanged, onGo, initialAction };

  if (section === 'insights') return <div className="hb-workspace hb-automotive-six">{notices}<AutomotiveDashboard mode="money" {...shared} /></div>;
  if (section === 'settings') {
    if (view === 'team') return <div className="hb-workspace hb-automotive-six">{notices}<AutomotiveDashboard mode="team" {...shared} /></div>;
    if (view === 'workshop') return <div className="hb-workspace hb-automotive-six">{notices}<AutomotiveDashboard mode="settings" {...shared} /></div>;
    return <div className="hb-workspace hb-automotive-six">{notices}<RulesView ar={ar} h={h} settings={overview.settings} busy={busy} onSave={body => perform('settings_update', body)} /></div>;
  }

  const strip = <NeedsAttention ar={ar} summary={state.data?.summary} onGo={(tab, p) => onGo(tab, p)} />;
  if (view === 'followups') {
    const header = <PageHeader icon="wrench" title={overview.pack?.ownerUi?.work?.[ar ? 'ar' : 'en'] || tr('Workshop', 'الورشة')}
      description={tr('What the workshop needs someone for, and the messages its rules wrote.', 'ما تحتاجه الورشة من أحد، والرسائل التي كتبتها قواعدها.')} />;
    const body = state.loading && !state.data ? <p className="ld-state" role="status">{s.t('loading')}</p>
      : <FollowupsView ar={ar} s={s} timezone={timezone} data={state.data || {}} manager={manager} busy={busy} filter={filter}
        onFilter={f => { const next = new URLSearchParams(params); next.set('filter', f); setParams(next); }} act={act}
        onOpen={id => onGo('work', { view: 'board', workorder: id })} onGo={onGo} />;
    return <div className="hb-workspace hb-automotive-six">{header}{strip}{tabs}{notices}{body}</div>;
  }
  if (view === 'parts') return <div className="hb-workspace hb-automotive-six">{tabs}{strip}<AutomotiveDashboard mode="parts" {...shared} /></div>;
  return <div className="hb-workspace hb-automotive-six">{tabs}<AutomotiveDashboard mode="workshop" focus={view === 'schedule' ? 'schedule' : 'work'} strip={strip} {...shared} /></div>;
}
