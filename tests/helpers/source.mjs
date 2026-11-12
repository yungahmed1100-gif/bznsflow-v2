// Source-text assertions that survive reformatting.
//
// A few guards must read source code (a constant inside a Convex mutation, a
// literal action name the page sends). Matching raw text ties them to layout:
// a formatter that wraps a line or swaps quote style makes them fail, or worse,
// match nothing and pass. Read code through these helpers instead, and prefer
// importing the real value whenever the module can be loaded in Node.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);

export const readSource = path => readFileSync(new URL(path, root), 'utf8');

/**
 * Code with its layout removed: whitespace collapsed to one space and dropped
 * next to punctuation, double quotes written as single quotes.
 * `a = { b: "c" }` and `a={b:'c'}` both become `a={b:'c'}`.
 */
export function compact(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/ ?([^\w$ ]) ?/g, '$1')
    .replace(/"/g, "'");
}

export const readCompact = path => compact(readSource(path));

/** Every match of `pattern` (global) in `text`; fails when there is none, so a guard can never pass vacuously. */
export function matchesIn(text, pattern, what = String(pattern)) {
  const found = [...text.matchAll(pattern)];
  assert.ok(found.length > 0, `expected at least one ${what}`);
  return found;
}

/** Routed paths without the leading slash ('' for the index), from src/routes.ts itself. */
export async function routedPaths() {
  const { default: routes } = await import(new URL('src/routes.ts', root));
  return routes.map(route => (route.index ? '' : route.path));
}

/** The prerendered paths from react-router.config.ts. */
export async function prerenderedPaths() {
  const { default: config } = await import(new URL('react-router.config.ts', root));
  return config.prerender;
}
