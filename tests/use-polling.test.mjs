import test from 'node:test';
import assert from 'node:assert/strict';
import { createRefresher } from '../src/hooks/usePolling.js';

// A load the test finishes by hand, so a refresh can arrive while one is running.
function harness() {
  const loads = [], shown = [];
  let gen = 1;
  const refresh = createRefresher({
    load: () => new Promise(resolve => loads.push(resolve)),
    current: g => g === gen,
    generation: () => gen,
    onLoading: () => {}, onData: data => shown.push(data), onError: () => {},
  });
  return { refresh, loads, shown, nextGeneration: () => { gen += 1; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('a refresh asked for during a running load waits for a fresh load', async () => {
  const h = harness();
  h.refresh({ quiet: true });                // the 30-second poll leaves with the old state
  const afterToggle = h.refresh();           // the owner flipped a switch meanwhile
  assert.equal(h.loads.length, 1, 'never two loads at once');
  h.loads[0]('paused');                      // the poll returns the pre-toggle state
  await tick();
  assert.equal(h.loads.length, 2, 'a second load runs');
  h.loads[1]('replying');
  await afterToggle;
  assert.deepEqual(h.shown, ['paused', 'replying'], 'the screen ends on the post-change state');
});

test('a single refresh loads once', async () => {
  const h = harness();
  const done = h.refresh();
  h.loads[0]('replying');
  await done;
  assert.equal(h.loads.length, 1);
  assert.deepEqual(h.shown, ['replying']);
});

test('a load from an older generation is never shown', async () => {
  const h = harness();
  const old = h.refresh();
  h.nextGeneration();
  h.loads[0]('stale');
  await old;
  assert.deepEqual(h.shown, []);
});
