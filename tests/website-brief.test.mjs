// Ascend's website brief: only an Ascend manager can send one, every field is validated, uploads must be
// real images that belong to the account, and each version is emailed once to Ahmed, never anyone else.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { normalizeBrief, BRIEF_RECIPIENT } from '../config/website-brief.js';
import { executeWebsiteBrief } from '../convex/websiteBriefState.js';
import { createWebsiteBriefApi } from '../api/_lib/website-brief-api.js';
import { briefEmail } from '../api/_lib/website-brief-email.js';
import { PilotError } from '../api/_lib/layla/config.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { GREEN_ORIGIN } from './helpers/green-env.mjs';

const token = 'a'.repeat(64), csrf = 'b'.repeat(64), sessionHash = createHash('sha256').update(token).digest('hex');
const minimal = { nameEn: 'Nour Abayas', phone: '+968 9000 0000', languages: 'both' };

test('a brief needs a name, a phone and a language; everything else is checked by kind and length', () => {
  assert.deepEqual(normalizeBrief(minimal), { ok: true, value: minimal });
  assert.equal(normalizeBrief({ ...minimal, nameEn: '' }).field, 'nameEn');
  assert.equal(normalizeBrief({ ...minimal, nameEn: '', nameAr: 'نور' }).ok, true);
  assert.equal(normalizeBrief({ ...minimal, phone: undefined }).reason, 'brief_required');
  for (const [field, value] of [['mapUrl', 'javascript:alert(1)'], ['email', 'not-an-email'], ['colors', ['red']], ['colors', ['#000000', '#111111', '#222222', '#333333']],
    ['references', ['ftp://x.example']], ['pages', ['blog']], ['style', 'brutal'], ['languages', 'fr'], ['designLogo', 'yes'], ['about', 42]]) {
    assert.equal(normalizeBrief({ ...minimal, [field]: value }).field, field, `${field} ${JSON.stringify(value)}`);
  }
  assert.equal(normalizeBrief({ ...minimal, about: 'x'.repeat(1501) }).reason, 'brief_too_long');
  const clean = normalizeBrief({ ...minimal, about: ' Abayas\u0000 for every day ', colors: ['#1F4F7A', '#1F4F7A'], references: ['', 'https://example.com'] });
  assert.equal(clean.value.about, 'Abayas for every day');
  assert.deepEqual(clean.value.colors, ['#1F4F7A']);
  assert.deepEqual(clean.value.references, ['https://example.com']);
});

// ── Convex state ────────────────────────────────────────────────────────────

async function fixture(plan = 'ascend') {
  const m = convexMemory(), now = m.now();
  const draftHash = 'd'.repeat(64);
  const accountId = await m.db.insert('accounts', { email: 'owner@example.com', name: 'Sara', phone: '+96890000000', role: 'customer', createdAt: now, draftHash });
  await m.db.insert('sessions', { accountId, tokenHash: sessionHash, createdAt: now, expiresAt: now + 86400000 });
  await m.db.insert('blueReviewSessions', { sessionHash: draftHash, profile: { businessName: 'Nour', sector: 'Retail', services: 'Abayas', prices: '', hours: '9–9', location: 'Muscat', humanContact: '', reviewed: true } });
  if (plan) await m.db.insert('blueAccessGrants', { email: 'owner@example.com', plan, status: 'active', grantedAt: now, grantedBy: 'ahmed@bznsflowai.com' });
  const run = args => executeWebsiteBrief(m.ctx, { sessionHash, ...args }, m.now());
  const upload = async (kind, check = 'ok', contentType = 'image/png') => {
    const storageId = m.putFile({ contentType });
    const result = await run({ operation: 'file_register', storageId, kind, fileCheck: check });
    return { storageId, result };
  };
  return { m, now, accountId, run, upload };
}

test('only an Ascend account manager can open the brief', async () => {
  assert.equal((await (await fixture('catalyst')).run({ operation: 'get' })).reason, 'access_required');
  assert.equal((await (await fixture(null)).run({ operation: 'get' })).reason, 'access_required');
  const f = await fixture();
  await f.m.db.insert('ascendWorkspaceMembers', { workspaceId: 'w', accountId: f.accountId, email: 'owner@example.com', status: 'active', invitedAt: f.now, updatedAt: f.now });
  assert.equal((await f.run({ operation: 'get' })).reason, 'manager_required');
  assert.equal((await executeWebsiteBrief(f.m.ctx, { sessionHash: 'c'.repeat(64), operation: 'get' }, f.now)).reason, 'sign_in_required');
});

