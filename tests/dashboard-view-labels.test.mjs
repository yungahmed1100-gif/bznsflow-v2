// Every view a dashboard offers has a name in both languages. The section tabs
// show viewLabel(); a missing string shows its raw key ("view_jobs") on screen,
// which is how HVAC's Jobs, Contracts and Units tabs read until 12 Nov 2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardMap } from '../src/lib/dashboard/navigation.js';
import { createStrings, viewLabel } from '../src/lib/dashboard/strings.js';
import { livePackSummaries } from '../config/hasib-packs.js';

const ALL_OPEN = { email: true, website: true, audits: true };
const CAPABILITIES = { broadcasts: true, money: true, operations: true, insights: true };

/** [name, packId, map] for every kind of workspace: each live sector, Catalyst, and Ascend before a sector. */
function workspaces() {
  const sectors = livePackSummaries().map(({ id }) => [
    id,
    id,
    dashboardMap(
      { pack: { id }, modules: ['orders', 'stock', 'payments'], setupRequired: false, workspaceRole: 'manager' },
      CAPABILITIES,
      'manager',
      ALL_OPEN,
    ),
  ]);
  return [
    ...sectors,
    ['catalyst', undefined, dashboardMap(null, { broadcasts: true })],
    ['ascend without a sector', undefined, dashboardMap(null, CAPABILITIES, 'manager', ALL_OPEN)],
  ];
}

test('every view has a name, not a raw string key, in Arabic and English', () => {
  const missing = [];
  let checked = 0;
  for (const [name, packId, map] of workspaces())
    for (const lang of ['ar', 'en']) {
      const s = createStrings(lang, packId);
      for (const [tab, views] of Object.entries(map.views))
        for (const view of views.length > 1 ? views : []) {
          checked++;
          const label = viewLabel(s, tab, view);
          if (!label || /^view_/.test(label)) missing.push(`${name} ${lang}: ${tab} › ${view}`);
        }
    }
  assert.ok(checked > 100, `checked ${checked} view names`);
  assert.deepEqual(missing, []);
});
