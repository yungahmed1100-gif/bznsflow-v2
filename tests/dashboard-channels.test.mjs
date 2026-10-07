import test from 'node:test';
import assert from 'node:assert/strict';
import { channelsFrom, masterState, needsAttention, setAll } from '../src/lib/dashboard/channels.js';

const checks = { routing: true, registered: true, path: true };
const whatsapp = (status = 'connected', messaging = { available: true, active: true, reason: '' }, extra = {}) =>
  ({ integration: { sender: '96890000000', status, checks, ...extra }, messaging });
const instagram = (status = 'connected', instagramMessaging = { available: true, active: true, reason: '' }) =>
  ({ instagram: { channel: 'instagram', username: 'qurum.coast', status }, instagramMessaging });

test('nothing connected: no channels and no master state', () => {
  assert.deepEqual(channelsFrom({ integration: null, instagram: null }), []);
  assert.equal(masterState([]), 'none');
});

test('an Instagram-only owner gets a real master switch, not a "Connect WhatsApp" prompt', () => {
  const channels = channelsFrom({ integration: null, messaging: { available: true, active: false, reason: 'not_activated' }, ...instagram() });
  assert.deepEqual(channels.map(c => [c.id, c.identity, c.active]), [['instagram', 'qurum.coast', true]]);
  assert.equal(masterState(channels), 'on');
});

test('both channels: on, off and mixed', () => {
  const on = channelsFrom({ ...whatsapp(), ...instagram() });
  assert.equal(masterState(on), 'on');
  const off = channelsFrom({ ...whatsapp('paused', { available: true, active: false, reason: 'owner_paused' }), ...instagram('connected', { available: true, active: false, reason: 'owner_paused' }) });
  assert.equal(masterState(off), 'off');
  assert.equal(needsAttention(off), null, 'a pause the owner chose is not a problem');
  const mixed = channelsFrom({ ...whatsapp('paused', { available: true, active: false, reason: 'owner_paused' }), ...instagram() });
  assert.equal(masterState(mixed), 'mixed');
});

test('a channel that needs fixing is flagged; a removed Instagram account disappears', () => {
  const broken = channelsFrom({ ...whatsapp('connected', { available: true, active: false, reason: 'send_outcome_unknown' }) });
  assert.equal(needsAttention(broken)?.id, 'whatsapp');
  const failedChecks = channelsFrom(whatsapp('connected', undefined, { checks: { routing: false, registered: true, path: true } }));
  assert.equal(needsAttention(failedChecks)?.id, 'whatsapp');
  const reconnect = channelsFrom(instagram('reconnect_required', null));
  assert.equal(reconnect[0].connected, false);
  assert.equal(needsAttention(reconnect)?.id, 'instagram');
  assert.equal(masterState(reconnect), 'none', 'nothing to switch while it is disconnected');
  assert.deepEqual(channelsFrom(instagram('revoked')), []);
  assert.deepEqual(channelsFrom(instagram('disconnected')), []);
});

test('the master switch turns every connected channel on or off, and reports refusals', async () => {
  const calls = [];
  const channels = channelsFrom({ ...whatsapp(), ...instagram(), ...{} });
  const ok = await setAll(false, channels, async (action, body) => { calls.push([action, body]); return { active: false }; });
  assert.deepEqual(ok, []);
  assert.deepEqual(calls, [['pause', {}], ['pause', { channel: 'instagram' }]]);
  const refused = await setAll(true, channels, async (action, body) => {
    if (body.channel === 'instagram') { const e = new Error('instagram_reconnect_required'); e.reason = 'instagram_reconnect_required'; throw e; }
    return { active: false, reason: 'activation_not_ready' };
  });
  assert.deepEqual(refused, [{ id: 'whatsapp', reason: 'activation_not_ready' }, { id: 'instagram', reason: 'instagram_reconnect_required' }]);
});

test('channels still connecting are not switched', async () => {
  const calls = [];
  const channels = channelsFrom({ ...whatsapp('verifying', { available: true, active: false, reason: 'not_activated' }), ...instagram() });
  await setAll(true, channels, async (action, body) => { calls.push(body); return { active: true }; });
  assert.deepEqual(calls, [{ channel: 'instagram' }]);
});
