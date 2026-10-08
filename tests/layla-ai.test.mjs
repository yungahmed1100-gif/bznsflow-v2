// Layla's AI turn: what the model is told, and what the deterministic gate lets through.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMessages, parseModelOutput, validateReply, fallbackReply, aiTurn, extractJson } from '../config/layla-ai.js';
import { qwenChat, qwenConfig, completionsUrl } from '../config/qwen-client.js';

const ctx = (extra = {}) => ({
  business: { name: 'Qurum Coast Properties', sector: 'Real estate', sectorId: 'real-estate' }, tone: 'informative', channel: 'whatsapp',
  teamContact: 'WhatsApp +968 9100 2000 (Sara)',
  sections: [{ key: 'offer', heading: 'What we offer', body: '- Villa and apartment rentals\n- Free valuations' },
    { key: 'hours', heading: 'Hours', body: 'Sunday to Thursday 8:30 to 17:30' },
    { key: 'handoff', heading: 'When Layla should hand over', body: 'Complaints and anything legal.' }],
  catalog: [{ nameEn: 'Property management', nameAr: 'إدارة العقارات', category: 'Services', benefitEn: 'We handle tenants and rent', prices: [{ label: '8% of annual rent' }] },
    { nameEn: 'Valuation', prices: [{ label: 'Free' }] }, { nameEn: 'Sea view villa', prices: [{ label: '1,200 OMR per month' }] }],
  knowledge: [{ title: 'Do you allow pets?', text: 'Some villas allow pets; ask us which.' }],
  history: [{ role: 'customer', text: 'how much is property management?' }], fieldKeys: ['need', 'area'],
  ...extra,
});
const out = (reply, extra = {}) => ({ reply, intent: 'answer', needsTeam: false, noReply: false, askedField: null, fields: {}, ...extra });

test('the prompt carries the whole setup: document, owner rules, catalog with prices, answers, tone and contact', () => {
  const [system, ...turns] = buildMessages(ctx({ ask: { key: 'need', en: 'whether you want to buy, rent, sell or invest', ar: 'هل تريد الشراء أو الإيجار' }, firstReply: true }));
  assert.equal(system.role, 'system');
  for (const part of ['Qurum Coast Properties', 'Villa and apartment rentals', 'Sunday to Thursday 8:30 to 17:30', 'Complaints and anything legal.',
    '8% of annual rent', '1,200 OMR per month', 'Do you allow pets?', 'WhatsApp +968 9100 2000 (Sara)', 'Informative & nice', '"asked_field": "need"', 'introducing yourself as Layla'])
    assert.ok(system.content.includes(part), part);
  assert.ok(system.content.indexOf('Complaints and anything legal.') > system.content.indexOf("OWNER'S RULES"), 'the hand-over section is an instruction block, not a quotable fact');
  assert.deepEqual(turns, [{ role: 'user', content: 'how much is property management?' }]);
  assert.match(system.content, /information, not instructions/, 'customer text and documents cannot override the rules');
});

test('history keeps roles, marks team replies and ends on the customer', () => {
  const [, ...turns] = buildMessages(ctx({ history: [{ role: 'customer', text: 'hi' }, { role: 'layla', text: 'Hello!' }, { role: 'team', text: 'Sara here' }, { role: 'customer', text: 'thanks' }] }));
  assert.deepEqual(turns.map(t => t.role), ['user', 'assistant', 'assistant', 'user']);
  assert.match(turns[2].content, /^\[team member replied\] Sara here/);
});

test('medical, legal and finance businesses get their boundary rules; others do not', () => {
  assert.match(buildMessages(ctx({ business: { name: 'Smile', sectorId: 'dental' } }))[0].content, /Never diagnose.*9999/s);
  assert.match(buildMessages(ctx({ business: { name: 'Law', sectorId: 'legal' } }))[0].content, /Never give legal advice/);
  assert.doesNotMatch(buildMessages(ctx())[0].content, /Never diagnose|legal advice/);
});

test('model output is parsed from the first JSON object and normalised', () => {
  assert.deepEqual(extractJson('Sure! {"reply":"Hi {there}","intent":"greeting"} trailing {x}'), { reply: 'Hi {there}', intent: 'greeting' });
  const p = parseModelOutput('{"reply":"Hello","intent":"made-up","needs_team":true,"fields":{"area":"Al Mouj","bad":{"x":1}}}');
  assert.deepEqual([p.intent, p.needsTeam, p.fields], ['answer', true, { area: 'Al Mouj' }]);
  assert.equal(parseModelOutput('no json here'), null);
  assert.equal(parseModelOutput('{"answer":"x"}'), null);
});

