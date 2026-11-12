import React from 'react';
import { Money } from '../Badges';
import { EmptyState } from '../DashboardVisuals';
import { KpiCards, DiagnosticsTable } from '../workspace/kpi.jsx';
import { InsightsHeader, KpiDetail, NoteList, SegmentTable } from '../workspace/insights.jsx';
import { label } from './labels.js';
import { HVAC_METRICS } from './metrics.js';

const SEGMENTS = ['job_type', 'unit_type', 'area', 'contract', 'urgency', 'month'];
const BACKLOG = new Set(['maintenance_due', 'jobs_past_promise', 'receivables']);
const segmentKey = (dimension, key, ar) =>
  dimension === 'job_type'
    ? label('jobType', key, ar)
    : dimension === 'unit_type'
      ? label('unitType', key, ar)
      : ['contract', 'urgency'].includes(dimension) || ['unknown', 'not_applicable'].includes(key)
        ? label('segmentKey', key, ar)
        : key;
// The industry reference beside a figure: "best ≥95%" or "best ≤2%". It is never the business's own target.
const reference = (ar, m) =>
  m.reference
    ? [
        m.reference.atLeast != null
          ? ar
            ? `المرجع ≥${m.reference.atLeast}٪`
            : `reference ≥${m.reference.atLeast}%`
          : ar
            ? `المرجع ≤${m.reference.atMost}٪`
            : `reference ≤${m.reference.atMost}%`,
      ]
    : [];
const Notes = ({ m, ar }) => <NoteList m={m} noteLabel={k => label('note', k, ar)} />;

/** The contract book and money owed, as of now. */
function Book({ ar, h, contracts, receivables, perTechDay }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return (
    <section className="hb-panel" aria-labelledby="hv-book">
      <h2 id="hv-book">{tr('Contracts and money owed', 'العقود والمبالغ المستحقة')}</h2>
      <dl className="hb-kpi-row">
        <div>
          <dt>{tr('Active contracts', 'عقود سارية')}</dt>
          <dd className="ld-num">{contracts?.active ?? 0}</dd>
        </div>
        <div>
          <dt>{tr('Units covered', 'وحدات مشمولة')}</dt>
          <dd className="ld-num">{contracts?.units ?? 0}</dd>
        </div>
        <div data-tone={contracts?.renewalsDue ? 'yellow' : undefined}>
          <dt>{tr('Renewals due', 'تجديدات مستحقة')}</dt>
          <dd className="ld-num">{contracts?.renewalsDue ?? 0}</dd>
        </div>
        <div>
          <dt>{tr('Owed 0–30 days', 'مستحق ٠–٣٠ يوماً')}</dt>
          <dd>
            <Money h={h} minor={receivables?.['0_30'] || 0} />
          </dd>
        </div>
        <div data-tone={receivables?.['31_60'] ? 'yellow' : undefined}>
          <dt>{tr('Owed 31–60 days', 'مستحق ٣١–٦٠ يوماً')}</dt>
          <dd>
            <Money h={h} minor={receivables?.['31_60'] || 0} />
          </dd>
        </div>
        <div data-tone={receivables?.['60_plus'] ? 'coral' : undefined}>
          <dt>{tr('Owed over 60 days', 'مستحق أكثر من ٦٠ يوماً')}</dt>
          <dd>
            <Money h={h} minor={receivables?.['60_plus'] || 0} />
          </dd>
        </div>
        <div>
          <dt>{tr('Revenue per technician-day', 'الإيراد لكل يوم فني')}</dt>
          <dd>{perTechDay?.value == null ? '—' : <Money h={h} minor={perTechDay.value} />}</dd>
        </div>
      </dl>
    </section>
  );
}

