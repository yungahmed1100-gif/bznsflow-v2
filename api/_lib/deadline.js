// Every function answers before the platform stops it. Vercel ends a function at its
// `maxDuration` (vercel.json) with no response and no record of what was running; a
// deadline a few seconds earlier answers 504 instead and logs which surface was slow.
// tests/function-deadlines.test.mjs requires every api/*.js entry to export one.

/** Budget for a function with this `maxDuration`, in milliseconds: 10 s spare, never under 5 s. */
export const deadlineFor = maxDurationSeconds => Math.max(5000, maxDurationSeconds * 1000 - 10000);

export class DeadlineError extends Error {
  constructor(label, ms, reason = 'request_timeout') {
    super(reason);
    this.code = 'request_timeout';
    this.reason = reason;
    this.status = 504;
    this.label = label;
    this.ms = ms;
  }
}

/**
 * The work's own result, or a DeadlineError after `ms`. The work is not cancelled: if it
 * settles later, its failure is absorbed so it cannot crash the instance.
 * @template T
 * @param {Promise<T>|T} work
 * @param {number} ms
 * @param {string} label
 * @param {string} [reason]
 * @returns {Promise<T>}
 */
export async function raceDeadline(work, ms, label, reason) {
  const pending = Promise.resolve(work);
  pending.catch(() => {});
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineError(label, ms, reason)), Math.max(0, ms));
  });
  try {
    return await Promise.race([pending, expired]);
  } finally {
    clearTimeout(timer);
  }
}

/** The surface a shared function was asked for, for the log line. */
const surfaceOf = req => {
  try {
    return new URL(req.url || '/', 'https://internal.invalid').searchParams.get('surface') || '';
  } catch {
    return '';
  }
};

/**
 * Wraps a Node request handler so it always answers within `ms`.
 * @param {(req: any, res: any) => unknown} handler
 * @param {{ ms: number, label: string }} options
 */
export function withDeadline(handler, { ms, label }) {
  return async (req, res) => {
    const started = Date.now();
    try {
      return await raceDeadline(handler(req, res), ms, label);
    } catch (error) {
      if (!(error instanceof DeadlineError)) throw error;
      console.error(
        'request_deadline',
        JSON.stringify({ label, surface: surfaceOf(req), method: req.method, ms, elapsedMs: Date.now() - started }),
      );
      if (res.writableEnded) return;
      if (res.headersSent) return res.end();
      res.statusCode = 504;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ ok: false, reason: 'request_timeout' }));
    }
  };
}
