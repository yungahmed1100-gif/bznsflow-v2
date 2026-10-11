import React from 'react';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';

// Shared Insights pieces for the sector workspaces (ascend/measurement-contract.md): every figure
// shows its basis and window, and an empty population says so instead of showing 0%.
export const PERIODS = [['7d', 'Last 7 days', 'آخر ٧ أيام'], ['30d', 'Last 30 days', 'آخر ٣٠ يوماً'], ['month', 'This month', 'هذا الشهر'], ['prev_month', 'Last month', 'الشهر الماضي']];
const D = 86400000, H = 3600000;

/** A duration in the largest unit that reads well. */
export function duration(ms, ar) {
  if (ms == null) return null;
  if (ms >= 2 * D) return ar ? `${Math.round(ms / D * 10) / 10} يوم` : `${Math.round(ms / D * 10) / 10} days`;
  if (ms >= H) return ar ? `${Math.round(ms / H * 10) / 10} ساعة` : `${Math.round(ms / H * 10) / 10} h`;
  return ar ? `${Math.max(1, Math.round(ms / 60000))} دقيقة` : `${Math.max(1, Math.round(ms / 60000))} min`;
}

/** A metric's headline value in its own unit. */
export function KpiValue({ m, h, ar }) {
  if (m.value == null) return <span className="hb-kpi-empty">{ar ? 'لا توجد سجلات مؤهلة' : 'No eligible records'}</span>;
  if (m.kind === 'rate') return <span className="ld-num">{m.value}%</span>;
  if (m.kind === 'money') return <Money h={h} minor={m.value} />;
  if (m.kind === 'duration') return <span>{duration(m.value, ar)}</span>;
  return <span className="ld-num">{m.value}</span>;
}

/** "3 of 9", P90, the as-of time or period, and any coverage warning. `extra` adds sector parts. */
export function KpiBasis({ m, ar, s, timezone, extra = [] }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const parts = [];
  if (m.kind === 'rate') parts.push(tr(`${m.numerator} of ${m.denominator}`, `${m.numerator} من ${m.denominator}`));
  if (m.kind === 'duration' && m.p90 != null) parts.push(`P90 ${duration(m.p90, ar)}`);
  if (m.oldestMs) parts.push(tr(`oldest ${duration(m.oldestMs, ar)}`, `الأقدم ${duration(m.oldestMs, ar)}`));
  parts.push(...extra);
  parts.push(m.asOf ? tr(`as of ${formatDateTime(m.asOf, s.lang, timezone)}`, `حتى ${formatDateTime(m.asOf, s.lang, timezone)}`) : tr('selected period', 'الفترة المختارة'));
  return <small>{parts.filter(Boolean).join(' · ')}{m.complete === false && <b className="hb-warn"> · {tr('Incomplete: older records not read', 'غير مكتمل: لم تُقرأ السجلات الأقدم')}</b>}</small>;
}

/** Eight weeks of matured cohorts as a compact column chart; each column says its own count. */
export function KpiTrend({ m, ar, s, timezone, format = w => `${w.value}%` }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  if (!m.trend) return <p className="ld-help">{m.asOf ? tr('A live backlog: it has no history to chart until snapshots are kept.', 'رصيد لحظي: لا تاريخ له يُرسم حتى تُحفظ لقطات.') : tr('No weekly trend for this measure.', 'لا اتجاه أسبوعي لهذا المؤشر.')}</p>;
  const day = ms => formatDate(ms, s.lang, timezone).replace(/[,،]?\s*\d{4}$/, '');
  const top = Math.max(100, ...m.trend.map(w => w.value ?? 0));
  return <figure className="hb-trend">
    <figcaption>{tr('Weekly cohorts (matured weeks only)', 'الأفواج الأسبوعية (الأسابيع المكتملة فقط)')}</figcaption>
    <ol>{m.trend.map((w, i) => <li key={i} aria-label={`${day(w.from)}: ${w.value == null ? tr('no records', 'لا سجلات') : `${format(w)} (${w.numerator}/${w.denominator})`}`}>
      <span className="hb-trend-bar" data-empty={w.value == null ? '' : undefined}><i style={{ blockSize: `${Math.round((w.value ?? 0) * 100 / top)}%` }} /></span>
      <b className="ld-num">{w.value == null ? '—' : format(w)}</b><small className="ld-num">{w.denominator ? `${w.numerator}/${w.denominator}` : ''}</small><small>{day(w.from)}</small>
    </li>)}</ol>
  </figure>;
}

