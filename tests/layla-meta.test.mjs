import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { settings, binding, stateKey, LIVE_RELEASE_ENABLED } from '../api/_lib/layla/config.js';
import {
  initialState,
  reviewProfile,
  accept,
  answer,
  guard,
  DAY,
  summary,
  maintain,
} from '../api/_lib/layla/domain.js';
import { parseEvents, signatureValid } from '../api/_lib/layla/webhook.js';
import { transact, createStore } from '../api/_lib/layla/store.js';
import { runOne } from '../api/_lib/layla/gateway.js';
const NOW = Date.UTC(2026, 8, 10, 12),
  OWNER = '11111111-1111-4111-8111-111111111111',
  TO = '96899999999';
const env = {
  LAYLA_OWNER_ACCOUNT_ID: OWNER,
  LAYLA_META_MODE: 'mock',
  LAYLA_META_KILL_SWITCH: 'false',
  LAYLA_META_APP_ID: '111',
  LAYLA_META_WABA_ID: '222',
  LAYLA_META_PHONE_NUMBER_ID: '333',
  LAYLA_META_SENDER_NUMBER: '96888888888',
  LAYLA_META_APP_SECRET: 'synthetic-secret',
  LAYLA_META_ACCESS_TOKEN: 'synthetic-token',
  LAYLA_META_VERIFY_TOKEN: 'synthetic-verify',
  LAYLA_META_GRAPH_VERSION: 'v25.0',
};
const cfg = () => settings(env);
const profile = () =>
  reviewProfile({
    sector: 'Business automation',
    services: 'Website FAQ assistance / مساعدة أسئلة الموقع',
    prices: '',
    hours: '',
    location: '',
    humanContact: 'owner@example.test',
    reviewed: true,
  });
function memory(c = cfg()) {
  let state = initialState(c),
    revision = 0;
  return {
    async read() {
      return { state: structuredClone(state), revision };
    },
    async cas(_, expected, next) {
      if (expected !== revision) return false;
      state = structuredClone(next);
      revision++;
      return true;
    },
    get state() {
      return structuredClone(state);
    },
  };
}
const message = (id = 'in.1', text = 'what services do you offer?', at = NOW) => ({
  kind: 'message',
  id,
  from: TO,
  at,
  text,
});
async function ready(store) {
  await transact(store, cfg(), s => {
    s.profile = profile();
    s.paused = false;
    accept(s, [message()], NOW);
  });
}
function envelope(value = {}, field = 'messages') {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '222',
        changes: [{ field, value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '333' }, ...value } }],
      },
    ],
  };
}
const incoming = () =>
  envelope({
    messages: [{ id: 'in.1', from: TO, type: 'text', timestamp: String(NOW / 1000), text: { body: 'services' } }],
  });
const raw = x => Buffer.from(JSON.stringify(x));

test('missing secrets and credentials fail safe; live remains locked', () => {
  assert.equal(settings({}).mode, 'mock');
  assert.equal(settings({}).kill, true);
  assert.equal(settings({}).missing.length, 9);
  assert.equal(LIVE_RELEASE_ENABLED, false);
  assert.throws(() => settings({ ...env, LAYLA_META_PHONE_NUMBER_ID: '../evil' }));
});
test('short sender environment name remains supported', () => {
  const { LAYLA_META_SENDER_NUMBER, ...shortEnv } = env;
  shortEnv.LAYLA_META_SENDER = LAYLA_META_SENDER_NUMBER;
  assert.equal(settings(shortEnv).sender, LAYLA_META_SENDER_NUMBER);
});
test('short sender environment name overrides a stale long name', () => {
  assert.equal(settings({ ...env, LAYLA_META_SENDER: '201036755930' }).sender, '201036755930');
});
test('asset changes receive isolated deterministic state keys', () => {
  const current = cfg(),
    same = settings({ ...env }),
    next = settings({ ...env, LAYLA_META_PHONE_NUMBER_ID: '444' });
  assert.equal(stateKey(current), stateKey(same));
  assert.match(stateKey(current), /^bznsflow:mock:[a-f0-9]{16}$/);
  assert.notEqual(stateKey(current), stateKey(next));
});
test('raw signature rejects tampering and missing secret', () => {
  const b = raw(incoming()),
    sig = `sha256=${createHmac('sha256', env.LAYLA_META_APP_SECRET).update(b).digest('hex')}`;
  assert(signatureValid(b, sig, env.LAYLA_META_APP_SECRET));
  assert(!signatureValid(Buffer.concat([b, Buffer.from(' ')]), sig, env.LAYLA_META_APP_SECRET));
  assert(!signatureValid(b, sig, ''));
});
test('wrong WABA and phone rejected', () => {
  let e = incoming();
  e.entry[0].id = 'old';
  assert.throws(() => parseEvents(raw(e), cfg(), NOW), /wrong_account/);
  e = incoming();
  e.entry[0].changes[0].value.metadata.phone_number_id = '444';
  assert.throws(() => parseEvents(raw(e), cfg(), NOW), /wrong_sender/);
});
test('authentic unknown fields accepted without creating work', () =>
  assert.deepEqual(parseEvents(raw(envelope({}, 'history')), cfg(), NOW), []));
