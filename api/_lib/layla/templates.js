// Graph API reads for Broadcast: approved templates and the portfolio messaging
// limit. Templates are managed in WhatsApp Manager.
import { metaRequest } from './customer-meta.js';
import { PilotError } from './config.js';
import { MEDIA_HEADERS, messagingAllowance, sanitizeTemplate } from '../../../config/layla-templates.js';

const FIELDS = 'id,name,language,status,category,parameter_format,components';
const PAGE_LIMIT = 25, MAX_PAGES = 10;

// Every approved template is listed so the owner sees what WhatsApp Manager holds.
// Only MARKETING ones are sendable: sanitizeTemplate marks the rest not_marketing,
// and campaign creation and the send worker re-check the category.
export async function fetchApprovedTemplates({ c, integration, token, fetcher }) {
  const templates = [];
  let after = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ fields: FIELDS, status: 'APPROVED', limit: String(PAGE_LIMIT), ...(after ? { after } : {}) });
    const result = await metaRequest(c, `${integration.waba}/message_templates?${query}`, token, fetcher);
    if (!Array.isArray(result.data)) throw new PilotError('meta_connection_unavailable', 502);
    for (const raw of result.data) {
      if (String(raw?.status).toUpperCase() !== 'APPROVED') continue;
      const t = sanitizeTemplate(raw);
      if (/^\d{1,30}$/.test(t.templateId) && /^[a-z0-9_]{1,512}$/.test(t.name) && /^[a-zA-Z_]{2,15}$/.test(t.language)) templates.push(t);
    }
    const next = result.paging?.cursors?.after;
    if (!result.paging?.next || typeof next !== 'string' || next.length > 500) break;
    after = next;
  }
  return templates;
}

/** Portfolio limit on unique users per 24 hours outside a service window. Unknown → 0. */
export async function fetchMessagingAllowance({ c, integration, token, fetcher }) {
  const result = await metaRequest(c, `${integration.phone}?fields=whatsapp_business_manager_messaging_limit`, token, fetcher);
  return messagingAllowance(result.whatsapp_business_manager_messaging_limit);
}

export async function fetchTemplateState({ c, templateId, token, fetcher }) {
  if (!/^\d{1,30}$/.test(templateId || '')) throw new PilotError('template_not_sendable', 409);
  const result = await metaRequest(c, `${templateId}?fields=status,category`, token, fetcher);
  return { status: String(result.status || '').toUpperCase(), category: String(result.category || '').toUpperCase() };
}

// WhatsApp Manager serves a template's approved sample from Meta's own file hosts.
const SAMPLE_HOSTS = ['.whatsapp.net', '.fbcdn.net', '.fbsbx.com'];
const sampleHost = url => url.protocol === 'https:' && SAMPLE_HOSTS.some(h => url.hostname.endsWith(h));
const SAMPLE_REDIRECTS = 3;

/** The approved sample of a template's image, video or PDF header, read fresh from Meta; null when the header is text or absent. */
export async function fetchTemplateSample({ c, templateId, token, fetcher }) {
  if (!/^\d{1,30}$/.test(templateId || '')) throw new PilotError('template_not_sendable', 409);
  const result = await metaRequest(c, `${templateId}?fields=name,components`, token, fetcher);
  const header = (Array.isArray(result.components) ? result.components : []).find(x => String(x?.type).toUpperCase() === 'HEADER');
  const format = String(header?.format || '').toUpperCase();
  const rule = MEDIA_HEADERS[format];
  if (!rule) return null;
  let url;
  try { url = new URL(header?.example?.header_handle?.[0]); } catch { throw new PilotError('header_media_sample_unavailable', 409); }
  for (let hop = 0; hop <= SAMPLE_REDIRECTS; hop++) {
    if (!sampleHost(url)) throw new PilotError('header_media_sample_unavailable', 409);
    let response;
    try { response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) }); } catch { throw new PilotError('header_media_sample_unavailable', 502); }
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) { url = new URL(response.headers.get('location'), url); continue; }
    const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!response.ok || !rule.types.includes(contentType) || Number(response.headers.get('content-length')) > rule.maxBytes) throw new PilotError('header_media_sample_unavailable', 409);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > rule.maxBytes) throw new PilotError('header_media_sample_unavailable', 409);
    const name = String(result.name || 'template').replace(/[^a-z0-9_]/g, '').slice(0, 60) || 'template';
    return { format, contentType, bytes, filename: format === 'DOCUMENT' ? `${name}.pdf` : name };
  }
  throw new PilotError('header_media_sample_unavailable', 409);
}

/** Stores a template sample as this account's header file, exactly as a browser upload would; returns its media id. */
export async function storeTemplateSample({ sample, store, sessionHash, actorAccountId, fetcher }) {
  const { url } = await store('campaign_media_upload_url', { sessionHash, actorAccountId });
  let storageId;
  try {
    const response = await fetcher(url, { method: 'POST', headers: { 'Content-Type': sample.contentType }, body: sample.bytes, signal: AbortSignal.timeout(30000) });
    storageId = response.ok ? (await response.json().catch(() => null))?.storageId : null;
  } catch { storageId = null; }
  if (typeof storageId !== 'string' || !storageId) throw new PilotError('header_media_sample_unavailable', 502);
  const { media } = await store('campaign_media_register', { sessionHash, actorAccountId, storageId, format: sample.format, filename: sample.filename });
  return media.id;
}
