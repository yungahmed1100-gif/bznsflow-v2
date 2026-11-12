// Layla's AI reply pipeline end to end, with a scripted model in place of Qwen:
// webhook → Convex ingest (deterministic) → debounced AI turn → checks → commit under fences → worker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { business, fixtureBusiness, scriptedModel, lastCustomer, env } from './helpers/layla-conversation.mjs';
import { processInboundMedia } from '../api/_lib/layla/inbound-media.js';

const CONTACT = 'WhatsApp +968 9100 2000 (Sara)';
const system = messages => messages[0].content;

test('the model sees the whole published setup and its reply reaches the customer, with cost recorded', async () => {
  const model = scriptedModel(() => 'Viewings are always free.');
  const b = await business({ model });
  const [reply] = await b.say('96891110001', 'Are viewings free?');
  assert.equal(reply, 'Viewings are always free.');
  const prompt = system(model.calls[0]);
  for (const part of [
    'Qurum Coast Properties',
    'Villa and apartment rentals',
    'Are viewings free?',
    CONTACT,
    'Informative & nice',
    'introducing yourself as Layla',
  ])
    assert.ok(prompt.includes(part), part);
  const out = b.h.m.table('blueMessages').find(m => m.direction === 'out');
  assert.deepEqual(
    [out.ai.model, out.ai.tokensIn, out.ai.tokensOut, out.ai.fallback],
    ['qwen-plus', 100, 20, undefined],
  );
  assert.equal(b.conversation('96891110001').pendingReply, undefined, 'the pending turn is cleared');
});

test('a quick run of messages gets one answer that saw all of them', async () => {
  const model = scriptedModel(() => 'Yes to both: rentals and sales.');
  const b = await business({ model });
  for (const text of ['hi', 'do you rent villas?', 'and sell them?']) {
    b.h.m.advance(500);
    await b.ingest(b.envelope('96891110002', text));
  }
  await b.turns();
  await b.flush();
  assert.equal(model.calls.length, 1, 'one model call for the burst');
  assert.deepEqual(
    model.calls[0].filter(m => m.role === 'user').map(m => m.content),
    ['hi', 'do you rent villas?', 'and sell them?'],
  );
  assert.deepEqual(
    b.sent.filter(s => s.to === '96891110002').map(s => s.text),
    ['Yes to both: rentals and sales.'],
  );
});

test('a reply written while the chat or the business changed is dropped', async () => {
  const b = await business({ model: scriptedModel(() => 'Stale answer.') });
  await b.ingest(b.envelope('96891110003', 'hello'));
  const chat = b.conversation('96891110003');
  await b.h.messaging('takeover', { sessionHash: b.tenant.sessionHash, conversationId: chat._id });
  const [result] = await b.turns();
  await b.flush();
  assert.equal(result.skipped, 'conversation_changed');
  assert.equal(b.sent.length, 0);
  const c = await business({ model: scriptedModel(() => 'Old document answer.') });
  await c.ingest(c.envelope('96891110004', 'hello'));
  await c.republish((await import('./helpers/layla-conversation.mjs')).bzns({ tone: 'sharp' }));
  const [skipped] = await c.turns();
  assert.equal(skipped.skipped, 'profile_changed', 'a republished bzns.md fences the old turn');
});

test('STOP never reaches the model and nothing is sent', async () => {
  const model = scriptedModel();
  const b = await business({ model });
  assert.deepEqual(await b.say('96891110005', 'STOP'), []);
  assert.equal(model.calls.length, 0);
  assert.equal(b.contact('96891110005').optout, true);
  assert.deepEqual(await b.say('96891110005', 'hello again'), [], 'opt-out is final');
  assert.equal(model.calls.length, 0);
});

test('model failures get the honest fallback with the team contact, and the reason is recorded', async () => {
  const b = await business({
    model: async () => {
      const e = new Error('slow');
      e.reason = 'ai_timeout';
      throw e;
    },
  });
  const [reply] = await b.say('96891110006', 'Do you have parking?');
  assert.equal(
    reply,
    `Hello, I’m Layla from Qurum Coast Properties. I don’t have confirmed information about that. Please contact our team directly: ${CONTACT}`,
  );
  assert.equal(b.h.m.table('blueMessages').find(m => m.direction === 'out').ai.fallback, 'ai_timeout');
  const c = await business({ model: scriptedModel(() => 'A villa is 99 OMR a night.') });
  const [guarded] = await c.say('96891110007', 'how much is a villa?');
  assert.match(guarded, /Please contact our team directly/, 'an invented price never goes out');
  assert.doesNotMatch(guarded, /99 OMR/);
  assert.equal(c.h.m.table('blueMessages').find(m => m.direction === 'out').ai.fallback, 'untraced_price');
});