test('malformed envelopes and future timestamps rejected', () => {
  assert.throws(() => parseEvents(raw({ object: 'x' }), cfg(), NOW));
  const e = incoming();
  e.entry[0].changes[0].value.messages[0].timestamp = String((NOW + DAY) / 1000);
  assert.throws(() => parseEvents(raw(e), cfg(), NOW), /timestamp/);
});
test('self, business messages, media and status events never become reply jobs', () => {
  const e = incoming();
  e.entry[0].changes[0].value.messages[0].from = cfg().sender;
  assert.deepEqual(parseEvents(raw(e), cfg(), NOW), []);
  const s = initialState(cfg());
  accept(
    s,
    parseEvents(
      raw(
        envelope({ statuses: [{ id: 'out.1', recipient_id: TO, status: 'delivered', timestamp: String(NOW / 1000) }] }),
      ),
      cfg(),
      NOW,
    ),
    NOW,
  );
  assert.equal(Object.keys(s.jobs).length, 0);
  assert.equal(s.activatedAt, null);
});
test('concurrent duplicate acceptance creates one durable job', async () => {
  const store = memory();
  await Promise.all([1, 2, 3].map(() => transact(store, cfg(), s => accept(s, [message()], NOW))));
  assert.equal(Object.keys(store.state.jobs).length, 1);
});
test('conflicts are bounded to four attempts', async () => {
  let n = 0;
  await assert.rejects(
    transact(
      {
        read: async () => ({ revision: 0, state: initialState(cfg()) }),
        cas: async () => {
          n++;
          return false;
        },
      },
      cfg(),
      () => {},
    ),
    /contention/,
  );
  assert.equal(n, 4);
});
test('unknown facts stay unknown in English and Arabic', () => {
  for (const t of ['how much does it cost?', 'كم التكلفة؟', 'where are you?', 'متى تفتح؟']) {
    const a = answer(t, profile());
    assert.match(a.text, /confirmed|معلومة مؤكدة/);
    assert(!a.text.includes('OMR'));
    assert(a.text.includes('owner@example.test'));
  }
});
test('profile requires explicit review and human contact', () => {
  assert.throws(() => reviewProfile({ ...profile(), humanContact: '' }));
  assert.throws(() => reviewProfile({ ...profile(), reviewed: false }));
  assert.equal(initialState(cfg()).profile.sector, '');
});
for (const [name, change, reason] of [
  [
    'opt-out',
    s => {
      s.contacts[TO].optout = true;
    },
    'optout',
  ],
  [
    'takeover',
    s => {
      s.contacts[TO].takeover = true;
    },
    'human_takeover',
  ],
  [
    'expiry',
    s => {
      s.activatedAt = NOW - 30 * DAY;
    },
    'trial_expired',
  ],
  [
    'window',
    s => {
      s.contacts[TO].lastInbound = NOW - DAY;
    },
    'window_closed',
  ],
  [
    'kill',
    s => {
      s.paused = true;
    },
    'kill_switch',
  ],
  [
    'feature',
    s => {
      s.jobs['in.1'].feature = 'booking';
    },
    'feature_disabled',
  ],
  [
    'rate',
    s => {
      s.rates = Array(10).fill(NOW);
    },
    'rate_limit',
  ],
])
  test(`gateway blocks ${name}`, async () => {
    const store = memory();
    await ready(store);
    await transact(store, cfg(), s => change(s));
    assert.equal(guard(store.state, cfg(), store.state.jobs['in.1'], NOW), reason);
    let calls = 0;
    await runOne({
      store,
      config: cfg,
      now: () => NOW,
      mockSend: async () => {
        calls++;
      },
    });
    assert.equal(calls, 0);
  });
