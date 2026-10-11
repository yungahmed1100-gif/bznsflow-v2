import React from 'react';
import { Money } from '../Badges';
import { EmptyState, PageHeader } from '../DashboardVisuals';
import { KpiCards, KpiTrend, PeriodPicker, DiagnosticsTable } from '../workspace/kpi.jsx';
import { label } from './labels.js';
import { FITNESS_METRICS } from './metrics.js';

const SEGMENTS = ['plan', 'source', 'class_type', 'member_state'];
const BACKLOG = new Set(['attendance_gap']);
const segmentKey = (dimension, key, ar) => dimension === 'source' ? label('source', key, ar) : dimension === 'member_state' ? label('state', key, ar) : key;
const basisExtra = ar => m => m.id === 'attendance_gap' && m.coverage ? [ar ? `${m.coverage.withVisit} من ${m.coverage.eligible} لديهم زيارة مسجلة` : `${m.coverage.withVisit} of ${m.coverage.eligible} have a recorded visit`]
  : m.id === 'net_growth' && m.rateOfBase != null ? [ar ? `${m.rateOfBase}% من قاعدة البداية` : `${m.rateOfBase}% of the opening base`] : [];

function Notes({ m, ar }) {
  const entries = Object.entries(m.notes || {}).filter(([, n]) => n);
  return entries.length ? <ul className="hb-kpi-notes">{entries.map(([k, n]) => <li key={k}>{label('note', k, ar)}: <b className="ld-num">{n}</b></li>)}</ul> : null;
}

/** The trial funnel: booked → attended → paid, by declared source. Spend is not captured, so cost per trial is unavailable. */
function TrialFunnel({ t, ar }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  if (!t) return null;
  return <section className="hb-panel hb-funnel" aria-labelledby="ft-funnel">
    <h2 id="ft-funnel">{tr('Trials in the period', 'التجارب في الفترة')}</h2>
    <p><b className="ld-num">{t.booked}</b> {tr('booked', 'محجوزة')} → <b className="ld-num">{t.attended}</b> {tr('attended', 'حضرها أصحابها')}{t.attendanceRate != null ? ` (${t.attendanceRate}%)` : ''} → <b className="ld-num">{t.paid}</b> {tr('paid', 'مدفوعة')}{t.attendedToPaid != null ? ` (${t.attendedToPaid}%)` : ''}</p>
    {t.bySource?.length > 0 && <div className="ld-table-wrap"><table className="ld-table">
      <thead><tr><th>{tr('Source', 'المصدر')}</th><th>{tr('Booked', 'محجوزة')}</th><th>{tr('Attended', 'حضر')}</th><th>{tr('Paid', 'مدفوعة')}</th></tr></thead>
      <tbody>{t.bySource.map(r => <tr key={r.source}><td data-label={tr('Source', 'المصدر')}>{label('source', r.source, ar)}</td><td data-label={tr('Booked', 'محجوزة')} className="ld-num">{r.booked}</td>
        <td data-label={tr('Attended', 'حضر')} className="ld-num">{r.attended}</td><td data-label={tr('Paid', 'مدفوعة')} className="ld-num">{r.paid}</td></tr>)}</tbody>
    </table></div>}
    <p className="ld-help">{tr('Cost per attended trial: unavailable until ad spend is recorded.', 'تكلفة التجربة المحضورة: غير متاحة حتى يُسجَّل الإنفاق الإعلاني.')}</p>
  </section>;
}

