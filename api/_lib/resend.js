// Transactional email through Resend: Green sends with RESEND_API_KEY / AUTH_FROM, Blue with its own pair
// (docs/green-production-migration.md). Same transport as the Ascend team invitations.
import { isGreenRuntime } from './green-config.js';
import { PilotError } from './layla/config.js';

/**
 * @param {{ env?: object, fetcher?: typeof fetch, idempotencyKey: string, failure: string, message: object }} input
 * `message` is Resend's body without `from`; `failure` is the reason code thrown when sending fails.
 * @returns {Promise<string>} Resend's email id
 */
export async function sendEmail({ env = process.env, fetcher = fetch, idempotencyKey, failure, message }) {
  const key = isGreenRuntime(env) ? env.RESEND_API_KEY : env.BLUE_RESEND_API_KEY;
  const from = isGreenRuntime(env) ? env.AUTH_FROM : env.BLUE_AUTH_FROM;
  if (!key || !from) throw new PilotError(failure, 503);
  let response, receipt;
  try {
    response = await fetcher('https://api.resend.com/emails', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ from, ...message }) });
    receipt = await response.json();
  } catch { throw new PilotError(failure, 502); }
  if (!response.ok || typeof receipt?.id !== 'string') throw new PilotError(failure, 502);
  return receipt.id;
}