test('business app echo pauses automation and replay is deduplicated after owner resume', async () => {
  const store = memory();
  await ready(store);
  const e = parseEvents(
    raw(
      envelope(
        {
          message_echoes: [
            {
              id: 'echo.1',
              from: cfg().sender,
              to: TO,
              timestamp: String(NOW / 1000),
              type: 'text',
              text: { body: 'A human response' },
            },
          ],
        },
        'smb_message_echoes',
      ),
    ),
    cfg(),
    NOW,
  );
  await transact(store, cfg(), s => accept(s, e, NOW));
  assert.equal(store.state.contacts[TO].takeover, true);
  await runOne({
    store,
    config: cfg,
    now: () => NOW,
    mockSend: () => {
      throw Error('must not send');
    },
  });
  assert.equal(store.state.jobs['in.1'].status, 'blocked');
  await transact(store, cfg(), s => {
    s.contacts[TO].takeover = false;
    accept(s, e, NOW);
  });
  assert.equal(store.state.contacts[TO].takeover, false);
});
test('wrong sender echo refused', () =>
  assert.throws(
    () =>
      parseEvents(
        raw(envelope({ message_echoes: [{ id: 'e', from: '96811111111', to: TO }] }, 'smb_message_echoes')),
        cfg(),
        NOW,
      ),
    /invalid_echo/,
  ));
