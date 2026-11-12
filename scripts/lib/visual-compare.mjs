// Comparing two captures of the same screen, for scripts/visual-diff.mjs.
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Pixel difference between two PNG buffers.
 * @returns {{ size: string|null, pixels: number, diff: Buffer|null }} size is set when the
 *   dimensions differ (then pixels is not counted); diff is a PNG of the changed pixels.
 */
export function comparePixels(baseBuffer, headBuffer, { threshold = 0.1 } = {}) {
  const base = PNG.sync.read(baseBuffer);
  const head = PNG.sync.read(headBuffer);
  if (base.width !== head.width || base.height !== head.height)
    return { size: `${base.width}×${base.height} → ${head.width}×${head.height}`, pixels: 0, diff: null };
  const out = new PNG({ width: base.width, height: base.height });
  const pixels = pixelmatch(base.data, head.data, out.data, base.width, base.height, { threshold });
  return { size: null, pixels, diff: pixels ? PNG.sync.write(out) : null };
}

/**
 * Lines of an accessibility snapshot that only one side has, counting repeats,
 * so a moved or doubled line shows and an unchanged page gives two empty lists.
 */
export function compareAria(baseText, headText) {
  const count = text => {
    const lines = new Map();
    for (const line of text
      .split('\n')
      .map(l => l.trimEnd())
      .filter(Boolean))
      lines.set(line, (lines.get(line) || 0) + 1);
    return lines;
  };
  const base = count(baseText);
  const head = count(headText);
  const only = (a, b) =>
    [...a].flatMap(([line, n]) => Array.from({ length: Math.max(0, n - (b.get(line) || 0)) }, () => line));
  return { removed: only(base, head), added: only(head, base) };
}

/** The key one difference is listed under in an expectations file. */
export const differenceKey = (screen, kind) => `${screen} ${kind}`;

/**
 * Splits the differences found into expected and unexpected, and lists the
 * expectations that did not occur (a stale entry fails like a new difference).
 * @param {string[]} found difference keys
 * @param {Record<string, string>} expected key → reason
 */
export function matchExpectations(found, expected) {
  const listed = new Set(Object.keys(expected));
  return {
    expected: found.filter(key => listed.has(key)),
    unexpected: found.filter(key => !listed.has(key)),
    missing: [...listed].filter(key => !found.includes(key)),
  };
}
