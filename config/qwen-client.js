// Qwen (Alibaba Cloud Model Studio) through its OpenAI-compatible chat API.
//
// Pure apart from the injected `fetcher`, so the Convex action, the Vercel preview and
// the tests share it. It never logs or returns the key, the prompt or the reply text on
// failure: errors carry only a short reason code.

export const DEFAULT_MODEL = 'qwen-plus';
export const TIMEOUT_MS = 12000;

/** The Qwen settings from an environment object, or null when Layla's AI is not configured. */
export function qwenConfig(env = {}) {
  const key = String(env.QWEN_API_KEY || '').trim();
  const baseUrl = String(env.QWEN_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!key || !/^https:\/\//.test(baseUrl)) return null;
  return { key, baseUrl, model: String(env.LAYLA_AI_MODEL || '').trim() || DEFAULT_MODEL };
}

/** The chat-completions endpoint for a base URL, whether or not it already ends in /v1. */
export function completionsUrl(baseUrl) {
  const base = baseUrl.replace(/\/+$/, '');
  if (/\/chat\/completions$/.test(base)) return base;
  if (/\/(compatible-mode\/)?v1$/.test(base)) return `${base}/chat/completions`;
  return `${base}/compatible-mode/v1/chat/completions`;
}

export class QwenError extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}

/**
 * One chat completion that must return a JSON object.
 * @param {{ config: {key:string, baseUrl:string, model:string}, messages: Array<{role:string, content:string}>,
 *   fetcher?: typeof fetch, timeoutMs?: number, maxTokens?: number, temperature?: number, now?: () => number }} input
 * @returns {Promise<{ text: string, usage: { input: number, output: number }, ms: number, model: string }>}
 */
export async function qwenChat({ config, messages, fetcher = globalThis.fetch, timeoutMs = TIMEOUT_MS, maxTokens = 400, temperature = 0.3, now = Date.now }) {
  if (!config) throw new QwenError('ai_not_configured');
  const started = now();
  let response;
  try {
    response = await fetcher(completionsUrl(config.baseUrl), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages, temperature, max_tokens: maxTokens, response_format: { type: 'json_object' } }),
    });
  } catch (e) {
    throw new QwenError(e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'ai_timeout' : 'ai_network');
  }
  if (!response.ok) throw new QwenError(response.status === 429 ? 'ai_rate_limited' : response.status >= 500 ? 'ai_unavailable' : 'ai_rejected');
  let body;
  try { body = await response.json(); } catch { throw new QwenError('ai_bad_response'); }
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new QwenError('ai_empty');
  return {
    text, model: String(body.model || config.model).slice(0, 60), ms: now() - started,
    usage: { input: Number(body.usage?.prompt_tokens) || 0, output: Number(body.usage?.completion_tokens) || 0 },
  };
}

/** A model call bound to one environment's Qwen settings; missing settings fail as `ai_not_configured`. */
export const qwenGenerator = (env, fetcher = globalThis.fetch, options = {}) => {
  const config = qwenConfig(env);
  return messages => qwenChat({ config, messages, fetcher, ...options });
};
/** BznsBrain extraction: deterministic, room for a page of proposals, and a longer wait than a chat reply. */
// Extraction writes a long JSON answer: allow up to 45 s and 3,000 tokens (the API function stops at 60 s).
export const qwenExtractor = (env, fetcher = globalThis.fetch) => qwenGenerator(env, fetcher, { temperature: 0, maxTokens: 3000, timeoutMs: 45000 });
