import React from 'react';
import { EmptyState, PageHeader } from '../DashboardVisuals';

const AGENT_WORDS = { invite: ['Invite an agent', 'دعوة وكيل'], none: ['No agents yet', 'لا يوجد وكلاء بعد'], hint: ['Invite your agents by email.', 'ادعُ وكلاءك بالبريد الإلكتروني.'],
  scope: limit => [`One manager and up to ${limit} agents. Agents see their own deals; money and approvals stay with you.`, `مدير واحد وحتى ${limit} وكلاء. يرى الوكلاء صفقاتهم فقط، ويبقى المال والموافقات لك.`] };

/** The manager's team: invite, resend, revoke. `words` names the staff role for the sector (agents, producers). */
export function TeamView({ ar, data, busy, act, openForm, words = AGENT_WORDS }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const w = key => words[key][ar ? 1 : 0];
  const members = data.team?.members || [];
  const status = st => ({ active: tr('Active', 'نشط'), pending: tr('Invited', 'مدعو'), revoked: tr('Removed', 'محذوف') })[st] || st;
  return <>
    <PageHeader title={tr('Team', 'الفريق')} description={words.scope(data.team?.limit || 5)[ar ? 1 : 0]} icon="users"
      primary={{ label: w('invite'), onClick: () => openForm('invite', {}) }} />
    {members.length ? <ul className="hb-re-list">{members.map(row => <li className="hb-panel hb-row" key={row.id}>
      <div><b>{row.email}</b><p>{status(row.status)}</p></div>
      {row.status === 'pending' && <button type="button" className="ld-button" disabled={busy} onClick={() => act('team_resend', { memberId: row.id })}>{tr('Resend invitation', 'إعادة إرسال الدعوة')}</button>}
      {row.status !== 'revoked' && <button type="button" className="ld-button ld-danger" disabled={busy} onClick={() => act('team_revoke', { memberId: row.id }, null, tr(`Remove ${row.email}? They are signed out at once.`, `حذف ${row.email}؟ سيُسجَّل خروجه فوراً.`))}>{tr('Remove', 'حذف')}</button>}
    </li>)}</ul> : <EmptyState icon="users" title={w('none')} description={w('hint')} action={{ label: w('invite'), onClick: () => openForm('invite', {}) }} />}
  </>;
}
