// Paymob onboarding in the Ascend website brief (Ahmed, 2026-10-31): optional; a "yes" needs a personal
// contact and the documents Paymob asks for, which reach Ahmed by email; a payments track he moves follows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PAYMENT_DOCS_MAX, normalizeBrief, paymentDocsProblem } from '../config/website-brief.js';
import { executeWebsiteBrief } from '../convex/websiteBriefState.js';
import { executeWebsiteAdmin } from '../convex/websiteProjectsState.js';
import { checkDocumentBytes } from '../convex/hasib/photoBytes.js';
import { PAYMOB_FORMS, createWebsiteBriefApi } from '../api/_lib/website-brief-api.js';
import { briefEmail } from '../api/_lib/website-brief-email.js';
import { PilotError } from '../api/_lib/layla/config.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { GREEN_ORIGIN } from './helpers/green-env.mjs';

const tokens = { owner: 'a'.repeat(64), admin: 'e'.repeat(64), other: 'f'.repeat(64) };
const hash = t => createHash('sha256').update(t).digest('hex');
const base = {
  nameEn: 'Nour Abayas',
  phone: '+968 9000 0000',
  languages: 'both',
  domainChoice: 'nourabayas.com',
  mailboxLocal: 'info',
  designLogo: true,
};
const paying = { ...base, payments: 'yes', payContactName: 'Sara Al Balushi', payContactPhone: '+968 9123 4567' };
const MB = 1024 * 1024;

test('payments are optional; a "yes" needs a personal name and mobile, and a "no" keeps neither', () => {
  assert.equal(normalizeBrief(base).ok, true, 'no answer is fine');
  assert.equal(normalizeBrief({ ...base, payments: 'maybe' }).field, 'payments');
  assert.deepEqual(normalizeBrief({ ...base, payments: 'yes' }), {
    ok: false,
    reason: 'brief_required',
    field: 'payContactName',
  });
  assert.deepEqual(normalizeBrief({ ...base, payments: 'yes', payContactName: 'Sara' }), {
    ok: false,
    reason: 'brief_required',
    field: 'payContactPhone',
  });
  assert.equal(normalizeBrief(paying).value.payContactPhone, '+968 9123 4567');
  const no = normalizeBrief({ ...paying, payments: 'no' }).value;
  assert.deepEqual(
    [no.payments, 'payContactName' in no, 'payContactPhone' in no],
    ['no', false, false],
    'a contact typed before saying no is not kept',
  );
});

test('every document slot has its minimum and maximum; the tax card is the only optional one', () => {
  const docs = kinds => kinds.map(kind => ({ kind }));
  const full = ['doc_cr', 'doc_id', 'doc_bank', 'doc_forms', 'doc_invoice'];
  assert.equal(paymentDocsProblem(docs(full)), '');
  assert.equal(paymentDocsProblem(docs([...full, 'doc_tax'])), '');
  for (const kind of full)
    assert.equal(paymentDocsProblem(docs(full.filter(k => k !== kind))), kind, `${kind} is required`);
  assert.equal(paymentDocsProblem(docs([...full, 'doc_tax', 'doc_tax'])), 'doc_tax', 'one tax card at most');
  assert.equal(paymentDocsProblem(docs([...full, ...Array(10).fill('doc_id')])), 'doc_id', 'ten ID cards at most');
  assert.equal(PAYMENT_DOCS_MAX, 22);
});

