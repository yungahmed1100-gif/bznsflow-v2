import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePolling } from '../../hooks/usePolling';
import { hasib } from '../../lib/dashboard/api';
import { PageHeader } from './DashboardVisuals';
import { AttentionStrip } from './workspace/AttentionStrip.jsx';
import { useWorkspaceActions } from './workspace/useWorkspaceActions.jsx';
import { OrdersView } from './OrdersView';
import { StockView } from './StockView';
import { ProductRequests } from './ProductRequests';
import { ServiceView } from './ServiceView';
import { InsightsView } from './InsightsView';
import { ExpensesView } from './ExpensesView';
import { TeamView } from './TeamView';
import { FollowupsView, STORE_FILTERS } from './store/FollowupsView.jsx';
import { RulesView } from './store/RulesView.jsx';

/** The strip above the store's Work: exceptions that need someone, each opening the view that holds them. */
function NeedsAttention({ ar, tech, summary, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const f = summary?.followups?.counts || {}, a = summary?.attention || {}, sales = tech ? 'sales' : 'orders';
  return <AttentionStrip ar={ar} onGo={onGo} items={[
    ['overdue', f.overdue, tr('Overdue follow-ups', 'متابعات متأخرة'), 'coral', { view: 'followups', filter: 'overdue' }],
    ['unconfirmed', a.unconfirmed, tr('Orders Layla could not confirm', 'طلبات لم تؤكدها ليلى'), 'yellow', { view: sales, filter: 'layla_waiting' }],
    ...(tech ? [['quotes', a.approvalPending, tr('Repair quotes with customers', 'عروض صيانة لدى العملاء'), 'yellow', { view: 'followups', filter: 'waiting' }],
      ['repairs', a.repairsReady, tr('Repairs ready to collect', 'صيانة جاهزة للاستلام'), 'green', { view: 'repairs' }]] : []),
    ['decision', f.decision, tr('Needs a decision', 'تحتاج قراراً'), 'yellow', { view: 'followups', filter: 'decision' }],
    ['ready', a.ready, tr('Orders ready for collection', 'طلبات جاهزة للاستلام'), 'green', { view: sales, filter: 'ready' }],
    ...(tech ? [] : [['requests', a.requests, tr('Customers waiting for a product', 'عملاء بانتظار منتج'), 'orange', { view: 'requests' }]]),
    ['low', a.lowStock, tr('Low stock', 'مخزون منخفض'), 'orange', { view: tech ? 'devices' : 'products', low: '1' }],
    ['today', f.today, tr('Due today', 'مستحقة اليوم'), 'orange', { view: 'followups', filter: 'today' }],
  ]} />;
}

/**
 * Retail and Phones & electronics on Ascend's six tabs (ascend/retail.md, ascend/retail-tech.md):
 * Orders (orders, products, customer requests, follow-ups) or Store & repairs (repairs, sales,
 * devices, follow-ups), Insights with expenses, and the rules and team in Settings. Every view is the
 * screen the store already had; the kit adds the strip, Follow-ups and Rules around them.
 */
export function StoreWorkspace({ section, view, s, h, overview, timezone = 'Asia/Muscat', connections = null, onChanged, onGo, initialAction = '', tabs = null }) {
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), tech = overview.pack?.id === 'retail-tech';
  const manager = overview.workspaceRole === 'manager';
  const [params, setParams] = useSearchParams();
  const queueFilter = STORE_FILTERS.includes(params.get('filter')) ? params.get('filter') : 'today';
  const key = [section, view, view === 'followups' ? queueFilter : ''].join('|');
  const state = usePolling(() => section !== 'work' ? Promise.resolve({}) : view === 'followups'
    ? Promise.all([hasib('store_overview'), hasib('store_followups', { filter: queueFilter })]).then(([summary, followups]) => ({ summary, followups }))
    : hasib('store_overview').then(summary => ({ summary })), [key], { interval: 30000 });
  const { busy, perform, act, notices } = useWorkspaceActions({ ar, s, h, refresh: state.refresh, onChanged });
  const wrap = body => <div className="hb-workspace hb-store-six">{notices}{body}</div>;
  const clearLink = () => setParams(new URLSearchParams({ tab: 'work', view: 'repairs' }), { replace: true });

  if (section === 'insights') return wrap(view === 'expenses' ? <ExpensesView s={s} h={h} overview={overview} timezone={timezone} initialCreate={initialAction === 'expense'} /> : <InsightsView s={s} h={h} overview={overview} onGo={onGo} />);
  if (section === 'settings') return wrap(view === 'team' ? <TeamView s={s} h={h} /> : <RulesView ar={ar} h={h} packId={overview.pack?.id} settings={overview.settings} busy={busy} onSave={body => perform('settings_update', body)} />);

  const strip = <NeedsAttention ar={ar} tech={tech} summary={state.data?.summary} onGo={onGo} />;
  if (view === 'followups') {
    const header = <PageHeader icon={tech ? 'smartphone' : 'receipt'} title={overview.pack?.ownerUi?.work?.[ar ? 'ar' : 'en'] || (tech ? tr('Store & repairs', 'المتجر والصيانة') : tr('Orders', 'الطلبات'))}
      description={tr('What the store needs someone for, and the messages its rules wrote.', 'ما يحتاجه المتجر من أحد، والرسائل التي كتبتها قواعده.')} />;
    const body = state.loading && !state.data ? <p className="ld-state" role="status">{s.t('loading')}</p>
      : <FollowupsView ar={ar} s={s} timezone={timezone} data={state.data || {}} manager={manager} busy={busy} filter={queueFilter}
        onFilter={f => { const next = new URLSearchParams(params); next.set('filter', f); setParams(next); }} act={act}
        onOpenOrder={id => onGo('work', { view: tech ? 'sales' : 'orders', order: id })} onOpenRepair={id => onGo('work', { view: 'repairs', repair: id })} onGo={onGo} />;
    return <div className="hb-workspace hb-store-six">{header}{strip}{tabs}{notices}{body}</div>;
  }
  const withTabs = body => <div className="hb-workspace hb-store-six">{tabs}{body}</div>;
  if (view === 'repairs') return withTabs(<>{strip}<ServiceView s={s} h={h} timezone={timezone} staff={!manager} initialRepairId={params.get('repair')} initialAction={initialAction} onClearLink={clearLink} onChanged={onChanged} /></>);
  if (view === 'products' || view === 'devices') return withTabs(<>{strip}<StockView s={s} h={h} overview={overview} timezone={timezone} initialLow={params.get('low') === '1'} initialAction={initialAction} onChanged={onChanged} /></>);
  if (view === 'requests') return withTabs(<>{strip}<ProductRequests s={s} h={h} /></>);
  return withTabs(<OrdersView s={s} h={h} overview={overview} business={connections?.business?.name || ''} timezone={timezone} onChanged={onChanged} requests={false} strip={strip}
    initialOrderId={params.get('order')} initialStatus={params.get('filter') || ''} initialCreate={params.get('create') === '1' || initialAction === 'charge'} />);
}
