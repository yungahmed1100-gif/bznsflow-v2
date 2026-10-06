import { isGreenRuntime } from '../green-config.js';
// Authenticated Hasib API: /api/layla-meta?surface=hasib
// Same boundary as the Layla dashboard: exact Blue host and origin, the
// __Host-blue_account session, CSRF double-submit. The tenant is always the
// signed-in account's saved draft; request bodies never name an account.
import { hasibStore } from '../convex.js';
import { blueAccount, blueAuthStore, blueAccountsAvailable } from '../blue-auth.js';
import { appUrl } from '../green-config.js';
import { ensureCsrfToken, verifyCsrf } from '../cookies.js';
import { readBody, send, sendPilotError } from '../http.js';
import { isSameSite } from '../guard.js';
import { PilotError } from '../layla/config.js';
import { dashboardAvailable } from '../layla/dashboard-api.js';
import { hasibArgs } from './validate.js';
import { isHasibFounder } from './founder.js';
import { hasibPreviewResponse } from './preview.js';

const siteOrigin = env => env.PUBLIC_SITE_ORIGIN || 'https://www.bznsflowai.com';
const LIMITS = { items_import: 60000, item_save: 40000, order_create: 40000, stock_move: 16000, repair_update: 12000 };
const DEFAULT_BODY_LIMIT = 6000;

export const hasibAvailable = (env = process.env) => dashboardAvailable(env) && env.BLUE_HASIB_ENABLED !== 'false';

export async function sendTeamInvitation({ member, env, fetcher = fetch }) {
  const key = isGreenRuntime(env) ? env.RESEND_API_KEY : env.BLUE_RESEND_API_KEY;
  const from = isGreenRuntime(env) ? env.AUTH_FROM : env.BLUE_AUTH_FROM;
  if (!key || !from || !blueAccountsAvailable(env) || !member?.email) throw new PilotError('invite_send_failed', 502);
  const response = await fetcher('https://api.resend.com/emails', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: {
    Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `ascend-invite/${member.id}/${member.resentAt || member.invitedAt}`,
  }, body: JSON.stringify({ from, to: [member.email], subject: 'You have been invited to join a BznsFlow team',
    text: `You have been invited to join your team's BznsFlow dashboard. Sign in with this email at ${appUrl('/en/layla/dashboard',env)} — your invitation activates only after the email-code sign-in is verified.\n\nتمت دعوتك للانضمام إلى لوحة فريقك على BznsFlow. سجّل الدخول بهذا البريد عبر ${appUrl('/layla/dashboard',env)}، ولن تتفعّل الدعوة إلا بعد التحقق من رمز البريد.` }) });
  if (!response.ok || typeof (await response.json())?.id !== 'string') throw new PilotError('invite_send_failed', 502);
}

export function createHasibApi({ env = process.env, fetcher = fetch, accounts = blueAuthStore({ env, fetcher }), store = hasibStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    try {
      if (!isSameSite(req, env, { write: req.method !== 'GET' })) throw new PilotError('origin', 403);
      if (!['GET', 'POST'].includes(req.method)) throw new PilotError('method', 405);
      if (!hasibAvailable(env)) throw new PilotError('hasib_unavailable', 503);
      const account = await blueAccount(req, accounts);
      if (!account) throw new PilotError('sign_in_required', 401);
      const sessionHash = account.workspaceDraftHash || account.draftHash;
      const url = new URL(req.url || '/api/layla-meta', siteOrigin(env));
      const csrfToken = ensureCsrfToken(req, res);
      const reply = value => send(res, 200, { ok: true, ...value, csrfToken }, { vary: 'Cookie' });

      if (req.method === 'GET') {
        const previewPack = url.searchParams.get('previewIndustry');
        if (previewPack) {
          if (!isHasibFounder(account)) throw new PilotError('preview_forbidden', 403);
          return reply(hasibPreviewResponse(previewPack, 'overview'));
        }
        if (!sessionHash) throw new PilotError('setup_required', 409);
        return reply(await store('overview', { sessionHash, actorAccountId: account.id }));
      }
      if (!verifyCsrf(req)) throw new PilotError('csrf', 403);
      const body = readBody(req);
      const action = typeof body.action === 'string' ? body.action : '';
      if (JSON.stringify(body).length > (LIMITS[action] || DEFAULT_BODY_LIMIT)) throw new PilotError('body_too_large', 413);
      const previewIndustry = body.previewIndustry ?? url.searchParams.get('previewIndustry');
      if (previewIndustry !== null && previewIndustry !== undefined) {
        if (!isHasibFounder(account)) throw new PilotError('preview_forbidden', 403);
        return reply(hasibPreviewResponse(previewIndustry, action));
      }
      if (!sessionHash) throw new PilotError('setup_required', 409);
      if (action === 'settings_update' && body.packId !== undefined && !isHasibFounder(account)) throw new PilotError('industry_profile_required', 409);
      const result = await store(action, { sessionHash, actorAccountId: account.id, ...hasibArgs(action, body) });
      if (['team_invite', 'team_resend'].includes(action)) {
        try { await sendTeamInvitation({ member: result, env, fetcher }); }
        catch { return reply({ ...result, invitationDelivery: 'failed' }); }
        return reply({ ...result, invitationDelivery: 'sent' });
      }
      return reply(result);
    } catch (e) {
      return sendPilotError(res, e, { fallback: 'hasib_unavailable', vary: 'Cookie' });
    }
  };
}
