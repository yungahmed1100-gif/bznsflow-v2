import React from 'react';
import { formatDate, formatDateTime, formatTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { Money } from '../Badges';
import { label, STATUS_TONE, QUICK } from './labels.js';

const DAY = 86400000,
  HOUR = 3600000;

/** The job's customer, its number and what makes it stand out (urgent, outside the areas, a contract visit). */
function JobTitle({ job, ar, onOpen }) {
  return (
    <>
      <button type="button" className="ld-link hb-visit-open" onClick={() => onOpen(job.id)}>
        <span className="ld-num">#{job.number}</span> · <bdi>{job.contactName || (ar ? 'عميل' : 'Customer')}</bdi>
      </button>
      {job.urgent && (
        <span className="ld-chip" data-tone="coral">
          {ar ? 'عاجل' : 'Urgent'}
        </span>
      )}
      {job.outOfArea && (
        <span className="ld-chip" data-tone="orange">
          {ar ? 'خارج المناطق' : 'Outside areas'}
        </span>
      )}
      {job.contractId && (
        <span className="ld-chip" data-tone="blue">
          {ar ? 'عقد' : 'Contract'}
        </span>
      )}
    </>
  );
}
const units = (job, ar) =>
  job.units?.length ? job.units.map(u => `${u.label} (${label('unitType', u.unitType, ar)})`).join(' · ') : null;

/** One tap from a visit: arrived, once its window is near. Everything else is on the job's record. */
function VisitActions({ visit, ar, busy, act }) {
  if (visit.status !== 'scheduled' || Date.now() < visit.startsAt - 2 * HOUR) return null;
  return (
    <button
      type="button"
      className="ld-button"
      disabled={busy}
      data-to="arrived"
      onClick={() => act('hvac_visit_status', { visitId: visit.id, version: visit.version, status: 'arrived' })}
    >
      {ar ? 'وصل الفني' : 'Arrived'}
    </button>
  );
}

/**
 * The dispatch board for a day: one column per technician with each visit window, job, units and next
 * step, plus the jobs still waiting for a time. Booking a window that clashes is refused.
 */
export function ScheduleView({ ar, s, timezone, data, busy, act, day, onDay, onOpen, onBook, manager }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const board = data.schedule || {},
    visits = board.visits || [],
    techs = board.technicians || [];
  const columns = techs
    .map(t => ({ ...t, visits: visits.filter(v => v.technicianAccountId === t.accountId) }))
    .filter(c => c.visits.length || techs.length <= 4);
  const waiting = board.unscheduled || [];
  return (
    <>
      <SectionHeader
        title={tr('Dispatch schedule', 'جدول التوزيع')}
        description={tr(
          'Each technician’s visit windows for the day. Record the arrival when they get there; reminders, follow-ups and figures follow by themselves.',
          'نوافذ زيارات كل فني في اليوم. سجّل الوصول عند الوصول؛ وتتبعه التذكيرات والمتابعات والأرقام تلقائياً.',
        )}
      />
      <div className="hb-day-nav" role="group" aria-label={tr('Day', 'اليوم')}>
        <button type="button" className="ld-button ld-quiet" onClick={() => onDay(day - DAY)}>
          {tr('Previous day', 'اليوم السابق')}
        </button>
        <b className="hb-day-label">{formatDate(day, s.lang, timezone)}</b>
        <button type="button" className="ld-button ld-quiet" onClick={() => onDay(day + DAY)}>
          {tr('Next day', 'اليوم التالي')}
        </button>
        <button type="button" className="ld-button ld-quiet" onClick={() => onDay(null)}>
          {tr('Today', 'اليوم')}
        </button>
      </div>
      <div className="hb-schedule hb-hvac-board">
        {columns.map(col => (
          <section key={col.accountId} className="hb-schedule-col" aria-label={col.name}>
            <h3>
              <bdi>{col.name}</bdi> <small className="ld-num">{col.visits.length}</small>
            </h3>
            {col.visits.length ? (
              <ul>
                {col.visits.map(v => (
                  <li
                    key={v.id}
                    className="hb-panel hb-visit"
                    data-tone={v.job ? STATUS_TONE[v.job.status] : undefined}
                    data-status={v.status}
                  >
                    <div className="hb-status-line">
                      <span className="ld-num">
                        {formatTime(v.startsAt, s.lang, timezone)}–{formatTime(v.endsAt, s.lang, timezone)}
                      </span>
                      <span
                        className="ld-chip"
                        data-tone={v.status === 'arrived' ? 'orange' : v.job?.visit?.unrecorded ? 'coral' : undefined}
                      >
                        {v.job?.visit?.unrecorded
                          ? tr('No arrival recorded', 'لم يُسجل الوصول')
                          : label('visit', v.status, ar)}
                      </span>
                    </div>
                    {v.job && (
                      <p>
                        <JobTitle job={v.job} ar={ar} onOpen={onOpen} />
                      </p>
                    )}
                    {v.job && (
                      <p className="ld-help">
                        {label('jobType', v.job.jobType, ar)}
                        {units(v.job, ar) ? (
                          <>
                            {' '}
                            · <bdi>{units(v.job, ar)}</bdi>
                          </>
                        ) : null}
                        {v.job.area ? (
                          <>
                            {' '}
                            · <bdi>{v.job.area}</bdi>
                          </>
                        ) : null}
                      </p>
                    )}
                    {v.job?.nextAction && <p className="ld-help">{label('next', v.job.nextAction, ar)}</p>}
                    <div className="ld-actions">
                      <VisitActions visit={v} ar={ar} busy={busy} act={act} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ld-help">{tr('Free all day', 'متاح طوال اليوم')}</p>
            )}
          </section>
        ))}
        {manager !== null && (
          <section className="hb-schedule-col hb-unscheduled" aria-label={tr('Waiting for a time', 'بانتظار موعد')}>
            <h3>
              {tr('Waiting for a time', 'بانتظار موعد')} <small className="ld-num">{waiting.length}</small>
            </h3>
            {waiting.length ? (
              <ul>
                {waiting.map(job => (
                  <li key={job.id} className="hb-panel hb-visit" data-tone={STATUS_TONE[job.status]}>
                    <p>
                      <JobTitle job={job} ar={ar} onOpen={onOpen} />
                    </p>
                    <p className="ld-help">
                      {label('jobType', job.jobType, ar)} · {label('status', job.status, ar)}
                      {job.partsLabel ? (
                        <>
                          {' '}
                          · <bdi>{job.partsLabel}</bdi>
                        </>
                      ) : null}
                    </p>
                    {onBook && (
                      <div className="ld-actions">
                        <button type="button" className="ld-button ld-primary" onClick={() => onBook(job)}>
                          {tr('Book a visit', 'حجز زيارة')}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ld-help">{tr('Every job has a time.', 'لكل عمل موعد.')}</p>
            )}
          </section>
        )}
      </div>
      {!visits.length && !waiting.length && (
        <EmptyState
          icon="calendar"
          title={tr('Nothing booked this day', 'لا شيء محجوز في هذا اليوم')}
          description={tr(
            'Layla’s requests wait in Follow-ups; triage them, then book a window here.',
            'تنتظر طلبات ليلى في المتابعات؛ افرزها ثم احجز نافذة من هنا.',
          )}
        />
      )}
    </>
  );
}

/** The job list with its quick filters: number and customer, type and units, status, visit and next step. */
export function JobList({ ar, s, h, timezone, data, quick, onQuick, onOpen, selectedId, onAdd }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const rows = data.jobs?.items || [];
  const shown = quick === 'all' ? rows : rows.filter(r => r.flags[quick]);
  return (
    <>
      <div className="hb-board-filters">
        <div className="ld-segmented" role="radiogroup" aria-label={tr('Show jobs', 'عرض الأعمال')}>
          {QUICK.map(q => (
            <label key={q}>
              <input type="radio" name="hv-quick" checked={quick === q} onChange={() => onQuick(q)} />
              <span>
                {label('quick', q, ar)} {q !== 'all' && <b className="ld-num">{rows.filter(r => r.flags[q]).length}</b>}
              </span>
            </label>
          ))}
        </div>
      </div>
      {data.jobs?.complete === false && (
        <p className="hb-warn" role="status">
          {tr('Showing the newest 500 jobs.', 'تُعرض أحدث ٥٠٠ عمل.')}
        </p>
      )}
      {shown.length ? (
        <div className="ld-table-wrap">
          <table className="ld-table hb-visits hb-hvac-jobs">
            <thead>
              <tr>
                <th>{tr('Job', 'العمل')}</th>
                <th>{tr('Type and units', 'النوع والوحدات')}</th>
                <th>{tr('Status', 'الحالة')}</th>
                <th>{tr('Visit', 'الزيارة')}</th>
                <th>{tr('Next step', 'الخطوة التالية')}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(job => (
                <tr key={job.id} data-tone={STATUS_TONE[job.status]} aria-selected={selectedId === job.id}>
                  <td data-label={tr('Job', 'العمل')}>
                    <JobTitle job={job} ar={ar} onOpen={onOpen} />
                  </td>
                  <td data-label={tr('Type and units', 'النوع والوحدات')}>
                    {label('jobType', job.jobType, ar)}
                    {units(job, ar) ? (
                      <small>
                        {' '}
                        · <bdi>{units(job, ar)}</bdi>
                      </small>
                    ) : null}
                  </td>
                  <td data-label={tr('Status', 'الحالة')}>
                    <span className="ld-chip" data-tone={STATUS_TONE[job.status]}>
                      {label('status', job.status, ar)}
                    </span>
                  </td>
                  <td data-label={tr('Visit', 'الزيارة')} className="ld-num">
                    {job.visit ? (
                      <>
                        {formatDateTime(job.visit.startsAt, s.lang, timezone)}
                        {job.technicianName ? (
                          <small>
                            {' '}
                            · <bdi>{job.technicianName}</bdi>
                          </small>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td data-label={tr('Next step', 'الخطوة التالية')}>
                    {job.nextAction ? label('next', job.nextAction, ar) : '—'}
                    {job.money?.balanceMinor ? (
                      <small>
                        {' '}
                        · <Money h={h} minor={job.money.balanceMinor} />
                      </small>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="wrench"
          title={
            quick === 'all'
              ? tr('No jobs yet', 'لا أعمال بعد')
              : tr('No jobs in this filter', 'لا أعمال في هذا التصنيف')
          }
          description={
            quick === 'all'
              ? tr('Add a job, or wait for Layla’s requests.', 'أضف عملاً، أو انتظر طلبات ليلى.')
              : tr('Try another filter.', 'جرّب تصنيفاً آخر.')
          }
          action={quick === 'all' && onAdd ? { label: tr('New job', 'عمل جديد'), onClick: onAdd } : undefined}
        />
      )}
    </>
  );
}

/** The quick-look drawer at wide widths; the full record is one click away. */
export function JobPreview({ row, ar, s, timezone, onOpenFull, onClose }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return (
    <aside className="hb-panel hb-deal-preview" aria-label={tr('Job preview', 'معاينة العمل')}>
      <div className="hb-status-line">
        <b>
          <span className="ld-num">#{row.number}</span> · <bdi>{row.contactName || tr('Customer', 'عميل')}</bdi>
        </b>
        <button type="button" className="ld-button ld-quiet" onClick={onClose}>
          {tr('Close', 'إغلاق')}
        </button>
      </div>
      <p>
        <span className="ld-chip" data-tone={STATUS_TONE[row.status]}>
          {label('status', row.status, ar)}
        </span>{' '}
        {label('jobType', row.jobType, ar)}
      </p>
      {row.visit && (
        <p className="ld-help">
          {formatDateTime(row.visit.startsAt, s.lang, timezone)}
          {row.technicianName ? (
            <>
              {' '}
              · <bdi>{row.technicianName}</bdi>
            </>
          ) : null}
        </p>
      )}
      {row.nextAction && <p className="ld-help">{label('next', row.nextAction, ar)}</p>}
      <button type="button" className="ld-button ld-primary" onClick={() => onOpenFull(row.id)}>
        {tr('Open full record', 'فتح السجل كاملاً')}
      </button>
    </aside>
  );
}