test('a document is judged by its bytes: PDF, JPEG or PNG, under the size limit', async () => {
  const stored = new Map();
  const ctx = { storage: { get: async id => stored.get(id) ?? null } };
  const put = (id, bytes) => stored.set(id, new Blob([new Uint8Array(bytes)]));
  put('pdf', [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
  put('jpg', [0xff, 0xd8, 0xff, 0xe0]);
  put('png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  put('exe', [0x4d, 0x5a, 0x90, 0x00]);
  put('webp', [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  for (const id of ['pdf', 'jpg', 'png']) assert.equal(await checkDocumentBytes(ctx, id, 8 * MB), 'ok', id);
  assert.equal(await checkDocumentBytes(ctx, 'exe', 8 * MB), 'bad');
  assert.equal(await checkDocumentBytes(ctx, 'webp', 8 * MB), 'bad', 'documents are PDF, JPG or PNG');
  assert.equal(await checkDocumentBytes(ctx, 'pdf', 4), 'bad', 'over the limit');
  assert.equal(await checkDocumentBytes(ctx, 'gone', 8 * MB), 'missing');
});

// ── Convex ───────────────────────────────────────────────────────────────────

async function fixture() {
  const m = convexMemory(),
    now = m.now();
  const account = async (email, token) => {
    const id = await m.db.insert('accounts', { email, name: 'Sara', role: 'customer', createdAt: now });
    await m.db.insert('sessions', {
      accountId: id,
      tokenHash: hash(token),
      createdAt: now,
      expiresAt: now + 30 * 86400000,
    });
    return id;
  };
  await account('owner@example.com', tokens.owner);
  await account('ahmed@bznsflowai.com', tokens.admin);
  await account('someone@example.com', tokens.other);
  for (const email of ['owner@example.com', 'someone@example.com']) {
    await m.db.insert('blueAccessGrants', {
      email,
      plan: 'ascend',
      status: 'active',
      grantedAt: now,
      grantedBy: 'ahmed@bznsflowai.com',
    });
  }
  const brief = (args, token = tokens.owner) =>
    executeWebsiteBrief(m.ctx, { sessionHash: hash(token), ...args }, m.now());
  const admin = (args, token = tokens.admin) =>
    executeWebsiteAdmin(m.ctx, { sessionHash: hash(token), ...args }, m.now());
  const upload = async (kind, { check = 'ok', size = 200 * 1024, name = `${kind}.pdf`, token } = {}) => {
    const id = m.putFile({ contentType: 'application/pdf', size });
    const result = await brief({ operation: 'file_register', storageId: id, kind, name, fileCheck: check }, token);
    return { id, kind, result };
  };
  /** One file in every required slot. */
  const pack = async () => {
    const docs = [];
    for (const kind of ['doc_cr', 'doc_id', 'doc_id', 'doc_bank', 'doc_forms', 'doc_invoice'])
      docs.push(await upload(kind));
    return docs.map(({ id, kind }) => ({ id, kind }));
  };
  return { m, brief, admin, upload, pack };
}

test('a document is registered under its slot with the name it was uploaded with; a bad file is deleted', async () => {
  const f = await fixture();
  const cr = await f.upload('doc_cr', { name: 'CR\u0007 Nour.pdf' });
  assert.equal(cr.result.ok, true, cr.result.reason);
  const [row] = f.m.table('websiteBriefFiles');
  assert.deepEqual([row.kind, row.name], ['doc_cr', 'CR Nour.pdf'], 'control characters are dropped from the name');
  const bad = await f.upload('doc_bank', { check: 'bad' });
  assert.equal(bad.result.reason, 'invalid_file');
  assert.ok(f.m.deletedFiles.includes(bad.id));
  assert.equal(
    (await f.brief({ operation: 'file_register', storageId: f.m.putFile(), kind: 'doc_passport', fileCheck: 'ok' }))
      .reason,
    'invalid_file',
    'only the known slots',
  );
});

test('saying no sends the website brief without documents, and sweeps any that were uploaded', async () => {
  const f = await fixture();
  const docs = await f.pack();
  const sent = await f.brief({
    operation: 'submit',
    version: 0,
    fields: { ...base, payments: 'no' },
    photoIds: [],
    docIds: docs,
  });
  assert.equal(sent.ok, true, sent.reason);
  assert.deepEqual(
    [sent.value.docs, 'payments' in sent.value.project],
    [[], false],
    'no documents and no payments track',
  );
  for (const d of docs) assert.ok(f.m.deletedFiles.includes(d.id), 'documents left out are deleted, not kept');
  assert.equal(f.m.table('websiteBriefFiles').length, 0);
});

test("saying yes needs every required slot, only this owner's files in the right slot, and under 20 MB in all", async () => {
  const f = await fixture();
  const docs = await f.pack();
  const without = kind => docs.filter(d => d.kind !== kind);
  for (const kind of ['doc_cr', 'doc_id', 'doc_bank', 'doc_forms', 'doc_invoice']) {
    assert.deepEqual(
      await f.brief({ operation: 'submit', version: 0, fields: paying, photoIds: [], docIds: without(kind) }),
      { ok: false, reason: 'brief_required', field: kind },
    );
  }
  const theirs = await f.upload('doc_cr', { token: tokens.other });
  assert.equal(theirs.result.ok, true);
  assert.equal(
    (
      await f.brief({
        operation: 'submit',
        version: 0,
        fields: paying,
        photoIds: [],
        docIds: [...docs, { kind: 'doc_tax', id: theirs.id }],
      })
    ).reason,
    'invalid_file',
    "another owner's file",
  );
  assert.equal(
    (
      await f.brief({
        operation: 'submit',
        version: 0,
        fields: paying,
        photoIds: [],
        docIds: docs.map(d => ({ ...d, kind: d.kind === 'doc_cr' ? 'doc_bank' : d.kind })),
      })
    ).reason,
    'invalid_file',
    'a file counts only in the slot it was uploaded to',
  );
  assert.equal(
    (await f.brief({ operation: 'submit', version: 0, fields: paying, photoIds: [], docIds: [...docs, docs[0]] }))
      .reason,
    'too_many_files',
    'no file twice',
  );
  const huge = await f.upload('doc_tax', { size: 19 * MB });
  assert.equal(
    (
      await f.brief({
        operation: 'submit',
        version: 0,
        fields: paying,
        photoIds: [],
        docIds: [...docs, { kind: 'doc_tax', id: huge.id }],
      })
    ).reason,
    'docs_too_large',
  );
  const sent = await f.brief({ operation: 'submit', version: 0, fields: paying, photoIds: [], docIds: docs });
  assert.equal(sent.ok, true, sent.reason);
  assert.deepEqual(
    sent.value.docs.map(d => [d.kind, d.name, d.contentType]),
    docs.map(d => [d.kind, `${d.kind}.pdf`, 'application/pdf']),
    'the email gets every document, named',
  );
  assert.ok(sent.value.docs.every(d => d.url.startsWith('https://files.test/')));
});

test('a draft keeps the documents, so the owner can leave and come back', async () => {
  const f = await fixture();
  const docs = await f.pack();
  assert.equal(
    (await f.brief({ operation: 'save_draft', step: 5, fields: paying, photoIds: [], docIds: docs })).ok,
    true,
  );
  const { value } = await f.brief({ operation: 'get' });
  assert.deepEqual(
    [value.draft.step, value.fields.payments, value.docs.map(d => d.kind)],
    [5, 'yes', docs.map(d => d.kind)],
  );
  assert.equal(
    (
      await f.brief({
        operation: 'save_draft',
        step: 5,
        fields: paying,
        photoIds: [],
        docIds: Array(PAYMENT_DOCS_MAX + 1).fill(docs[0]),
      })
    ).reason,
    'too_many_files',
  );
});

test('a "yes" starts the payments track once; Ahmed alone moves it, in order, with no due date', async () => {
  const f = await fixture();
  const docs = await f.pack();
  const first = await f.brief({ operation: 'submit', version: 0, fields: paying, photoIds: [], docIds: docs });
  assert.deepEqual(first.value.project.payments, { stage: 'received', stageAt: { received: f.m.now() } });
  const {
    value: {
      open: [row],
    },
  } = await f.admin({ operation: 'projects' });
  assert.deepEqual(
    [row.payContactName, row.payContactPhone, row.docs.length, row.payments.stage],
    ['Sara Al Balushi', '+968 9123 4567', 6, 'received'],
  );

  const move = (args, token) =>
    f.admin({ operation: 'project_update', projectId: row.id, action: 'payments_advance', ...args }, token);
  assert.equal((await move({}, tokens.owner)).reason, 'admin_required', 'not even the owner');
  f.m.advance(86400000);
  for (const stage of ['submitted', 'approved', 'connected'])
    assert.equal((await move({})).value.project.payments.stage, stage);

  // A later brief that says no never undoes a track already under way.
  const again = await f.brief({ operation: 'submit', version: 1, fields: { ...base, payments: 'no' }, photoIds: [] });
  assert.equal(again.value.project.payments.stage, 'connected');

  // The website goes live; the row stays in the queue until payments are live too.
  const site = args => f.admin({ operation: 'project_update', projectId: row.id, ...args });
  for (let i = 0; i < 3; i++) await site({ action: 'advance' });
  assert.equal((await site({ action: 'advance', liveUrl: 'https://nourabayas.com' })).value.project.stage, 'live');
  assert.equal((await f.admin({ operation: 'projects' })).value.open.length, 1, 'still open: payments are not live');
  assert.equal((await move({})).value.project.payments.stage, 'live');
  assert.equal((await move({})).reason, 'invalid_state');
  const queue = (await f.admin({ operation: 'projects' })).value;
  assert.deepEqual([queue.open.length, queue.live.length], [0, 1]);
  const seen = (await f.brief({ operation: 'get' })).value.project.payments;
  assert.deepEqual(
    Object.keys(seen.stageAt),
    ['received', 'submitted', 'approved', 'connected', 'live'],
    'the owner sees every stage with its date',
  );
});

test('a website without payments has no payments track to move', async () => {
  const f = await fixture();
  await f.brief({ operation: 'submit', version: 0, fields: base, photoIds: [] });
  const {
    value: {
      open: [row],
    },
  } = await f.admin({ operation: 'projects' });
  assert.equal('payments' in row, false);
  assert.equal(
    (await f.admin({ operation: 'project_update', projectId: row.id, action: 'payments_advance' })).reason,
    'invalid_state',
  );
});

test('cancelling a payments set-up ends the track and deletes the documents and personal contact; admin only', async () => {
  const f = await fixture();
  const docs = await f.pack();
  const logo = await f.upload('logo');
  await f.brief({ operation: 'submit', version: 0, fields: paying, logoId: logo.id, photoIds: [], docIds: docs });
  const {
    value: {
      open: [row],
    },
  } = await f.admin({ operation: 'projects' });
  const cancel = token => f.admin({ operation: 'project_update', projectId: row.id, action: 'payments_cancel' }, token);
  assert.equal((await cancel(tokens.owner)).reason, 'admin_required');
  const done = await cancel();
  assert.equal(done.ok, true, done.reason);
  assert.equal('payments' in done.value.project, false);
  for (const d of docs) assert.ok(f.m.deletedFiles.includes(d.id), 'every document file is deleted');
  assert.equal(f.m.deletedFiles.includes(logo.id), false, 'the logo stays');
  assert.deepEqual(
    f.m.table('websiteBriefFiles').map(r => r.kind),
    ['logo'],
  );
  const [brief] = f.m.table('websiteBriefs');
  assert.deepEqual(
    [brief.docIds, brief.fields.payments, 'payContactName' in brief.fields, 'payContactPhone' in brief.fields],
    [[], 'no', false, false],
  );
  assert.equal((await cancel()).reason, 'invalid_state', 'nothing left to cancel');
  assert.equal(
    'payments' in (await f.brief({ operation: 'get' })).value.project,
    false,
    "the owner's tracker no longer shows payments",
  );
});

// ── Email ────────────────────────────────────────────────────────────────────

test('the email to Ahmed names the personal contact and attaches every document by what it is', () => {
  const docs = [
    { kind: 'doc_id', url: 'https://files.test/1', contentType: 'image/jpeg' },
    { kind: 'doc_cr', url: 'https://files.test/2', contentType: 'application/pdf' },
    { kind: 'doc_id', url: 'https://files.test/3', contentType: 'image/png' },
  ];
  const email = briefEmail({
    version: 1,
    update: false,
    account: { email: 'owner@example.com', name: 'Sara' },
    fields: paying,
    logo: null,
    photos: [],
    docs,
  });
  assert.equal(email.subject, 'Website brief + Paymob — Nour Abayas');
  assert.deepEqual(
    email.attachments.map(a => [a.filename, a.path]),
    [
      ['paymob-id-card-1.jpg', 'https://files.test/1'],
      ['paymob-commercial-register-1.pdf', 'https://files.test/2'],
      ['paymob-id-card-2.png', 'https://files.test/3'],
    ],
  );
  assert.match(email.text, /Paymob contact \(personal\): Sara Al Balushi/);
  assert.match(email.text, /Personal mobile: \+968 9123 4567/);
  const no = briefEmail({
    version: 1,
    update: false,
    account: { email: 'owner@example.com', name: '' },
    fields: base,
    logo: null,
    photos: [],
    docs,
  });
  assert.equal(no.subject, 'Website brief — Nour Abayas');
  assert.equal('attachments' in no, false, 'no documents without a yes');
});

// ── API ──────────────────────────────────────────────────────────────────────

const env = {
  PUBLIC_SITE_ORIGIN: GREEN_ORIGIN,
  VERCEL_ENV: 'production',
  RESEND_API_KEY: 're_test',
  AUTH_FROM: 'BznsFlow <hello@bznsflowai.com>',
};
const csrf = 'b'.repeat(64);
const request = (
  method,
  body,
  url = '/api/layla-meta?surface=website-brief',
  cookie = `bf_session=${tokens.owner}; bf_csrf=${csrf}`,
) => ({
  method,
  body,
  url,
  headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, cookie, 'x-csrf-token': csrf },
});
const response = () => ({
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v;
  },
  getHeader(k) {
    return this.headers[k];
  },
  status(n) {
    this.statusCode = n;
  },
  end(v) {
    this.raw = v;
    try {
      this.body = JSON.parse(v);
    } catch {
      this.body = null;
    }
  },
});

test("Paymob's forms download only for a signed-in Ascend owner, as PDFs from the bundle", async () => {
  const pdf = Buffer.from('%PDF-1.7 test');
  const read = [];
  const api = store =>
    createWebsiteBriefApi({
      env,
      store,
      form: async file => {
        read.push(file);
        return pdf;
      },
    });
  const ok = response();
  await api(async op => {
    assert.equal(op, 'get');
    return {};
  })(request('GET', undefined, '/api/layla-meta?surface=website-brief&form=application'), ok);
  assert.deepEqual([ok.statusCode, ok.headers['Content-Type'], ok.raw], [200, 'application/pdf', pdf]);
  assert.equal(ok.headers['Content-Disposition'], 'attachment; filename="Paymob-merchant-application.pdf"');
  assert.equal(ok.headers['Cache-Control'], 'private, no-store');
  assert.deepEqual(read, ['merchant-application.pdf']);

  const catalyst = response();
  await api(async () => {
    throw new PilotError('access_required', 403);
  })(request('GET', undefined, '/api/layla-meta?surface=website-brief&form=vat'), catalyst);
  assert.deepEqual([catalyst.statusCode, catalyst.body.reason], [403, 'access_required']);
  const signedOut = response();
  await api(async () => assert.fail('no store call'))(
    request('GET', undefined, '/api/layla-meta?surface=website-brief&form=vat', ''),
    signedOut,
  );
  assert.equal(signedOut.statusCode, 401);
  const unknown = response();
  await api(async () => assert.fail('no store call'))(
    request('GET', undefined, '/api/layla-meta?surface=website-brief&form=../../.env'),
    unknown,
  );
  assert.equal(unknown.statusCode, 404);
  assert.equal(read.length, 1, 'no file read for a refused or unknown form');
  assert.deepEqual(Object.keys(PAYMOB_FORMS), ['application', 'vat']);
});

test('the bundled forms are the PDFs Ahmed shared', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const [file] of Object.values(PAYMOB_FORMS)) {
    const bytes = await readFile(new URL(`../api/_assets/paymob/${file}`, import.meta.url));
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', file);
  }
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(
    vercel.functions['api/layla-meta.js'].includeFiles,
    'api/_assets/paymob/**',
    'bundled with the function that serves them',
  );
});

test('the API passes documents through only with a known slot and a well-formed id', async () => {
  const calls = [];
  const store = async (op, args) => {
    calls.push({ op, args });
    return op === 'submit'
      ? { version: 1, account: { email: 'o@x.com', name: '' }, fields: base, logo: null, photos: [], docs: [] }
      : { fileId: 'x' };
  };
  const handler = createWebsiteBriefApi({
    env,
    store,
    fetcher: async () => new Response(JSON.stringify({ id: 'e1' })),
  });
  const send = async body => {
    const res = response();
    await handler(request('POST', body), res);
    return res;
  };
  assert.equal(
    (await send({ action: 'file_register', storageId: 'kg2abc12345', kind: 'doc_id', name: 'x'.repeat(300) }))
      .statusCode,
    200,
  );
  assert.deepEqual(calls.at(-1).args, {
    sessionHash: hash(tokens.owner),
    storageId: 'kg2abc12345',
    kind: 'doc_id',
    name: 'x'.repeat(120),
  });
  assert.equal(
    (await send({ action: 'file_register', storageId: 'kg2abc12345', kind: 'doc_passport' })).statusCode,
    400,
  );
  assert.equal(
    (
      await send({
        action: 'submit',
        version: 0,
        fields: paying,
        photoIds: [],
        docIds: [{ kind: 'doc_cr', id: '../etc' }],
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await send({
        action: 'submit',
        version: 0,
        fields: paying,
        photoIds: [],
        docIds: [{ kind: 'doc_other', id: 'kg2abc12345' }],
      })
    ).statusCode,
    400,
  );
  const ok = await send({
    action: 'submit',
    version: 0,
    fields: paying,
    photoIds: [],
    docIds: [{ kind: 'doc_cr', id: 'kg2abc12345', extra: 1 }],
  });
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(
    calls.find(c => c.op === 'submit').args.docIds,
    [{ kind: 'doc_cr', id: 'kg2abc12345' }],
    'nothing else rides along',
  );
});
