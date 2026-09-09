// Shared request/response plumbing for the serverless functions.
//
// `send`, `readBody` and `limits` were each copy-pasted into three handlers,
// with the copies already diverging — one had `Vary: Cookie`, one read its env
// inline instead of through a function. Three copies of a response helper is
// three places to remember when a header changes.
//
// api/chat.js keeps its own `reply()` wrapper on top of `send`: that one is
// genuinely different, shaping every response to the widget's invariant that a
// `reply` string is present at every status code.

/**
 * Write a JSON response.
 *
 * `Cache-Control: no-store` is unconditional. Every endpoint here is either
 * per-visitor or state-changing, and a cached response on any of them is a bug —
 * a shared cache serving one visitor's chat reply or account to another.
 *
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {object} payload
 * @param {{ vary?: string }} [options] `Vary` for responses that differ by cookie
 */
export function send(res, status, payload, options = {}) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (options.vary) res.setHeader('Vary', options.vary);
  res.end(JSON.stringify(payload));
}

/**
 * Read a JSON body.
 *
 * Vercel parses JSON bodies automatically, but tolerate a raw string too: a
 * client that sends the right bytes with the wrong Content-Type should still be
 * understood, and a malformed body should read as empty rather than throw
 * inside the handler.
 *
 * @returns {object} always an object, never null
 */
export function readBody(req) {
  const b = req?.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return typeof b === 'object' ? b : {};
}

/**
 * Read a numeric env limit at request time.
 *
 * Deliberately not a module-level constant: those are frozen at cold start, so
 * they silently ignore an environment change until the instance recycles, and
 * they cannot be exercised by a test.
 *
 * @param {string} name env var
 * @param {number} fallback used when unset, empty or not a finite number
 */
export function limit(name, fallback) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}
