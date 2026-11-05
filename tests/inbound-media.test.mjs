// Customer photos, voice notes, videos and files: kept from the webhook, fetched only from Meta, read once,
// checked again in Convex, and removed with the message's text. Synthetic Meta, storage and Qwen only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchMetaFile, instagramMedia, processMediaJob, storedMedia, whatsappMedia } from '../api/_lib/layla/inbound-media.js';
import { ingestBlueEnvelope } from '../api/_lib/layla/blue-messaging.js';
import { ASR_MAX_BYTES, describePhoto, mediaLine, photoText, transcribeVoice, understandingConfig } from '../config/media-understanding.js';
import { attachedMedia, expireInboundMedia } from '../convex/blueInboundMedia.js';
import { sweepOrphanPhotos } from '../convex/hasib/photosState.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { business, env } from './helpers/layla-conversation.mjs';

const reason = promise => promise.then(() => 'resolved', e => e.reason || e.message);
const file = (type, size = 900) => () => new Response(new Uint8Array(size), { headers: { 'content-type': type } });

test('WhatsApp and Instagram media are recognised; Convex never receives the id or the link', () => {
  assert.deepEqual(whatsappMedia({ type: 'audio', audio: { id: '1234', mime_type: 'audio/ogg; codecs=opus', voice: true } }), { kind: 'audio', ref: '1234', mimeType: 'audio/ogg', voice: true, caption: '' });
  assert.deepEqual(whatsappMedia({ type: 'image', image: { id: '55', mime_type: 'image/jpeg', caption: 'هذا؟' } }), { kind: 'image', ref: '55', mimeType: 'image/jpeg', caption: 'هذا؟' });
  assert.equal(whatsappMedia({ type: 'document', document: { id: '7', mime_type: 'application/pdf', filename: 'quote/../a.pdf' } }).filename, 'quote .. a.pdf');
  assert.equal(whatsappMedia({ type: 'sticker', sticker: { id: '8', mime_type: 'image/webp' } }).kind, 'sticker');
  assert.equal(whatsappMedia({ type: 'image', image: { id: 'bad id!' } }), null);
  assert.equal(whatsappMedia({ type: 'location', location: {} }), null);
  assert.deepEqual(storedMedia(whatsappMedia({ type: 'audio', audio: { id: '1', mime_type: 'audio/ogg', voice: true } })), { kind: 'audio', mimeType: 'audio/ogg', voice: true });
  assert.equal(instagramMedia({ type: 'audio', payload: { url: 'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=1' } }).voice, true);
  assert.equal(instagramMedia({ type: 'file', payload: { url: 'https://scontent.fbcdn.net/f.pdf' } }).kind, 'document');
  assert.equal(instagramMedia({ type: 'image', payload: { url: 'https://evil.test/p.jpg' } }), null, 'only Meta hosts');
  assert.equal(instagramMedia({ type: 'share', payload: { url: 'https://scontent.fbcdn.net/x' } }), null, 'shares stay with the team');
});

test('the webhook keeps media for later, skips reactions and still flags what nobody can read', async () => {
  const calls = [];
  const binding = { integrationId: 'int1', app: '1388038082832745', waba: '111', phone: '222', sender: '96890000000', profileVersion: 1 };
  const message = (id, part) => ({ id, from: '96891234567', timestamp: '1800000000', ...part });
  const { media } = await ingestBlueEnvelope({ entry: [{ id: '111', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '222' }, messages: [
    message('wamid.1', { type: 'audio', audio: { id: '901', mime_type: 'audio/ogg', voice: true } }),
    message('wamid.2', { type: 'reaction', reaction: { message_id: 'wamid.0', emoji: '👍' } }),
    message('wamid.3', { type: 'location', location: { latitude: 23.6, longitude: 58.5 } }),
  ] } }] }] }, { store: async (op, args) => { calls.push({ op, args }); return op === 'binding' ? binding : null; }, now: () => 1800000000000 });
  const events = calls.find(c => c.op === 'ingest').args.events;
  assert.deepEqual(events.map(e => e.id), ['wamid.1', 'wamid.3'], 'a 👍 reaction is not a message to answer');
  assert.deepEqual([events[0].media, events[0].text], [{ kind: 'audio', mimeType: 'audio/ogg', voice: true }, '']);
  assert.ok(!JSON.stringify(events).includes('901'), 'the media id never reaches Convex');
  assert.deepEqual([events[1].media, events[1].text], [true, '[The customer sent a location, contact card or message type you cannot read]']);
  assert.deepEqual(media, [{ integrationId: 'int1', messageId: 'wamid.1', channel: 'whatsapp', kind: 'audio', ref: '901', mimeType: 'audio/ogg', voice: true, caption: '' }]);
});