test('a first brief starts from the business details the owner already confirmed', async () => {
  const { run } = await fixture();
  const { value } = await run({ operation: 'get' });
  assert.equal(value.version, 0);
  assert.deepEqual(value.fields, { nameEn: 'Nour', services: 'Abayas', hours: '9–9', address: 'Muscat', phone: '+96890000000', email: 'owner@example.com' });
});

test('uploads are rate limited, byte-checked, and only the account\'s own files can be used', async () => {
  const f = await fixture();
  for (let i = 0; i < 40; i++) assert.equal((await f.run({ operation: 'upload_url' })).ok, true);
  assert.equal((await f.run({ operation: 'upload_url' })).reason, 'upload_limit');

  const bad = await f.upload('logo', 'bad');
  assert.equal(bad.result.reason, 'invalid_file');
  assert.deepEqual(f.m.deletedFiles, [bad.storageId], 'a file that is not an image is deleted');

  const other = await fixture();
  const theirs = await other.upload('logo');
  assert.equal(theirs.result.ok, true);
  const mine = await f.upload('logo');
  assert.equal(mine.result.ok, true);
  // Another account's file id, even if it exists, is not this owner's.
  assert.equal((await f.run({ operation: 'submit', version: 0, fields: minimal, logoId: theirs.storageId, photoIds: [] })).reason, 'invalid_file');
  assert.equal((await f.run({ operation: 'submit', version: 0, fields: minimal, logoId: mine.storageId, photoIds: [mine.storageId] })).reason, 'invalid_file', 'a logo is not a photo');
});

test('submitting stores a version, deletes unused uploads, and returns the files for the email', async () => {
  const f = await fixture();
  assert.equal((await f.run({ operation: 'submit', version: 0, fields: minimal, photoIds: [] })).field, 'logo', 'a logo or a request to design one');
  const logo = await f.upload('logo');
  const photo = await f.upload('photo', 'ok', 'image/jpeg');
  const dropped = await f.upload('photo', 'ok', 'image/jpeg');
  const sent = await f.run({ operation: 'submit', version: 0, fields: minimal, logoId: logo.storageId, photoIds: [photo.storageId] });
  assert.equal(sent.ok, true, sent.reason);
  assert.equal(sent.value.version, 1);
  assert.equal(sent.value.update, false);
  assert.equal(sent.value.logo.contentType, 'image/png');
  assert.equal(sent.value.photos.length, 1);
  assert.ok(f.m.deletedFiles.includes(dropped.storageId));
  assert.equal(f.m.table('websiteBriefFiles').length, 2);

  assert.equal((await f.run({ operation: 'submit', version: 0, fields: minimal, logoId: logo.storageId, photoIds: [] })).reason, 'brief_conflict', 'a stale tab cannot overwrite');
  const update = await f.run({ operation: 'submit', version: 1, fields: { ...minimal, designLogo: true }, photoIds: [] });
  assert.deepEqual([update.value.version, update.value.update, update.value.logo], [2, true, null]);
  assert.ok(f.m.deletedFiles.includes(logo.storageId) && f.m.deletedFiles.includes(photo.storageId), 'files left out of the update are deleted');

  assert.equal((await f.run({ operation: 'emailed', version: 1, emailId: 'x' })).reason, 'invalid_state');
  assert.equal((await f.run({ operation: 'emailed', version: 2, emailId: 'email_1' })).ok, true);
  assert.equal(f.m.table('websiteBriefs')[0].emailId, 'email_1');
});

test('the orphan photo sweep keeps brief files', async () => {
  const f = await fixture();
  const logo = await f.upload('logo');
  const orphan = f.m.putFile({ contentType: 'image/png' });
  const { sweepOrphanPhotos } = await import('../convex/hasib/photosState.js');
  f.m.advance(25 * 3600000); // inside the sweep's day-old window
  await sweepOrphanPhotos(f.m.ctx, f.m.now());
  assert.ok(f.m.deletedFiles.includes(orphan), 'control: an unregistered upload is swept');
  assert.equal(f.m.deletedFiles.includes(logo.storageId), false);
});

// ── Email ───────────────────────────────────────────────────────────────────

const brief = (over = {}) => ({ version: 1, update: false, account: { email: 'owner@example.com', name: 'Sara' },
  fields: { ...minimal, about: '<script>alert(1)</script>', colors: ['#1f4f7a'], references: ['https://example.com/?a=1&b="2"'], designLogo: true },
  logo: { id: 'l', url: 'https://files.test/l', contentType: 'image/png' }, photos: [{ id: 'p', url: 'https://files.test/p', contentType: 'image/jpeg' }], ...over });

