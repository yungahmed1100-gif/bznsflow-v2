import React from 'react';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { EmptyState, HorizontalBars, PageHeader } from '../DashboardVisuals';
import { label, LOST_REASONS } from './labels.js';
import { METRICS, duration } from './metrics.js';

export const PERIODS = [['7d', 'Last 7 days', 'آخر ٧ أيام'], ['30d', 'Last 30 days', 'آخر ٣٠ يوماً'], ['month', 'This month', 'هذا الشهر'], ['prev_month', 'Last month', 'الشهر الماضي']];
const SEGMENTS = ['need', 'property_type', 'source', 'agent'];
const SEGMENT_COLUMNS = ['qualified_to_viewing', 'viewing_attendance', 'qualified_to_close', 'unanswered_qualified', 'commission_overdue'];
// Whether a higher value is better decides nothing here: no thresholds are invented. Tone only marks a backlog that is not empty.
const BACKLOG = new Set(['unanswered_qualified', 'commission_overdue', 'offer_backlog']);

/** A metric's headline value in its own unit; an empty population says so instead of showing 0%. */
function Value({ m, h, ar }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  if (m.value == null) return <span className="hb-kpi-empty">{tr('No eligible records', 'لا توجد سجلات مؤهلة')}</span>;
  if (m.kind === 'rate') return <span className="ld-num">{m.value}%</span>;
  if (m.kind === 'money') return <Money h={h} minor={m.value} />;
  if (m.kind === 'duration') return <span>{duration(m.value, ar)}</span>;
  return <span className="ld-num">{m.value}</span>;
}

/** "3 of 9", the as-of time or period, and any coverage warning. */
function Basis({ m, ar, s, timezone }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const parts = [];
  if (m.kind === 'rate') parts.push(tr(`${m.numerator} of ${m.denominator}`, `${m.numerator} من ${m.denominator}`));
  if (m.kind === 'duration' && m.p90 != null) parts.push(`P90 ${duration(m.p90, ar)}`);
  if (m.oldestMs) parts.push(tr(`oldest ${duration(m.oldestMs, ar)}`, `الأقدم ${duration(m.oldestMs, ar)}`));
  parts.push(m.asOf ? tr(`as of ${formatDateTime(m.asOf, s.lang, timezone)}`, `حتى ${formatDateTime(m.asOf, s.lang, timezone)}`) : tr('selected period', 'الفترة المختارة'));
  return <small>{parts.filter(Boolean).join(' · ')}{m.complete === false && <b className="hb-warn"> · {tr('Incomplete: older records not read', 'غير مكتمل: لم تُقرأ السجلات الأقدم')}</b>}</small>;
}

/** The notes a population carries: timely cancellations, missing due dates, deals with no viewing yet. */
function Notes({ m, ar }) {
  const entries = Object.entries(m.notes || {}).filter(([k]) => !['completed', 'missed'].includes(k));
  if (!entries.length && m.openMedianMs == null) return null;
  return <ul className="hb-kpi-notes">{entries.map(([k, n]) => <li key={k}>{label('note', k, ar)}: <b className="ld-num">{n}</b></li>)}
    {m.openMedianMs != null && <li>{ar ? 'عمر الصفقات بلا معاينة (الوسيط)' : 'Age of deals without a viewing (median)'}: <b>{duration(m.openMedianMs, ar)}</b></li>}</ul>;
}

