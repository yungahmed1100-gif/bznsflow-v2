import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { compareAria, comparePixels, matchExpectations } from '../scripts/lib/visual-compare.mjs';

const png = (width, height, paint = () => [255, 255, 255]) => {
  const image = new PNG({ width, height });
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      image.data.set([r, g, b, 255], (y * width + x) * 4);
    }
  return PNG.sync.write(image);
};

test('identical screenshots have no difference', () => {
  assert.deepEqual(comparePixels(png(4, 4), png(4, 4)), { size: null, pixels: 0, diff: null });
});

test('changed pixels are counted and drawn', () => {
  const changed = png(4, 4, (x, y) => (x === 1 && y === 2 ? [0, 0, 0] : [255, 255, 255]));
  const result = comparePixels(png(4, 4), changed);
  assert.equal(result.pixels, 1);
  assert.ok(Buffer.isBuffer(result.diff));
});

test('a different page height is reported as a size change', () => {
  assert.equal(comparePixels(png(4, 4), png(4, 6)).size, '4×4 → 4×6');
});

test('accessibility lines only one side has are listed, repeats counted', () => {
  const base = '- link "Audit":\n  - /url: https://wa.me/1\n- button "Menu"\n- button "Menu"';
  const head = '- link "Audit":\n  - /url: /audit\n- button "Menu"';
  assert.deepEqual(compareAria(base, head), {
    removed: ['  - /url: https://wa.me/1', '- button "Menu"'],
    added: ['  - /url: /audit'],
  });
  assert.deepEqual(compareAria(base, base), { removed: [], added: [] });
});

test('expectations split the differences and catch stale entries', () => {
  assert.deepEqual(
    matchExpectations(['/ @phone pixels', '/en @phone aria'], { '/ @phone pixels': 'x', '/x aria': 'y' }),
    {
      expected: ['/ @phone pixels'],
      unexpected: ['/en @phone aria'],
      missing: ['/x aria'],
    },
  );
});
