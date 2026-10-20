import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { dailyLimit, validEmail, validDomain, normalizeDomain, campaignContent, renderEmail, RASIL_MONTHLY_CAP, validLocalPart, validSenderName } from '../config/rasil.js';
import { signLink, verifyLink, verifyWebhook } from '../api/_lib/rasil-sign.js';
import { rasilSendResult, publicDomain, sendCampaignEmail } from '../api/_lib/rasil-resend.js';

const DAY = 86400000;
const env = { CONVEX_SERVICE_SECRET: 'a'.repeat(64) };

test('a new domain warms up over three weeks, then may send its monthly allowance in a day', () => {
  const start = Date.UTC(2026, 9, 1);
  assert.equal(dailyLimit(undefined, start), 0, 'no verified domain, no sending');
  assert.deepEqual([0, 6, 7, 13, 14, 20, 21, 90].map(d => dailyLimit(start, start + d * DAY)), [50, 50, 150, 150, 400, 400, RASIL_MONTHLY_CAP, RASIL_MONTHLY_CAP]);
});

test('addresses, domains and senders are validated; BznsFlow and webmail domains are never a sender', () => {
  for (const e of ['huda@example.om', 'A.B+news@Mail.Example.co.uk']) assert.equal(validEmail(e), true, e);
  for (const e of ['huda', 'huda@', '@x.om', 'a b@x.om', 'huda@x', 'x'.repeat(65) + '@x.om']) assert.equal(validEmail(e), false, e);
  assert.equal(normalizeDomain(' https://www.DarAlRayan.om/ar '), 'daralrayan.om');
  for (const d of ['daralrayan.om', 'mail.example.co.uk']) assert.equal(validDomain(d), true, d);
  for (const d of ['bznsflowai.com', 'news.bznsflowai.com', 'gmail.com', 'localhost', 'x', '-bad.om']) assert.equal(validDomain(d), false, d);
  assert.equal(validLocalPart('news'), true);
  assert.equal(validLocalPart('News'), false);
  assert.equal(validLocalPart('a b'), false);
  assert.equal(validSenderName('Dar Al Rayan'), true);
  assert.equal(validSenderName('Evil <x@y.com>'), false);
});

test('campaign content is plain text with one personal field; owner text is never HTML', () => {
  assert.equal(campaignContent({ subject: '', body: 'x' }).reason, 'invalid_subject');
  assert.equal(campaignContent({ subject: 'Hi', body: '  ' }).reason, 'invalid_body');
  assert.deepEqual(campaignContent({ subject: ' Autumn\r\noffer ', body: 'Hello\r\n' }), { ok: true, subject: 'Autumn offer', body: 'Hello' });
  const out = renderEmail({ subject: 'Hi {{name}}', body: 'Hello {{ name }},\n\n<script>x</script> See https://example.om/offer?a=1&b=2.', name: 'Huda',
    business: 'Dar Al Rayan', address: 'Al Khuwair, Muscat', unsubscribeUrl: 'https://www.bznsflowai.com/u?t=x', lang: 'en' });
  assert.equal(out.subject, 'Hi Huda');
  assert.match(out.html, /Hello Huda,/);
  assert.doesNotMatch(out.html, /<script>/);
  assert.match(out.html, /&lt;script&gt;/);
  assert.match(out.html, /<a href="https:\/\/example\.om\/offer\?a=1&amp;b=2"/, 'links work; the full stop is not part of them');
  assert.match(out.html, /subscribed to emails from Dar Al Rayan\. Al Khuwair, Muscat\./);
  assert.match(out.html, /href="https:\/\/www\.bznsflowai\.com\/u\?t=x"/);
  assert.match(out.text, /Unsubscribe: https:\/\/www\.bznsflowai\.com\/u\?t=x$/);
  const ar = renderEmail({ subject: 'عرض', body: 'أهلاً {{name}}', business: 'دار الريان', unsubscribeUrl: 'https://x.test/u', lang: 'ar' });
  assert.match(ar.html, /dir="rtl"/);
  assert.match(ar.html, /أهلاً عزيزي العميل/, 'no name: a polite fallback');
  assert.match(ar.html, /إلغاء الاشتراك/);
});

