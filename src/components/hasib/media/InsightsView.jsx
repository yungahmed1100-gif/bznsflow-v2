import React from 'react';
import { Money } from '../Badges';
import { EmptyState, PageHeader } from '../DashboardVisuals';
import { KpiCards, KpiTrend, PeriodPicker, DiagnosticsTable, duration } from '../workspace/kpi.jsx';
import { label } from './labels.js';
import { MEDIA_METRICS } from './metrics.js';

const SEGMENTS = ['production_type', 'client_cohort', 'deliverable_format', 'resource_category'];
// A backlog that is not empty is marked; no threshold is invented for the others.
const BACKLOG = new Set(['unapproved_extra_scope']);
const segmentKey = (dimension, key, ar) => dimension === 'production_type' ? label('type', key, ar) : dimension === 'deliverable_format' ? label('format', key, ar)
  : dimension === 'client_cohort' ? label('cohort', key, ar) : dimension === 'resource_category' ? label('category', key, ar) : key;

/** Extra basis parts: tentative hours beside utilisation, and contribution's cost coverage. */
const basisExtra = ar => m => m.id === 'committed_utilization' && m.tentativeHours ? [ar ? `${m.tentativeHours} ساعة مبدئية` : `${m.tentativeHours} h tentative`]
  : m.id === 'project_contribution' && m.costsComplete === false ? [ar ? 'غير مكتمل: تكاليف غير مؤكدة' : 'Incomplete: costs not confirmed'] : [];

/** The notes a population carries, and figures shown beside the value. */
function Notes({ m, i, h, ar }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const entries = Object.entries(m.notes || {}).filter(([, n]) => n);
  return <ul className="hb-kpi-notes">
    {entries.map(([k, n]) => <li key={k}>{label('note', k, ar)}: <b className="ld-num">{n}</b></li>)}
    {m.openOldestMs != null && <li>{tr('Oldest cut still pending', 'أقدم نسخة معلقة')}: <b>{duration(m.openOldestMs, ar)}</b></li>}
    {m.id === 'on_time_delivery' && i.firstCut?.denominator ? <li>{tr('First cut on time', 'النسخة الأولى في موعدها')}: <b className="ld-num">{i.firstCut.value}% ({i.firstCut.numerator}/{i.firstCut.denominator})</b></li> : null}
    {m.id === 'revision_overrun' && <li>{tr('Change orders approved in the period', 'أوامر التغيير المعتمدة في الفترة')}: <b className="ld-num">{i.changeOrders?.approved ?? 0}</b>{i.changeOrders?.approvedMinor ? <> · <Money h={h} minor={i.changeOrders.approvedMinor} /></> : null}</li>}
    {m.id === 'project_contribution' && m.value != null && <li>{tr('Revenue', 'الإيراد')} <Money h={h} minor={m.revenueMinor} /> − {tr('direct costs', 'التكاليف المباشرة')} <Money h={h} minor={m.costMinor} /></li>}
  </ul>;
}