test('STOP pauses pending message in same envelope', async () => {
  const store = memory();
  await ready(store);
  await transact(store, cfg(), s => accept(s, [message('in.2', 'STOP')], NOW));
  let calls = 0;
  await runOne({
    store,
    config: cfg,
    now: () => NOW,
    mockSend: () => {
      calls++;
    },
  });
  assert.equal(calls, 0);
});
test('only one concurrent worker submits the same intent', async () => {
  const store = memory();
  await ready(store);
  let sends = 0;
  await Promise.all(
    [1, 2].map(() =>
      runOne({
        store,
        config: cfg,
        now: () => NOW,
        mockSend: async () => {
          sends++;
          return { status: 'submitted', providerId: 'out.1' };
        },
      }),
    ),
  );
  assert.equal(sends, 1);
  assert.equal(store.state.activatedAt, null);
  assert.equal(store.state.jobs['in.1'].status, 'submitted');
});
test('timeout/ambiguous outcome is never replayed; blocks later sends', async () => {
  const store = memory();
  await ready(store);
  let sends = 0;
  const options = {
    store,
    config: cfg,
    now: () => NOW,
    mockSend: async () => {
      sends++;
      throw Error('timeout after acceptance');
    },
  };
  await runOne(options);
  await transact(store, cfg(), s => accept(s, [message('in.2')], NOW));
  await runOne(options);
  assert.equal(sends, 1);
  assert.equal(store.state.jobs['in.1'].status, 'ambiguous');
  assert.equal(store.state.jobs['in.2'].status, 'queued');
});
test('matching authentic receipt reconciles timeout using intent', async () => {
  const store = memory();
  await ready(store);
  await runOne({
    store,
    config: cfg,
    now: () => NOW,
    mockSend: async () => {
      throw Error('timeout');
    },
  });
  const intent = store.state.jobs['in.1'].intentId;
  const body = envelope({
    statuses: [
      {
        id: 'out.1',
        recipient_id: TO,
        status: 'delivered',
        timestamp: String(NOW / 1000),
        biz_opaque_callback_data: intent,
      },
    ],
  });
  await transact(store, cfg(), s => accept(s, parseEvents(raw(body), cfg(), NOW), NOW));
  assert.equal(store.state.jobs['in.1'].status, 'delivered');
  assert.equal(store.state.activatedAt, NOW);
  assert.equal(summary(store.state, cfg(), NOW).firstSuccessfulReplyAt, null);
});
test('receipt before HTTP response wins; out-of-order statuses never reset activation', async () => {
  const store = memory();
  await ready(store);
  await runOne({
    store,
    config: cfg,
    now: () => NOW,
    mockSend: async j => {
      await transact(store, cfg(), s =>
        accept(s, [{ kind: 'receipt', id: 'out.1', intent: j.intentId, recipient: TO, status: 'read', at: NOW }], NOW),
      );
      return { status: 'submitted', providerId: 'out.1' };
    },
  });
  await transact(store, cfg(), s =>
    accept(
      s,
      [
        { kind: 'receipt', id: 'out.1', recipient: TO, status: 'failed', at: NOW },
        { kind: 'receipt', id: 'out.1', recipient: TO, status: 'sent', at: NOW },
      ],
      NOW + DAY,
    ),
  );
  assert.equal(store.state.jobs['in.1'].status, 'read');
  assert.equal(store.state.activatedAt, NOW);
});
test('wrong recipient, unmatched id and stale receipt cannot activate', async () => {
  const store = memory();
  await ready(store);
  await runOne({ store, config: cfg, now: () => NOW });
  const j = store.state.jobs['in.1'];
  await transact(store, cfg(), s =>
    accept(
      s,
      [
        { kind: 'receipt', id: j.providerId, recipient: '96811111111', status: 'delivered', at: NOW },
        { kind: 'receipt', id: 'unknown', recipient: TO, status: 'delivered', at: NOW },
        { kind: 'receipt', id: j.providerId, recipient: TO, status: 'read', at: NOW - DAY },
      ],
      NOW,
    ),
  );
  assert.equal(store.state.activatedAt, null);
});
test('crashed intent becomes ambiguous without replay', async () => {
  const store = memory();
  await ready(store);
  await transact(store, cfg(), s => {
    Object.assign(s.jobs['in.1'], { status: 'attempting', attemptAt: NOW - 61000, intentId: 'crashed' });
    maintain(s, NOW);
  });
  assert.equal(store.state.jobs['in.1'].status, 'ambiguous');
});
test('persisted sender binding prevents credential/sender reuse', async () => {
  const store = memory();
  await ready(store);
  await assert.rejects(
    transact(store, { ...cfg(), phone: '999' }, () => {}),
    /binding_changed/,
  );
});
test('pause changed after intent prevents transport', async () => {
  const store = memory();
  await ready(store);
  let reads = 0;
  const wrapped = {
    ...store,
    async read(c) {
      reads++;
      if (reads === 2)
        await transact(store, c, s => {
          s.paused = true;
        });
      return store.read(c);
    },
  };
  let sends = 0;
  await runOne({
    store: wrapped,
    config: cfg,
    now: () => NOW,
    mockSend: async () => {
      sends++;
    },
  });
  assert.equal(sends, 0);
  assert.equal(store.state.jobs['in.1'].status, 'blocked');
});
test('live mode cannot invoke network', async () => {
  const c = { ...cfg(), mode: 'live' };
  let calls = 0;
  await assert.rejects(
    runOne({
      store: memory(c),
      config: () => c,
      fetcher: async () => {
        calls++;
      },
    }),
    /live_release_locked/,
  );
  assert.equal(calls, 0);
});
test('retired store cannot make a network request', async () => {
  const store = createStore({
    fetcher: async () => {
      assert.fail('retired store must not fetch');
    },
  });
  await assert.rejects(store.read(cfg()), e => e.code === 'legacy_storage_retired');
});
test('30-day dedupe retention removes content but retains activation and optout', () => {
  const s = initialState(cfg());
  accept(s, [message('stop', 'STOP')], NOW);
  s.activatedAt = NOW;
  maintain(s, NOW + 31 * DAY);
  assert.equal(Object.keys(s.jobs).length, 0);
  assert.equal(s.activatedAt, NOW);
  assert.equal(s.contacts[TO].optout, true);
});
test('business echo outranks pending human-request contact acknowledgement', async () => {
  const store = memory();
  await transact(store, cfg(), s => {
    s.profile = profile();
    s.paused = false;
    accept(s, [message('human.1', 'I want a human'), { kind: 'takeover', id: 'echo.human', from: TO }], NOW);
  });
  let sends = 0;
  await runOne({
    store,
    config: cfg,
    now: () => NOW,
    mockSend: () => {
      sends++;
    },
  });
  assert.equal(sends, 0);
});
test('stale STOP still suppresses, while stale questions never open the message window', () => {
  const s = initialState(cfg());
  accept(s, [message('stale', 'STOP', NOW - 2 * DAY)], NOW);
  assert.equal(s.contacts[TO].optout, true);
  assert.equal(Object.keys(s.jobs).length, 0);
});
test('three known provider failures trip persisted circuit breaker', async () => {
  const store = memory();
  await ready(store);
  for (let i = 0; i < 3; i++) {
    if (i) await transact(store, cfg(), s => accept(s, [message(`failure.${i}`)], NOW));
    await runOne({
      store,
      config: cfg,
      now: () => NOW,
      mockSend: async () => ({ status: 'failed', error: 'provider_http_400' }),
    });
  }
  assert.equal(store.state.paused, true);
});
test('Cloud API response contract separates accepted, rejected and ambiguous results', async () => {
  const { providerResult } = await import('../api/_lib/layla/gateway.js');
  assert.deepEqual(providerResult(200, { messages: [{ id: 'wamid.actual-format' }] }), {
    status: 'submitted',
    providerId: 'wamid.actual-format',
  });
  assert.equal(providerResult(200, {}).status, 'ambiguous');
  for (const code of [408, 500, 503]) assert.equal(providerResult(code, {}).status, 'ambiguous');
  for (const code of [400, 401, 403, 429])
    assert.equal(providerResult(code, { error: { message: 'SECRET' } }).status, 'failed');
  // 2026-10-25: a test number's refusal (131030) was saved only as provider_http_400.
  assert.deepEqual(providerResult(400, { error: { code: 131030, message: 'SECRET recipient' } }), {
    status: 'failed',
    error: 'provider_http_400',
    errorCode: 131030,
  });
  assert.equal(providerResult(400, { error: { code: 'x' } }).errorCode, undefined);
  assert(!JSON.stringify(providerResult(401, { error: { message: 'SECRET' } })).includes('SECRET'));
});
