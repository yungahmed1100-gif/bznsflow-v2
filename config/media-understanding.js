// What a customer's photo or voice note says, as text that Layla, her checks and the owner can read.
// A voice note becomes the customer's own words (qwen3-asr-flash); a photo becomes one factual line,
// the exact text in it and, when it clearly shows one, the catalog item (qwen3-vl-plus). Both go through
// the same Qwen account as Layla's replies. Pure apart from the injected `fetcher`: it never logs the
// bytes, the transcript or the description, and errors carry only a reason code.
import { qwenChat, qwenConfig, QwenError } from './qwen-client.js';

export const ASR_MODEL = 'qwen3-asr-flash';
export const VISION_MODEL = 'qwen3-vl-plus';
const MB = 1024 * 1024;
// Meta's own limits per type, and what the dashboard may play. Office files and PDFs are kept, never read.
export const MEDIA_KINDS = Object.freeze({
  image: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * MB },
  sticker: { types: ['image/webp'], maxBytes: MB },
  audio: {
    types: [
      'audio/ogg',
      'audio/mpeg',
      'audio/mp4',
      'audio/aac',
      'audio/amr',
      'audio/webm',
      'audio/wav',
      'audio/x-wav',
      'audio/x-m4a',
    ],
    maxBytes: 16 * MB,
  },
  video: { types: ['video/mp4', 'video/3gpp', 'video/quicktime', 'video/webm'], maxBytes: 16 * MB },
  document: {
    types: [
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxBytes: 16 * MB,
  },
});
// qwen3-asr-flash takes at most 10 MB and 5 minutes; a longer note is kept for the owner but not transcribed.
export const ASR_MAX_BYTES = 10 * MB;
export const PHOTO_KINDS = Object.freeze(['product', 'screenshot', 'document', 'receipt', 'place', 'person', 'other']);
export const MEDIA_TEXT_MAX = 2000;

/** A MIME type without its parameters ("audio/ogg; codecs=opus" → "audio/ogg"), or ''. */
export const mimeOf = value =>
  String(value || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
/** Whether a file of this kind and type may be kept and shown. */
export const mediaAllowed = (kind, type) => !!MEDIA_KINDS[kind]?.types.includes(mimeOf(type));

/** The Qwen settings for one job ('asr' or 'vision'), or null when Layla's AI is not configured. */
export function understandingConfig(env = {}, job) {
  const base = qwenConfig(env);
  if (!base) return null;
  const model =
    job === 'asr'
      ? String(env.LAYLA_ASR_MODEL || '').trim() || ASR_MODEL
      : String(env.LAYLA_VISION_MODEL || '').trim() || VISION_MODEL;
  return { ...base, model };
}

const dataUri = (type, bytes) => `data:${mimeOf(type)};base64,${Buffer.from(bytes).toString('base64')}`;
const clean = (value, max) =>
  String(value || '')
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/**
 * A voice note in the customer's own words. The business's name and catalog bias recognition toward
 * the words this customer is likely to use.
 * @returns {Promise<string>} the transcript; '' when nothing was said
 */
export async function transcribeVoice({ config, bytes, mimeType, vocabulary = [], business = '', fetcher }) {
  if (bytes.length > ASR_MAX_BYTES) throw new QwenError('media_too_long');
  const context = clean([business, ...vocabulary].filter(Boolean).join(', '), 2000);
  const messages = [
    ...(context ? [{ role: 'system', content: [{ type: 'text', text: context }] }] : []),
    { role: 'user', content: [{ type: 'input_audio', input_audio: { data: dataUri(mimeType, bytes) } }] },
  ];
  const { text } = await qwenChat({ config, messages, fetcher, json: false, timeoutMs: 25000 });
  return clean(text, MEDIA_TEXT_MAX);
}

/**
 * One factual reading of a customer's photo: what it shows, the text in it, and the catalog item it
 * clearly shows (only an exact catalog name, never a guess).
 * @returns {Promise<{ summary: string, textInImage: string, kind: string, catalogMatch: string }>}
 */
export async function describePhoto({ config, bytes, mimeType, catalog = [], business = '', fetcher }) {
  const names = [...new Set(catalog.map(n => clean(n, 80)).filter(Boolean))].slice(0, 150);
  const system = [
    `A customer sent this photo to ${business || 'a business'} on WhatsApp or Instagram. Describe it so the business's assistant can answer them.`,
    'Describe only what is visible. Never guess who a person is, a diagnosis, or a price that is not shown.',
    `Return ONLY a JSON object: {"summary": one factual English sentence, "text_in_image": the visible text copied exactly (at most 300 characters, "" if none), "kind": one of ${JSON.stringify(PHOTO_KINDS)}, "catalog_match": the exact name from CATALOG that the photo clearly shows, or ""}.`,
    `CATALOG: ${names.length ? names.join('; ') : '(none)'}`,
  ].join('\n');
  const messages = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUri(mimeType, bytes) } },
        { type: 'text', text: 'Describe this photo.' },
      ],
    },
  ];
  const { text } = await qwenChat({ config, messages, fetcher, temperature: 0, maxTokens: 300, timeoutMs: 25000 });
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new QwenError('ai_bad_response');
  }
  const match = clean(value?.catalog_match, 80);
  return {
    summary: clean(value?.summary, 300),
    textInImage: clean(value?.text_in_image, 300),
    kind: PHOTO_KINDS.includes(value?.kind) ? value.kind : 'other',
    catalogMatch: names.includes(match) ? match : '',
  };
}

/** The stored reading of a photo: one line the owner and Layla both read. */
export function photoText({ summary, textInImage, catalogMatch }) {
  return clean(
    [summary, textInImage && `Text in the photo: "${textInImage}"`, catalogMatch && `Looks like: ${catalogMatch}`]
      .filter(Boolean)
      .join(' '),
    MEDIA_TEXT_MAX,
  );
}

const LABEL = { image: 'photo', sticker: 'sticker', video: 'video', document: 'file' };
/**
 * How a customer's media message reads in Layla's history: a voice note as their words, a photo as
 * what it shows, anything unread as unread, so she asks rather than guesses.
 */
export function mediaLine(media, mediaText) {
  if (!media?.kind) return '';
  const label = media.kind === 'audio' ? (media.voice ? 'voice note' : 'audio message') : LABEL[media.kind] || 'file';
  if (mediaText && media.kind === 'audio') return `[${label}] ${mediaText}`;
  if (mediaText && (media.kind === 'image' || media.kind === 'sticker')) return `[${label}: ${mediaText}]`;
  if (media.kind === 'document' && media.status !== 'failed')
    return `[${label}${media.filename ? ` "${clean(media.filename, 80)}"` : ''}: you cannot open files]`;
  if (media.kind === 'video' && media.status !== 'failed') return '[video: you cannot watch videos]';
  return `[${label} that could not be read]`;
}