test('files come only from Meta hosts, over HTTPS, of the right type and size', async () => {
  const get = (href, kind, fetcher, declaredType) => reason(fetchMetaFile(href, { kind, fetcher, declaredType }));
  assert.equal(await get('https://evil.test/a.ogg', 'audio', file('audio/ogg')), 'media_host_refused');
  assert.equal(await get('http://lookaside.fbsbx.com/a', 'audio', file('audio/ogg')), 'media_host_refused');
  assert.equal(await get('https://lookaside.fbsbx.com/a', 'audio', () => new Response(null, { status: 302, headers: { location: 'https://evil.test/a' } })), 'media_host_refused', 'a redirect off Meta');
  assert.equal(await get('https://lookaside.fbsbx.com/a', 'image', file('text/html')), 'media_type_refused');
  assert.equal(await get('https://lookaside.fbsbx.com/a', 'image', file('image/jpeg', 6 * 1024 * 1024)), 'media_too_large');
  assert.equal(await get('https://lookaside.fbsbx.com/a', 'audio', () => new Response('gone', { status: 404 })), 'media_unavailable', 'an expired link');
  // Meta's generic label defers to the type WhatsApp declared for the message, and Meta-to-Meta hops are followed.
  const typed = await fetchMetaFile('https://lookaside.fbsbx.com/a', { kind: 'audio', declaredType: 'audio/ogg', fetcher: file('application/octet-stream') });
  assert.equal(typed.contentType, 'audio/ogg');
  const hop = await fetchMetaFile('https://lookaside.fbsbx.com/a', { kind: 'image', fetcher: url => (new URL(url).hostname === 'lookaside.fbsbx.com' ? new Response(null, { status: 302, headers: { location: 'https://scontent.whatsapp.net/i.jpg' } }) : file('image/jpeg')()) });
  assert.equal(hop.bytes.length, 900);
});

test('a job that cannot be fetched or stored still reports back, so Layla is never left waiting', async () => {
  const job = { integrationId: 'int1', messageId: 'wamid.9', channel: 'instagram', kind: 'image', ref: 'https://scontent.fbcdn.net/p.jpg' };
  const run = async (context, fetcher) => {
    const calls = [];
    await processMediaJob(job, { env, fetcher, store: async (op, args) => { calls.push([op, args]); return op === 'media_context' ? context : op === 'media_upload_url' ? { url: 'https://upload.test/1' } : null; } });
    return calls.at(-1);
  };
  assert.deepEqual(await run(null, file('image/jpeg')), ['media_attach', { integrationId: 'int1', attach: { messageId: 'wamid.9', status: 'failed', error: 'not_connected' } }]);
  assert.deepEqual((await run({}, file('image/jpeg', 6 * 1024 * 1024)))[1].attach, { messageId: 'wamid.9', status: 'too_large', error: 'media_too_large' });
  assert.deepEqual((await run({}, url => (new URL(url).hostname === 'upload.test' ? new Response('no', { status: 500 }) : file('image/jpeg')())))[1].attach.status, 'failed');
  // Without Qwen settings the photo is still kept and shown; it is just not read.
  const kept = (await run({}, url => (new URL(url).hostname === 'upload.test' ? new Response(JSON.stringify({ storageId: 'kg1' })) : file('image/jpeg')())))[1].attach;
  assert.deepEqual(kept, { messageId: 'wamid.9', storageId: 'kg1', mimeType: 'image/jpeg', size: 900, status: 'unread', error: 'ai_not_configured' });
});

