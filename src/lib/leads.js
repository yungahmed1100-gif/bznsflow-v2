// ─── Lead capture → Google Sheet ─────────────────────────────────────────────
// Single door to the CRM Sheet. EVERY form that collects a name/email/phone on
// the site MUST submit through postLead() so nothing is ever lost. The Apps
// Script Web App (apps-script/Code.gs) matches payload keys to sheet columns by
// normalized name, so each form just sends the fields it has.
//
// Endpoint is env-overridable (VITE_LEAD_ENDPOINT in Vercel) with the deployed
// /exec URL as the baked-in fallback.

export const LEAD_ENDPOINT =
  import.meta.env.VITE_LEAD_ENDPOINT ||
  'https://script.google.com/macros/s/AKfycbx6Ti7Opsvn0USjL_DoiDDrJKH4r9jtSHswUJmXGlxdAzSdlg2cmFmRPqN1zxzr9k6C-g/exec';

/**
 * Append a lead to the CRM Sheet.
 * Keys map to columns by normalized name, e.g.
 *   name, email, phoneWhatsapp, sourceCta, language, pageUrl,
 *   marketRegion, segment, monthlyLeads, teamSize, biggestBottleneck, growthGoal
 *
 * Resolves on success, rejects on network failure. Always stamps language +
 * pageUrl from the browser so callers don't have to.
 *
 * @param {Record<string, string | number>} fields
 * @param {{ lang?: string }} [opts]
 * @returns {Promise<void>}
 */
export async function postLead(fields, opts = {}) {
  if (!LEAD_ENDPOINT) return; // safe dev default: no endpoint → no-op success

  const payload = {
    language: opts.lang || fields.language || '',
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    ...fields,
  };

  // text/plain keeps this a "simple" request — Apps Script has no CORS preflight
  // handler, so application/json would be rejected.
  const res = await fetch(LEAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  // Apps Script returns HTTP 200 even when the row append fails (body { ok:false }).
  // The response may be an opaque cross-origin redirect we can't read — in that
  // case stay optimistic; only surface an error when we positively read ok:false.
  let body = null;
  try { body = await res.json(); } catch (_) { /* unreadable/redirected — assume delivered */ }
  if (body && body.ok === false) throw new Error(body.error || 'Lead endpoint error');
}