/** Media Insights: four headline cards, the selected measure's definition and trend, diagnostics and breakdowns. */
export function InsightsView({ ar, h, s, timezone, data, params, onParams, onRecords }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const i = data.insights || {};
  const settings = i.settings || {};
  const period = params.get('period') || '30d', segment = params.get('segment') || '';
  const all = [...(i.headline || []), ...(i.diagnostics || [])];
  const selected = all.find(m => m.id === params.get('metric')) || i.headline?.[0];
  if (i.synthetic) return <EmptyState icon="bar-chart" title={tr('Insights use your recorded productions', 'تعتمد المؤشرات على إنتاجاتك المسجلة')} description={tr('This preview has no records.', 'لا توجد سجلات في هذه المعاينة.')} />;
  const format = m => w => m.kind === 'duration' ? duration(w.value, ar) : `${w.value}%`;
  const metricsBy = new Map(all.map(m => [m.id, m]));
  return <>
    <PageHeader icon="trending-up" title={tr('Insights', 'المؤشرات')} description={tr('Each figure names its population and window. Open any of them to see the exact productions behind it.', 'كل رقم يوضح مجتمعه ونافذته. افتح أياً منها لترى الإنتاجات التي خلفه بالضبط.')} />
    <PeriodPicker ar={ar} period={period} name="md-period" onChange={id => onParams({ period: id })} />
    <KpiCards ar={ar} h={h} s={s} timezone={timezone} metrics={i.headline || []} defs={MEDIA_METRICS} selectedId={selected?.id} backlog={BACKLOG} onSelect={id => onParams({ metric: id })} basisExtra={basisExtra(ar)} />
    {selected && <section className="hb-panel hb-kpi-detail" aria-labelledby="md-kpi-title">
      <div className="hb-status-line"><h2 id="md-kpi-title">{ar ? MEDIA_METRICS[selected.id].ar : MEDIA_METRICS[selected.id].en}</h2>
        <button type="button" className="ld-button ld-primary" onClick={() => onRecords(selected.id)}>{tr('View source records', 'عرض السجلات المصدرية')}</button></div>
      <p>{MEDIA_METRICS[selected.id].def(settings, ar)}</p>
      <p className="ld-help">{tr('Owner and review', 'المسؤول والمراجعة')}: {MEDIA_METRICS[selected.id].owner[ar ? 1 : 0]}</p>
      <Notes m={selected} i={i} h={h} ar={ar} />
      <KpiTrend m={selected} ar={ar} s={s} timezone={timezone} format={format(selected)} />
    </section>}
    <DiagnosticsTable ar={ar} h={h} s={s} timezone={timezone} metrics={i.diagnostics || []} defs={MEDIA_METRICS} selectedId={selected?.id} onSelect={id => onParams({ metric: id })} onRecords={id => onRecords(id)} basisExtra={basisExtra(ar)} />
    <section aria-labelledby="md-segments" className="hb-segments">
      <div className="hb-status-line"><h2 id="md-segments">{tr('Break down by', 'تقسيم حسب')}</h2>
        <select aria-label={tr('Break down by', 'تقسيم حسب')} value={segment} onChange={e => onParams({ segment: e.target.value })}>
          <option value="">{tr('Choose…', 'اختر…')}</option>{SEGMENTS.map(id => <option key={id} value={id}>{label('segment', id, ar)}</option>)}
        </select></div>
      {i.segments?.rows?.length ? <div className="ld-table-wrap"><table className="ld-table">
        <thead><tr><th>{label('segment', segment, ar)}</th>{i.segments.metrics.map(id => <th key={id}>{ar ? MEDIA_METRICS[id].ar : MEDIA_METRICS[id].en}</th>)}</tr></thead>
        <tbody>{i.segments.rows.map(row => <tr key={row.key}>
          <td data-label={label('segment', segment, ar)}><b><bdi>{segmentKey(segment, row.key, ar)}</bdi></b></td>
          {i.segments.metrics.map(id => { const v = row.values[id], m = metricsBy.get(id);
            return <td key={id} data-label={ar ? MEDIA_METRICS[id].ar : MEDIA_METRICS[id].en}>
              {v?.denominator || (v?.value && m?.kind !== 'rate') ? <button type="button" className="ld-link" onClick={() => onRecords(id, `${segment}:${row.key}`)}>
                {m?.kind === 'money' ? <Money h={h} minor={v.value || 0} /> : v.value == null ? '—' : m?.kind === 'rate' ? `${v.value}% (${v.numerator}/${v.denominator})` : m?.kind === 'duration' ? duration(v.value, ar) : v.value}</button> : '—'}
            </td>; })}
        </tr>)}</tbody>
      </table></div> : segment ? <p className="ld-help">{tr('No records in this period for this breakdown.', 'لا سجلات في هذه الفترة لهذا التقسيم.')}</p>
        : <p className="ld-help">{tr('Split the measures by production type, new or repeat client, deliverable format, or crew and resource category.', 'قسّم المؤشرات حسب نوع الإنتاج، أو العميل الجديد أو المتكرر، أو صيغة المُخرَج، أو فئة الطاقم والموارد.')}</p>}
    </section>
  </>;
}
