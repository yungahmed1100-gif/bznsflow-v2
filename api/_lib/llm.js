// LLM chat completion + strict parsing of Layla's JSON envelope.
//
// The provider is OpenAI. It was Groq until that service was decommissioned;
// the two speak the same wire format, so the swap touched only the constants
// below. Keep it that way — nothing provider-specific belongs past this file.

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4.1-mini';

// Under the function's 30s ceiling with room for two DB round trips after it.
// Groq answered in ~4.6s median; OpenAI is slower, hence the extra headroom.
const TIMEOUT_MS = 15000;

const TEMPERATURE = 0.6;
const MAX_TOKENS = 700;

/** Caps on model output, matching the persona's own limits. */
const MAX_REPLY_CHARS = 1200;
const MAX_CONTEXT_CHARS = 300;

/**
 * Extract the first balanced JSON object from a string.
 *
 * The old flow used /\{[\s\S]*\}/ — greedy, so any prose containing a brace
 * after the JSON swallowed it and the whole turn degraded to the glitch reply.
 * This walks the string tracking depth, and ignores braces inside strings and
 * escapes, so it stops at the real end of the first object.
 *
 * JSON mode should make this unnecessary; it stays because JSON mode is
 * untested against this persona and silently returning the error bubble on a
 * good reply is a bad failure.
 *
 * @returns {object|null}
 */
export function extractJson(text) {
  if (typeof text !== 'string') return null;

  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Normalise whatever the model returned into the widget's contract.
 * @returns {{ reply: string, handoff: boolean, handoff_context: string }|null}
 */
export function parseReply(raw) {
  const obj = extractJson(raw);
  if (!obj) return null;

  const reply = typeof obj.reply === 'string' ? obj.reply.trim() : '';
  if (!reply) return null;

  return {
    reply: reply.slice(0, MAX_REPLY_CHARS),
    handoff: obj.handoff === true || obj.handoff === 'true',
    handoff_context:
      typeof obj.handoff_context === 'string'
        ? obj.handoff_context.trim().slice(0, MAX_CONTEXT_CHARS)
        : '',
  };
}

/**
 * Ask the model for one reply.
 *
 * Throws on transport failure, non-2xx, timeout, or unparseable output. The
 * caller turns any throw into the friendly glitch reply at HTTP 200 — the
 * widget must always receive a `reply` string.
 *
 * @returns {Promise<{ reply: string, handoff: boolean, handoff_context: string }>}
 */
export async function complete(systemMessage, userMessage) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        // JSON mode requires the literal word "JSON" somewhere in the messages.
        // The persona prompt carries it — see the OUTPUT line in
        // web-chatbot/system-prompt-web-bznsflow.md. Do not remove it.
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`OpenAI timed out after ${TIMEOUT_MS}ms`);
    }
    throw new Error(`OpenAI request failed: ${err?.message || err}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI → HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  const parsed = parseReply(content);
  if (!parsed) {
    throw new Error(`OpenAI returned unparseable content: ${String(content).slice(0, 200)}`);
  }
  return parsed;
}