/** Fitness Insights: four headline cards, the selected measure's definition and trend, diagnostics, the trial funnel and breakdowns. */
export function InsightsView({ ar, h, s, timezone, data, params, onParams, onRecords }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const i = data.insights || {};
  const settings = i.settings || {};
  const period = params.get('period') || '30d', segment = params.get('segment') || '';
  const all = [...(i.headline || []), ...(i.diagnostics || [])];
  const selected = all.find(m => m.id === params.get('metric')) || i.headline?.[0];
  if (i.synthetic) return <EmptyState icon="bar-chart" title={tr('Insights use your recorded memberships and classes', 'تعتمد المؤشرات على عضوياتك وحصصك المسجلة')} description={tr('This preview has no records.', 'لا توجد سجلات في هذه المعاينة.')} />;
  const metricsBy = new Map(all.map(m => [m.id, m]));
  return <>
    <PageHeader icon="trending-up" title={tr('Insights', 'المؤشرات')} description={tr('Each figure names its population and window. Open any of them to see the exact members behind it.', 'كل رقم يوضح مجتمعه ونافذته. افتح أياً منها لترى الأعضاء الذين خلفه بالضبط.')} />
    <PeriodPicker ar={ar} period={period} name="ft-period" onChange={id => onParams({ period: id })} />
    <KpiCards ar={ar} h={h} s={s} timezone={timezone} metrics={i.headline || []} defs={FITNESS_METRICS} selectedId={selected?.id} backlog={BACKLOG} onSelect={id => onParams({ metric: id })} basisExtra={basisExtra(ar)} />
    {selected && <section className="hb-panel hb-kpi-detail" aria-labelledby="ft-kpi-title">
      <div className="hb-status-line"><h2 id="ft-kpi-title">{ar ? FITNESS_METRICS[selected.id].ar : FITNESS_METRICS[selected.id].en}</h2>
        <button type="button" className="ld-button ld-primary" onClick={() => onRecords(selected.id)}>{tr('View source records', 'عرض السجلات المصدرية')}</button></div>
      <p>{FITNESS_METRICS[selected.id].def(settings, ar)}</p>
      <p className="ld-help">{tr('Owner and review', 'المسؤول والمراجعة')}: {FITNESS_METRICS[selected.id].owner[ar ? 1 : 0]}</p>
      <Notes m={selected} ar={ar} />
      <KpiTrend m={selected} ar={ar} s={s} timezone={timezone} />
    </section>}
    <DiagnosticsTable ar={ar} h={h} s={s} timezone={timezone} metrics={i.diagnostics || []} defs={FITNESS_METRICS} selectedId={selected?.id} onSelect={id => onParams({ metric: id })} onRecords={id => onRecords(id)} basisExtra={basisExtra(ar)} />
    <TrialFunnel t={i.trials} ar={ar} />
    <section aria-labelledby="ft-segments" className="hb-segments">
      <div className="hb-status-line"><h2 id="ft-segments">{tr('Break down by', 'تقسيم حسب')}</h2>
        <select aria-label={tr('Break down by', 'تقسيم حسب')} value={segment} onChange={e => onParams({ segment: e.target.value })}>
          <option value="">{tr('Choose…', 'اختر…')}</option>{SEGMENTS.map(id => <option key={id} value={id}>{label('segment', id, ar)}</option>)}
        </select></div>
      {i.segments?.rows?.length ? <div className="ld-table-wrap"><table className="ld-table">
        <thead><tr><th>{label('segment', segment, ar)}</th>{i.segments.metrics.map(id => <th key={id}>{ar ? FITNESS_METRICS[id].ar : FITNESS_METRICS[id].en}</th>)}</tr></thead>
        <tbody>{i.segments.rows.map(row => <tr key={row.key}>
          <td data-label={label('segment', segment, ar)}><b><bdi>{segmentKey(segment, row.key, ar)}</bdi></b></td>
          {i.segments.metrics.map(id => { const v = row.values[id], m = metricsBy.get(id);
            return <td key={id} data-label={ar ? FITNESS_METRICS[id].ar : FITNESS_METRICS[id].en}>
              {v?.denominator || (v?.value && m?.kind !== 'rate') ? <button type="button" className="ld-link" onClick={() => onRecords(id, `${segment}:${row.key}`)}>
                {m?.kind === 'money' ? <Money h={h} minor={v.value || 0} /> : v.value == null ? '—' : m?.kind === 'rate' ? `${v.value}% (${v.numerator}/${v.denominator})` : v.value}</button> : '—'}
            </td>; })}
        </tr>)}</tbody>
      </table></div> : segment ? <p className="ld-help">{tr('No records in this period for this breakdown.', 'لا سجلات في هذه الفترة لهذا التقسيم.')}</p>
        : <p className="ld-help">{tr('Split the measures by plan, acquisition source, class type, or frozen versus active.', 'قسّم المؤشرات حسب الخطة أو مصدر الاكتساب أو نوع الحصة أو المجمّد مقابل النشط.')}</p>}
    </section>
  </>;
}
