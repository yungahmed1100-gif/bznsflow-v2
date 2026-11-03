import React from 'react';
import { formatDate } from '../../../lib/dashboard/format';
import { formatLocal } from '../../../lib/timezone.js';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { label } from './labels.js';

/**
 * Customers' AC units: type, contract, last service and the next service date their technician set.
 * Units past their date come first. A repeat fault on a unit is counted here, never blamed on anyone.
 */
export function UnitsView({ ar, s, timezone, data, onAdd, onService, onOpenCustomer }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const rows = data.units?.items || [];
  return <>
    <SectionHeader title={tr('Units', 'الوحدات')} description={tr('Every AC you look after, with its service history. The next service date comes from the technician; Hasib drafts the reminder a week before.', 'كل مكيف تهتم به مع سجل صيانته. موعد الصيانة القادم من الفني، ويكتب حاسب التذكير قبل أسبوع.')}
      primary={onAdd ? { label: tr("Add unit", "إضافة وحدة"), onClick: onAdd } : undefined} />
    {rows.length ? <div className="ld-table-wrap"><table className="ld-table hb-visits hb-units">
      <thead><tr><th>{tr('Unit', 'الوحدة')}</th><th>{tr('Customer', 'العميل')}</th><th>{tr('Last service', 'آخر صيانة')}</th><th>{tr('Next service', 'الصيانة القادمة')}</th><th>{tr('Contract', 'العقد')}</th></tr></thead>
      <tbody>{rows.map(u => <tr key={u.id} data-tone={u.serviceDue ? 'orange' : undefined}>
        <td data-label={tr('Unit', 'الوحدة')}><b><bdi>{u.label}</bdi></b> · {label('unitType', u.unitType, ar)}{u.capacityBtu ? <small> · <span className="ld-num">{u.capacityBtu}</span> BTU</small> : null}
          {u.repeatFaults > 0 && <span className="ld-chip" data-tone="coral">{tr(`${u.repeatFaults} repeat`, `${u.repeatFaults} متكرر`)}</span>}</td>
        <td data-label={tr('Customer', 'العميل')}><button type="button" className="ld-link" onClick={() => onOpenCustomer(u.contactId)}><bdi>{u.contactName || tr('Customer', 'عميل')}</bdi></button>{u.area ? <small> · <bdi>{u.area}</bdi></small> : null}</td>
        <td data-label={tr('Last service', 'آخر صيانة')} className="ld-num">{u.lastServiceAt ? formatDate(u.lastServiceAt, s.lang, timezone) : '—'}</td>
        <td data-label={tr('Next service', 'الصيانة القادمة')}>{u.nextServiceAt ? <span className="ld-num">{formatDate(u.nextServiceAt, s.lang, timezone)}</span> : '—'}
          {u.serviceDue && <span className="ld-chip" data-tone="orange">{tr('Due', 'مستحقة')}</span>}
          {onService && <button type="button" className="ld-button ld-quiet" onClick={() => onService({ unitId: u.id, version: u.version, hasDate: !!u.nextServiceAt, serviceOn: u.nextServiceAt ? formatLocal(u.nextServiceAt, timezone).slice(0, 10) : '', subject: u.label })}>{u.nextServiceAt ? tr('Change', 'تغيير') : tr('Set date', 'تحديد موعد')}</button>}</td>
        <td data-label={tr('Contract', 'العقد')}>{u.contractReference ? <bdi>{u.contractReference}</bdi> : '—'}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState icon="snowflake" title={tr('No units yet', 'لا وحدات بعد')} description={tr('Add each customer’s AC units so their history, contracts and service dates follow them.', 'أضف وحدات التكييف لكل عميل ليتبعها سجلها وعقودها ومواعيد صيانتها.')}
      action={onAdd ? { label: tr('Add unit', 'إضافة وحدة'), onClick: onAdd } : undefined} />}
  </>;
}