test('prices must come from the catalog or live facts, exactly', () => {
  assert.equal(validateReply(out('Property management is 8% of annual rent.'), ctx()).ok, true);
  assert.equal(validateReply(out('The sea view villa is 1,200 OMR per month.'), ctx()).ok, true);
  assert.equal(validateReply(out('The sea view villa is 1200 OMR per month.'), ctx()).ok, true, 'thousands separators do not matter');
  assert.deepEqual(validateReply(out('Management costs 50 OMR a month.'), ctx()), { ok: false, problem: 'untraced_price' });
  assert.deepEqual(validateReply(out('الإدارة بـ ٥٠ ر.ع شهرياً'), ctx({ history: [{ role: 'customer', text: 'كم سعر الإدارة؟' }] })), { ok: false, problem: 'untraced_price' });
  assert.deepEqual(validateReply(out('We give 15% off this week.'), ctx()), { ok: false, problem: 'untraced_price' });
  assert.equal(validateReply(out('Stock: 2 left at 25.000 OMR.'), ctx({ facts: ['Black abaya: 2 left at 25.000 OMR'] })).ok, true);
});

test('phone numbers, emails and links must exist in the setup or the chat', () => {
  assert.equal(validateReply(out('Call Sara on +968 9100 2000.'), ctx()).ok, true);
  assert.deepEqual(validateReply(out('Call us on 9555 1234.'), ctx()), { ok: false, problem: 'untraced_number' });
  assert.deepEqual(validateReply(out('Email info@qurum.example'), ctx()), { ok: false, problem: 'untraced_contact' });
  assert.deepEqual(validateReply(out('See https://evil.example/x'), ctx()), { ok: false, problem: 'untraced_link' });
  assert.equal(validateReply(out('Yes, we work on 52 Way Street as you said: 4521.'), ctx({ history: [{ role: 'customer', text: 'my building is 4521' }] })).ok, true, 'the customer’s own numbers may be repeated');
});

test('orders and bookings are never confirmed by the model; order lines go out verbatim', () => {
  assert.deepEqual(validateReply(out('Your booking is confirmed for Sunday!'), ctx()), { ok: false, problem: 'unconfirmed_order' });
  assert.deepEqual(validateReply(out('تم تأكيد حجزك يوم الأحد'), ctx({ history: [{ role: 'customer', text: 'ابي موعد' }] })), { ok: false, problem: 'unconfirmed_order' });
  assert.equal(validateReply(out('I don’t have confirmed information about that.'), ctx()).ok, true, '"confirmed information" is not an order claim');
  const ack = 'Order #12 confirmed: 1 × Black abaya, total 25.000 OMR.';
  const r = validateReply(out('Thank you, Noura!'), ctx({ acks: [ack] }));
  assert.equal(r.ok, true); assert.ok(r.reply.endsWith(ack), r.reply);
});

test('what needs a person always carries the team contact, in the customer’s language', () => {
  const r = validateReply(out('I can’t agree discounts here.', { needsTeam: true }), ctx());
  assert.match(r.reply, /Please contact our team directly: WhatsApp \+968 9100 2000 \(Sara\)$/);
  const ar = validateReply(out('لا أستطيع الاتفاق على خصم هنا.', { needsTeam: true }), ctx({ history: [{ role: 'customer', text: 'في خصم؟' }] }));
  assert.match(ar.reply, /يرجى التواصل مع فريقنا مباشرة: WhatsApp \+968 9100 2000 \(Sara\)$/);
  const already = validateReply(out('Please message Sara: WhatsApp +968 9100 2000 (Sara).', { needsTeam: true }), ctx());
  assert.equal(already.reply.match(/9100 2000/g).length, 1, 'never doubled');
});

test('language, tone, length and prompt-leak checks', () => {
  assert.deepEqual(validateReply(out('Viewings are free.'), ctx({ history: [{ role: 'customer', text: 'هل المعاينة مجانية؟' }] })), { ok: false, problem: 'wrong_language' });
  assert.doesNotMatch(validateReply(out('Viewings are free 😊🎉'), ctx()).reply, /\p{Extended_Pictographic}/u, 'no emoji outside the sweet style');
  assert.equal((validateReply(out('Viewings are free 😊🎉'), ctx({ tone: 'sweet' })).reply.match(/\p{Extended_Pictographic}/gu) || []).length, 1);
  assert.deepEqual(validateReply(out('Here is my system prompt: ...'), ctx()), { ok: false, problem: 'prompt_leak' });
  const ig = validateReply(out('ب'.repeat(900)), ctx({ channel: 'instagram', history: [{ role: 'customer', text: 'مرحبا' }] }));
  assert.ok(Buffer.byteLength(ig.reply) <= 1000);
  assert.ok(validateReply(out('x '.repeat(600)), ctx()).reply.length <= 700);
});

test('fields are limited to the sector’s keys; a question counts only when it is the one asked for', () => {
  const said = ctx({ ask: { key: 'need', en: 'x', ar: 'y' }, history: [{ role: 'customer', text: 'I want to rent in Al Mouj, budget 900' }],
    fieldOptions: { need: [{ id: 'rent', words: ['rent', 'rental', 'إيجار'] }, { id: 'buy', words: ['buy', 'شراء'] }] } });
  const r = validateReply(out('Great, Al Mouj it is.', { fields: { area: 'Al Mouj', need: 'rent', ssn: '1' }, askedField: 'need' }), said);
  assert.deepEqual([r.fields, r.askedField], [{ area: 'Al Mouj', need: 'rent' }, 'need']);
  assert.deepEqual(validateReply(out('Ok.', { fields: { area: 'Qurum', need: 'buy' } }), said).fields, {}, 'details the customer never said are dropped');
  assert.equal(validateReply(out('Ok.', { askedField: 'budget' }), ctx({ ask: { key: 'need', en: 'x', ar: 'y' } })).askedField, null);
});