test('the email goes only to Ahmed, escapes everything the owner typed, and attaches the files', () => {
  const email = briefEmail(brief());
  assert.deepEqual(email.to, [BRIEF_RECIPIENT]);
  assert.equal(BRIEF_RECIPIENT, 'ahmed@bznsflowai.com');
  assert.equal(email.reply_to, 'owner@example.com');
  assert.equal(email.subject, 'Website brief — Nour Abayas');
  assert.equal(email.html.includes('<script>'), false);
  assert.ok(email.html.includes('&lt;script&gt;'));
  assert.ok(email.html.includes('href="https://example.com/?a=1&amp;b=&quot;2&quot;"'));
  assert.deepEqual(email.attachments, [{ filename: 'logo.png', path: 'https://files.test/l' }, { filename: 'photo-1.jpg', path: 'https://files.test/p' }]);
  assert.ok(email.text.includes('Needs a simple logo designed: Yes'));
  assert.equal(briefEmail(brief({ update: true, version: 2 })).subject, 'Updated website brief — Nour Abayas');
});

// ── API ─────────────────────────────────────────────────────────────────────

const env = { PUBLIC_SITE_ORIGIN: GREEN_ORIGIN, VERCEL_ENV: 'production', RESEND_API_KEY: 're_test', AUTH_FROM: 'BznsFlow <hello@bznsflowai.com>' };
const request = (method, body) => ({ method, body, url: '/api/layla-meta?surface=website-brief', headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, cookie: `bf_session=${token}; bf_csrf=${csrf}`, 'x-csrf-token': csrf } });
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(n) { this.statusCode = n; }, end(v) { this.body = JSON.parse(v); } });

function harness({ resendOk = true } = {}) {
  const calls = [], sent = [];
  const store = async (op, args) => {
    calls.push({ op, args });
    if (op === 'submit') return { ...brief(), version: 3 };
    if (op === 'get') return { ...brief(), version: 3, emailedAt: null };
    return { ok: true };
  };
  const fetcher = async (url, init) => {
    sent.push({ url, init, body: JSON.parse(init.body) });
    return resendOk ? new Response(JSON.stringify({ id: 'email_9' }), { status: 200 }) : new Response('{}', { status: 500 });
  };
  return { calls, sent, handler: createWebsiteBriefApi({ env, fetcher, store }) };
}

test('the API needs the session, a same-site origin and the CSRF token before any write', async () => {
  for (const edit of [r => { r.headers.cookie = `bf_csrf=${csrf}`; }, r => { r.headers.origin = 'https://evil.example'; }, r => { delete r.headers['x-csrf-token']; }]) {
    const h = harness(); const req = request('POST', { action: 'upload_url' }); edit(req); const res = response();
    await h.handler(req, res);
    assert.ok([401, 403].includes(res.statusCode));
    assert.equal(h.calls.length, 0);
  }
  const h = harness(), res = response();
  await h.handler(request('POST', { action: 'submit', version: 0, fields: minimal, photoIds: ['../../etc'] }), res);
  assert.equal(res.statusCode, 400);
});

test('submitting saves, then emails Ahmed once per version with the idempotency key', async () => {
  const h = harness(), res = response();
  await h.handler(request('POST', { action: 'submit', version: 2, fields: minimal, logoId: 'kg2abc12345', photoIds: [] }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(h.calls.map(c => c.op), ['submit', 'emailed']);
  assert.deepEqual(h.calls[1].args, { sessionHash, version: 3, emailId: 'email_9' });
  const [{ url, init, body }] = h.sent;
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(init.headers['Idempotency-Key'], 'website-brief/owner@example.com/3');
  assert.deepEqual(body.to, ['ahmed@bznsflowai.com']);
  assert.equal(body.from, env.AUTH_FROM);
});

test('a failed email keeps the brief, says so, and can be resent with the same key', async () => {
  const h = harness({ resendOk: false }), res = response();
  await h.handler(request('POST', { action: 'submit', version: 2, fields: minimal, photoIds: [] }), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.reason, 'brief_email_failed');
  assert.deepEqual(h.calls.map(c => c.op), ['submit']);

  const retry = harness(), again = response();
  await retry.handler(request('POST', { action: 'resend' }), again);
  assert.equal(again.statusCode, 200);
  assert.equal(retry.sent[0].init.headers['Idempotency-Key'], 'website-brief/owner@example.com/3');
  assert.deepEqual(retry.calls.map(c => c.op), ['get', 'emailed']);
});

test('backend refusals reach the owner with the right status', async () => {
  for (const [reason, status] of [['access_required', 403], ['manager_required', 403], ['brief_required', 400], ['brief_conflict', 409], ['sign_in_required', 401]]) {
    const handler = createWebsiteBriefApi({ env, fetcher: async () => assert.fail('no email'), store: async () => { throw new PilotError(reason, status); } });
    const res = response();
    await handler(request('GET'), res);
    assert.deepEqual([res.statusCode, res.body.reason], [status, reason]);
  }
});
