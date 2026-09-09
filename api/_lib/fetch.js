// Outbound HTTP: one timeout wrapper and one error format.
//
// db.js, llm.js, mailer.js and keepalive.js each carried their own copy of the
// same AbortController/setTimeout/catch-AbortError/finally-clearTimeout dance,
// plus their own copy of the `→ HTTP nnn: <first 300 chars>` error string. Four
// copies of a timeout is four chances to forget the `finally`, which leaks a
// timer on every success.
//
// Timeouts are NOT unified — they legitimately differ (Supabase 5s, Apps Script
// 10s, OpenAI 15s) because the services differ. The caller passes one.

/**
 * `fetch` with a hard timeout and a labelled failure.
 *
 * @param {string} url
 * @param {RequestInit} init
 * @param {{ label: string, timeoutMs: number }} options
 *   label — names the service in every error, so a log line says which
 *   dependency failed without needing a stack trace.
 * @returns {Promise<Response>}
 * @throws {Error} on timeout, abort or network failure — never on a non-2xx,
 *   which the caller inspects itself.
 */
export async function fetchWithTimeout(url, init, { label, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw new Error(`${label} failed: ${err?.message || err}`);
  } finally {
    // In `finally`, so the timer is cleared on the success path too. Leaving it
    // pending keeps a serverless invocation alive past its useful life.
    clearTimeout(timer);
  }
}

/** Longest error detail kept from a response body. */
const MAX_DETAIL = 300;

/**
 * Build the error for a non-2xx response.
 *
 * The body is where the useful detail lives — PostgREST and Apps Script both put
 * their real message there — but it is bounded, because an HTML error page would
 * otherwise flood the logs with a full document on every failure.
 *
 * @returns {Promise<Error>} awaited by the caller, which then throws it
 */
export async function httpError(label, res) {
  const detail = await res.text().catch(() => '');
  return new Error(`${label} → HTTP ${res.status}: ${detail.slice(0, MAX_DETAIL)}`);
}
