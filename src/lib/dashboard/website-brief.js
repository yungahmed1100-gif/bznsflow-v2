// Browser client for the Ascend website brief (api/_lib/website-brief-api.js).
// Files go straight to Convex storage; the server checks their bytes before they count.
import { ApiError, callApi } from '../api-client.js';
import { PHOTO_MAX_BYTES, PHOTO_TYPES, preparePhoto, uploadPhoto } from '../hasib/photo.js';

const URL = '/api/layla-meta?surface=website-brief';

/** @returns {Promise<{ brief: object, csrfToken: string }>} */
export const loadBrief = () => callApi(URL, { fallback: 'brief_unavailable' });

export const briefAction = (csrf, action, body = {}) => callApi(URL, { body: { action, ...body }, csrf, fallback: 'brief_unavailable', timeout: 45000 });

/**
 * Upload one logo or photo and register it. The logo is sent as it is, so a transparent PNG stays
 * transparent; photos are shrunk like product photos.
 * @returns {Promise<string>} the file id to submit
 */
export async function uploadBriefFile(csrf, kind, file) {
  if (!file || !PHOTO_TYPES.includes(file.type)) throw new ApiError('photo_type', 0);
  const prepared = kind === 'photo' ? await preparePhoto(file) : file;
  if (prepared.size > PHOTO_MAX_BYTES) throw new ApiError('photo_size', 0);
  const { url } = await briefAction(csrf, 'upload_url');
  let storageId;
  try { storageId = await uploadPhoto(url, prepared); } catch { throw new ApiError('photo_upload_failed', 0); }
  const { fileId } = await briefAction(csrf, 'file_register', { storageId, kind });
  return fileId;
}
