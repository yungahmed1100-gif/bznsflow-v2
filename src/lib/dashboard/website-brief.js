// Browser client for the Ascend website brief (api/_lib/website-brief-api.js).
// Files go straight to Convex storage; the server checks their bytes before they count.
import { ApiError, callApi } from '../api-client.js';
import { PHOTO_MAX_BYTES, PHOTO_TYPES, preparePhoto, uploadPhoto } from '../hasib/photo.js';
import { PAYMENT_DOC_MAX_BYTES, PAYMENT_DOC_TYPES } from '../../../config/website-brief.js';

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

/** Where an owner downloads one of Paymob's blank forms ('application' or 'vat'); signed-in Ascend owners only. */
export const paymobFormUrl = form => `${URL}&form=${form}`;

/**
 * Upload one document Paymob asks for (a PDF, JPG or PNG) as it is, and register it under its slot with the
 * name it had, so Ahmed can tell the files apart. The server checks the bytes before it counts.
 * @returns {Promise<string>} the file id to submit
 */
export async function uploadBriefDocument(csrf, kind, file) {
  if (!file || !PAYMENT_DOC_TYPES.includes(file.type)) throw new ApiError('doc_type', 0);
  if (file.size > PAYMENT_DOC_MAX_BYTES) throw new ApiError('doc_size', 0);
  const { url } = await briefAction(csrf, 'upload_url');
  let storageId;
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
    storageId = response.ok ? (await response.json().catch(() => null))?.storageId : null;
  } catch { storageId = null; }
  if (!storageId) throw new ApiError('photo_upload_failed', 0);
  const { fileId } = await briefAction(csrf, 'file_register', { storageId, kind, name: String(file.name || '').slice(0, 120) });
  return fileId;
}
