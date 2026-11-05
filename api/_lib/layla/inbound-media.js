// A customer's photo, voice note, video or file: kept in Convex storage so the owner can see and hear it,
// and read once (config/media-understanding.js) so Layla can answer it. Runs after the webhook has
// answered Meta (waitUntil), because WhatsApp's download link lasts five minutes. Only the media id or
// Instagram's file link stays here; Convex keeps the file, its type and what it says.
import { PilotError } from './config.js';
import { credentialContext, metaRequest, openToken } from './customer-meta.js';
import { ASR_MAX_BYTES, MEDIA_KINDS, describePhoto, mediaAllowed, mimeOf, photoText, transcribeVoice, understandingConfig } from '../../../config/media-understanding.js';

const META = { version: 'v25.0' };
const MEDIA_HOSTS = ['.whatsapp.net', '.fbcdn.net', '.fbsbx.com', '.cdninstagram.com'];
const mediaHost = url => url.protocol === 'https:' && MEDIA_HOSTS.some(h => url.hostname.endsWith(h));
const REDIRECTS = 3;
const WHATSAPP_KINDS = ['image', 'audio', 'video', 'document', 'sticker'];
const INSTAGRAM_KINDS = { image: 'image', audio: 'audio', video: 'video', file: 'document' };
const filenameOf = value => String(value || '').replace(/[\x00-\x1f\x7f/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

/** A WhatsApp message's media, or null. The caption is the message text; the id is fetched here, never stored. */
export function whatsappMedia(m) {
  const kind = WHATSAPP_KINDS.includes(m?.type) ? m.type : null;
  const part = kind && m[kind];
  if (!part || !/^[A-Za-z0-9_-]{1,100}$/.test(String(part.id || ''))) return null;
  const filename = kind === 'document' ? filenameOf(part.filename) : '';
  return { kind, ref: String(part.id), mimeType: mimeOf(part.mime_type), ...(filename ? { filename } : {}), ...(kind === 'audio' && part.voice === true ? { voice: true } : {}),
    caption: typeof part.caption === 'string' ? part.caption.slice(0, 1000) : '' };
}

/** An Instagram attachment Layla and the owner can use, or null (shares, story mentions and reels stay with the team). */
export function instagramMedia(attachment) {
  const kind = INSTAGRAM_KINDS[attachment?.type];
  let url;
  try { url = new URL(attachment?.payload?.url); } catch { return null; }
  if (!kind || !mediaHost(url)) return null;
  // Instagram's audio attachments are the voice messages people record in the app.
  return { kind, ref: url.href, mimeType: '', ...(kind === 'audio' ? { voice: true } : {}), caption: '' };
}

/** What Convex keeps on the message at arrival: no id, no link. */
export const storedMedia = ({ kind, mimeType, filename, voice }) => ({ kind, ...(mimeType ? { mimeType } : {}), ...(filename ? { filename } : {}), ...(voice ? { voice } : {}) });

/** A file from Meta's own hosts, following at most three redirects between them, within the kind's type and size. */
export async function fetchMetaFile(href, { kind, declaredType = '', token, fetcher }) {
  const rule = MEDIA_KINDS[kind];
  let url;
  try { url = new URL(href); } catch { throw new PilotError('media_unavailable', 502); }
  for (let hop = 0; hop <= REDIRECTS; hop++) {
    if (!mediaHost(url)) throw new PilotError('media_host_refused', 502);
    let response;
    try { response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: token ? { Authorization: `Bearer ${token}` } : {} }); }
    catch { throw new PilotError('media_unavailable', 502); }
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) { url = new URL(response.headers.get('location'), url); continue; }
    if (!response.ok) throw new PilotError('media_unavailable', 502);
    // Meta's download host may label a file generically; the type WhatsApp declared for the message then decides.
    const served = mimeOf(response.headers.get('content-type'));
    const contentType = mediaAllowed(kind, served) ? served : served === 'application/octet-stream' && mediaAllowed(kind, declaredType) ? mimeOf(declaredType) : '';
    if (!contentType) throw new PilotError('media_type_refused', 415);
    if (Number(response.headers.get('content-length')) > rule.maxBytes) throw new PilotError('media_too_large', 413);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length) throw new PilotError('media_unavailable', 502);
    if (bytes.length > rule.maxBytes) throw new PilotError('media_too_large', 413);
    return { contentType, bytes };
  }
  throw new PilotError('media_host_refused', 502);
}

