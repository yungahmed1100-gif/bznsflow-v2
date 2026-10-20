// Phase 4: the dashboard map and old links.
import test from 'node:test';
import assert from 'node:assert/strict';
import { brainPart, dashboardMap, resolveTab } from '../src/lib/dashboard/navigation.js';

const retail = { modules: ['orders', 'stock', 'expenses', 'insights'], setupRequired: false };
const tech = { modules: ['orders', 'stock', 'expenses', 'insights', 'serials', 'repairs', 'tradeIns'], setupRequired: false };
const construction = { modules: ['orders', 'stock', 'expenses', 'insights'], setupRequired: false, pack: { id: 'construction' }, workspaceRole: 'manager' };
const automotive = { modules: ['orders', 'stock', 'expenses', 'insights'], setupRequired: false, pack: { id: 'automotive' }, workspaceRole: 'manager' };

test('Catalyst: four tabs, with chats as home', () => {
  const map = dashboardMap(null);
  assert.deepEqual(map.sections, ['chats', 'broadcasts', 'customers', 'settings']);
  assert.deepEqual(resolveTab(null, null, map), { tab: 'chats', view: null });
  assert.deepEqual(resolveTab('orders', null, map), { tab: 'chats', view: null }, 'Hasib sections are not reachable');
  assert.deepEqual(resolveTab('settings', null, map), { tab: 'settings', view: 'brain' }, 'Settings opens on BznsBrain');
  assert.deepEqual(map.views.settings, ['brain', 'channels'], 'BznsBrain and Channels: no extra tabs');
  assert.deepEqual(dashboardMap(null, { broadcasts: false }).sections, ['chats', 'customers', 'settings']);
});

test('Catalyst: old links land on the four tabs', () => {
  const map = dashboardMap(null);
  for (const [tab, view, where] of [
    ['broadcast', null, { tab: 'broadcasts', view: null }],
    ['customers', 'broadcast', { tab: 'broadcasts', view: null }],
    ['customers', 'contacts', { tab: 'customers', view: null }],
    ['contacts', null, { tab: 'customers', view: null }],
    ['stock', 'services', { tab: 'settings', view: 'brain' }],
    ['settings', 'services', { tab: 'settings', view: 'brain' }],
    ['settings', 'business', { tab: 'settings', view: 'brain' }],
    ['channels', null, { tab: 'settings', view: 'channels' }],
    ['business', null, { tab: 'settings', view: 'brain' }],
    ['settings', 'channels', { tab: 'settings', view: 'channels' }],
  ]) assert.deepEqual(resolveTab(tab, view, map), where, `${tab}/${view}`);
});

test('BznsBrain opens the catalog for old Services & prices links, else bzns.md', () => {
  const part = q => brainPart(new URLSearchParams(q));
  assert.equal(part('tab=settings&view=services'), 'catalog');
  assert.equal(part('tab=stock'), 'catalog');
  assert.equal(part('tab=settings&view=brain&part=catalog'), 'catalog');
  assert.equal(part('tab=settings&view=business'), 'bzns');
  assert.equal(part('tab=settings&part=nope'), 'bzns');
});

test('Ascend before Hasib loads keeps its own map, not Catalyst\'s', () => {
  const map = dashboardMap(null, { operations: true, broadcasts: true, money: true });
  assert.equal(map.catalyst, undefined);
  assert.deepEqual(map.sections, ['chats', 'customers', 'settings']);
  assert.deepEqual(map.views.customers, ['contacts', 'broadcast']);
  assert.deepEqual(map.views.settings, ['channels', 'business']);
});

test('retail shop: Today is home; Service is only for phone stores', () => {
  assert.deepEqual(dashboardMap(retail).sections, ['today', 'chats', 'orders', 'stock', 'money', 'customers', 'settings']);
  assert.deepEqual(dashboardMap(tech).sections, ['today', 'chats', 'orders', 'stock', 'service', 'money', 'customers', 'settings']);
  assert.deepEqual(resolveTab(null, null, dashboardMap(retail)), { tab: 'today', view: null });
  assert.deepEqual(resolveTab('service', null, dashboardMap(retail)), { tab: 'today', view: null });
});

test('old links land where their content lives now', () => {
  const map = dashboardMap(retail);
  for (const [old, where] of [['insights', ['money', 'insights']], ['expenses', ['money', 'expenses']], ['contacts', ['customers', 'contacts']], ['broadcast', ['customers', 'broadcast']], ['channels', ['settings', 'channels']], ['business', ['settings', 'business']]]) {
    assert.deepEqual(resolveTab(old, null, map), { tab: where[0], view: where[1] }, old);
  }
  assert.deepEqual(resolveTab('stock', 'services', map), { tab: 'stock', view: 'services' });
  assert.deepEqual(resolveTab('stock', 'nonsense', map), { tab: 'stock', view: 'products' });
});

test('before an industry is chosen, Today holds the setup and Stock keeps only services', () => {
  const map = dashboardMap({ modules: [], setupRequired: true });
  assert.deepEqual(map.sections, ['today', 'chats', 'customers', 'settings']);
  assert.deepEqual(resolveTab('insights', null, map), { tab: 'today', view: null });
});

