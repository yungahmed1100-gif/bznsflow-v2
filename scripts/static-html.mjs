// The current prerenderer emits occasional NUL padding between complete UTF-8
// characters in Arabic HTML. Browsers hide/replace it, but raw JSON-LD parsers
// reject it. Normalize only HTML output; reject other encoding/JSON corruption.
export function normalizeStaticHtml(bytes) {
  const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replaceAll('\0', '');
  const schemas = html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, schema] of schemas) JSON.parse(schema);
  return html;
}
