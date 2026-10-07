// Last step before a reply leaves Layla: strip control characters, collapse runs
// of blank lines, and shorten at a sentence or word boundary so a cut can never
// land inside a word, a number or a price.
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const SENTENCE_END = /[.!?؟\n](?=\s|$)/g;

/**
 * @param {string} text
 * @param {number} [max] hard cap in characters, including the ellipsis
 * @returns {string}
 */
export function safeReply(text, max = 1000) {
  const clean = String(text ?? '').replace(CONTROL, '').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= max) return clean;
  const room = clean.slice(0, max - 1);
  let end = -1;
  for (const m of room.matchAll(SENTENCE_END)) end = m.index + 1;
  if (end >= max * 0.5) return room.slice(0, end).trim();
  const space = room.search(/\s\S*$/);
  return `${(space > 0 ? room.slice(0, space) : room).trimEnd()}…`;
}