/** The period picker every Insights page starts with. */
export function PeriodPicker({ ar, period, onChange, name }) {
  return <div className="ld-segmented" role="radiogroup" aria-label={ar ? 'الفترة' : 'Period'}>
    {PERIODS.map(([id, en, arabic]) => <label key={id}><input type="radio" name={name} checked={period === id} onChange={() => onChange(id)} /><span>{ar ? arabic : en}</span></label>)}
  </div>;
}

/** The four headline cards; the pressed one opens its detail below. */
export function KpiCards({ ar, h, s, timezone, metrics, defs, selectedId, backlog = new Set(), onSelect, basisExtra = () => [] }) {
  return <section className="hb-kpis" aria-label={ar ? 'المؤشرات الرئيسية' : 'Headline measures'}>
    {metrics.map(m => <button key={m.id} type="button" className="hb-kpi" data-metric={m.id} aria-pressed={selectedId === m.id} data-backlog={backlog.has(m.id) && m.value ? '' : undefined} onClick={() => onSelect(m.id)}>
      <span>{ar ? defs[m.id].ar : defs[m.id].en}</span>
      <strong><KpiValue m={m} h={h} ar={ar} /></strong>
      <KpiBasis m={m} ar={ar} s={s} timezone={timezone} extra={basisExtra(m)} />
    </button>)}
  </section>;
}

/** The diagnostics table: each row opens its detail or its source records. */
export function DiagnosticsTable({ ar, h, s, timezone, metrics, defs, selectedId, onSelect, onRecords, valueExtra = () => null, basisExtra = () => [] }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <section aria-labelledby="ws-diagnostics" className="hb-diagnostics">
    <h2 id="ws-diagnostics">{tr('Diagnostics', 'التشخيص')}</h2>
    <div className="ld-table-wrap"><table className="ld-table">
      <thead><tr><th>{tr('Measure', 'المؤشر')}</th><th>{tr('Value', 'القيمة')}</th><th>{tr('Basis', 'الأساس')}</th><th><span className="ld-visually-hidden">{tr('Records', 'السجلات')}</span></th></tr></thead>
      <tbody>{metrics.map(m => <tr key={m.id} aria-selected={selectedId === m.id}>
        <td data-label={tr('Measure', 'المؤشر')}><button type="button" className="ld-link" onClick={() => onSelect(m.id)}>{ar ? defs[m.id].ar : defs[m.id].en}</button></td>
        <td data-label={tr('Value', 'القيمة')}><KpiValue m={m} h={h} ar={ar} />{valueExtra(m)}</td>
        <td data-label={tr('Basis', 'الأساس')}><KpiBasis m={m} ar={ar} s={s} timezone={timezone} extra={basisExtra(m)} /></td>
        <td data-label={tr('Records', 'السجلات')}><button type="button" className="ld-button ld-quiet" onClick={() => onRecords(m.id)}>{tr('Records', 'السجلات')}</button></td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

/** Whether a drill-down row is in the result, only in the population, or outside it. */
export function CountedChip({ row, ar }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <span className={`ld-chip ${row.inNumerator ? 'is-green' : row.counts ? 'is-muted' : 'is-yellow'}`}>
    {row.inNumerator ? tr('Counted', 'محتسب') : row.counts ? tr('In population only', 'في المجتمع فقط') : tr('Outside the population', 'خارج المجتمع')}</span>;
}

/** "N counted out of M in the population", with the incomplete warning. */
export function RecordsSummary({ rows, ar, complete }) {
  const counted = rows.filter(r => r.counts), hits = counted.filter(r => r.inNumerator), outside = rows.length - counted.length;
  return <p className="ld-help">{ar ? `${hits.length} محتسبة في النتيجة من أصل ${counted.length} في المجتمع${outside ? `؛ و${outside} معروضة خارجه` : ''}.`
    : `${hits.length} counted in the result, out of ${counted.length} in its population${outside ? `; ${outside} listed but outside it` : ''}.`}
    {complete === false && <b className="hb-warn"> {ar ? 'لم تُقرأ السجلات الأقدم.' : 'Older records were not read.'}</b>}</p>;
}
