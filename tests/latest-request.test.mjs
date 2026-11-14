import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLatestRequest } from '../src/lib/latest-request.js';

test('only the newest request is current', () => {
  const { begin } = createLatestRequest();
  const first = begin();
  assert.equal(first(), true);
  const second = begin();
  assert.equal(first(), false, 'an older request is stale once a newer one begins');
  assert.equal(second(), true);
});

test('an answer arriving after a newer request is ignored', async () => {
  const { begin } = createLatestRequest();
  let shown = null;
  const load = async (value, ms) => {
    const isLatest = begin();
    await new Promise(resolve => setTimeout(resolve, ms));
    if (isLatest()) shown = value;
  };
  await Promise.all([load('team', 30), load('workshop', 5)]);
  assert.equal(shown, 'workshop');
});

test('cancelling makes every request stale', () => {
  const { begin, cancelAll } = createLatestRequest();
  const request = begin();
  cancelAll();
  assert.equal(request(), false);
});

test('dashboards that reload by mode apply only the newest answer', () => {
  for (const file of ['AutomotiveDashboard', 'ConstructionDashboard', 'ClinicDashboard']) {
    const source = readFileSync(`src/components/hasib/${file}.jsx`, 'utf8');
    assert.match(source, /useViewData\(mode, /, `${file} loads its view through useViewData`);
    assert.doesNotMatch(source, /setData\(/, `${file} never applies an answer outside the guard`);
  }
});
