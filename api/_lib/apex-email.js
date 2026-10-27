// The email Ahmed receives for each Apex request. The recipient is fixed in config/apex.js; the company's
// address only becomes reply-to.
import { APEX_RECIPIENT } from '../../config/apex.js';

const QUEUE = 'https://www.bznsflowai.com/en/owner/apex';
const FUNCTIONS = { erp: 'ERP / Odoo connection', branches: 'Branches and teams routing', workflows: 'Custom agent workflows', channels: 'Voice and other channels', other: 'Something else' };
const SYSTEMS = { odoo: 'Odoo', other_erp: 'Another ERP', none: 'No ERP yet' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** @param {{ id: string, company: string, name: string, email: string, phone?: string, branches?: string, staff?: string, system?: string, systemNote?: string, functions: string[], need: string, lang: string }} request */
export function apexEmail(request) {
  const rows = [['Company', request.company], ['Name', request.name], ['Email', request.email], ['Phone', request.phone],
    ['Branches', request.branches], ['Staff', request.staff], ['Systems', [SYSTEMS[request.system], request.systemNote].filter(Boolean).join(' — ')],
    ['Functions', request.functions.map(f => FUNCTIONS[f] || f).join(', ')], ['Language', request.lang === 'ar' ? 'Arabic' : 'English'], ['What the agents should do', request.need]]
    .filter(([, value]) => value);
  const subject = `Apex request — ${request.company}`.slice(0, 200);
  const html = `<p>A company requested Apex on bznsflowai.com. Queue: <a href="${QUEUE}">${QUEUE}</a></p><table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${
    rows.map(([label, value]) => `<tr><th align="left" valign="top" style="border-bottom:1px solid #ddd">${escape(label)}</th><td dir="auto" style="border-bottom:1px solid #ddd">${escape(value).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
  const text = ['A company requested Apex on bznsflowai.com.', ...rows.map(([label, value]) => `${label}: ${value}`), `Queue: ${QUEUE}`].join('\n');
  return { to: [APEX_RECIPIENT], reply_to: request.email, subject, html, text };
}
