import React from 'react';
import { EmptyState, PageHeader } from '../DashboardVisuals';

/** The manager's agents: invite, resend, revoke. */
export function TeamView({ ar, data, busy, act, openForm }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const members = data.team?.members || [];
  const status = st => ({ active: tr('Active', 'نشط'), pending: tr('Invited', 'مدعو'), revoked: tr('Removed', 'محذوف') })[st] || st;
  return <>
    <PageHeader title={tr('Team', 'الفريق')} description={tr(`One manager and up to ${data.team?.limit || 5} agents. Agents see their own deals; money and approvals stay with you.`, `مدير واحد وحتى ${data.team?.limit || 5} وكلاء. يرى الوكلاء صفقاتهم فقط، ويبقى المال والموافقات لك.`)} icon="users"
      primary={{ label: tr('Invite an agent', 'دعوة وكيل'), onClick: () => openForm('invite', {}) }} />
    {members.length ? <ul className="hb-re-list">{members.map(row => <li className="hb-panel hb-row" key={row.id}>
      <div><b>{row.email}</b><p>{status(row.status)}</p></div>
      {row.status === 'pending' && <button type="button" className="ld-button" disabled={busy} onClick={() => act('team_resend', { memberId: row.id })}>{tr('Resend invitation', 'إعادة إرسال الدعوة')}</button>}
      {row.status !== 'revoked' && <button type="button" className="ld-button ld-danger" disabled={busy} onClick={() => act('team_revoke', { memberId: row.id }, null, tr(`Remove ${row.email}? They are signed out at once.`, `حذف ${row.email}؟ سيُسجَّل خروجه فوراً.`))}>{tr('Remove', 'حذف')}</button>}
    </li>)}</ul> : <EmptyState icon="users" title={tr('No agents yet', 'لا يوجد وكلاء بعد')} description={tr('Invite your agents by email.', 'ادعُ وكلاءك بالبريد الإلكتروني.')} action={{ label: tr('Invite an agent', 'دعوة وكيل'), onClick: () => openForm('invite', {}) }} />}
  </>;
}
