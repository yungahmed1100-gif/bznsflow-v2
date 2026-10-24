// The email Ahmed receives for each free-audit booking, with a calendar invite. The recipient is fixed in
// config/audit.js; the visitor's address only becomes reply-to.
import { AUDIT_RECIPIENT, AUDIT_SLOT_MIN } from '../../config/audit.js';

const CALENDAR = 'https://www.bznsflowai.com/en/layla/dashboard?tab=audits';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// RFC 5545 text: escape \ ; , and fold newlines; stamps are UTC.
const icsText = value => String(value).replace(/[\;,]/g, c => `\\${c}`).replace(/\r?\n/g, '\\n');
const stamp = at => new Date(at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const when = at => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }).format(new Date(at));

/** @param {{ id: string, startAt: number, name: string, email: string, phone?: string, business?: string, industry?: string, note?: string, lang: string }} booking */
export function auditInvite(booking, now = Date.now()) {
  const summary = `BznsFlow free audit — ${booking.business || booking.name}`;
  const description = [`${booking.name} <${booking.email}>`, booking.phone, booking.industry && `Industry: ${booking.industry}`, booking.note].filter(Boolean).join('\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BznsFlow//Audit//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:audit-${booking.id}@bznsflowai.com`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(booking.startAt)}`, `DTEND:${stamp(booking.startAt + AUDIT_SLOT_MIN * 60000)}`,
    `SUMMARY:${icsText(summary)}`, `DESCRIPTION:${icsText(description)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

export function auditEmail(booking, now = Date.now()) {
  const rows = [['When', `${when(booking.startAt)} (Muscat), ${AUDIT_SLOT_MIN} minutes`], ['Name', booking.name], ['Email', booking.email], ['Phone', booking.phone],
    ['Business', booking.business], ['Industry', booking.industry], ['Language', booking.lang === 'ar' ? 'Arabic' : 'English'], ['Note', booking.note]].filter(([, value]) => value);
  const subject = `Free audit booked — ${booking.business || booking.name}, ${when(booking.startAt)}`.slice(0, 200);
  const html = `<p>A free audit was booked on bznsflowai.com. Calendar: <a href="${CALENDAR}">${CALENDAR}</a></p><table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${
    rows.map(([label, value]) => `<tr><th align="left" valign="top" style="border-bottom:1px solid #ddd">${escape(label)}</th><td dir="auto" style="border-bottom:1px solid #ddd">${escape(value).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
  const text = ['A free audit was booked on bznsflowai.com.', ...rows.map(([label, value]) => `${label}: ${value}`), `Calendar: ${CALENDAR}`].join('\n');
  return { to: [AUDIT_RECIPIENT], reply_to: booking.email, subject, html, text,
    attachments: [{ filename: 'audit.ics', content: Buffer.from(auditInvite(booking, now)).toString('base64'), content_type: 'text/calendar; method=PUBLISH' }] };
}
