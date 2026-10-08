// Local synthetic acceptance candidate. All records live in process memory.
// No credentials, provider calls, outbound messages, email, or deployment.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { convexMemory, SECRET } from '../tests/helpers/convex-memory.mjs';
import { seedTenant } from '../tests/helpers/blue-tenant.mjs';
import { executeProductSetup } from '../convex/productSetupState.js';
import { executeKnowledge } from '../convex/knowledgeSourceState.js';
import { executeAccess } from '../convex/blueAccessState.js';
import { executeReview } from '../convex/reviewState.js';
import { executeMessaging } from '../convex/blueMessagingState.js';
import { executeDashboard } from '../convex/blueDashboardState.js';
import { executeHasib } from '../convex/hasib/hasibState.js';
import { hasibArgs } from '../api/_lib/hasib/validate.js';
import { hasibPreviewResponse, dashboardPreviewResponse } from '../api/_lib/hasib/preview.js';
import { livePackSummaries } from '../config/hasib-packs.js';
import { capabilitiesFor } from '../convex/hasib/capabilities.js';
const port = Number(process.argv[2] || 5311), root = resolve('dist');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Choose a port between 1024 and 65535');
const m = convexMemory({ start: Date.now() }), tokenHash = 'e'.repeat(64), csrf = 'd'.repeat(64);
const tenant = await seedTenant(m, { name: 'preview', plan: 'ascend', sector: 'Retail' });
await m.db.patch(tenant.accountId, { email: 'ahmed@bznsflowai.com', name: 'Ahmed · synthetic account' });
await m.db.patch(m.table('blueAccessGrants')[0]._id, { email: 'ahmed@bznsflowai.com' });
await m.db.insert('sessions', { tokenHash, accountId: tenant.accountId, expiresAt: Date.now() + 86400000 });
await m.db.patch(tenant.rowId, { journeyStep: 0, profile: { businessName: 'Synthetic review business', sector: 'Retail', services: 'Abayas and tailoring', prices: 'From 8 OMR', hours: '9–5', location: 'Muscat (sample)', humanContact: '', handoffMode: 'inbox', reviewed: true } });
for (const key of ['global', 'hasib']) await m.db.insert('blueMessagingSettings', { key, enabled: true, rolloutMode: 'live', smokeVerifiedAt: 1, smokeEvidence: 'LOCAL_SYNTHETIC_ONLY' });
const call = (fn, operation, args = {}) => fn(m.ctx, { operation, sessionHash: tenant.sessionHash, actorAccountId: tenant.accountId, hashSecret: SECRET, workerFunction: 'never-dispatched', ...args }, Date.now());
await call(executeHasib, 'settings_update', { packId: 'retail' });
await call(executeMessaging, 'activate');
for (const [i, text] of ['Could a person confirm my order?', 'هل يمكن تعديل موعد الاستلام؟', 'What are your opening hours?'].entries()) {
  await call(executeMessaging, 'ingest', { integrationId: tenant.integration.id, events: [{ kind: 'message', id: `synthetic-${i}`, from: `9689900000${i}`, at: Date.now(), text, reply: 'Synthetic reply — no message is sent.', intent: i < 2 ? 'handoff' : 'hours', handoff: i < 2, profileName: ['Sample customer A', 'عميل تجريبي', 'Sample customer C'][i] }] });
}
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
const reply = (res, r) => json(res, r.ok ? 200 : 409, r.ok ? { ok: true, synthetic: true, ...(r.value || {}), csrfToken: csrf } : { ok: false, reason: r.reason });
async function bodyOf(req) { let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 500000) throw Error('body_too_large'); } return raw ? JSON.parse(raw) : {}; }
const account = { id: tenant.accountId, email: 'ahmed@bznsflowai.com', name: 'Ahmed · local synthetic', accessPlan: 'ascend', workspaceRole: 'manager', profileComplete: true };
async function customer(body) {
  let row = await m.db.get(tenant.rowId);
  if (body.action === 'profile') {
    const result = await executeReview(m.ctx, { operation: 'profile', sessionHash: tenant.sessionHash, profile: { ...body.profile, businessName: body.businessName || body.profile.businessName } });
    if (!result.ok) return result;
  } else if (body.action === 'save_progress') {
    const result = await executeReview(m.ctx, { operation: 'save_progress', sessionHash: tenant.sessionHash, journeyStep: body.journeyStep }); if (!result.ok) return result;
  } else if (body.action === 'preview') {
    const q = String(body.text || '').slice(0, 1000);
    const source = /hour|دوام/i.test(q) ? 'hours' : /price|سعر/i.test(q) ? 'prices' : 'services';
    const result = await executeReview(m.ctx, { operation: 'preview_result', sessionHash: tenant.sessionHash, profileVersion: row.profileVersion, preview: { question: q, text: row.profile[source] || 'A person will help in the inbox.', intent: source, sourceFields: [source] } }); if (!result.ok) return result;
  } else if (body.action === 'catalog_list') return { ok: true, value: { catalog: { entries: [], cursor: null } } };
  else if (body.action === 'import_website') return { ok: false, reason: 'website_import_unavailable' };
  else if (body.action && !['claim_draft', 'refresh'].includes(body.action)) return { ok: false, reason: 'provider_action_disabled_in_preview' };
  row = await m.db.get(tenant.rowId);
  return { ok: true, value: { available: true, account, accountSaveAvailable: true, savedToAccount: true, profile: row.profile, profileVersion: row.profileVersion, journeyStep: row.journeyStep, lastPreview: row.lastPreview || null, previewIntents: row.previewIntents || [], status: row.status, integration: { id: tenant.integration.id, sender: tenant.integration.sender, status: 'connected', path: 'existing_cloud' }, capabilities: { preview: true, connect: false, manageMessaging: true }, connectionChecks: { routing: true, registered: true, path: true }, checkedAt: Date.now() } };
}
const banner = `window.addEventListener('load',()=>{const b=document.createElement('aside');b.setAttribute('aria-label','Local synthetic review');b.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#242422;color:#fff;padding:8px 12px;font:12px sans-serif;text-align:center';b.innerHTML='LOCAL SYNTHETIC PREVIEW · All records are samples, including My business. No sends or production changes. <a href="/review" style="color:#fff;text-decoration:underline">All 10 surfaces / جميع المعاينات</a>';document.body.appendChild(b);document.body.style.paddingBottom='48px'});`;
const pages = [['Ahmed admin', '/owner'], ['Catalyst inbox', '/layla/dashboard?tab=chats&workspace=catalyst'], ['Catalyst setup', '/catalyst/setup'], ...livePackSummaries().map(p => [p.en, `/owner/preview/${p.id}`])];
const review = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>BznsFlow local review candidate</title><style>body{font:16px system-ui;background:#f8f5ed;color:#242422;max-width:850px;margin:40px auto;padding:20px}li{padding:14px;border-bottom:1px solid #bbb}a{color:inherit;margin-inline-end:20px}h1{font-size:28px}</style><h1>BznsFlow — local synthetic review candidate</h1><p>All 10 surfaces are available below in English and Arabic. Every record and account is synthetic, including the screen labelled “My business”. Sector previews are read only. Setup, knowledge publication and inbox handoffs use real state logic on an in-memory database.</p><p>No external APIs, messages, email or production deployments. Restarting this process resets every change. This candidate is for design acceptance; it is not production authentication or provider evidence.</p><ol>${pages.map(([name, path]) => `<li>${name}<br><a href="/en${path}">English</a><a href="${path}" lang="ar">العربية</a></li>`).join('')}</ol></html>`;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
// Serialize mutations because the in-memory adapter does not implement Convex transaction retries.
let queue = Promise.resolve();
async function api(req, res, url) {
  const body = req.method === 'POST' || req.method === 'DELETE' ? await bodyOf(req) : {};
  if (req.method !== 'GET') {
    const origin = req.headers.origin;
    if (!origin || new URL(origin).host !== req.headers.host) return json(res, 403, { ok: false, reason: 'origin' });
    if (req.headers['x-csrf-token'] !== csrf) return json(res, 403, { ok: false, reason: 'csrf' });
  }
  if (url.pathname === '/api/auth-session') return json(res, 200, { ok: true, account, csrfToken: csrf });
  if (url.pathname === '/api/access-admin') return reply(res, await executeAccess(m.ctx, { operation: req.method === 'GET' ? 'list' : req.method === 'DELETE' ? 'revoke' : 'grant', sessionHash: tokenHash, email: body.email, plan: body.plan, packId: body.packId, note: body.note }));
  if (url.pathname === '/api/product-setup') return reply(res, await executeProductSetup(m.ctx, { ...body, operation: req.method === 'GET' ? 'get' : 'save', product: body.product || url.searchParams.get('product'), sessionHash: tokenHash, draftHash: 'f'.repeat(64) }));
  if (url.pathname === '/api/knowledge') return reply(res, await executeKnowledge(m.ctx, { ...body, operation: req.method === 'GET' ? 'list' : body.operation, tokenHash }));
  if (url.pathname !== '/api/layla-meta') return json(res, 409, { ok: false, reason: 'provider_action_disabled_in_preview' });
  const surface = url.searchParams.get('surface'), operation = body.action || 'overview';
  const packId = url.searchParams.get('previewIndustry') || body.previewIndustry;
  if (packId && ['hasib', 'dashboard'].includes(surface)) return json(res, 200, { ok: true, ...(surface === 'hasib' ? hasibPreviewResponse(packId, operation) : dashboardPreviewResponse(packId, operation)), csrfToken: csrf });
  if (surface === 'customer' || surface === 'customer-review') return reply(res, await customer(body));
  if (surface === 'instagram') return json(res, 200, { ok: true, connection: null, active: false, sendingEnabled: false, csrfToken: csrf });
  if (surface === 'hasib') return reply(res, await call(executeHasib, operation, req.method === 'GET' ? {} : hasibArgs(operation, body)));
  if (surface === 'dashboard') {
    const r = await call(executeDashboard, operation, body);
    if (r.ok && operation === 'overview') { r.value.account = account; r.value.dashboardAvailable = true; r.value.broadcastEnabled = false; r.value.founderPreview = false; if (new URL(req.headers.referer || '/', url).searchParams.get('workspace') === 'catalyst') r.value.capabilities = capabilitiesFor('catalyst'); }
    return reply(res, r);
  }
  if (surface === 'messaging') {
    const op = req.method === 'GET' || operation === 'check_connection' ? 'state' : operation;
    if (!['state', 'pause', 'activate', 'takeover', 'resume_conversation', 'manual_reply'].includes(op)) return json(res, 409, { ok: false, reason: 'provider_action_disabled_in_preview' });
    return reply(res, await call(executeMessaging, op, body));
  }
  return json(res, 409, { ok: false, reason: 'provider_action_disabled_in_preview' });
}
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-src 'none'");
    if (url.pathname === '/review' || url.pathname === '/') { res.writeHead(200, { 'Content-Type': types['.html'] }); return res.end(review); }
    if (url.pathname === '/review-banner.js') { res.writeHead(200, { 'Content-Type': types['.js'] }); return res.end(banner); }
    if (url.pathname.startsWith('/api/')) { queue = queue.then(() => api(req, res, url)).catch(e => json(res, 500, { ok: false, reason: 'preview_error', detail: String(e.message).slice(0, 100) })); return; }
    const base = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (base !== root && !base.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    for (const file of [base, base + '.html', resolve(base, 'index.html')]) {
      if (!(await stat(file).catch(() => null))?.isFile()) continue;
      let content = await readFile(file);
      if (extname(file) === '.html') content = Buffer.from(content.toString().replace('</head>', '<script src="/review-banner.js" defer></script></head>'));
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); return res.end(content);
    }
    res.writeHead(404); res.end('Build first: npm run build');
  } catch { if (!res.headersSent) json(res, 400, { ok: false, reason: 'invalid_preview_request' }); }
}).listen(port, '127.0.0.1', () => console.log(`LOCAL SYNTHETIC candidate: http://127.0.0.1:${port}/review\n10 surfaces × EN/AR. In-memory only. No provider sends. Restart resets samples.`));