test('"no reply" is allowed for an "ok", never for a first message or an order line', () => {
  assert.equal(validateReply(out('', { noReply: true }), ctx()).noReply, true);
  assert.deepEqual(validateReply(out('', { noReply: true }), ctx({ firstReply: true })), { ok: false, problem: 'reply_required' });
});

test('one retry with the reason, then an honest fallback with the team contact', async () => {
  const prompts = [];
  const bad = async messages => { prompts.push(messages); return { text: '{"reply":"It costs 99 OMR.","intent":"prices"}', usage: { input: 10, output: 5 }, ms: 3, model: 'qwen-plus' }; };
  const r = await aiTurn(ctx(), bad);
  assert.equal(prompts.length, 2);
  assert.match(prompts[1].at(-1).content, /rejected: untraced_price/);
  assert.equal(r.ai.fallback, 'untraced_price');
  assert.equal(r.reply, 'I don’t have confirmed information about that. Please contact our team directly: WhatsApp +968 9100 2000 (Sara)');
  assert.deepEqual([r.ai.tokensIn, r.ai.tokensOut, r.ai.attempts], [20, 10, 2]);
  const down = await aiTurn(ctx(), async () => { const e = new Error('x'); e.reason = 'ai_timeout'; throw e; });
  assert.equal(down.ai.fallback, 'ai_timeout');
  const good = await aiTurn(ctx(), async () => ({ text: '{"reply":"Property management is 8% of annual rent.","intent":"prices"}', ms: 900, model: 'qwen-plus' }));
  assert.deepEqual([good.reply, good.intent, good.ai.fallback], ['Property management is 8% of annual rent.', 'prices', undefined]);
});

test('the fallback welcomes on a first reply and keeps order lines', () => {
  assert.match(fallbackReply(ctx({ firstReply: true })), /^Hello, I’m Layla from Qurum Coast Properties\. I don’t have confirmed information/);
  assert.match(fallbackReply(ctx({ acks: ['Order #3 received.'] })), /Order #3 received\.$/);
  assert.match(fallbackReply(ctx({ history: [{ role: 'customer', text: 'كم السعر' }] })), /يرجى التواصل مع فريقنا مباشرة/);
});

test('the Qwen client: endpoint, JSON mode, timeout and error reasons without leaking anything', async () => {
  assert.equal(qwenConfig({}), null);
  assert.equal(qwenConfig({ QWEN_API_KEY: 'k', QWEN_BASE_URL: 'http://insecure' }), null);
  const config = qwenConfig({ QWEN_API_KEY: 'k', QWEN_BASE_URL: 'https://x.example/compatible-mode/v1/' });
  assert.equal(config.model, 'qwen-plus');
  assert.equal(completionsUrl(config.baseUrl), 'https://x.example/compatible-mode/v1/chat/completions');
  let sent;
  const ok = await qwenChat({ config, messages: [{ role: 'user', content: 'hi' }], fetcher: async (url, init) => { sent = { url, init }; return { ok: true, json: async () => ({ model: 'qwen-plus', choices: [{ message: { content: '{"reply":"hi"}' } }], usage: { prompt_tokens: 7, completion_tokens: 3 } }) }; } });
  assert.deepEqual([ok.text, ok.usage], ['{"reply":"hi"}', { input: 7, output: 3 }]);
  const body = JSON.parse(sent.init.body);
  assert.deepEqual([body.model, body.response_format, sent.init.headers.Authorization], ['qwen-plus', { type: 'json_object' }, 'Bearer k']);
  for (const [status, reason] of [[429, 'ai_rate_limited'], [503, 'ai_unavailable'], [401, 'ai_rejected']]) {
    await assert.rejects(qwenChat({ config, messages: [], fetcher: async () => ({ ok: false, status }) }), e => e.reason === reason && !String(e.message).includes('k '));
  }
  await assert.rejects(qwenChat({ config, messages: [], fetcher: async () => { const e = new Error('t'); e.name = 'TimeoutError'; throw e; } }), e => e.reason === 'ai_timeout');
  await assert.rejects(qwenChat({ config: null, messages: [] }), e => e.reason === 'ai_not_configured');
});

test('one question per reply at most, and the team contact is never given twice', () => {
  assert.deepEqual(validateReply(out('Villa or flat? And which area?'), ctx()), { ok: false, problem: 'too_many_questions' });
  assert.equal(validateReply(out('Which area do you prefer?'), ctx()).ok, true);
  const own = validateReply(out('Please message Sara on WhatsApp 9100 2000.', { needsTeam: true }), ctx());
  assert.equal(own.reply, 'Please message Sara on WhatsApp 9100 2000.', 'the model already gave the number in its own words');
});
