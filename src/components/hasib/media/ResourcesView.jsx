import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { label } from './labels.js';

/** Crew and equipment, with their next booking and how many holds each carries. */
export function ResourcesView({ ar, h, s, timezone, data, manager, onAdd, onEdit }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const rows = data.resources?.items || [];
  return <>
    <SectionHeader title={tr('Resources', 'الموارد')} description={tr('Crew and equipment a production can hold. Two confirmed bookings can never share one at the same time.', 'الطاقم والمعدات التي يمكن للإنتاج حجزها. لا يمكن لحجزين مؤكدين استخدام المورد نفسه في الوقت نفسه.')}
      primary={manager ? { label: tr('Add crew or equipment', 'إضافة طاقم أو معدات'), onClick: onAdd } : null} />
    {rows.length ? <div className="ld-table-wrap"><table className="ld-table">
      <thead><tr><th>{tr('Resource', 'المورد')}</th><th>{tr('Category', 'الفئة')}</th><th>{tr('Next booking', 'الحجز القادم')}</th><th>{tr('Upcoming', 'القادم')}</th>{manager && <th>{tr('Internal rate / day', 'التكلفة الداخلية / يوم')}</th>}<th><span className="ld-visually-hidden">{tr('Edit', 'تعديل')}</span></th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id} data-active={r.active ? 'yes' : 'no'}>
        <td data-label={tr('Resource', 'المورد')}><b><bdi>{r.name}</bdi></b>{!r.active && <> · <span className="ld-chip is-muted">{tr('Inactive', 'غير نشط')}</span></>}</td>
        <td data-label={tr('Category', 'الفئة')}>{label('category', r.category, ar)}</td>
        <td data-label={tr('Next booking', 'الحجز القادم')}>{r.next ? <>{formatDateTime(r.next.startsAt, s.lang, timezone)} · {label('hold', r.next.status, ar)}</> : '—'}</td>
        <td data-label={tr('Upcoming', 'القادم')}>{tr(`${r.confirmed} confirmed, ${r.held} tentative`, `${r.confirmed} مؤكدة، ${r.held} مبدئية`)}</td>
        {manager && <td data-label={tr('Internal rate / day', 'التكلفة الداخلية / يوم')}>{r.internalRateMinor ? <Money h={h} minor={r.internalRateMinor} /> : '—'}</td>}
        <td data-label={tr('Edit', 'تعديل')}>{manager && <button type="button" className="ld-button ld-quiet" onClick={() => onEdit(r)}>{tr('Edit', 'تعديل')}</button>}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState icon="calendar" title={tr('No crew or equipment yet', 'لا طاقم أو معدات بعد')} description={tr('Add the crew and kit you book, so holds can be checked for clashes.', 'أضف الطاقم والمعدات التي تحجزها، ليتم فحص التعارض في الحجوزات.')}
      action={manager ? { label: tr('Add crew or equipment', 'إضافة طاقم أو معدات'), onClick: onAdd } : null} />}
  </>;
}
