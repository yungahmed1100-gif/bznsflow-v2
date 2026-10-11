import React from 'react';
import { formatDate } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { EmptyState, HorizontalBars } from '../DashboardVisuals';
import { label, LOST_REASONS } from './labels.js';
import { METRICS, duration } from './metrics.js';
import { PERIODS, KpiCards, DiagnosticsTable } from '../workspace/kpi.jsx';
import { InsightsHeader, KpiDetail, NoteList, SegmentTable } from '../workspace/insights.jsx';

export { PERIODS };

const SEGMENTS = ['need', 'property_type', 'source', 'agent'];
const SEGMENT_COLUMNS = ['qualified_to_viewing', 'viewing_attendance', 'qualified_to_close', 'unanswered_qualified', 'commission_overdue'];
// Whether a higher value is better decides nothing here: no thresholds are invented. Tone only marks a backlog that is not empty.
const BACKLOG = new Set(['unanswered_qualified', 'commission_overdue', 'offer_backlog']);

/** The notes a population carries: timely cancellations, missing due dates, deals with no viewing yet. */
const Notes = ({ m, ar }) => <NoteList m={m} noteLabel={k => label('note', k, ar)} keep={k => !['completed', 'missed'].includes(k)}>
  {m.openMedianMs != null && <li key="open">{ar ? 'عمر الصفقات بلا معاينة (الوسيط)' : 'Age of deals without a viewing (median)'}: <b>{duration(m.openMedianMs, ar)}</b></li>}
</NoteList>;

export function InsightsView({ ar, h, s, timezone, data, busy, act, params, onParams, onRecords, agentNames }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const i = data.insights || {};
  const settings = { ...(i.settings || {}) };
  const period = params.get('period') || '30d', segment = params.get('segment') || '';
  const all = [...(i.headline || []), ...(i.diagnostics || [])];
  const selected = all.find(m => m.id === params.get('metric')) || i.headline?.[0];
  const segmentLabel = key => segment === 'agent' ? (agentNames.get(key) || label('segmentKey', key, ar)) : segment === 'property_type' && key !== 'unknown' ? label('propertyType', key, ar) : label('segmentKey', key, ar);
  const lost = code => { const row = LOST_REASONS.find(([id]) => id === code); return row ? (ar ? row[2] : row[1]) : code; };
  const commissions = data.commissions?.items || [];
  if (i.synthetic) return <EmptyState icon="bar-chart" title={tr('Insights use your recorded deals', 'تعتمد المؤشرات على صفقاتك المسجلة')} description={tr('This preview has no records.', 'لا توجد سجلات في هذه المعاينة.')} />;
  return <>
    <InsightsHeader ar={ar} prefix="re" period={period} onParams={onParams} description={['Each figure names its population and window. Open any of them to see the exact records behind it.', 'كل رقم يوضح مجتمعه ونافذته. افتح أياً منها لترى السجلات التي خلفه بالضبط.']} />

    <KpiCards ar={ar} h={h} s={s} timezone={timezone} metrics={i.headline || []} defs={METRICS} selectedId={selected?.id} backlog={BACKLOG} onSelect={id => onParams({ metric: id })} />

    {selected && <KpiDetail ar={ar} s={s} timezone={timezone} prefix="re" defs={METRICS} m={selected} settings={settings} onRecords={onRecords} notes={<Notes m={selected} ar={ar} />} />}

    <DiagnosticsTable ar={ar} h={h} s={s} timezone={timezone} metrics={i.diagnostics || []} defs={METRICS} selectedId={selected?.id} onSelect={id => onParams({ metric: id })} onRecords={id => onRecords(id)}
      valueExtra={m => m.id === 'offer_backlog' && m.valueMinor ? <> · <Money h={h} minor={m.valueMinor} /></> : null} />

    <SegmentTable ar={ar} h={h} prefix="re" dimensions={SEGMENTS} segment={segment} columns={SEGMENT_COLUMNS} rows={i.segments?.rows} defs={METRICS} metricsBy={new Map(all.map(m => [m.id, m]))}
      dimensionLabel={id => label('segment', id, ar)} keyLabel={segmentLabel} onParams={onParams} onRecords={onRecords}
      hint={['Split the measures by rental or sale, property type, lead source or agent.', 'قسّم المؤشرات حسب الإيجار أو البيع، أو نوع العقار، أو مصدر العميل، أو الوكيل.']} />

    {(i.sourceConversion?.length || i.lostReasons?.length) ? <div className="hb-real-grid">
      <HorizontalBars title={tr('Won deals by lead source', 'الصفقات الرابحة حسب المصدر')} rows={(i.sourceConversion || []).map(row => ({ id: row.source, label: label('segmentKey', row.source, ar), value: row.rate, detail: row }))} format={(value, row) => `${row.detail.won}/${row.detail.opportunities} · ${value}%`} />
      <HorizontalBars title={tr('Why deals were lost', 'أسباب خسارة الصفقات')} rows={(i.lostReasons || []).map(row => ({ id: row.label, label: lost(row.label), value: row.count }))} />
    </div> : null}

    <h2 id="commission-records">{tr('Commission records', 'سجلات العمولة')}</h2>
    {commissions.length ? <div className="ld-table-wrap"><table className="ld-table">
      <thead><tr><th>{tr('Customer', 'العميل')}</th><th>{tr('Commission', 'العمولة')}</th><th>{tr('Still owed', 'المتبقي')}</th><th>{tr('Due', 'الاستحقاق')}</th><th>{tr('Status', 'الحالة')}</th><th><span className="ld-visually-hidden">{tr('Action', 'إجراء')}</span></th></tr></thead>
      <tbody>{commissions.map(row => { const overdue = row.balanceMinor > 0 && row.dueAt && row.dueAt < Date.now();
        return <tr key={row.id}>
          <td data-label={tr('Customer', 'العميل')}><bdi>{row.contactName || tr('Customer', 'عميل')}</bdi></td>
          <td data-label={tr('Commission', 'العمولة')}><Money h={h} minor={row.amountMinor} /></td>
          <td data-label={tr('Still owed', 'المتبقي')}><Money h={h} minor={row.balanceMinor} /></td>
          <td data-label={tr('Due', 'الاستحقاق')}>{row.dueAt ? formatDate(row.dueAt, s.lang, timezone) : label('note', 'no_due_date', ar)}</td>
          <td data-label={tr('Status', 'الحالة')}><span className={`ld-chip ${row.status === 'paid' ? 'is-green' : overdue ? 'is-coral' : 'is-yellow'}`}>{overdue ? tr('Overdue', 'متأخرة') : label('commission', row.status, ar)}</span></td>
          <td data-label={tr('Action', 'إجراء')}>{row.balanceMinor > 0 && <button type="button" className="ld-button" disabled={busy} onClick={() => act('commission_record', { requestId: crypto.randomUUID(), commissionId: row.id, status: 'paid' }, null, tr('Record the remaining balance as paid by bank transfer?', 'تسجيل الرصيد المتبقي كمدفوع بتحويل بنكي؟'))}>{tr('Record payment', 'تسجيل الدفع')}</button>}</td>
        </tr>; })}</tbody>
    </table></div> : <EmptyState icon="receipt" title={tr('No commission yet', 'لا توجد عمولة بعد')} description={tr('Commission is recorded when you close a deal after its compliance checks.', 'تُسجَّل العمولة عند إغلاق الصفقة بعد بنود الامتثال.')} />}
  </>;
}
