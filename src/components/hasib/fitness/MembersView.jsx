import React from 'react';
import { formatDate } from '../../../lib/dashboard/format';
import { EmptyState } from '../DashboardVisuals';
import { Money } from '../Badges';
import { label, QUICK, STATE_TONE } from './labels.js';

/** The member action list: member, plan, term end, last attendance, renewal state and owner, with the four quick filters. */
export function MembersView({ ar, s, h, timezone, rows, quick, onQuick, onOpen, owners, selectedId, onAdd, complete }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const date = ms => ms ? formatDate(ms, s.lang, timezone) : '—';
  const shown = quick === 'all' ? rows : rows.filter(r => r.flags[quick]);
  return <>
    <div className="hb-board-filters">
      <div className="ld-segmented" role="radiogroup" aria-label={tr('Show members', 'عرض الأعضاء')}>
        {QUICK.map(q => <label key={q}><input type="radio" name="ft-quick" checked={quick === q} onChange={() => onQuick(q)} />
          <span>{label('quick', q, ar)} {q !== 'all' && <b className="ld-num">{rows.filter(r => r.flags[q]).length}</b>}</span></label>)}
      </div>
    </div>
    {complete === false && <p className="hb-warn" role="status">{tr('Showing the newest 1,000 members.', 'يُعرض أحدث ١٠٠٠ عضو.')}</p>}
    {shown.length ? <div className="ld-table-wrap"><table className="ld-table hb-members">
      <thead><tr><th>{tr('Member', 'العضو')}</th><th>{tr('Plan', 'الخطة')}</th><th>{tr('Term end', 'نهاية المدة')}</th><th>{tr('Last attendance', 'آخر حضور')}</th>
        <th>{tr('Renewal', 'التجديد')}</th><th>{tr('Owner', 'المسؤول')}</th></tr></thead>
      <tbody>{shown.map(r => <tr key={r.id} data-tone={STATE_TONE[r.state]} aria-selected={selectedId === r.id} data-flags={Object.keys(r.flags).filter(k => r.flags[k]).join(' ')}>
        <td data-label={tr('Member', 'العضو')}><button type="button" className="ld-link hb-member-open" onClick={() => onOpen(r.contactId)}><bdi>{r.contactName || tr('Customer', 'عميل')}</bdi></button>
          {' '}<span className="ld-chip" data-tone={STATE_TONE[r.state]}>{label('state', r.state, ar)}</span>
          {r.flags.attendanceGap && <span className="ld-chip" data-tone="coral">{label('quick', 'attendanceGap', ar)}</span>}</td>
        <td data-label={tr('Plan', 'الخطة')}>{r.membership ? <><bdi>{r.membership.planName}</bdi>{r.membership.remainingCredits != null && <small> · {tr(`${r.membership.remainingCredits} classes left`, `${r.membership.remainingCredits} حصص متبقية`)}</small>}
          {r.money?.balanceMinor ? <small> · {tr('owes', 'متبقٍ')} <Money h={h} minor={r.money.balanceMinor} /></small> : null}</>
          : r.trial ? label('trial', r.trial.status, ar) : tr('Enquiry', 'استفسار')}</td>
        <td data-label={tr('Term end', 'نهاية المدة')}>{date(r.membership?.endsAt)}</td>
        <td data-label={tr('Last attendance', 'آخر حضور')}>{date(r.lastAttendanceAt || (r.trial?.status === 'attended' ? r.trial.classStartsAt : null))}</td>
        <td data-label={tr('Renewal', 'التجديد')}>{r.renewalState ? label('renewal', r.renewalState, ar) : '—'}</td>
        <td data-label={tr('Owner', 'المسؤول')}><bdi>{owners.get(String(r.ownerId)) || '—'}</bdi></td>
      </tr>)}</tbody>
    </table></div> : <EmptyState icon="users" title={quick === 'all' ? tr('No members yet', 'لا أعضاء بعد') : tr('No one in this filter', 'لا أحد في هذا التصنيف')}
      description={quick === 'all' ? tr('Layla adds enquiries here; book a trial class, or add a membership for an offline sign-up.', 'تضيف ليلى الاستفسارات هنا. احجز حصة تجريبية، أو أضف عضوية لتسجيل تم خارج المحادثة.') : tr('Try another filter.', 'جرّب تصنيفاً آخر.')}
      action={quick === 'all' && onAdd ? { label: tr('Add membership', 'إضافة عضوية'), onClick: onAdd } : undefined} />}
  </>;
}

/** The quick-look drawer at wide widths; the full record is one click away. */
export function MemberPreview({ row, ar, s, timezone, onOpenFull, onClose }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <aside className="hb-panel hb-deal-preview" aria-label={tr('Member preview', 'معاينة العضو')}>
    <div className="hb-status-line"><b><bdi>{row.contactName || tr('Customer', 'عميل')}</bdi></b><button type="button" className="ld-button ld-quiet" onClick={onClose}>{tr('Close', 'إغلاق')}</button></div>
    <p><span className="ld-chip" data-tone={STATE_TONE[row.state]}>{label('state', row.state, ar)}</span></p>
    {row.membership && <p className="ld-help"><bdi>{row.membership.planName}</bdi> · {tr('ends', 'ينتهي')} {formatDate(row.membership.endsAt, s.lang, timezone)}</p>}
    {row.trial && <p className="ld-help">{label('trial', row.trial.status, ar)}{row.trial.title ? <> · <bdi>{row.trial.title}</bdi></> : null}</p>}
    <button type="button" className="ld-button ld-primary" onClick={() => onOpenFull(row.contactId)}>{tr('Open full record', 'فتح السجل كاملاً')}</button>
  </aside>;
}
