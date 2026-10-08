import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { convexConfigured, reviewStore, catalogStore, brainStore } from '../convex.js';
import { convexServiceSecret, publicOrigin, appUrl, greenDataReady, isGreenRuntime, customerSetupEnabled, whatsappVerifyToken, customerSignupConfig, websiteImportEnabled, greenOwnerCredentials } from '../green-config.js';
import { blueAccountsAvailable, blueAuthStore, blueAccount, BLUE_ACCOUNT_COOKIE, hashAccountToken } from '../blue-auth.js';
import { parseCookies } from '../cookies.js';
import { safeEqual } from '../cookies.js';
import { readBody, send, sendPilotError } from '../http.js';
import { PilotError } from './config.js';
import { importWebsite } from './website-import.js';
import { validateReviewProfile } from './review-profile.js';
import { aiTurn, profileSections } from '../../../config/layla-ai.js';
import { qwenGenerator, qwenExtractor } from '../../../config/qwen-client.js';
import { extractionMessages, CHUNK_CHARS } from '../../../config/brain-extract.js';
import { previewOutcome } from '../../../config/brain-preview.js';
import { extractJson } from '../../../config/layla-ai.js';
import { teamContactOf, langOf } from '../../../config/layla-tones.js';
import { sectorIdFor } from '../../../config/layla-qualification.js';
import { BZNS_MAX_CHARS, parseBzns, validateBzns } from '../../../src/lib/bzns-doc.js';
import { credentialContext, exchangeAndVerify, metaRequest, openToken, sealToken } from './customer-meta.js';
import { verifySignupConfiguration } from './eligibility.js';