test('unsubscribe and confirm links are signed per subscriber and per purpose', () => {
  const token = signLink(env, 'unsubscribe', 'k57abc123def');
  assert.equal(verifyLink(env, 'unsubscribe', token), 'k57abc123def');
  assert.equal(verifyLink(env, 'confirm', token), null, 'an unsubscribe link cannot confirm');
  assert.equal(verifyLink(env, 'unsubscribe', token.replace(/.$/, c => (c === 'A' ? 'B' : 'A'))), null);
  assert.equal(verifyLink(env, 'unsubscribe', `k57other0000.${token.split('.')[1]}`), null, 'a mac is bound to its subscriber');
  assert.equal(verifyLink({ CONVEX_SERVICE_SECRET: 'b'.repeat(64) }, 'unsubscribe', token), null);
  assert.equal(signLink({}, 'unsubscribe', 'k57abc123def'), null);
});

test('Resend webhooks are accepted only with a fresh, valid Svix signature', () => {
  const key = Buffer.from('rasil-test-key-32-bytes-long-ok!');
  const secret = `whsec_${key.toString('base64')}`;
  const raw = '{"type":"email.delivered","data":{"email_id":"e1"}}';
  const now = Date.UTC(2026, 9, 20, 10);
  const ts = String(now / 1000);
  const sig = createHmac('sha256', key).update(`msg_1.${ts}.${raw}`).digest('base64');
  const headers = { 'svix-id': 'msg_1', 'svix-timestamp': ts, 'svix-signature': `v1,bogus v1,${sig}` };
  assert.equal(verifyWebhook(secret, headers, raw, now), true);
  assert.equal(verifyWebhook(secret, headers, raw.replace('e1', 'e2'), now), false, 'a changed body');
  assert.equal(verifyWebhook(secret, headers, raw, now + 301000), false, 'replayed later');
  assert.equal(verifyWebhook('whsec_' + Buffer.from('other').toString('base64'), headers, raw, now), false);
  assert.equal(verifyWebhook(undefined, headers, raw, now), false);
});

test('send results: accepted, retried with the same key, or failed; account problems stop the campaign', async () => {
  assert.deepEqual(rasilSendResult(200, { id: 're_1-a' }), { status: 'submitted', providerId: 're_1-a' });
  assert.equal(rasilSendResult(200, {}).status, 'ambiguous');
  assert.equal(rasilSendResult(429, {}).status, 'retry');
  assert.equal(rasilSendResult(503, {}).status, 'retry');
  assert.deepEqual(rasilSendResult(422, { message: 'Invalid `to` field' }), { status: 'failed', reason: 'provider_rejected' });
  assert.equal(rasilSendResult(403, { message: 'The daralrayan.om domain is not verified' }).campaignBlock, 'domain_not_verified');
  assert.equal(rasilSendResult(401, { message: 'API key is invalid' }).campaignBlock, 'email_unavailable');
  const keys = [];
  const fetcher = async (url, opts) => { keys.push(opts.headers['Idempotency-Key']); throw new TypeError('network'); };
  assert.equal((await sendCampaignEmail({ env: { RASIL_RESEND_API_KEY: 're_x' }, fetcher, idempotencyKey: 'rasil/j1', message: {} })).status, 'retry');
  assert.deepEqual(keys, ['rasil/j1']);
  assert.equal((await sendCampaignEmail({ env: {}, fetcher, idempotencyKey: 'rasil/j1', message: {} })).campaignBlock, 'email_unavailable');
});

test('a domain is shown with its records and the recommended DMARC record', () => {
  const d = publicDomain({ id: 'd-1', status: 'not_started', records: [{ record: 'DKIM', type: 'TXT', name: 'resend._domainkey', value: 'p=MIG', status: 'not_started' }] });
  assert.equal(d.status, 'pending');
  assert.deepEqual(d.records.map(r => r.name), ['resend._domainkey', '_dmarc']);
  assert.equal(publicDomain({ id: 'd-1', status: 'verified', records: [] }).status, 'verified');
});