test('what needs a person gets the team contact and Layla stays on the chat', async () => {
  const model = scriptedModel(q =>
    /person/.test(q) ? { reply: 'Of course.', intent: 'human', needs_team: true } : 'We rent villas.',
  );
  const b = await business({ model });
  const [first] = await b.say('96891110008', 'I want to talk to a person');
  assert.equal(first, `Of course. Please contact our team directly: ${CONTACT}`);
  assert.equal(b.conversation('96891110008').takeover, false);
  // The referral is recorded as a fact, with the required details known and missing; no queue, no hand-over state.
  const outcome = b.conversation('96891110008').outcome;
  assert.equal(outcome.referral.reason, 'human');
  assert.ok(Array.isArray(outcome.missing) && outcome.required.length >= outcome.missing.length);
  assert.equal(b.conversation('96891110008').handoffState, undefined, 'giving the contact opens no hand-over');
  assert.deepEqual(await b.say('96891110008', 'do you rent villas?'), ['We rent villas.']);
  const setup = b.h.m.table('blueReviewSessions')[0].metrics;
  assert.ok(
    setup.firstTeamReferralAt && setup.firstReplySentAt,
    'the first referral and the first reply sent are stamped once',
  );
});

test('the flood guard stays deterministic: after ten automated replies an hour, one notice and Layla stops', async () => {
  const model = scriptedModel(q => `Noted: ${q}`);
  const b = await business({ model });
  for (let i = 0; i < 10; i++) await b.say('96891110009', `question ${i}`);
  const notice = await b.say('96891110009', 'question 10');
  assert.equal(notice.length, 1);
  assert.equal(b.conversation('96891110009').takeover, true);
  const calls = model.calls.length;
  assert.deepEqual(await b.say('96891110009', 'question 11'), []);
  assert.equal(model.calls.length, calls, 'a stopped chat never calls the model');
});

test('lead details: proposals are validated, owner values win, and only the one asked question is counted', async () => {
  const model = scriptedModel((q, messages) => {
    const ask = /"asked_field": "([a-z_]+)"/.exec(system(messages))?.[1] || null;
    return { reply: 'Thanks! Which area do you prefer?', fields: { need: 'rent', area: 'Atlantis' }, asked_field: ask };
  });
  const b = await business({ model });
  await b.say('96891110010', 'I am looking for a place');
  let c = b.contact('96891110010');
  assert.equal(
    (c.fields || []).find(f => f.key === 'need'),
    undefined,
    'nothing the customer did not say is kept',
  );
  assert.equal(
    (c.fields || []).find(f => f.key === 'area'),
    undefined,
  );
  await b.say('96891110010', 'I want to rent');
  c = b.contact('96891110010');
  assert.equal(c.fields.find(f => f.key === 'need')?.value, 'rent', 'a listed option the customer named is kept');
  assert.equal(
    c.fields.find(f => f.key === 'area'),
    undefined,
    'a place they never mentioned is refused',
  );
  assert.ok((c.asked || []).length <= 1, 'at most one question per reply');
  await b.h.m.db.patch(c._id, { fields: [{ key: 'need', value: 'buy', source: 'owner', confidence: 1, at: 1 }] });
  await b.say('96891110010', 'still looking');
  assert.equal(b.contact('96891110010').fields.find(f => f.key === 'need').value, 'buy', 'never overwrites the owner');
});

