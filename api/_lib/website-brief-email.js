// The email Ahmed receives for each website brief: every field the owner entered, the logo and photos
// attached. The recipient is fixed in config/website-brief.js; nothing the owner sends can change it.
// When the owner asks for online payments, Paymob's documents are attached too, named by what they are,
// so Ahmed can forward the pack to Paymob as it arrives (2026-10-31).
import { BRIEF_LABELS, BRIEF_RECIPIENT } from '../../config/website-brief.js';

const QUEUE = 'https://www.bznsflowai.com/en/owner/websites';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const DOC_FILE = { doc_cr: 'commercial-register', doc_id: 'id-card', doc_bank: 'bank-proof', doc_tax: 'tax-card', doc_forms: 'signed-paymob-forms', doc_invoice: 'invoice' };
const shown = value => Array.isArray(value) ? value.join(', ') : value === true ? 'Yes' : String(value);

function htmlValue(key, value) {
  if (key === 'colors') return value.map(c => `<span style="display:inline-block;width:14px;height:14px;border:1px solid #999;background:${escape(c)};vertical-align:middle"></span> ${escape(c)}`).join(' &nbsp; ');
  if (key === 'references' || key === 'mapUrl') return [].concat(value).map(u => `<a href="${escape(u)}">${escape(u)}</a>`).join('<br>');
  return escape(shown(value)).replace(/\n/g, '<br>');
}

/** Paymob's documents, numbered within their kind: paymob-id-card-2.jpg. */
const docFiles = docs => docs.map((d, i) => ({ ...d, filename: `paymob-${DOC_FILE[d.kind] || 'document'}-${docs.slice(0, i + 1).filter(x => x.kind === d.kind).length}` }));

/** @param {{ version: number, update: boolean, account: { email: string, name: string }, fields: object, logo: object|null, photos: object[], docs?: object[] }} brief */
export function briefEmail(brief) {
  const name = brief.fields.nameEn || brief.fields.nameAr || brief.account.email;
  const rows = BRIEF_LABELS.filter(([key]) => brief.fields[key] !== undefined);
  const paying = brief.fields.payments === 'yes';
  const files = [...(brief.logo ? [{ ...brief.logo, filename: 'logo' }] : []), ...brief.photos.map((p, i) => ({ ...p, filename: `photo-${i + 1}` })),
    ...(paying ? docFiles(brief.docs || []) : [])]
    .filter(f => f.url).map(f => ({ filename: `${f.filename}.${EXT[f.contentType] || 'jpg'}`, path: f.url }));
  const subject = `${brief.update ? 'Updated website brief' : 'Website brief'}${paying ? ' + Paymob' : ''} — ${name}`.slice(0, 200);
  const due = brief.project?.dueAt ? ` Due ${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Muscat' }).format(new Date(brief.project.dueAt))}, 17:00 Muscat.` : '';
  const intro = `Ascend account ${brief.account.email}${brief.account.name ? ` (${brief.account.name})` : ''}, brief version ${brief.version}. ${files.length} file(s) attached.${due} Queue: ${QUEUE}`;
  const html = `<p>${escape(intro)}</p><table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${
    rows.map(([key, label]) => `<tr><th align="left" valign="top" style="border-bottom:1px solid #ddd">${escape(label)}</th><td dir="auto" style="border-bottom:1px solid #ddd">${htmlValue(key, brief.fields[key])}</td></tr>`).join('')
  }</table>`;
  const text = [intro, '', ...rows.map(([key, label]) => `${label}: ${shown(brief.fields[key])}`)].join('\n');
  return { to: [BRIEF_RECIPIENT], reply_to: brief.account.email, subject, html, text, ...(files.length ? { attachments: files } : {}) };
}
