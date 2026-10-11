import React from 'react';
import { EmptyState } from '../DashboardVisuals';
import { KpiCards, DiagnosticsTable } from '../workspace/kpi.jsx';
import { InsightsHeader, KpiDetail, NoteList, SegmentTable } from '../workspace/insights.jsx';
import { label } from './labels.js';
import { FITNESS_METRICS } from './metrics.js';

const SEGMENTS = ['plan', 'source', 'class_type', 'member_state'];
const BACKLOG = new Set(['attendance_gap']);
const segmentKey = (dimension, key, ar) => dimension === 'source' ? label('source', key, ar) : dimension === 'member_state' ? label('state', key, ar) : key;
const basisExtra = ar => m => m.id === 'attendance_gap' && m.coverage ? [ar ? `${m.coverage.withVisit} من ${m.coverage.eligible} لديهم زيارة مسجلة` : `${m.coverage.withVisit} of ${m.coverage.eligible} have a recorded visit`]
  : m.id === 'net_growth' && m.rateOfBase != null ? [ar ? `${m.rateOfBase}% من قاعدة البداية` : `${m.rateOfBase}% of the opening base`] : [];

const Notes = ({ m, ar }) => <NoteList m={m} noteLabel={k => label('note', k, ar)} />;

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
    <InsightsHeader ar={ar} prefix="ft" period={period} onParams={onParams} description={['Each figure names its population and window. Open any of them to see the exact members behind it.', 'كل رقم يوضح مجتمعه ونافذته. افتح أياً منها لترى الأعضاء الذين خلفه بالضبط.']} />
    <KpiCards ar={ar} h={h} s={s} timezone={timezone} metrics={i.headline || []} defs={FITNESS_METRICS} selectedId={selected?.id} backlog={BACKLOG} onSelect={id => onParams({ metric: id })} basisExtra={basisExtra(ar)} />
    {selected && <KpiDetail ar={ar} s={s} timezone={timezone} prefix="ft" defs={FITNESS_METRICS} m={selected} settings={settings} onRecords={onRecords} notes={<Notes m={selected} ar={ar} />} />}
    <DiagnosticsTable ar={ar} h={h} s={s} timezone={timezone} metrics={i.diagnostics || []} defs={FITNESS_METRICS} selectedId={selected?.id} onSelect={id => onParams({ metric: id })} onRecords={id => onRecords(id)} basisExtra={basisExtra(ar)} />
    <TrialFunnel t={i.trials} ar={ar} />
    <SegmentTable ar={ar} h={h} prefix="ft" dimensions={SEGMENTS} segment={segment} columns={i.segments?.metrics || []} rows={i.segments?.rows} defs={FITNESS_METRICS} metricsBy={metricsBy}
      dimensionLabel={id => label('segment', id, ar)} keyLabel={key => segmentKey(segment, key, ar)} onParams={onParams} onRecords={onRecords}
      hint={['Split the measures by plan, acquisition source, class type, or frozen versus active.', 'قسّم المؤشرات حسب الخطة أو مصدر الاكتساب أو نوع الحصة أو المجمّد مقابل النشط.']} />
  </>;
}
