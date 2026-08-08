// Prompt assembly: pick the relevant catalog sections, render history, build
// the system message. Pure logic — no I/O.

import { PERSONA, SECTIONS } from './kb.generated.js';

const ARABIC_RE = /[؀-ۿ]/;

/** Keywords shorter than this are ignored — see MIN_KEYWORD_LEN note below. */
const MIN_KEYWORD_LEN = 3;

/** How many catalog sections to inject. */
const TOP_N = 3;

/** Turns of history considered when scoring keywords. */
const CONTEXT_TURNS = 2;

/** Sections used when nothing matches: who we are + who we serve. */
const FALLBACK_IDS = ['00', '20'];

/** Hard cap on rendered history, so a long chat cannot crowd out the catalog. */
const MAX_HISTORY_CHARS = 3000;

/**
 * Visitor's language, from their CURRENT message only.
 *
 * Not from history: a visitor who opens in Arabic and switches to English must
 * get English back immediately, which is the single most visible correctness
 * rule in the persona.
 * @returns {'ar'|'en'}
 */
export function detectLang(message) {
  return ARABIC_RE.test(message || '') ? 'ar' : 'en';
}

/**
 * Score catalog sections against the visitor's message plus the last couple of
 * turns, and return the best few.
 *
 * Matching is lowercase substring containment, which is why keywords under 3
 * characters are skipped: at that length they match inside unrelated words. It
 * also means keywords match inflections for free ("order" catches "orders"),
 * which is intentional. gen-kb.mjs rejects short keywords at build time so this
 * guard never silently discards one someone believed was live.
 *
 * @param {string} message
 * @param {Array<{role: string, content: string}>} history  oldest → newest
 */
export function pickSections(message, history = []) {
  const recent = history.slice(-CONTEXT_TURNS).map((m) => m.content).join(' ');
  const haystack = `${message} ${recent}`.toLowerCase();

  const scored = SECTIONS.map((section) => ({
    section,
    score: section.kw.reduce(
      (n, k) => n + (k.length >= MIN_KEYWORD_LEN && haystack.includes(k) ? 1 : 0),
      0
    ),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.section.id.localeCompare(b.section.id))
    .slice(0, TOP_N)
    .map((x) => x.section);

  if (scored.length) return scored;
  return FALLBACK_IDS.map((id) => SECTIONS.find((s) => s.id === id)).filter(Boolean);
}

/**
 * Render history for the prompt, oldest → newest.
 *
 * The ordering is load-bearing. The old workflow reversed this list on the
 * mistaken assumption that SQL had returned it newest-first, so the model read
 * every conversation backwards — which is what actually broke "never re-ask
 * what the visitor already told you" and "close on an affirmation". The
 * database now returns chronological order and nothing here reverses it.
 */
export function renderHistory(history = []) {
  if (!history.length) return '';

  const lines = history.map(
    (m) => `${m.role === 'user' ? 'Visitor' : 'Layla'}: ${m.content}`
  );

  // Trim from the FRONT when too long: recent turns decide the next reply.
  let out = lines.join('\n');
  while (out.length > MAX_HISTORY_CHARS && lines.length > 1) {
    lines.shift();
    out = lines.join('\n');
  }
  return out;
}

/**
 * Build the system message: persona + matched catalog + conversation so far.
 *
 * Only the visitor's own language is injected, roughly halving catalog tokens;
 * the persona's language-mirroring rule handles the reply language.
 */
export function buildSystemMessage(message, history = []) {
  const lang = detectLang(message);
  const sections = pickSections(message, history);
  const knowledge = sections.map((s) => `- ${lang === 'ar' ? s.ar : s.en}`).join('\n');
  const rendered = renderHistory(history);

  const base = `${PERSONA}\n${knowledge}`;
  return rendered
    ? `${base}\n\nCONVERSATION SO FAR (older→newer):\n${rendered}`
    : base;
}