test('a contractor: the six Ascend tabs with Projects as Work; Channels and BznsBrain are reachable again', () => {
  const map = dashboardMap(construction);
  assert.deepEqual(map.sections, ['chats', 'work', 'customers', 'broadcasts', 'insights', 'settings']);
  assert.deepEqual(map.views.work, ['projects', 'procurement', 'followups']);
  assert.deepEqual(map.views.settings, ['brain', 'rules', 'team', 'site', 'business', 'channels', 'accounts']);
  assert.deepEqual(resolveTab('stock', 'products', map), { tab: 'work', view: 'procurement' });
  assert.deepEqual(resolveTab('orders', null, map), { tab: 'work', view: 'projects' });
  assert.deepEqual(resolveTab('money', null, map), { tab: 'insights', view: null });
  assert.deepEqual(resolveTab('settings', 'channels', map), { tab: 'settings', view: 'channels' });
});

test('an automotive workshop: the six Ascend tabs with Workshop as Work, and old links land in it', () => {
  const map = dashboardMap(automotive);
  assert.deepEqual(map.sections, ['chats', 'work', 'customers', 'broadcasts', 'insights', 'settings']);
  assert.deepEqual(map.views.work, ['board', 'schedule', 'parts', 'followups']);
  assert.deepEqual(map.views.settings, ['brain', 'rules', 'team', 'workshop', 'business', 'channels', 'accounts'], 'Channels and BznsBrain are reachable again');
  assert.deepEqual(resolveTab('stock', 'products', map), { tab: 'work', view: 'parts' });
  assert.deepEqual(resolveTab('orders', null, map), { tab: 'work', view: 'board' });
  assert.deepEqual(resolveTab('money', null, map), { tab: 'insights', view: null });
  assert.deepEqual(resolveTab('today', null, map), { tab: 'work', view: 'board' });
});

test('a dental clinic: the six Ascend tabs with Visits as Work, and old links land in Visits', () => {
  const dental = { modules: ['orders', 'stock', 'expenses', 'insights'], setupRequired: false, pack: { id: 'dental' } };
  const map = dashboardMap(dental);
  assert.deepEqual(map.sections, ['chats', 'work', 'customers', 'broadcasts', 'insights', 'settings']);
  assert.deepEqual(map.views.work, ['schedule', 'visits', 'services', 'followups']);
  assert.deepEqual(map.views.customers, [], 'one patient list');
  assert.deepEqual(resolveTab('stock', null, map), { tab: 'work', view: 'services' });
  assert.deepEqual(resolveTab('orders', null, map), { tab: 'work', view: 'visits' });
  assert.deepEqual(resolveTab('today', null, map), { tab: 'work', view: 'schedule' });
  assert.deepEqual(dashboardMap(retail).views.stock, ['products', 'services'], 'shops are unchanged');
  assert.deepEqual(dashboardMap(retail).views.customers, ['contacts', 'broadcast']);
});

test('Accounts and VAT appear in Settings once an industry is set', () => {
  assert.deepEqual(dashboardMap(retail).views.settings, ['channels', 'business', 'accounts']);
  assert.deepEqual(dashboardMap(null, { operations: true }).views.settings, ['channels', 'business']);
  assert.deepEqual(dashboardMap({ modules: [], setupRequired: true }).views.settings, ['channels', 'business']);
});

test('Rasil’s Email tab is one general section in every Ascend dashboard, for the manager, when the server opens it', async () => {
  const { capabilitiesFor } = await import('../convex/hasib/capabilities.js');
  const { livePackSummaries } = await import('../config/hasib-packs.js');
  const caps = capabilitiesFor('ascend');
  for (const { id } of livePackSummaries()) {
    const hasib = { modules: ['orders', 'stock', 'insights', 'repairs'], setupRequired: false, pack: { id }, workspaceRole: 'manager' };
    const map = dashboardMap(hasib, caps, 'manager', { email: true });
    if (map.sections.includes('broadcasts')) assert.equal(map.sections.indexOf('email'), map.sections.indexOf('broadcasts') + 1, `${id}: right after Broadcasts`);
    assert.ok(map.sections.includes('email'), `${id}: the Email tab`);
    assert.deepEqual(map.views.email, ['campaigns', 'subscribers', 'setup'], id);
    assert.deepEqual(resolveTab('email', 'subscribers', map), { tab: 'email', view: 'subscribers' }, id);
    assert.deepEqual(resolveTab('email', null, map), { tab: 'email', view: 'campaigns' }, id);
    assert.equal(dashboardMap({ ...hasib, workspaceRole: 'employee' }, capabilitiesFor('ascend', 'employee'), 'employee', { email: true }).sections.includes('email'), false, `${id}: staff`);
    assert.deepEqual(dashboardMap(hasib, caps, 'manager'), dashboardMap(hasib, caps, 'manager', { email: false }), `${id}: closed means no change`);
    assert.equal(dashboardMap(hasib, caps, 'manager').sections.includes('email'), false, id);
  }
  assert.equal(dashboardMap(null, capabilitiesFor('catalyst'), 'manager', { email: true }).sections.includes('email'), false, 'Catalyst has no Email tab');
});
