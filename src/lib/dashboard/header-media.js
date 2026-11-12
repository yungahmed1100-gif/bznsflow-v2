// The image, video or PDF a broadcast sends as its template's header. The browser
// uploads the file straight to storage, then registers it for this account.
import { dashboard, DashboardError } from './api.js';
import { MEDIA_HEADERS } from '../../../config/layla-templates.js';

/** File-picker `accept` value for a header format. */
export const acceptFor = format => (MEDIA_HEADERS[format]?.types || []).join(',');

/** @returns {Promise<{ id: string, format: string, contentType: string, size: number }>} */
export async function uploadHeaderMedia(format, file) {
  const rule = MEDIA_HEADERS[format];
  if (!rule || !file || !rule.types.includes(file.type)) throw new DashboardError('header_media_type', 0);
  if (file.size > rule.maxBytes) throw new DashboardError('header_media_size', 0);
  const { url } = await dashboard('campaign_media_upload_url');
  let storageId;
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
    storageId = response.ok ? (await response.json().catch(() => null))?.storageId : null;
  } catch {
    storageId = null;
  }
  if (!storageId) throw new DashboardError('header_media_upload_failed', 0);
  const { media } = await dashboard('campaign_media_register', {
    storageId,
    format,
    filename: String(file.name || '').slice(0, 120),
  });
  return media;
}