/** Eight weeks of matured cohorts as a compact column chart; each column says its own count. */
function Trend({ m, ar, s, timezone }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  if (!m.trend) return <p className="ld-help">{m.asOf ? tr('A live backlog: it has no history to chart until snapshots are kept.', 'رصيد لحظي: لا تاريخ له يُرسم حتى تُحفظ لقطات.') : tr('No weekly trend for this measure.', 'لا اتجاه أسبوعي لهذا المؤشر.')}</p>;
  const day = ms => formatDate(ms, s.lang, timezone).replace(/[,،]?\s*\d{4}$/, '');
  return <figure className="hb-trend">
    <figcaption>{tr('Weekly cohorts (matured weeks only)', 'الأفواج الأسبوعية (الأسابيع المكتملة فقط)')}</figcaption>
    <ol>{m.trend.map((w, i) => <li key={i} aria-label={`${day(w.from)}: ${w.value == null ? tr('no records', 'لا سجلات') : `${w.value}% (${w.numerator}/${w.denominator})`}`}>
      <span className="hb-trend-bar" data-empty={w.value == null ? '' : undefined}><i style={{ blockSize: `${w.value ?? 0}%` }} /></span>
      <b className="ld-num">{w.value == null ? '—' : `${w.value}%`}</b><small className="ld-num">{w.denominator ? `${w.numerator}/${w.denominator}` : ''}</small><small>{day(w.from)}</small>
    </li>)}</ol>
  </figure>;
}

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
    <PageHeader icon="trending-up" title={tr('Insights', 'المؤشرات')} description={tr('Each figure names its population and window. Open any of them to see the exact records behind it.', 'كل رقم يوضح مجتمعه ونافذته. افتح أياً منها لترى السجلات التي خلفه بالضبط.')} />
    <div className="ld-segmented" role="radiogroup" aria-label={tr('Period', 'الفترة')}>
      {PERIODS.map(([id, en, arabic]) => <label key={id}><input type="radio" name="re-period" checked={period === id} onChange={() => onParams({ period: id })} /><span>{ar ? arabic : en}</span></label>)}
    </div>

    <section className="hb-kpis" aria-label={tr('Headline measures', 'المؤشرات الرئيسية')}>
      {(i.headline || []).map(m => <button key={m.id} type="button" className="hb-kpi" aria-pressed={selected?.id === m.id} data-backlog={BACKLOG.has(m.id) && m.value ? '' : undefined}
        onClick={() => onParams({ metric: m.id })}>
        <span>{ar ? METRICS[m.id].ar : METRICS[m.id].en}</span>
        <strong><Value m={m} h={h} ar={ar} /></strong>
        <Basis m={m} ar={ar} s={s} timezone={timezone} />
      </button>)}
    </section>

    {selected && <section className="hb-panel hb-kpi-detail" aria-labelledby="re-kpi-title">
      <div className="hb-status-line"><h2 id="re-kpi-title">{ar ? METRICS[selected.id].ar : METRICS[selected.id].en}</h2>
        <button type="button" className="ld-button ld-primary" onClick={() => onRecords(selected.id)}>{tr('View source records', 'عرض السجلات المصدرية')}</button></div>
      <p>{METRICS[selected.id].def(settings, ar)}</p>
      <p className="ld-help">{tr('Owner and review', 'المسؤول والمراجعة')}: {METRICS[selected.id].owner[ar ? 1 : 0]}</p>
      <Notes m={selected} ar={ar} />
      <Trend m={selected} ar={ar} s={s} timezone={timezone} />
    </section>}

    <section aria-labelledby="re-diagnostics" className="hb-diagnostics">
      <h2 id="re-diagnostics">{tr('Diagnostics', 'التشخيص')}</h2>
      <div className="ld-table-wrap"><table className="ld-table">
        <thead><tr><th>{tr('Measure', 'المؤشر')}</th><th>{tr('Value', 'القيمة')}</th><th>{tr('Basis', 'الأساس')}</th><th><span className="ld-visually-hidden">{tr('Records', 'السجلات')}</span></th></tr></thead>
        <tbody>{(i.diagnostics || []).map(m => <tr key={m.id} aria-selected={selected?.id === m.id}>
          <td data-label={tr('Measure', 'المؤشر')}><button type="button" className="ld-link" onClick={() => onParams({ metric: m.id })}>{ar ? METRICS[m.id].ar : METRICS[m.id].en}</button></td>
          <td data-label={tr('Value', 'القيمة')}><Value m={m} h={h} ar={ar} />{m.id === 'offer_backlog' && m.valueMinor ? <> · <Money h={h} minor={m.valueMinor} /></> : null}</td>
          <td data-label={tr('Basis', 'الأساس')}><Basis m={m} ar={ar} s={s} timezone={timezone} /></td>
          <td data-label={tr('Records', 'السجلات')}><button type="button" className="ld-button ld-quiet" onClick={() => onRecords(m.id)}>{tr('Records', 'السجلات')}</button></td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section aria-labelledby="re-segments" className="hb-segments">
      <div className="hb-status-line"><h2 id="re-segments">{tr('Break down by', 'تقسيم حسب')}</h2>
        <select aria-label={tr('Break down by', 'تقسيم حسب')} value={segment} onChange={e => onParams({ segment: e.target.value })}>
          <option value="">{tr('Choose…', 'اختر…')}</option>{SEGMENTS.map(id => <option key={id} value={id}>{label('segment', id, ar)}</option>)}
        </select></div>
      {i.segments?.rows?.length ? <div className="ld-table-wrap"><table className="ld-table">
        <thead><tr><th>{label('segment', segment, ar)}</th>{SEGMENT_COLUMNS.map(id => <th key={id}>{ar ? METRICS[id].ar : METRICS[id].en}</th>)}</tr></thead>
        <tbody>{i.segments.rows.map(row => <tr key={row.key}>
          <td data-label={label('segment', segment, ar)}><b><bdi>{segmentLabel(row.key)}</bdi></b></td>
          {SEGMENT_COLUMNS.map(id => { const v = row.values[id]; const m = all.find(x => x.id === id);
            return <td key={id} data-label={ar ? METRICS[id].ar : METRICS[id].en}>
              {v?.denominator || (v?.value && m?.kind !== 'rate') ? <button type="button" className="ld-link" onClick={() => onRecords(id, `${segment}:${row.key}`)}>
                {m?.kind === 'money' ? <Money h={h} minor={v.value || 0} /> : v.value == null ? '—' : m?.kind === 'rate' ? `${v.value}% (${v.numerator}/${v.denominator})` : v.value}</button> : '—'}
            </td>; })}
        </tr>)}</tbody>
      </table></div> : segment ? <p className="ld-help">{tr('No records in this period for this breakdown.', 'لا سجلات في هذه الفترة لهذا التقسيم.')}</p> : <p className="ld-help">{tr('Split the measures by rental or sale, property type, lead source or agent.', 'قسّم المؤشرات حسب الإيجار أو البيع، أو نوع العقار، أو مصدر العميل، أو الوكيل.')}</p>}
    </section>

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
