import React from 'react';
import { Money } from '../Badges';
import { EmptyState } from '../DashboardVisuals';
import { KpiCards, DiagnosticsTable } from '../workspace/kpi.jsx';
import { InsightsHeader, KpiDetail, NoteList, SegmentTable } from '../workspace/insights.jsx';
import { label } from './labels.js';
import { DENTAL_METRICS } from './metrics.js';

const SEGMENTS = ['provider', 'service_group', 'patient_type', 'time_of_day'];
const BACKLOG = new Set(['followups_due', 'overdue_balances']);
const segmentKey = (dimension, key, ar) => ['patient_type', 'time_of_day'].includes(dimension) || ['unknown', 'not_applicable'].includes(key) ? label('segmentKey', key, ar) : key;
const basisExtra = () => () => [];

const Notes = ({ m, ar }) => <NoteList m={m} noteLabel={k => label('note', k, ar)} />;

/** Dental Insights: four headline cards, the selected measure's definition and trend, diagnostics, coverage, costs and breakdowns. */
export function InsightsView({ ar, h, s, timezone, data, params, onParams, onRecords, onAddExpense, categories = [] }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const i = data.insights || {};
  const settings = i.settings || {};
  const period = params.get('period') || '30d', segment = params.get('segment') || '';
  const all = [...(i.headline || []), ...(i.diagnostics || [])];
  const selected = all.find(m => m.id === params.get('metric')) || i.headline?.[0];
  if (i.synthetic) return <EmptyState icon="bar-chart" title={tr('Insights use your recorded visits', 'تعتمد المؤشرات على زياراتك المسجلة')} description={tr('This preview has no records.', 'لا توجد سجلات في هذه المعاينة.')} />;
  const metricsBy = new Map(all.map(m => [m.id, m]));
  const expenses = data.expenses?.items || [];
  const category = key => { const c = categories.find(x => x.key === key); return c ? (ar ? c.ar : c.en) : key; };
  return <>
    <InsightsHeader ar={ar} prefix="dn" period={period} onParams={onParams} description={['Each figure names its population and window. Open any of them to see the exact visits behind it.', 'كل رقم يوضح مجتمعه ونافذته. افتح أياً منها لترى الزيارات التي خلفه بالضبط.']} />
    {i.coverage?.chargesWithoutVisit > 0 && <p className="hb-warn" role="status">{tr(`${i.coverage.chargesWithoutVisit} charges in this period have no visit record (recorded before Visits). They are not counted as attendance.`,
      `${i.coverage.chargesWithoutVisit} رسوم في هذه الفترة بلا سجل زيارة (سُجلت قبل الزيارات)، ولا تُحتسب حضوراً.`)}</p>}
    <KpiCards ar={ar} h={h} s={s} timezone={timezone} metrics={i.headline || []} defs={DENTAL_METRICS} selectedId={selected?.id} backlog={BACKLOG} onSelect={id => onParams({ metric: id })} basisExtra={basisExtra(ar)} />
    {selected && <KpiDetail ar={ar} s={s} timezone={timezone} prefix="dn" defs={DENTAL_METRICS} m={selected} settings={settings} onRecords={onRecords} notes={<Notes m={selected} ar={ar} />} />}
    <DiagnosticsTable ar={ar} h={h} s={s} timezone={timezone} metrics={i.diagnostics || []} defs={DENTAL_METRICS} selectedId={selected?.id} onSelect={id => onParams({ metric: id })} onRecords={id => onRecords(id)} basisExtra={basisExtra(ar)} />
    <SegmentTable ar={ar} h={h} prefix="dn" dimensions={SEGMENTS} segment={segment} columns={i.segments?.metrics || []} rows={i.segments?.rows} defs={DENTAL_METRICS} metricsBy={metricsBy}
      dimensionLabel={id => label('segment', id, ar)} keyLabel={key => segmentKey(segment, key, ar)} onParams={onParams} onRecords={onRecords}
      hint={['Split the measures by provider, service group, new versus returning patients, or time of day.', 'قسّم المؤشرات حسب مقدم الخدمة أو مجموعة الخدمة أو المرضى الجدد مقابل العائدين أو وقت اليوم.']} />
    <section aria-labelledby="dn-costs" className="hb-panel">
      <div className="hb-status-line"><h2 id="dn-costs">{tr('Clinic costs', 'تكاليف العيادة')}</h2>
        {onAddExpense && <button type="button" className="ld-button" onClick={onAddExpense}>{tr('Add expense', 'إضافة مصروف')}</button>}</div>
      {expenses.length ? <ul className="hb-re-list">{expenses.slice(0, 12).map(e => <li key={e.id}>{category(e.category)}{e.vendor ? <> · <bdi>{e.vendor}</bdi></> : null} · <Money h={h} minor={e.amountMinor} /> · <span className="ld-num">{e.paidOn}</span></li>)}</ul>
        : <p className="ld-help">{tr('No costs recorded in this period.', 'لا تكاليف مسجلة في هذه الفترة.')}</p>}
    </section>
  </>;
}
