import React from 'react';
import { Money } from '../Badges';
import { EmptyState } from '../DashboardVisuals';
import { KpiCards, DiagnosticsTable, duration } from '../workspace/kpi.jsx';
import { InsightsHeader, KpiDetail, NoteList, SegmentTable } from '../workspace/insights.jsx';
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
  return <NoteList m={m} noteLabel={k => label('note', k, ar)} always>
    {m.openOldestMs != null && <li>{tr('Oldest cut still pending', 'أقدم نسخة معلقة')}: <b>{duration(m.openOldestMs, ar)}</b></li>}
    {m.id === 'on_time_delivery' && i.firstCut?.denominator ? <li>{tr('First cut on time', 'النسخة الأولى في موعدها')}: <b className="ld-num">{i.firstCut.value}% ({i.firstCut.numerator}/{i.firstCut.denominator})</b></li> : null}
    {m.id === 'revision_overrun' && <li>{tr('Change orders approved in the period', 'أوامر التغيير المعتمدة في الفترة')}: <b className="ld-num">{i.changeOrders?.approved ?? 0}</b>{i.changeOrders?.approvedMinor ? <> · <Money h={h} minor={i.changeOrders.approvedMinor} /></> : null}</li>}
    {m.id === 'project_contribution' && m.value != null && <li>{tr('Revenue', 'الإيراد')} <Money h={h} minor={m.revenueMinor} /> − {tr('direct costs', 'التكاليف المباشرة')} <Money h={h} minor={m.costMinor} /></li>}
  </NoteList>;
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
    <InsightsHeader ar={ar} prefix="md" period={period} onParams={onParams} description={['Each figure names its population and window. Open any of them to see the exact productions behind it.', 'كل رقم يوضح مجتمعه ونافذته. افتح أياً منها لترى الإنتاجات التي خلفه بالضبط.']} />
    <KpiCards ar={ar} h={h} s={s} timezone={timezone} metrics={i.headline || []} defs={MEDIA_METRICS} selectedId={selected?.id} backlog={BACKLOG} onSelect={id => onParams({ metric: id })} basisExtra={basisExtra(ar)} />
    {selected && <KpiDetail ar={ar} s={s} timezone={timezone} prefix="md" defs={MEDIA_METRICS} m={selected} settings={settings} onRecords={onRecords} format={format(selected)} notes={<Notes m={selected} i={i} h={h} ar={ar} />} />}
    <DiagnosticsTable ar={ar} h={h} s={s} timezone={timezone} metrics={i.diagnostics || []} defs={MEDIA_METRICS} selectedId={selected?.id} onSelect={id => onParams({ metric: id })} onRecords={id => onRecords(id)} basisExtra={basisExtra(ar)} />
    <SegmentTable ar={ar} h={h} prefix="md" dimensions={SEGMENTS} segment={segment} columns={i.segments?.metrics || []} rows={i.segments?.rows} defs={MEDIA_METRICS} metricsBy={metricsBy}
      dimensionLabel={id => label('segment', id, ar)} keyLabel={key => segmentKey(segment, key, ar)} onParams={onParams} onRecords={onRecords} duration={ms => duration(ms, ar)}
      hint={['Split the measures by production type, new or repeat client, deliverable format, or crew and resource category.', 'قسّم المؤشرات حسب نوع الإنتاج، أو العميل الجديد أو المتكرر، أو صيغة المُخرَج، أو فئة الطاقم والموارد.']} />
  </>;
}