/** WhatsApp: the media id gives a five-minute link, downloaded with the business's own token. */
async function downloadWhatsapp(job, context, { env, fetcher }) {
  const token = openToken(context.integration.credential, credentialContext(context.sessionHash, context.integration), env);
  const meta = await metaRequest(META, encodeURIComponent(job.ref), token, fetcher);
  if (Number(meta.file_size) > MEDIA_KINDS[job.kind].maxBytes) throw new PilotError('media_too_large', 413);
  return fetchMetaFile(meta.url, { kind: job.kind, declaredType: meta.mime_type || job.mimeType, token, fetcher });
}

async function upload(file, { store, integrationId, fetcher }) {
  const { url } = await store('media_upload_url', { integrationId });
  let storageId;
  try {
    const response = await fetcher(url, { method: 'POST', headers: { 'Content-Type': file.contentType }, body: file.bytes, signal: AbortSignal.timeout(30000) });
    storageId = response.ok ? (await response.json().catch(() => null))?.storageId : null;
  } catch { storageId = null; }
  if (typeof storageId !== 'string' || !storageId) throw new PilotError('media_store_failed', 502);
  return storageId;
}

/** What the file says, or '' when it is not a kind Layla reads. A failed reading leaves the file kept and shown. */
async function understand(job, file, context, { env, fetcher }) {
  const business = context.business || '', vocabulary = context.catalog || [];
  if (job.kind === 'audio') {
    if (file.bytes.length > ASR_MAX_BYTES) return { status: 'unread', error: 'media_too_long' };
    return { status: 'ready', text: await transcribeVoice({ config: understandingConfig(env, 'asr'), bytes: file.bytes, mimeType: file.contentType, vocabulary, business, fetcher }) };
  }
  if (job.kind === 'image' || job.kind === 'sticker') {
    return { status: 'ready', text: photoText(await describePhoto({ config: understandingConfig(env, 'vision'), bytes: file.bytes, mimeType: file.contentType, catalog: vocabulary, business, fetcher })) };
  }
  return { status: 'ready' };
}

const reasonOf = e => String(e?.reason || e?.message || 'media_failed').replace(/[^a-z0-9_]/g, '').slice(0, 40) || 'media_failed';

/** One media message: fetch, keep, read, then hand the result to Convex, which wakes Layla. */
export async function processMediaJob(job, { store, env = process.env, fetcher = fetch }) {
  let attach;
  try {
    const context = await store('media_context', { integrationId: job.integrationId });
    if (!context) attach = { status: 'failed', error: 'not_connected' };
    else {
      const file = job.channel === 'instagram' ? await fetchMetaFile(job.ref, { kind: job.kind, fetcher }) : await downloadWhatsapp(job, context, { env, fetcher });
      const storageId = await upload(file, { store, integrationId: job.integrationId, fetcher });
      let reading;
      try { reading = await understand(job, file, context, { env, fetcher }); }
      catch (e) { reading = { status: 'unread', error: reasonOf(e) }; }
      attach = { storageId, mimeType: file.contentType, size: file.bytes.length, ...reading };
    }
  } catch (e) {
    attach = { status: reasonOf(e) === 'media_too_large' ? 'too_large' : 'failed', error: reasonOf(e) };
  }
  // Codes only: never the file, the transcript or the description.
  if (attach.error) console.warn('inbound_media', JSON.stringify({ kind: job.kind, status: attach.status, error: attach.error }));
  const { text, ...rest } = attach;
  await store('media_attach', { integrationId: job.integrationId, attach: { messageId: job.messageId, ...rest, ...(text ? { text } : {}) } });
}

/** Every media message of one webhook delivery, side by side; one failure never stops the others. */
export async function processInboundMedia(jobs, options) {
  await Promise.allSettled(jobs.slice(0, 20).map(job => processMediaJob(job, options)));
}