/** AC Insights: four headline cards, the selected measure's definition and trend, eight diagnostics, the contract book, costs and breakdowns. */
export function InsightsView({ ar, h, s, timezone, data, params, onParams, onRecords, onAddExpense, categories = [] }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const i = data.insights || {};
  const settings = i.settings || {};
  const period = params.get('period') || '30d',
    segment = params.get('segment') || '';
  const all = [...(i.headline || []), ...(i.diagnostics || [])];
  const selected = all.find(m => m.id === params.get('metric')) || i.headline?.[0];
  if (i.synthetic)
    return (
      <EmptyState
        icon="bar-chart"
        title={tr('Insights use your recorded jobs', 'تعتمد المؤشرات على أعمالك المسجلة')}
        description={tr('This preview has no records.', 'لا توجد سجلات في هذه المعاينة.')}
      />
    );
  const metricsBy = new Map(all.map(m => [m.id, m]));
  const expenses = data.expenses?.items || [];
  const category = key => {
    const c = categories.find(x => x.key === key);
    return c ? (ar ? c.ar : c.en) : key;
  };
  const extra = m => reference(ar, m);
  return (
    <>
      <InsightsHeader
        ar={ar}
        prefix="hv"
        period={period}
        onParams={onParams}
        description={[
          'Each figure names its population and window, with the industry reference beside it. Open any of them to see the exact jobs behind it. Targets are yours to set once you have a month of your own figures.',
          'كل رقم يوضح مجتمعه ونافذته، ومعه المرجع في القطاع. افتح أياً منها لترى الأعمال التي خلفه بالضبط. تحدد أهدافك بعد شهر من أرقامك.',
        ]}
      />
      {i.coverage?.olderJobs > 0 && (
        <p className="hb-warn" role="status">
          {tr(
            `${i.coverage.olderJobs} jobs were recorded in the older job list before this workspace. They are not counted here.`,
            `${i.coverage.olderJobs} عملاً سُجلت في قائمة الأعمال القديمة قبل هذه المساحة، ولا تُحتسب هنا.`,
          )}
        </p>
      )}
      <KpiCards
        ar={ar}
        h={h}
        s={s}
        timezone={timezone}
        metrics={i.headline || []}
        defs={HVAC_METRICS}
        selectedId={selected?.id}
        backlog={BACKLOG}
        onSelect={id => onParams({ metric: id })}
        basisExtra={extra}
      />
      {selected && (
        <KpiDetail
          ar={ar}
          s={s}
          timezone={timezone}
          prefix="hv"
          defs={HVAC_METRICS}
          m={selected}
          settings={settings}
          onRecords={onRecords}
          notes={<Notes m={selected} ar={ar} />}
        />
      )}
      <DiagnosticsTable
        ar={ar}
        h={h}
        s={s}
        timezone={timezone}
        metrics={i.diagnostics || []}
        defs={HVAC_METRICS}
        selectedId={selected?.id}
        onSelect={id => onParams({ metric: id })}
        onRecords={id => onRecords(id)}
        basisExtra={extra}
      />
      <Book ar={ar} h={h} contracts={i.contracts} receivables={i.receivables} perTechDay={i.revenuePerTechDay} />
      <SegmentTable
        ar={ar}
        h={h}
        prefix="hv"
        dimensions={SEGMENTS}
        segment={segment}
        columns={i.segments?.metrics || []}
        rows={i.segments?.rows}
        defs={HVAC_METRICS}
        metricsBy={metricsBy}
        dimensionLabel={id => label('segment', id, ar)}
        keyLabel={key => segmentKey(segment, key, ar)}
        onParams={onParams}
        onRecords={onRecords}
        hint={[
          'Split the measures by job type, unit type, area, contract versus one-off, urgent versus routine, or month (the summer peak shows here).',
          'قسّم المؤشرات حسب نوع العمل أو نوع الوحدة أو المنطقة أو العقد مقابل المرة الواحدة أو العاجل مقابل الاعتيادي أو الشهر (تظهر ذروة الصيف هنا).',
        ]}
      />
      <section aria-labelledby="hv-costs" className="hb-panel">
        <div className="hb-status-line">
          <h2 id="hv-costs">{tr('Business costs', 'تكاليف العمل')}</h2>
          {onAddExpense && (
            <button type="button" className="ld-button" onClick={onAddExpense}>
              {tr('Add expense', 'إضافة مصروف')}
            </button>
          )}
        </div>
        {expenses.length ? (
          <ul className="hb-re-list">
            {expenses.slice(0, 12).map(e => (
              <li key={e.id}>
                {category(e.category)}
                {e.vendor ? (
                  <>
                    {' '}
                    · <bdi>{e.vendor}</bdi>
                  </>
                ) : null}{' '}
                · <Money h={h} minor={e.amountMinor} /> · <span className="ld-num">{e.paidOn}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ld-help">{tr('No costs recorded in this period.', 'لا تكاليف مسجلة في هذه الفترة.')}</p>
        )}
      </section>
    </>
  );
}
