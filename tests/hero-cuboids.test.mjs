// The sculpture's shapes: five of them, every block placed, inside the drawing, and the still
// drawing agrees with the moving one about where a block is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CUBOID_STAGES, cuboidPosition, fallbackCuboid } from '../src/lib/hero-cuboids.js';

test('every block of every shape has a finite place inside the sculpture', () => {
  assert.equal(CUBOID_STAGES, 5, 'one shape per step of an inquiry');
  for (const count of [48, 64, 96])
    for (let stage = 0; stage < CUBOID_STAGES; stage++) {
      const seen = new Set();
      for (let i = 0; i < count; i++) {
        const p = cuboidPosition(i, count, stage);
        assert.equal(p.length, 3);
        for (const v of p) assert.ok(Number.isFinite(v) && Math.abs(v) <= 2.6, `${count}/${stage}/${i}: ${v}`);
        seen.add(p.map(v => v.toFixed(3)).join());
      }
      assert.equal(seen.size, count, `shape ${stage} with ${count} blocks: no two blocks share a place`);
    }
});

test('the still drawing keeps every block inside its 500 × 500 frame', () => {
  for (let stage = 0; stage < CUBOID_STAGES; stage++)
    for (let i = 0; i < 48; i++) {
      const { x, y, depth } = fallbackCuboid(i, 48, stage);
      assert.ok(x > 12 && x < 488 && y > 14 && y < 486, `stage ${stage} block ${i}: ${x}, ${y}`);
      assert.equal(depth, cuboidPosition(i, 48, stage)[2]);
    }
});
