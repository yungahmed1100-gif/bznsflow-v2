import React from 'react';
import { Money } from '../Badges';
import { EmptyState, PageHeader } from '../DashboardVisuals';
import { KpiCards, KpiTrend, PeriodPicker, DiagnosticsTable } from '../workspace/kpi.jsx';
import { label } from './labels.js';
import { DENTAL_METRICS } from './metrics.js';

const SEGMENTS = ['provider', 'service_group', 'patient_type', 'time_of_day'];
const BACKLOG = new Set(['followups_due', 'overdue_balances']);
const segmentKey = (dimension, key, ar) => ['patient_type', 'time_of_day'].includes(dimension) || ['unknown', 'not_applicable'].includes(key) ? label('segmentKey', key, ar) : key;
const basisExtra = () => () => [];

function Notes({ m, ar }) {
  const entries = Object.entries(m.notes || {}).filter(([, n]) => n);
  return entries.length ? <ul className="hb-kpi-notes">{entries.map(([k, n]) => <li key={k}>{label('note', k, ar)}: <b className="ld-num">{n}</b></li>)}</ul> : null;
}

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
    <PageHeader icon="trending-up" title={tr('Insights', 'المؤشرات')} description={tr('Each figure names its population and window. Open any of them to see the exact visits behind it.', 'كل رقم يوضح مجتمعه ونافذته. افتح أياً منها لترى الزيارات التي خلفه بالضبط.')} />
    <PeriodPicker ar={ar} period={period} name="dn-period" onChange={id => onParams({ period: id })} />
    {i.coverage?.chargesWithoutVisit > 0 && <p className="hb-warn" role="status">{tr(`${i.coverage.chargesWithoutVisit} charges in this period have no visit record (recorded before Visits). They are not counted as attendance.`,
      `${i.coverage.chargesWithoutVisit} رسوم في هذه الفترة بلا سجل زيارة (سُجلت قبل الزيارات)، ولا تُحتسب حضوراً.`)}</p>}
    <KpiCards ar={ar} h={h} s={s} timezone={timezone} metrics={i.headline || []} defs={DENTAL_METRICS} selectedId={selected?.id} backlog={BACKLOG} onSelect={id => onParams({ metric: id })} basisExtra={basisExtra(ar)} />
    {selected && <section className="hb-panel hb-kpi-detail" aria-labelledby="dn-kpi-title">
      <div className="hb-status-line"><h2 id="dn-kpi-title">{ar ? DENTAL_METRICS[selected.id].ar : DENTAL_METRICS[selected.id].en}</h2>
        <button type="button" className="ld-button ld-primary" onClick={() => onRecords(selected.id)}>{tr('View source records', 'عرض السجلات المصدرية')}</button></div>
      <p>{DENTAL_METRICS[selected.id].def(settings, ar)}</p>
      <p className="ld-help">{tr('Owner and review', 'المسؤول والمراجعة')}: {DENTAL_METRICS[selected.id].owner[ar ? 1 : 0]}</p>
      <Notes m={selected} ar={ar} />
      <KpiTrend m={selected} ar={ar} s={s} timezone={timezone} />
    </section>}
    <DiagnosticsTable ar={ar} h={h} s={s} timezone={timezone} metrics={i.diagnostics || []} defs={DENTAL_METRICS} selectedId={selected?.id} onSelect={id => onParams({ metric: id })} onRecords={id => onRecords(id)} basisExtra={basisExtra(ar)} />
    <section aria-labelledby="dn-segments" className="hb-segments">
      <div className="hb-status-line"><h2 id="dn-segments">{tr('Break down by', 'تقسيم حسب')}</h2>
        <select aria-label={tr('Break down by', 'تقسيم حسب')} value={segment} onChange={e => onParams({ segment: e.target.value })}>
          <option value="">{tr('Choose…', 'اختر…')}</option>{SEGMENTS.map(id => <option key={id} value={id}>{label('segment', id, ar)}</option>)}
        </select></div>
      {i.segments?.rows?.length ? <div className="ld-table-wrap"><table className="ld-table">
        <thead><tr><th>{label('segment', segment, ar)}</th>{i.segments.metrics.map(id => <th key={id}>{ar ? DENTAL_METRICS[id].ar : DENTAL_METRICS[id].en}</th>)}</tr></thead>
        <tbody>{i.segments.rows.map(row => <tr key={row.key}>
          <td data-label={label('segment', segment, ar)}><b><bdi>{segmentKey(segment, row.key, ar)}</bdi></b></td>
          {i.segments.metrics.map(id => { const v = row.values[id], m = metricsBy.get(id);
            return <td key={id} data-label={ar ? DENTAL_METRICS[id].ar : DENTAL_METRICS[id].en}>
              {v?.denominator || (v?.value && m?.kind !== 'rate') ? <button type="button" className="ld-link" onClick={() => onRecords(id, `${segment}:${row.key}`)}>
                {m?.kind === 'money' ? <Money h={h} minor={v.value || 0} /> : v.value == null ? '—' : m?.kind === 'rate' ? `${v.value}% (${v.numerator}/${v.denominator})` : v.value}</button> : '—'}
            </td>; })}
        </tr>)}</tbody>
      </table></div> : segment ? <p className="ld-help">{tr('No records in this period for this breakdown.', 'لا سجلات في هذه الفترة لهذا التقسيم.')}</p>
        : <p className="ld-help">{tr('Split the measures by provider, service group, new versus returning patients, or time of day.', 'قسّم المؤشرات حسب مقدم الخدمة أو مجموعة الخدمة أو المرضى الجدد مقابل العائدين أو وقت اليوم.')}</p>}
    </section>
    <section aria-labelledby="dn-costs" className="hb-panel">
      <div className="hb-status-line"><h2 id="dn-costs">{tr('Clinic costs', 'تكاليف العيادة')}</h2>
        {onAddExpense && <button type="button" className="ld-button" onClick={onAddExpense}>{tr('Add expense', 'إضافة مصروف')}</button>}</div>
      {expenses.length ? <ul className="hb-re-list">{expenses.slice(0, 12).map(e => <li key={e.id}>{category(e.category)}{e.vendor ? <> · <bdi>{e.vendor}</bdi></> : null} · <Money h={h} minor={e.amountMinor} /> · <span className="ld-num">{e.paidOn}</span></li>)}</ul>
        : <p className="ld-help">{tr('No costs recorded in this period.', 'لا تكاليف مسجلة في هذه الفترة.')}</p>}
    </section>
  </>;
}