const ORIGIN = env => publicOrigin(env);
const CALLBACK = env => appUrl('/api/layla-meta-webhook', env);
const APP = '1388038082832745';
// The Login for Business configuration is replaceable in Meta (for example to
// change its products), so it is read from the environment rather than pinned.
export const signupConfigId = customerSignupConfig;
const COOKIE = '__Host-blue_review';
const digest = text => createHash('sha256').update(text).digest('hex');
const assetId = value => typeof value === 'string' && /^\d{1,30}$/.test(value);
export function greenSubscriptionReady(env = process.env) {
  return !isGreenRuntime(env) || greenDataReady(env);
}
export function reviewAvailable(env = process.env) {
  return convexConfigured(env) && customerSetupEnabled(env) && env.LAYLA_META_APP_ID === APP &&
    !!signupConfigId(env) && !!env.LAYLA_META_APP_SECRET && /^[a-f0-9]{64}$/i.test(env.LAYLA_CREDENTIAL_ENCRYPTION_KEY || '') &&
    !!whatsappVerifyToken(env) && (isGreenRuntime(env) || (!env.LAYLA_META_ACCESS_TOKEN && env.LAYLA_META_KILL_SWITCH !== 'false' && env.LAYLA_META_MODE !== 'live' && env.LAYLA_OPEN_TEST_ENABLED !== 'true'));
}
export function ownerConnection(env, account) {
  const green = !!env.GREEN_CONVEX_CLOUD_URL || env.VERCEL_ENV === 'production';
  if (!greenSubscriptionReady(env)) return null;
  const prefix = green ? 'GREEN_WHATSAPP_OWNER_CONNECT' : 'BLUE_OWNER_CONNECT';
  const configured = green ? greenOwnerCredentials(env) : null;
  const parts = green ? ['ahmed@bznsflowai.com', configured?.waba, configured?.phone, configured?.business] : String(env[prefix] || '').split(':');
  const token = green ? configured?.token : env[`${prefix}_TOKEN`];
  const enabled = green ? env.GREEN_WHATSAPP_OWNER_CONNECT_ENABLED === 'true' : true;
  const verify = green ? env.GREEN_WHATSAPP_VERIFY_TOKEN : env.BLUE_REVIEW_VERIFY_TOKEN;
  if (!enabled || parts.length !== 4 || !parts.slice(1,3).every(assetId) || (!green && !assetId(parts[3]))
    || typeof token !== 'string' || token.length < 20 || token.length > 8192
    || !/^[a-f0-9]{64}$/i.test(env.LAYLA_CREDENTIAL_ENCRYPTION_KEY || '')
    || !env.LAYLA_META_APP_SECRET || !verify) return null;
  if (green && parts[0].trim().toLowerCase() !== 'ahmed@bznsflowai.com') return null;
  if (!account?.email || String(account.email).trim().toLowerCase() !== parts[0].trim().toLowerCase()) return null;
  return { waba: parts[1], phone: parts[2], ...(parts[3] ? {business:parts[3]} : {}) };
}
function configuration(env, ownerMode = false) {
  if (ownerMode) {
    const green = !!env.GREEN_CONVEX_CLOUD_URL || env.VERCEL_ENV === 'production';
    const verify = green ? env.GREEN_WHATSAPP_VERIFY_TOKEN : env.BLUE_REVIEW_VERIFY_TOKEN;
    if (!convexConfigured(env) || env.LAYLA_META_APP_ID !== APP || !env.LAYLA_META_APP_SECRET
      || !/^[a-f0-9]{64}$/i.test(env.LAYLA_CREDENTIAL_ENCRYPTION_KEY || '') || !verify) {
      throw new PilotError('customer_onboarding_not_enabled', 503);
    }
    return { app: APP, secret: env.LAYLA_META_APP_SECRET, version: 'v25.0', verify };
  }
  if (!reviewAvailable(env)) throw new PilotError('customer_onboarding_not_enabled', 503);
  return { app: APP, secret: env.LAYLA_META_APP_SECRET, version: 'v25.0', verify: whatsappVerifyToken(env) };
}
function publicState(row, available, accountReady = true) {
  if (!row) throw new PilotError('review_backend_unavailable', 503);
  return { ok: true, review: true, synthetic: true, available, status: row.status, expiresAt: row.expiresAt,
    profile: row.profile || null, messagingStateUrl: '/api/layla-meta?surface=messaging',
    journeyStep: row.journeyStep ?? (row.profile ? 2 : 0), profileVersion: row.profileVersion || 1,
    lastPreview: row.lastPreview || null, previewIntents: row.previewIntents || [],
    capabilities: { preview: !!row.profile?.reviewed, connect: accountReady && available && !!(row.profile?.humanContact || row.profile?.handoffMode === 'inbox') && !row.integration && !row.pendingSelection, manageMessaging: accountReady && !!row.accountId && !!row.integration },
    nextAction: row.status === 'registration_required' ? 'register_number' : row.integration && !['connected','paused'].includes(row.status) ? 'refresh' : row.profile ? 'preview' : 'profile',
    selection: row.pendingSelection ? { candidates: row.pendingSelection.candidates, expiresAt: row.attempt?.expiresAt } : null,
    connectionChecks: row.connectionChecks || null, checkedAt: row.checkedAt || null, diagnostic: row.diagnostic || null,
    integration: row.integration ? { id: row.integration.id, sender: row.integration.sender, path: row.integration.path, status: row.status } : null,
    bzns: bznsState(row) };
}
// The owner's working bzns.md and whether Layla is answering from the latest version of it.
function bznsState(row) {
  const draft = row.bznsDraft, published = row.bznsPublished;
  return { markdown: draft?.markdown ?? published?.markdown ?? null, version: draft?.version || 0,
    publishedRevision: published?.revision || 0, publishedAt: published?.publishedAt || null,
    unpublishedChanges: !!draft && draft.markdown !== published?.markdown };
}
function allowedAssets(env, waba, phone) {
  if (!assetId(waba) || !assetId(phone)) throw new PilotError('invalid_signup_result');
  // All customer-owned assets may enter signup. Meta-granted WABA membership,
  // durable ownership and verified routing are checked before external writes.
}
// Provider-confirmed overrides are required before any subscribe/register write.
// Existing non-Blue routing for this app is never overwritten. A new WABA
// subscription includes its Blue override in the same provider request.
export async function inspectReviewConnection({ c, integration: i, token, fetcher, env = process.env }) {
  const [apps, phone, name] = await Promise.all([
    metaRequest(c, `${i.waba}/subscribed_apps`, token, fetcher),
    metaRequest(c, `${i.phone}?fields=id,status,is_on_biz_app,webhook_configuration`, token, fetcher),
    metaRequest(c, `${i.phone}?fields=name_status`, token, fetcher).catch(() => null),
  ]);
  const app = apps.data?.find(item => item.whatsapp_business_api_data?.id === c.app);
  const routing = phone.webhook_configuration;
  const callback = CALLBACK(env);
  const isolated = phone.id === i.phone && app?.override_callback_uri === callback &&
    routing?.whatsapp_business_account === callback && (!routing.phone_number || routing.phone_number === callback);
  const pathVerified = i.path === 'coexistence' ? phone.is_on_biz_app === true : phone.is_on_biz_app === false;
  const safeToSubscribe = phone.id === i.phone && pathVerified && Array.isArray(apps.data) &&
    (!app || app.override_callback_uri === callback) &&
    (!routing?.phone_number || routing.phone_number === callback) &&
    (!routing?.whatsapp_business_account || routing.whatsapp_business_account === callback);
  return { nameStatus: ['APPROVED','AVAILABLE_WITHOUT_REVIEW','DECLINED','EXPIRED','PENDING_REVIEW','NONE'].includes(name?.name_status) ? name.name_status : 'UNKNOWN', pathVerified, registered: phone.status === 'CONNECTED', isolated: isolated && pathVerified, safeToSubscribe, connected: isolated && pathVerified && phone.status === 'CONNECTED', subscribed: !!app,
    phoneMatches: phone.id === i.phone, phoneRoutedElsewhere: !!routing?.phone_number && routing.phone_number !== callback };
}
// Every path follows Embedded Signup v4, whose version comes from the login
// configuration. BLUE_SIGNUP_VERSION_EXISTING=v2|v3 is a temporary fallback for
// numbers already on an API; Meta retires v2/v3 on 2026-10-15.
export function signupVersion(env, path) {
  return path === 'existing_cloud' && ['v2','v3'].includes(env.BLUE_SIGNUP_VERSION_EXISTING) ? env.BLUE_SIGNUP_VERSION_EXISTING : 'v4';
}
// Refuse before the popup when Meta does not list the configuration on the app,
// instead of letting Meta's window fail. A success is remembered for ten minutes.
const CONFIG_CHECK_TTL = 600000;
let configChecked = { id: null, at: 0 };
export async function checkSignupConfiguration({ c, configId, fetcher, now }) {
  if (configChecked.id === configId && now() - configChecked.at < CONFIG_CHECK_TTL) return;
  await verifySignupConfiguration(c, { LAYLA_EMBEDDED_SIGNUP_CONFIG_ID: configId }, fetcher);
  configChecked = { id: configId, at: now() };
}
// The owner approved moving exactly one existing Cloud API number from other routing
// to Blue: BLUE_ROUTING_TAKEOVER="<waba>:<phone id>". Any other asset stays refused.
export function routingTakeoverApproved(env, i) {
  const parts = String(env.BLUE_ROUTING_TAKEOVER || '').split(':');
  return parts.length === 2 && parts.every(assetId) && i?.path === 'existing_cloud' && i.waba === parts[0] && i.phone === parts[1];
}
export function createReviewHandler({ env = process.env, fetcher = fetch, now = Date.now, store = reviewStore({ env, fetcher }), catalog = catalogStore({env,fetcher}), exchange = exchangeAndVerify, inspect = inspectReviewConnection, reviewMode = true, accountStore = blueAuthStore({env,fetcher}), websiteImport = importWebsite, verifyConfig = checkSignupConfiguration, generate = qwenGenerator(env, fetcher), brain = brainStore({env,fetcher}), extract = qwenExtractor(env, fetcher) } = {}) {
  return async (req, res) => {
    let body;
    try {
      if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow','GET, POST'); throw new PilotError('method',405); }
      if (!convexConfigured(env)) throw new PilotError('review_backend_unavailable',503);
      const cookies = String(req.headers?.cookie || '').split(';').map(s => s.trim()).filter(s => s.startsWith(`${COOKIE}=`));
      let session = cookies.length === 1 ? cookies[0].slice(COOKIE.length + 1) : '';
      const validSession = /^[a-f0-9]{64}$/.test(session);
      if (req.method === 'POST') {
        if (req.headers?.origin !== ORIGIN(env) || req.headers?.host !== new URL(ORIGIN(env)).host || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) throw new PilotError('origin',403);
        if (!validSession) throw new PilotError('session_expired',401);
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new PilotError('content_type',415);
      }
      if (!validSession) session = randomBytes(32).toString('hex');
      let sessionHash = digest(session);
      const accountsAvailable = blueAccountsAvailable(env);
      const account = accountsAvailable ? await blueAccount(req,accountStore) : null;
      if (account?.draftHash) sessionHash = account.draftHash;
      const secret = convexServiceSecret(env);
      const csrf = createHmac('sha256', secret).update(`blue-review-csrf:${session}`).digest('hex');
      if (req.method === 'POST' && !safeEqual(req.headers['x-csrf-token'] || '', csrf)) throw new PilotError('csrf',403);
      let row;
      try { row = await store(validSession ? 'get' : 'create', { sessionHash }); }
      catch (error) {
        if (error.code === 'session_expired' && req.method === 'GET') res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax`);
        throw error;
      }
      if (!row || row.expiresAt <= now()) throw new PilotError('session_expired',401);
      if (!validSession) res.setHeader('Set-Cookie', `${COOKIE}=${session}; Max-Age=86400; Path=/; Secure; HttpOnly; SameSite=Lax`);
      const attemptState = attempt => createHmac('sha256', secret).update(`blue-review-attempt:${sessionHash}:${attempt}`).digest('hex');
      const result = () => ({ ...publicState(row, reviewAvailable(env), reviewMode || !!account && !!row.accountId), csrfToken: csrf,
        reviewMode, websiteImportAvailable: websiteImportEnabled(env), accountSaveAvailable: accountsAvailable, savedToAccount: !!row.accountId,
        account: account ? { email:account.email, industry:account.industry || '' } : null,
        ownerConnectAvailable: !reviewMode && !!row.accountId && !row.integration && !row.pendingSelection && !!ownerConnection(env,account),
        ...(isGreenRuntime(env) && String(account?.email || '').trim().toLowerCase() === 'ahmed@bznsflowai.com' ? {
          ownerConnectionReadiness: {
            enabled: env.GREEN_WHATSAPP_OWNER_CONNECT_ENABLED === 'true',
            credentialsValid: !!greenOwnerCredentials(env),
            dataReady: greenSubscriptionReady(env),
          },
        } : {}),
        ...(row.attempt && !row.attempt.claimed && ['prepared','awaiting_meta'].includes(row.status) && row.attempt.expiresAt > now() ? {
          prepared: {attempt:row.attempt.id,state:attemptState(row.attempt.id),path:row.attempt.path,expiresAt:row.attempt.expiresAt,appId:APP,configId:signupConfigId(env),version:'v25.0',esVersion:signupVersion(env,row.attempt.path),...(row.attempt.preselect ? {preselect:row.attempt.preselect} : {})},
        } : {}),
      });
      if (req.method === 'GET') return send(res,200,result(),{vary:'Cookie'});
      body = readBody(req);
      if (!body || Array.isArray(body) || JSON.stringify(body).length > 12000) throw new PilotError('body_too_large',413);
      const write = async (operation, args = {}) => {
        const next = await store(operation, { ...args, sessionHash });
        if (!next || next.expiresAt <= now()) throw new PilotError('review_backend_unavailable',503);
        row = next; return row;
      };
      // Catalog rows belong to the account, or to this setup until it is saved to an account (claim_draft moves them).
      const ownerKey=row.accountId ? String(row.accountId) : `review_${row._id}`;
      // BznsBrain and catalog changes are the manager's: a team member never edits the business's knowledge.
      if ((String(body.action || '').startsWith('brain_') || ['catalog_save','catalog_save_many','catalog_archive','catalog_approve','catalog_discard','catalog_publish'].includes(body.action)) && account?.workspaceRole === 'employee') throw new PilotError('manager_required',403);
      const brainState = async () => brain('state',{sessionHash});
      const persistConnection = async (verified, waba, phone, connectionConfig = configuration(env)) => {
        if (!greenSubscriptionReady(env)) throw new PilotError('green_whatsapp_not_ready',503);
        const token = verified.token;
        const i = {id:randomUUID(),app:APP,waba,phone:verified.phone || phone,sender:verified.sender,path:row.attempt.path};
        i.credential = sealToken(token,credentialContext(sessionHash,i),env);
        await write('credential',{attempt:row.attempt.id,integration:i});
        const c = connectionConfig;
        const proof = await inspect({c,integration:i,token,fetcher});
        const takeover = routingTakeoverApproved(env,i) && proof.phoneMatches && proof.pathVerified;
        if (!proof.isolated && !proof.safeToSubscribe && !takeover) throw new PilotError('test_routing_not_verified',409);
        const operationId = randomUUID();
        await write('claim_operation',{operationId,effect:'subscribe'});
        try {
          const subscribed = await metaRequest(c,`${i.waba}/subscribed_apps`,token,fetcher,{override_callback_uri:CALLBACK(env),verify_token:c.verify});
          if (subscribed.success !== true) throw new PilotError('meta_connection_unavailable',502);
          // A phone-level override outranks the WABA override, so an approved move sets both.
          if (takeover && proof.phoneRoutedElsewhere) {
            const phoneRouted = await metaRequest(c,i.phone,token,fetcher,{webhook_configuration:JSON.stringify({override_callback_uri:CALLBACK(env),verify_token:c.verify})});
            if (phoneRouted.success !== true) throw new PilotError('meta_connection_unavailable',502);
          }
          const after = await inspect({c,integration:i,token,fetcher});
          const status = after.connected ? 'connected' : after.isolated && i.path === 'new_number' ? 'registration_required' : 'reconciliation_required';
          await write('result',{operationId,status,connectionChecks:checks(after)});
        } catch (error) { await write('result',{operationId,status:'reconciliation_required',diagnostic:diagnostic(error,'subscription')}); }
      };
      // Exchange (or token check), then connection persistence. A failure before any provider
      // operation is recorded against the attempt; a claimed operation keeps its own record.
      const verifyAndPersist = async ({ attemptId, waba, phone, exchangeArgs, stage, connectionConfig }) => {
        let token;
        try {
          const verified = await exchange({ c:connectionConfig || configuration(env), ...exchangeArgs, waba, phone, path:row.attempt.path, allowPhoneSelection:!exchangeArgs.token, fetcher, now });
          token = verified.token;
          if (verified.candidates) {
            const credential = sealToken(token,`review-selection:${sessionHash}:${row.attempt.id}:${waba}`,env);
            await write('pending_selection',{selection:{waba,path:row.attempt.path,candidates:verified.candidates,credential}});
          } else await persistConnection(verified,waba,phone,connectionConfig || configuration(env));
        } catch (error) {
          if (!row.operation) await write('result',{attempt:attemptId,status:row.integration ? 'reconciliation_required' : 'failed',diagnostic:diagnostic(error,stage)});
          throw error;
        } finally { token = undefined; }
      };
      const checks = proof => ({ routing:!!proof.isolated, registered:!!(proof.registered ?? proof.connected), path:!!(proof.pathVerified ?? proof.isolated), nameStatus:proof.nameStatus || 'UNKNOWN' });
      const diagnostic = (error, stage) => ({reason:error instanceof PilotError ? error.code : 'review_backend_unavailable',stage,at:now(),...(Number.isSafeInteger(error.providerCode) ? {providerCode:error.providerCode} : {})});
      if (body.action === 'claim_draft') {
        if (!accountsAvailable || !account) throw new PilotError('sign_in_required',401);
        const token = parseCookies(req)[BLUE_ACCOUNT_COOKIE];
        const draftHash = randomBytes(32).toString('hex');
        let credential;
        if (row.integration) {
          let customerToken;
          try {
            customerToken = openToken(row.integration.credential,credentialContext(sessionHash,row.integration),env);
            credential = sealToken(customerToken,credentialContext(draftHash,row.integration),env);
          } finally { customerToken = undefined; }
        }
        const claimed = await accountStore('claim_draft',{tokenHash:hashAccountToken(token),sessionHash,draftHash,...(credential ? {credential} : {})});
        sessionHash = claimed.draftHash;
        row = await store('get',{sessionHash});
      } else if (body.action === 'import_website') {
        if (!websiteImportEnabled(env)) throw new PilotError('website_import_unavailable',503);
        const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
        const ipHash = createHmac('sha256',secret).update(`blue-import:${ip}`).digest('hex');
        await accountStore('limit_import',{ipHash});
        const imported = await websiteImport(body.url);
        return send(res,200,{...result(),imported},{vary:'Cookie'});
      } else if (body.action === 'profile') {
        const businessName = body.businessName?.trim();
        if (typeof businessName !== 'string' || !businessName || businessName.length > 100 || /[\x00-\x1f]/.test(businessName)) throw new PilotError('invalid_profile');
        await write('profile', { profile: { ...validateReviewProfile(body.profile), businessName } });
      } else if (body.action === 'bzns_save' || body.action === 'bzns_publish') {
        if (typeof body.markdown !== 'string' || !Number.isSafeInteger(body.version) || body.version < 0) throw new PilotError('invalid_state');
        if (body.markdown.length > BZNS_MAX_CHARS) throw new PilotError('bzns_too_long',413);
        if (body.action === 'bzns_publish') {
          // Section-level errors go back to the editor; Convex validates again before writing.
          const checked = validateBzns(body.markdown);
          if (!checked.ok) return send(res,400,{ok:false,reason:'bzns_invalid',errors:checked.errors.map(({code,section,heading})=>({code,section,...(heading ? {heading} : {})}))},{vary:'Cookie'});
        }
        await write(body.action, { markdown: body.markdown, version: body.version });
      } else if (body.action === 'preview') {
        if (!row.profile?.reviewed) throw new PilotError('profile_unreviewed',409);
        if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 1000) throw new PilotError('invalid_text');
        // The same AI turn a customer gets, from the same setup: document, approved catalog, tone and contact.
        const text = body.text.trim();
        const markdown = row.bznsPublished?.markdown || row.bznsDraft?.markdown || '';
        const parsed = parseBzns(markdown).sections.map(({ key, heading, body: sectionBody }) => ({ key, heading, body: sectionBody }));
        const sections = parsed.length ? parsed : profileSections(row.profile);
        const approved = row.accountId ? ((await catalog('list',{ownerKey,limit:50})).entries || []).filter(entry => entry.status === 'approved') : [];
        const turn = await aiTurn({ business: { name: row.profile.businessName || '', sector: row.profile.sector || '', sectorId: sectorIdFor(row.profile.sector) },
          tone: row.profile.tone, channel: 'whatsapp', teamContact: teamContactOf(row.profile), sections, catalog: approved, knowledge: [], facts: [], acks: [],
          customer: {}, ask: null, firstReply: true, history: [{ role: 'customer', text }], fieldKeys: [], lang: langOf(text) }, generate);
        const preview = { question: text, text: turn.reply.slice(0, 1200), sourceFields: [], needsHuman: !!turn.needsTeam, intent: turn.intent, ...(turn.ai?.fallback ? { fallback: turn.ai.fallback } : {}) };
        await write('preview_result', { profileVersion: row.profileVersion || 1, preview });
        return send(res,200,{...result(), preview: preview.text, sourceFields: preview.sourceFields, needsHuman: preview.needsHuman},{vary:'Cookie'});
      } else if (body.action === 'save_progress') {
        await write('save_progress', { journeyStep: body.journeyStep });
      } else if (body.action === 'catalog_list') {
        const value=await catalog('list',{ownerKey,cursor:body.cursor,limit:body.limit,...(body.all===true?{all:true}:{})});return send(res,200,{...result(),catalog:value},{vary:'Cookie'});
      } else if (body.action === 'catalog_save') {
        const value=await catalog('save',{ownerKey,entry:body.entry});return send(res,200,{...result(),catalog:value},{vary:'Cookie'});
      } else if (body.action === 'catalog_save_many') {
        const value=await catalog('saveMany',{ownerKey,entries:body.entries});return send(res,200,{...result(),catalog:value},{vary:'Cookie'});
      } else if (['catalog_archive','catalog_approve','catalog_discard'].includes(body.action)) {
        const value=await catalog(body.action.slice(8),{ownerKey,entryKey:body.entryKey});return send(res,200,{...result(),catalog:value},{vary:'Cookie'});
      } else if (body.action === 'catalog_publish') {
        const value=await catalog('publish',{ownerKey});return send(res,200,{...result(),catalog:value},{vary:'Cookie'});
      } else if (body.action === 'brain_state') {
        return send(res,200,{...result(),brain:await brainState()},{vary:'Cookie'});
      } else if (body.action === 'brain_test') {
        // Test Layla: the live context builder and question planner (in Convex), the live AI turn and checks
        // (here), on a simulated customer. Nothing is sent and no customer or conversation is written.
        const variant = body.variant === 'draft' ? 'draft' : 'published';
        const history = Array.isArray(body.history) ? body.history.slice(-12).filter(h => h && ['customer','layla'].includes(h.role) && typeof h.text === 'string').map(h => ({ role:h.role, text:h.text.slice(0,500) })) : [];
        const latest = history.filter(h => h.role === 'customer').at(-1)?.text?.trim();
        if (!latest) throw new PilotError('invalid_text');
        const test = await brain('test_context',{sessionHash,variant,history,sim:body.sim && typeof body.sim === 'object' ? body.sim : {}});
        const turn = await aiTurn(test.context, generate);
        const outcome = previewOutcome(test.sim, turn, { sectorId:test.sectorId, catalog:test.context.catalog || [], reception:test.reception, latest });
        if (row.profile?.reviewed && variant === 'published') await write('preview_result', { profileVersion: row.profileVersion || 1, preview: { question: latest.slice(0,1000), text: turn.reply.slice(0,1200), sourceFields: (turn.sources || []).map(x => x.label).slice(0,10), needsHuman: !!turn.needsTeam, intent: turn.intent, variant, ...(turn.ai?.fallback ? { fallback: String(turn.ai.fallback).slice(0,40) } : {}) } }).catch(() => {});
        return send(res,200,{...result(),test:{ variant, reply:turn.reply, noReply:!!turn.noReply, intent:turn.intent, needsTeam:!!turn.needsTeam, askedField:turn.askedField || null,
          sources:turn.sources || [], reason:turn.reason || '', fallback:turn.ai?.fallback || null, captured:outcome.captured, sim:outcome.sim, override:test.override, reception:test.reception, appointment:outcome.sim.appointment || null }},{vary:'Cookie'});
      } else if (body.action === 'brain_extract') {
        // One chunk of an owner's document, page or pasted text: Qwen proposes, Convex verifies and queues for review.
        if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > CHUNK_CHARS + 500 || !['file','website','paste'].includes(body.sourceKind)) throw new PilotError('invalid_extraction');
        const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
        await accountStore('limit_extract',{ipHash:createHmac('sha256',secret).update(`blue-extract:${ip}`).digest('hex')});
        let raw = null, failure = null;
        try { raw = extractJson((await extract(extractionMessages(body.text, { business: row.profile?.businessName || '', sector: row.profile?.sector || '' }))).text); if (!raw) failure = 'invalid_json'; }
        catch (e) { failure = e?.reason || 'ai_error'; }
        if (failure) return send(res,200,{...result(),extraction:{ ok:false, reason:failure, added:0, duplicate:0, rejected:0 }},{vary:'Cookie'});
        const counts = await brain('record_extraction',{sessionHash,raw,chunk:body.text,sourceKind:body.sourceKind,sourceLabel:String(body.sourceLabel || '').slice(0,200)});
        return send(res,200,{...result(),extraction:{ ok:true, ...counts }},{vary:'Cookie'});
      } else if (body.action === 'brain_website') {
        // A web page read on the server (the existing importer), returned as text for the browser to send in chunks.
        if (!websiteImportEnabled(env)) throw new PilotError('website_import_unavailable',503);
        const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
        await accountStore('limit_import',{ipHash:createHmac('sha256',secret).update(`blue-import:${ip}`).digest('hex')});
        // An owner types "bznsflowai.com"; the importer needs https://, so add it when no scheme was given.
        const address = typeof body.url === 'string' && !/^[a-z][a-z0-9+.-]*:/i.test(body.url.trim()) ? `https://${body.url.trim()}` : body.url;
        const imported = await websiteImport(address, { summary: true });
        return send(res,200,{...result(),page:{ url:imported.url, text:String(imported.text || '').slice(0,48000), partial:!!imported.partial || String(imported.text || '').length > 48000 }},{vary:'Cookie'});
      } else if (['brain_accept','brain_dismiss'].includes(body.action)) {
        if (typeof body.proposalId !== 'string' || body.proposalId.length > 64) throw new PilotError('proposal_not_found',404);
        await brain(body.action === 'brain_accept' ? 'accept' : 'dismiss',{sessionHash,proposalId:body.proposalId,
          ...(typeof body.text === 'string' ? { text:body.text.slice(0,1500) } : {}), ...(typeof body.section === 'string' ? { section:body.section } : {}), ...(body.replace === true ? { replace:true } : {}),
          ...(body.entry && typeof body.entry === 'object' ? { entry:body.entry } : {})});
        row = await store('get',{sessionHash});
        return send(res,200,{...result(),brain:await brainState()},{vary:'Cookie'});
      } else if (body.action === 'brain_behaviour') {
        await brain('behaviour_save',{sessionHash,behaviour:body.behaviour,version:Number.isSafeInteger(body.version) ? body.version : -1});
        row = await store('get',{sessionHash});
        return send(res,200,{...result(),brain:await brainState()},{vary:'Cookie'});
      } else if (body.action === 'brain_step') {
        await brain('step',{sessionHash,brainStep:body.brainStep});
        return send(res,200,{...result(),brain:await brainState()},{vary:'Cookie'});
      } else if (body.action === 'brain_publish') {
        // One Publish: bzns.md (checked here and again in Convex) and the catalog's drafts and staged edits.
        const draft = row.bznsDraft, unpublished = !!draft && draft.markdown !== row.bznsPublished?.markdown;
        if (unpublished) {
          const checked = validateBzns(draft.markdown);
          if (!checked.ok) return send(res,400,{ok:false,reason:'bzns_invalid',errors:checked.errors.map(({code,section,heading})=>({code,section,...(heading ? {heading} : {})}))},{vary:'Cookie'});
          await write('bzns_publish',{ markdown:draft.markdown, version:draft.version || 0 });
        }
        if (body.catalog !== false) await catalog('publish',{ownerKey});
        await brain('settle_publish',{sessionHash});
        row = await store('get',{sessionHash});
        return send(res,200,{...result(),brain:await brainState()},{vary:'Cookie'});
      } else if (body.action === 'begin') {
        const c = configuration(env);
        if (!reviewMode && (!account || !row.accountId)) throw new PilotError('sign_in_required',401);
        if (!['coexistence','new_number','existing_cloud'].includes(body.path)) throw new PilotError('invalid_path');
        const named = ['business','waba'].filter(k => body[k] !== undefined && body[k] !== '');
        if (named.length && body.path === 'coexistence') throw new PilotError('invalid_path');
        if (named.some(k => !assetId(body[k]))) throw new PilotError('invalid_signup_result');
        const preselect = named.length ? Object.fromEntries(named.map(k => [k, body[k]])) : undefined;
        await verifyConfig({ c, configId: signupConfigId(env), fetcher, now });
        const attempt = randomUUID(), state = attemptState(attempt);
        await write('begin',{attempt,stateHash:digest(state),path:body.path,...(preselect ? {preselect} : {})});
        return send(res,200,{...result(),attempt,state,path:row.attempt.path,expiresAt:row.attempt.expiresAt,appId:APP,configId:signupConfigId(env),version:'v25.0',esVersion:signupVersion(env,body.path),...(preselect ? {preselect} : {})},{vary:'Cookie'});
      } else if (['cancel','finish'].includes(body.action)) {
        if (typeof body.state !== 'string' || !/^[a-f0-9]{64}$/.test(body.state) || typeof body.attempt !== 'string') throw new PilotError('invalid_state',409);
        if (body.action === 'cancel') await write('cancel',{attempt:body.attempt,stateHash:digest(body.state)});
        else {
          configuration(env);
          if (!assetId(body.waba) || (body.phone !== undefined && !assetId(body.phone))) throw new PilotError('invalid_signup_result');
          if (typeof body.code !== 'string' || !body.code || body.code.length > 4096) throw new PilotError('invalid_signup_result');
          // The owner named this WABA before launch; a different one is a wrong selection, not a connection.
          if (row.attempt?.preselect?.waba && row.attempt.preselect.waba !== body.waba) throw new PilotError('invalid_signup_result');
          await write('claim',{attempt:body.attempt,stateHash:digest(body.state)});
          // If a provider operation was claimed, its record survives even if
          // persistence fails. A refresh can reconcile it after 60 seconds.
          try { await verifyAndPersist({ attemptId:body.attempt, waba:body.waba, phone:body.phone, exchangeArgs:{ code:body.code }, stage:'verification' }); }
          finally { delete body.code; }
        }
      } else if (body.action === 'connect_owner_number') {
        const owner = !reviewMode && account && row.accountId ? ownerConnection(env,account) : null;
        if (!owner) throw new PilotError('owner_connection_unavailable',403);
        const connectionConfig = configuration(env, true);
        if (row.integration || row.pendingSelection) throw new PilotError('operation_conflict',409);
        // Retire an unused prepared Embedded Signup attempt; the owner path replaces it.
        if (row.attempt && !row.attempt.claimed && ['prepared','awaiting_meta'].includes(row.status) && row.attempt.expiresAt > now()) await write('cancel',{attempt:row.attempt.id,stateHash:row.attempt.stateHash});
        const attempt = randomUUID(), state = attemptState(attempt);
        await write('begin',{attempt,stateHash:digest(state),path:'existing_cloud'});
        await write('claim',{attempt,stateHash:digest(state)});
        await verifyAndPersist({ attemptId:attempt, waba:owner.waba, phone:owner.phone, exchangeArgs:{ token:isGreenRuntime(env)?greenOwnerCredentials(env)?.token:env.BLUE_OWNER_CONNECT_TOKEN, ownerBusiness:owner.business, configuredOwner:isGreenRuntime(env) }, stage:'owner_connection', connectionConfig });
      } else if (body.action === 'cancel_selection') {
        await write('cancel_selection');
      } else if (body.action === 'select_phone') {
        if (!row.pendingSelection || !row.attempt || row.attempt.expiresAt <= now()) throw new PilotError('attempt_expired',409);
        const selection = row.pendingSelection;
        if (!selection.candidates.some(p => p.id === body.phone)) throw new PilotError('invalid_signup_result');
        let token;
        try {
          token = openToken(selection.credential,`review-selection:${sessionHash}:${row.attempt.id}:${selection.waba}`,env);
          const verified = await exchange({ c:configuration(env), token, waba:selection.waba, phone:body.phone,path:selection.path,fetcher,now });
          await persistConnection(verified,selection.waba,body.phone);
        } catch (error) {
          if (row.integration && !row.operation && row.status === 'verifying') await write('result',{attempt:row.attempt.id,status:'reconciliation_required',diagnostic:diagnostic(error,'selection')});
          throw error;
        } finally { token = undefined; }
      } else if (['register_number','refresh'].includes(body.action)) {
        const i = row.integration;
        if (!i) throw new PilotError('operation_conflict',409);
        allowedAssets(env,i.waba,i.phone);
        // Read-only reconciliation remains possible when new setup is disabled.
        const c = {app:APP,secret:env.LAYLA_META_APP_SECRET,version:'v25.0'};
        const register = body.action === 'register_number';
        if (register) {
          configuration(env);
          if (i.path !== 'new_number' || row.status !== 'registration_required' || !/^\d{6}$/.test(body.pin || '') || body.confirm !== true) throw new PilotError('registration_confirmation_required',409);
        }
        const operationId = randomUUID();
        await write('claim_operation',{operationId,effect:register ? 'register' : 'refresh'});
        let token;
        try {
          token = openToken(i.credential,credentialContext(sessionHash,i),env);
          let proof = await inspect({c,integration:i,token,fetcher});
          if (register) {
            if (!proof.isolated) throw new PilotError('test_routing_not_verified',409);
            const r = await metaRequest(c,`${i.phone}/register`,token,fetcher,{messaging_product:'whatsapp',pin:body.pin});
            if (r.success !== true) throw new PilotError('meta_connection_unavailable',502);
            proof = await inspect({c,integration:i,token,fetcher});
          }
          await write('result',{operationId,status:proof.connected ? 'connected' : proof.isolated && i.path === 'new_number' && !row.registrationAttempted ? 'registration_required' : 'reconciliation_required',connectionChecks:checks(proof)});
        } catch (error) { await write('result',{operationId,status:'reconciliation_required',diagnostic:diagnostic(error,register ? 'registration' : 'refresh')}); }
        finally { token = undefined; delete body.pin; }
      } else if (body.action === 'pause') await write('pause');
      else throw new PilotError('unknown_action');
      return send(res,200,result(),{vary:'Cookie'});
    } catch (error) {
      return sendPilotError(res, error, { fallback: 'review_backend_unavailable', vary: 'Cookie' });
    } finally { if (body && typeof body === 'object') { delete body.code; delete body.pin; } }
  };
}
