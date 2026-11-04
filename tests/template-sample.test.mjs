import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchTemplateSample, storeTemplateSample } from '../api/_lib/layla/templates.js';

const c = { version: 'v25.0', secret: 'test-secret' };
const SAMPLE = 'https://scontent.whatsapp.net/v/t61/sample.jpg?oe=1';
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const json = value => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
const template = (header, name = 'clinics_1') => ({ id: '222', name, components: [header, { type: 'BODY', text: 'Hi {{1}}' }] });

function fakeMeta({ header, file = () => new Response(png, { status: 200, headers: { 'content-type': 'image/png' } }) }) {
  const calls = [];
  const fetcher = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('https://graph.facebook.com/')) return json(template(header));
    return file(new URL(url));
  };
  return { fetcher, calls };
}
const reason = promise => promise.then(() => 'resolved', e => e.reason || e.message);

test('the approved sample of an image header is read fresh from Meta and downloaded', async () => {
  const { fetcher, calls } = fakeMeta({ header: { type: 'HEADER', format: 'IMAGE', example: { header_handle: [SAMPLE] } } });
  const sample = await fetchTemplateSample({ c, templateId: '222', token: 't', fetcher });
  assert.deepEqual([sample.format, sample.contentType, sample.filename, [...sample.bytes]], ['IMAGE', 'image/png', 'clinics_1', [...png]]);
  assert.match(calls[0].url, /\/v25\.0\/222\?fields=name,components$/);
  assert.equal(calls[1].url, SAMPLE);
});

test('a text header has no sample, and a PDF sample is named after the template', async () => {
  assert.equal(await fetchTemplateSample({ c, templateId: '222', token: 't', fetcher: fakeMeta({ header: { type: 'HEADER', format: 'TEXT', text: 'Hello' } }).fetcher }), null);
  const pdf = fakeMeta({ header: { type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [SAMPLE] } }, file: () => new Response(png, { headers: { 'content-type': 'application/pdf' } }) });
  assert.equal((await fetchTemplateSample({ c, templateId: '222', token: 't', fetcher: pdf.fetcher })).filename, 'clinics_1.pdf');
});

test('a sample is fetched only from Meta hosts, of the header type and within its size', async () => {
  const header = url => ({ type: 'HEADER', format: 'IMAGE', example: { header_handle: [url] } });
  const sample = (opts) => reason(fetchTemplateSample({ c, templateId: '222', token: 't', fetcher: fakeMeta(opts).fetcher }));
  assert.equal(await sample({ header: header('https://evil.test/a.jpg') }), 'header_media_sample_unavailable');
  assert.equal(await sample({ header: header('http://scontent.whatsapp.net/a.jpg') }), 'header_media_sample_unavailable');
  assert.equal(await sample({ header: { type: 'HEADER', format: 'IMAGE' } }), 'header_media_sample_unavailable', 'no sample handle');
  assert.equal(await sample({ header: header(SAMPLE), file: () => new Response('x', { headers: { 'content-type': 'text/html' } }) }), 'header_media_sample_unavailable');
  assert.equal(await sample({ header: header(SAMPLE), file: () => new Response(new Uint8Array(6 * 1024 * 1024), { headers: { 'content-type': 'image/jpeg' } }) }), 'header_media_sample_unavailable');
  assert.equal(await sample({ header: header(SAMPLE), file: () => new Response(null, { status: 302, headers: { location: 'https://evil.test/a.jpg' } }) }), 'header_media_sample_unavailable', 'a redirect off Meta is refused');
  const hop = await fetchTemplateSample({ c, templateId: '222', token: 't', fetcher: fakeMeta({ header: header(SAMPLE),
    file: url => url.hostname === 'scontent.whatsapp.net' ? new Response(null, { status: 302, headers: { location: 'https://lookaside.fbsbx.com/s.png' } }) : new Response(png, { headers: { 'content-type': 'image/png' } }) }).fetcher });
  assert.equal(hop.bytes.length, png.length, 'a redirect between Meta hosts is followed');
});

test('a sample is stored and registered exactly like an owner upload', async () => {
  const sample = { format: 'IMAGE', contentType: 'image/png', bytes: png, filename: 'clinics_1' };
  const calls = [];
  const store = async (operation, args) => {
    calls.push([operation, args]);
    return operation === 'campaign_media_upload_url' ? { url: 'https://upload.test/u' } : { media: { id: 'media9' } };
  };
  const posted = [];
  const fetcher = async (url, init) => { posted.push([String(url), init.method, init.headers['Content-Type'], init.body]); return json({ storageId: 'kg2sample' }); };
  assert.equal(await storeTemplateSample({ sample, store, sessionHash: 's', actorAccountId: 'acc', fetcher }), 'media9');
  assert.deepEqual(posted, [['https://upload.test/u', 'POST', 'image/png', png]]);
  assert.deepEqual(calls[1], ['campaign_media_register', { sessionHash: 's', actorAccountId: 'acc', storageId: 'kg2sample', format: 'IMAGE', filename: 'clinics_1' }]);
  const failed = async () => new Response('no', { status: 500 });
  assert.equal(await reason(storeTemplateSample({ sample, store, sessionHash: 's', actorAccountId: 'acc', fetcher: failed })), 'header_media_sample_unavailable');
});
