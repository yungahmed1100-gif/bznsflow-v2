// A customer's photo, voice note, video or file on their message. Vercel fetches it from Meta, stores it
// and reads it (api/_lib/layla/inbound-media.js); this checks the stored file before the message keeps it,
// and removes it with the message's text. Only inbound files are ever deleted here: an outgoing message's
// media is a Hasib product photo, owned by the product.
import { MEDIA_KINDS, MEDIA_TEXT_MAX, mediaAllowed, mimeOf } from '../config/media-understanding.js';

export const MEDIA_STATUSES = Object.freeze(['ready', 'unread', 'failed', 'too_large']);
// The file must be the one just uploaded for this message, not an older or borrowed one.
const UPLOAD_WINDOW_MS = 30 * 60000;
const without = (object, key) => { const { [key]: _drop, ...rest } = object; return rest; };

/** The message's media and reading once Vercel reports back; a file that fails any check is deleted. */
export async function attachedMedia(ctx, original, attach, now) {
  const base = without(original.media, 'storageId');
  const id = typeof attach.storageId === 'string' ? ctx.db.system.normalizeId('_storage', attach.storageId) : null;
  const meta = id && await ctx.db.system.get(id);
  const reused = id && await ctx.db.query('blueMessages').withIndex('by_media_storage', q => q.eq('media.storageId', id)).first();
  const valid = meta && !reused && meta._creationTime >= now - UPLOAD_WINDOW_MS && meta.size <= MEDIA_KINDS[base.kind].maxBytes && mediaAllowed(base.kind, meta.contentType);
  if (id && meta && !valid && !reused) await ctx.storage.delete(id);
  const status = MEDIA_STATUSES.includes(attach.status) ? attach.status : 'failed';
  if (!valid) return { media: { ...base, status: status === 'too_large' ? 'too_large' : 'failed', ...(attach.error || id ? { error: String(attach.error || 'media_invalid').slice(0, 40) } : {}) } };
  const text = typeof attach.text === 'string' ? attach.text.trim().slice(0, MEDIA_TEXT_MAX) : '';
  return {
    media: { ...base, storageId: id, status: status === 'unread' ? 'unread' : 'ready', mimeType: mimeOf(meta.contentType), size: meta.size, ...(attach.error ? { error: String(attach.error).slice(0, 40) } : {}) },
    ...(text && original.textExpiresAt > now ? { mediaText: text } : {}),
  };
}

/** Deletes an inbound message's file and returns the patch that marks it gone ({} when there is nothing to remove). */
export async function expireInboundMedia(ctx, row) {
  if (row.direction !== 'in' || !row.media) return row.mediaText ? { mediaText: undefined } : {};
  if (row.media.storageId && await ctx.db.system.get(row.media.storageId)) await ctx.storage.delete(row.media.storageId);
  return { media: { ...without(row.media, 'storageId'), status: 'expired' }, mediaText: undefined };
}
