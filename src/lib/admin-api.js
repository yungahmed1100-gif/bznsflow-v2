// One loader for the administrator pages: Access (/owner/access), Apex requests
// and Websites. Each used to repeat the session and list requests and read its
// lists unchecked; an answer without `requests` crashed the Apex page.
import { callApi } from './api-client.js';

/**
 * @typedef {'signed_out' | 'denied' | 'failed' | 'ready'} AdminState
 * @typedef {{ state: AdminState, csrf: string, data?: object }} AdminList
 */

/**
 * Loads an administrator list. Every key in `lists` arrives as an array, empty
 * when the answer has none or something else there.
 * @param {string} op the access-admin operation ('apex', 'websites'), '' for access grants
 * @param {string[]} lists the keys that must be arrays
 * @returns {Promise<AdminList>}
 */
export async function loadAdminList(op, lists) {
  let session;
  try {
    session = await callApi('/api/auth-session');
  } catch {
    return { state: 'failed', csrf: '' };
  }
  const csrf = session.csrfToken || '';
  if (!session.account) return { state: 'signed_out', csrf };
  try {
    const body = await callApi(op ? `/api/access-admin?op=${encodeURIComponent(op)}` : '/api/access-admin');
    const data = { ...body };
    for (const key of lists) data[key] = Array.isArray(body[key]) ? body[key] : [];
    return { state: 'ready', csrf, data };
  } catch (e) {
    return { state: e.reason === 'admin_required' ? 'denied' : 'failed', csrf };
  }
}