test('stock lines are live facts in the prompt; order lines always go out word for word', async () => {
  const model = scriptedModel(() => 'Great choice!');
  const b = await business({
    model,
    markdown: (await import('./helpers/layla-conversation.mjs')).retailDoc('informative'),
    sectorLabel: 'Retail',
    ascend: 'retail',
    seed: (await import('./helpers/layla-conversation.mjs')).seedBoutique,
  });
  await b.say('96891110011', 'Hi, do you have the black abaya?');
  assert.match(system(model.calls[0]), /LIVE FACTS:\n- .*Black abaya.*25\.000 OMR/s);
  const [reply] = await b.say('96891110011', 'size 52 please, I want to order 1');
  assert.match(reply, /^Great choice!\n\nOrder #\d+ (is )?confirmed/, reply);
});

// Photos and voice notes: the real webhook path keeps the media id, then processInboundMedia (run after Meta
// is answered in production) fetches the file from a fake Meta, stores it and reads it with a fake Qwen.
const aiEnv = { ...env, QWEN_API_KEY: 'test-key', QWEN_BASE_URL: 'https://qwen.test' };
function mediaWorld(b, { transcript = '', photo = null, refuse = false, type = 'audio/ogg' } = {}) {
  const calls = [];
  const fetcher = async (url, init = {}) => {
    const u = new URL(url);
    if (u.hostname === 'graph.facebook.com')
      return new Response(
        JSON.stringify({
          url: `https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=${u.pathname.split('/').pop()}`,
          mime_type: type,
          file_size: 900,
        }),
      );
    if (u.hostname === 'lookaside.fbsbx.com')
      return new Response(new Uint8Array(900), { headers: { 'content-type': type } });
    if (u.hostname === 'upload.test')
      return new Response(
        JSON.stringify({
          storageId: b.h.m.putFile({ contentType: init.headers['Content-Type'], size: init.body.length }),
        }),
      );
    if (u.hostname === 'qwen.test') {
      const body = JSON.parse(init.body);
      calls.push(body);
      if (refuse) return new Response(JSON.stringify({ code: 'insufficient_quota' }), { status: 403 });
      const content = body.model === 'qwen3-asr-flash' ? transcript : JSON.stringify(photo);
      return new Response(
        JSON.stringify({
          model: body.model,
          choices: [{ message: { content } }],
          usage: { prompt_tokens: 50, completion_tokens: 10 },
        }),
      );
    }
    return b.fetcher(url, init);
  };
  return { calls, read: media => processInboundMedia(media, { store: b.store, env: aiEnv, fetcher }) };
}
const say = async (b, from, message) => {
  b.h.m.advance(1000);
  return b.ingest(b.envelope(from, message));
};
const answer = async b => {
  const before = b.sent.length;
  await b.turns();
  await b.flush();
  return b.sent.slice(before).map(x => x.text);
};
const thread = async (b, from) =>
  (await b.h.dashboard('thread', { sessionHash: b.tenant.sessionHash, conversationId: b.conversation(from)._id })).value
    .messages;

test('a voice note is transcribed and answered in the language it was spoken', async () => {
  const model = scriptedModel(() => ({ reply: 'نعم، المعاينة مجانية دائماً.' }));
  const b = await business({ model });
  const world = mediaWorld(b, { transcript: 'هل المعاينة مجانية؟' });
  const { media } = await say(b, '96891110012', {
    type: 'audio',
    audio: { id: 'media1', mime_type: 'audio/ogg; codecs=opus', voice: true },
  });
  assert.deepEqual(
    media.map(j => [j.kind, j.ref, j.voice]),
    [['audio', 'media1', true]],
  );
  assert.equal(b.conversation('96891110012').pendingReply.awaitMedia.length, 1, 'Layla waits for the note to be read');
  await world.read(media);
  const [reply] = await answer(b);
  assert.equal(reply, 'نعم، المعاينة مجانية دائماً.');
  assert.equal(model.calls.length, 1);
  assert.equal(lastCustomer(model.calls[0]), '[voice note] هل المعاينة مجانية؟');
  assert.match(system(model.calls[0]), /PHOTOS AND VOICE NOTES/);
  assert.doesNotMatch(
    system(model.calls[0]),
    /can only read text|location, contact card/,
    'a readable note is never "can only read text"',
  );
  // The business's own words steer recognition; recognition answers in plain text.
  assert.equal(world.calls[0].model, 'qwen3-asr-flash');
  assert.match(world.calls[0].messages[0].content[0].text, /Qurum Coast Properties/);
  assert.match(world.calls[0].messages.at(-1).content[0].input_audio.data, /^data:audio\/ogg;base64,/);
  assert.equal(world.calls[0].response_format, undefined);
  // The owner hears it and reads what was said.
  const [note] = await thread(b, '96891110012');
  assert.deepEqual(
    [note.media.kind, note.media.voice, note.media.status, note.media.text, note.text],
    ['audio', true, 'ready', 'هل المعاينة مجانية؟', ''],
  );
  assert.match(note.media.url, /^https:\/\/files\.test\//);
});

test("a photo is described; a price in it is the customer's, never quoted as the business's", async () => {
  const model = scriptedModel(() => ({ reply: 'السعر 9 ريال عماني.' }));
  const b = await business({ model });
  const world = mediaWorld(b, {
    type: 'image/jpeg',
    photo: {
      summary: 'A screenshot of a price list.',
      text_in_image: 'تنظيف 9 ر.ع',
      kind: 'screenshot',
      catalog_match: 'Not in the catalog',
    },
  });
  const { media } = await say(b, '96891110013', {
    type: 'image',
    image: { id: 'media2', mime_type: 'image/jpeg', caption: 'كم السعر عندكم؟' },
  });
  await world.read(media);
  const [reply] = await answer(b);
  assert.equal(
    lastCustomer(model.calls[0]),
    '[photo: A screenshot of a price list. Text in the photo: "تنظيف 9 ر.ع"]\nكم السعر عندكم؟',
  );
  assert.doesNotMatch(reply, /9 ريال/, "the screenshot's price is refused");
  assert.equal(model.calls.length, 2, 'refused once, retried, then the safe fallback');
  assert.equal(world.calls[0].model, 'qwen3-vl-plus');
  assert.match(world.calls[0].messages[1].content[0].image_url.url, /^data:image\/jpeg;base64,/);
  assert.deepEqual(world.calls[0].response_format, { type: 'json_object' });
  const [photo] = await thread(b, '96891110013');
  assert.deepEqual([photo.media.kind, photo.media.status, photo.text], ['image', 'ready', 'كم السعر عندكم؟']);
  assert.doesNotMatch(photo.media.text, /Looks like/, 'a catalog match that is not in the catalog is dropped');
});

test('a photo the model cannot read is kept for the owner; Layla asks the customer to describe it', async () => {
  const model = scriptedModel(() => ({
    reply: 'Thanks for the photo. Could you tell me what you would like to know about it?',
  }));
  const b = await business({ model });
  const world = mediaWorld(b, { type: 'image/jpeg', refuse: true });
  const { media } = await say(b, '96891110014', { type: 'image', image: { id: 'media3', mime_type: 'image/jpeg' } });
  await world.read(media);
  const [reply] = await answer(b);
  assert.equal(
    reply,
    'Thanks for the photo. Could you tell me what you would like to know about it?',
    'no team contact for an unreadable photo alone',
  );
  assert.equal(lastCustomer(model.calls[0]), '[photo that could not be read]');
  const [photo] = await thread(b, '96891110014');
  assert.deepEqual([photo.media.status, !!photo.media.url, photo.media.text], ['unread', true, undefined]);
});

test('Layla never waits forever for a file; a late reading is answered under its own key', async () => {
  const model = scriptedModel(q =>
    q.includes('could not be read')
      ? 'Sorry, I could not hear that. Could you type your question?'
      : 'Yes, viewings are always free.',
  );
  const b = await business({ model });
  const { media } = await say(b, '96891110015', {
    type: 'audio',
    audio: { id: 'media4', mime_type: 'audio/ogg', voice: true },
  });
  // The fallback reply fires before the note is read.
  assert.deepEqual(await answer(b), ['Sorry, I could not hear that. Could you type your question?']);
  await mediaWorld(b, { transcript: 'Are viewings free?' }).read(media);
  assert.deepEqual(await answer(b), ['Yes, viewings are always free.'], 'the reading gets its own answer');
  assert.equal(
    new Set(
      b.h.m
        .table('blueMessages')
        .filter(m => m.direction === 'out')
        .map(m => m.key),
    ).size,
    2,
    'two replies, two keys',
  );
});

test('a photo and a question sent together get one answer that reads both', async () => {
  const model = scriptedModel(() => 'Yes, it is available for viewing.');
  const b = await business({ model });
  const world = mediaWorld(b, {
    type: 'image/jpeg',
    photo: { summary: 'A white villa with a pool.', text_in_image: '', kind: 'place', catalog_match: '' },
  });
  const { media } = await say(b, '96891110016', { type: 'image', image: { id: 'media5', mime_type: 'image/jpeg' } });
  await say(b, '96891110016', 'Is this one available?');
  assert.equal(b.conversation('96891110016').pendingReply.awaitMedia.length, 1, 'the text keeps waiting for the photo');
  await world.read(media);
  assert.equal((await answer(b)).length, 1);
  assert.equal(model.calls.length, 1);
  const users = model.calls[0].filter(m => m.role === 'user').map(m => m.content);
  assert.deepEqual(users.slice(-2), ['[photo: A white villa with a pool.]', 'Is this one available?']);
});

test('Instagram goes through the same turn and keeps within 1000 bytes', async () => {
  const model = scriptedModel(() => 'نعم، '.repeat(400));
  const b = await fixtureBusiness('realestate', 'informative', 'instagram');
  const ig = await business({ model, channel: 'instagram' });
  const [reply] = await ig.say('96891110013', 'هل المعاينة مجانية؟');
  assert.ok(Buffer.byteLength(reply) <= 1000, `${Buffer.byteLength(reply)} bytes`);
  assert.match(system(model.calls[0]), /replying to a customer on Instagram/);
  void b;
});

test('publishing the catalog fences replies queued from the old prices', async () => {
  const b = await business({ model: scriptedModel(() => 'Valuations are free.') });
  await b.ingest(b.envelope('96891110014', 'is a valuation free?'));
  await b.turns();
  const job = b.queued()[0];
  assert.ok(job, 'a reply is queued');
  const { fenceRepliesForOwner } = await import('../convex/laylaTurn.js');
  assert.equal(
    await fenceRepliesForOwner(b.h.m.ctx, String(b.tenant.accountId), b.h.m.now()),
    true,
    'catalog publish runs this (convex/blueCatalog.ts)',
  );
  await b.flush();
  assert.equal(
    b.h.m.table('blueMessages').find(m => m._id === job._id).status,
    'blocked',
    'the stale reply never sends',
  );
});

test('approved services and products reach the model with their price labels; drafts never do', async () => {
  const { randomUUID } = await import('node:crypto');
  const model = scriptedModel(() => 'Property management is 8% of annual rent.');
  const b = await business({ model });
  const entry = (name, status, label) => ({
    ownerKey: String(b.tenant.accountId),
    entryKey: randomUUID(),
    kind: 'service',
    status,
    nameEn: name,
    nameAr: '',
    category: 'Services',
    benefitEn: 'We handle tenants and rent',
    benefitAr: '',
    descriptionEn: '',
    descriptionAr: '',
    availability: 'Muscat',
    prices: [{ type: 'fixed', currency: 'OMR', unit: '', label }],
    source: 'owner',
    confidence: 1,
    laylaUseEn: '',
    laylaUseAr: '',
    revision: 1,
    sortOrder: 0,
    createdAt: 1,
    updatedAt: 1,
  });
  await b.h.m.db.insert('blueCatalogEntries', entry('Property management', 'approved', '8% of annual rent'));
  await b.h.m.db.insert('blueCatalogEntries', entry('Secret draft', 'draft', '1 OMR'));
  const [reply] = await b.say('96891110015', 'how much is property management?');
  assert.equal(reply, 'Property management is 8% of annual rent.', 'a catalog price passes the price check');
  const prompt = system(model.calls[0]);
  assert.match(
    prompt,
    /- Property management \[Services\]: We handle tenants and rent \(availability: Muscat\) — price: 8% of annual rent/,
  );
  assert.doesNotMatch(prompt, /Secret draft/);
});

test('cost guard: once the number has used its daily sends, no model call is made', async () => {
  const { RATE_LIMITS } = await import('../convex/blueMessagingState.js');
  const model = scriptedModel();
  const b = await business({ model });
  await b.h.m.db.insert('blueMessageRates', {
    key: `day:${b.integration.id}:${Math.floor(b.h.m.now() / 86400000)}`,
    count: RATE_LIMITS.perDay,
    expiresAt: b.h.m.now() + 86400000,
  });
  assert.deepEqual(await b.say('96891110016', 'hello'), []);
  assert.equal(model.calls.length, 0);
  assert.equal(
    b.h.m.table('blueMessages').filter(m => m.direction === 'in').length,
    1,
    'the message is still kept for the owner',
  );
});