test('photo reading keeps only exact catalog names and a known kind; a voice note has model limits', async () => {
  const qwen = content => async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }));
  const config = understandingConfig({ QWEN_API_KEY: 'k', QWEN_BASE_URL: 'https://qwen.test', LAYLA_VISION_MODEL: 'qwen-vl-max' }, 'vision');
  assert.equal(config.model, 'qwen-vl-max', 'models are overridable');
  assert.equal(understandingConfig({ QWEN_API_KEY: 'k', QWEN_BASE_URL: 'https://qwen.test' }, 'asr').model, 'qwen3-asr-flash');
  const photo = await describePhoto({ config, bytes: new Uint8Array(4), mimeType: 'image/png', catalog: ['iPhone 15', 'Galaxy S24'], fetcher: qwen(JSON.stringify({ summary: 'A phone box.', text_in_image: 'iPhone 15 128GB', kind: 'gadget', catalog_match: 'iPhone 15' })) });
  assert.deepEqual(photo, { summary: 'A phone box.', textInImage: 'iPhone 15 128GB', kind: 'other', catalogMatch: 'iPhone 15' });
  assert.equal(photoText(photo), 'A phone box. Text in the photo: "iPhone 15 128GB" Looks like: iPhone 15');
  assert.equal((await describePhoto({ config, bytes: new Uint8Array(4), mimeType: 'image/png', catalog: ['iPhone 15'], fetcher: qwen(JSON.stringify({ summary: 'x', catalog_match: 'iPhone 16' })) })).catalogMatch, '', 'never a guessed name');
  assert.equal(await reason(describePhoto({ config, bytes: new Uint8Array(4), mimeType: 'image/png', fetcher: qwen('not json') })), 'ai_bad_response');
  assert.equal(await reason(transcribeVoice({ config, bytes: new Uint8Array(ASR_MAX_BYTES + 1), mimeType: 'audio/ogg', fetcher: qwen('x') })), 'media_too_long');
});

test('Layla reads each kind of media as what it is, and asks when she could not read it', () => {
  assert.equal(mediaLine({ kind: 'audio', voice: true, status: 'ready' }, 'عندكم موعد اليوم؟'), '[voice note] عندكم موعد اليوم؟');
  assert.equal(mediaLine({ kind: 'image', status: 'ready' }, 'A villa.'), '[photo: A villa.]');
  assert.equal(mediaLine({ kind: 'image', status: 'unread' }, ''), '[photo that could not be read]');
  assert.equal(mediaLine({ kind: 'audio', voice: true, status: 'pending' }, ''), '[voice note that could not be read]');
  assert.equal(mediaLine({ kind: 'document', status: 'ready', filename: 'quote.pdf' }, ''), '[file "quote.pdf": you cannot open files]');
  assert.equal(mediaLine({ kind: 'video', status: 'ready' }, ''), '[video: you cannot watch videos]');
});

