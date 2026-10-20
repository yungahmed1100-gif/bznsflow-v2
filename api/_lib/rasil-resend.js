// Resend for Rasil: the owner's sending domain and campaign emails. Server only.
//
// Domain management needs a full-access key; RASIL_RESEND_API_KEY may hold one, otherwise the
// deployment's own Resend key is used. Every campaign email carries an idempotency key per
// recipient, so a retry after a timeout can never send the same email twice.
import { isGreenRuntime } from './green-config.js';
import { PilotError } from './layla/config.js';
import { DMARC_RECORD } from '../../config/rasil.js';

const API = 'https://api.resend.com';

export function rasilKey(env = process.env) {
  return env.RASIL_RESEND_API_KEY || (isGreenRuntime(env) ? env.RESEND_API_KEY : env.BLUE_RESEND_API_KEY) || '';
}

async function call(env, fetcher, method, path, body, headers = {}) {
  const key = rasilKey(env);
  if (!key) throw new PilotError('email_unavailable', 503);
  let response, json = null;
  try {
    response = await fetcher(`${API}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    try { json = await response.json(); } catch { json = null; }
  } catch { throw new PilotError('email_provider_unavailable', 502); }
  return { status: response.status, json };
}

const STATUS = { verified: 'verified', failed: 'failed', temporary_failure: 'failed' };
/** Resend's records as the owner adds them, plus the recommended DMARC record. */
export function publicDomain(json) {
  const records = (Array.isArray(json?.records) ? json.records : []).slice(0, 10).map(r => ({
    type: String(r.type || '').slice(0, 10), name: String(r.name || '').slice(0, 253), value: String(r.value || '').slice(0, 1024),
    ...(Number.isFinite(r.priority) ? { priority: r.priority } : {}), status: String(r.status || 'pending').slice(0, 30) }));
  return { resendDomainId: String(json?.id || ''), status: STATUS[json?.status] || 'pending', records: [...records, { ...DMARC_RECORD }] };
}

export async function createDomain({ env, fetcher = fetch, domain }) {
  const { status, json } = await call(env, fetcher, 'POST', '/domains', { name: domain, region: 'eu-west-1' });
  if (status === 409 || /already/i.test(json?.message || '')) throw new PilotError('domain_in_use', 409);
  if (status === 403 && /limit|plan/i.test(json?.message || '')) throw new PilotError('email_domain_limit', 503);
  if (status < 200 || status >= 300 || !json?.id) throw new PilotError(status === 422 ? 'invalid_domain' : 'email_provider_unavailable', status === 422 ? 400 : 502);
  return publicDomain(json);
}

/** Ask Resend to look up the records again, then read the result. */
export async function checkDomain({ env, fetcher = fetch, resendDomainId }) {
  if (!/^[A-Za-z0-9-]{1,80}$/.test(resendDomainId || '')) throw new PilotError('domain_not_found', 404);
  await call(env, fetcher, 'POST', `/domains/${resendDomainId}/verify`);
  const { status, json } = await call(env, fetcher, 'GET', `/domains/${resendDomainId}`);
  if (status === 404) throw new PilotError('domain_not_found', 404);
  if (status < 200 || status >= 300) throw new PilotError('email_provider_unavailable', 502);
  return publicDomain(json);
}

/**
 * What one send attempt means for the campaign. A rejection names the recipient's problem
 * (`failed`) or the account's (`campaignBlock`); rate limits and outages are retried with the
 * same idempotency key.
 */
export function rasilSendResult(status, json) {
  if (status >= 200 && status < 300) {
    return typeof json?.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(json.id) ? { status: 'submitted', providerId: json.id } : { status: 'ambiguous', reason: 'provider_missing_id' };
  }
  if (status === 429 || status >= 500 || status === 0) return { status: 'retry', reason: 'provider_unavailable' };
  const message = String(json?.message || json?.name || '');
  if (status === 401 || status === 403) {
    return { status: 'failed', reason: 'provider_rejected', campaignBlock: /domain/i.test(message) ? 'domain_not_verified' : 'email_unavailable' };
  }
  return { status: 'failed', reason: 'provider_rejected' };
}

/** One campaign email. Network failures are retried: the idempotency key makes that safe. */
export async function sendCampaignEmail({ env, fetcher = fetch, idempotencyKey, message }) {
  try {
    const { status, json } = await call(env, fetcher, 'POST', '/emails', message, { 'Idempotency-Key': idempotencyKey });
    return rasilSendResult(status, json);
  } catch (e) {
    if (e instanceof PilotError && e.code === 'email_unavailable') return { status: 'failed', reason: 'email_unavailable', campaignBlock: 'email_unavailable' };
    return { status: 'retry', reason: 'provider_unavailable' };
  }
}