test('Convex keeps only a fresh, fitting file for a waiting message, and deletes anything else', async () => {
  const m = convexMemory();
  const now = m.now();
  const original = { _id: 'm1', direction: 'in', media: { kind: 'audio', voice: true, status: 'pending' }, textExpiresAt: now + 1000 };
  const good = m.putFile({ contentType: 'audio/ogg', size: 900 });
  assert.deepEqual(await attachedMedia(m.ctx, original, { storageId: good, status: 'ready', text: ' hello ' }, now),
    { media: { kind: 'audio', voice: true, storageId: good, status: 'ready', mimeType: 'audio/ogg', size: 900 }, mediaText: 'hello' });
  const wrongType = m.putFile({ contentType: 'text/html', size: 10 });
  assert.equal((await attachedMedia(m.ctx, original, { storageId: wrongType, status: 'ready' }, now)).media.status, 'failed');
  assert.ok(m.deletedFiles.includes(wrongType), 'a file of the wrong type is deleted');
  const old = m.putFile({ contentType: 'audio/ogg', size: 900 });
  m.advance(31 * 60000);
  assert.equal((await attachedMedia(m.ctx, original, { storageId: old, status: 'ready' }, m.now())).media.status, 'failed', 'an old upload is not this message\'s');
  assert.ok(m.deletedFiles.includes(old));
  const late = m.putFile({ contentType: 'audio/ogg', size: 900 });
  assert.equal((await attachedMedia(m.ctx, { ...original, textExpiresAt: 0 }, { storageId: late, status: 'ready', text: 'hi' }, m.now())).mediaText, undefined, 'no reading once the text is gone');
});

test('media and broadcast header files survive the hourly sweep, and go with the message text', async () => {
  const m = convexMemory();
  const customer = m.putFile({ contentType: 'image/jpeg' }), header = m.putFile({ contentType: 'image/jpeg' }), product = m.putFile({ contentType: 'image/jpeg' }), stray = m.putFile({ contentType: 'image/jpeg' });
  const inbound = await m.db.insert('blueMessages', { key: 'incoming:i:1', direction: 'in', media: { kind: 'image', storageId: customer, status: 'ready' }, mediaText: 'A villa.', textExpiresAt: 0, expiresAt: 1 });
  const outbound = await m.db.insert('blueMessages', { key: 'reply:i:1', direction: 'out', media: { kind: 'image', storageId: product }, textExpiresAt: 0, expiresAt: 1 });
  await m.db.insert('blueCampaignMedia', { storageId: header, format: 'IMAGE', contentType: 'image/jpeg', size: 1, createdAt: 0 });
  m.advance(2 * 3600000);
  await sweepOrphanPhotos(m.ctx, m.now());
  assert.deepEqual([customer, header, product].filter(id => m.deletedFiles.includes(id)), [], 'attached files are kept');
  assert.ok(m.deletedFiles.includes(stray), 'a file nothing holds is still swept');
  const patch = await expireInboundMedia(m.ctx, await m.db.get(inbound));
  assert.deepEqual(patch, { media: { kind: 'image', status: 'expired' }, mediaText: undefined });
  assert.ok(m.deletedFiles.includes(customer), 'the customer\'s photo goes with the text');
  assert.deepEqual(await expireInboundMedia(m.ctx, await m.db.get(outbound)), {});
  assert.ok(!m.deletedFiles.includes(product), 'a product photo Layla sent belongs to the product');
});

test('a late or repeated reading changes nothing and its file is removed', async () => {
  const b = await business();
  const { media } = await b.ingest(b.envelope('96891119999', { type: 'image', image: { id: 'm1', mime_type: 'image/jpeg' } }));
  const id = b.h.m.putFile({ contentType: 'image/jpeg', size: 900 });
  await b.store('media_attach', { integrationId: media[0].integrationId, attach: { messageId: media[0].messageId, storageId: id, status: 'ready', text: 'A villa.' } });
  const again = b.h.m.putFile({ contentType: 'image/jpeg', size: 900 });
  await b.store('media_attach', { integrationId: media[0].integrationId, attach: { messageId: media[0].messageId, storageId: again, status: 'ready', text: 'Something else.' } });
  const row = b.h.m.table('blueMessages').find(m => m.media?.kind === 'image');
  assert.deepEqual([row.media.storageId, row.mediaText], [id, 'A villa.']);
  assert.ok(b.h.m.deletedFiles.includes(again) && !b.h.m.deletedFiles.includes(id));
  // The owner's chat list says what arrived.
  const chats = (await b.h.dashboard('conversations', { sessionHash: b.tenant.sessionHash })).value.items;
  assert.deepEqual(chats.find(c => c.contact.number === '96891119999').lastMessage.media, { kind: 'image' });
});
