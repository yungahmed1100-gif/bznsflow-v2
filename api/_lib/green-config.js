import { PilotError } from './layla/config.js';

export const GREEN_ORIGIN = 'https://www.bznsflowai.com';
const BLUE_CLOUD_HOST = 'quaint-nightingale-675.eu-west-1.convex.cloud';

export const isGreenRuntime = (env = process.env) => env.VERCEL_ENV === 'production' || !!env.GREEN_CONVEX_CLOUD_URL;
export const whatsappMessagingEnabled = (env = process.env) => isGreenRuntime(env)
  ? env.GREEN_WHATSAPP_ENABLED === 'true'
  : env.BLUE_LIVE_MESSAGING_ENABLED === 'true';
export const instagramMessagingEnabled = (env = process.env) => isGreenRuntime(env)
  ? env.GREEN_INSTAGRAM_APPROVED === 'true' && env.GREEN_INSTAGRAM_ENABLED === 'true'
  : env.BLUE_INSTAGRAM_SEND_ENABLED === 'true';
export const broadcastMessagingEnabled = (env = process.env) => isGreenRuntime(env)
  ? env.GREEN_BROADCAST_ENABLED === 'true' && whatsappMessagingEnabled(env)
  : env.BLUE_BROADCAST_ENABLED === 'true' && whatsappMessagingEnabled(env);
export const messagingWorkerSecret = (env = process.env) => isGreenRuntime(env)
  ? env.GREEN_MESSAGING_WORKER_SECRET || ''
  : env.GREEN_MESSAGING_WORKER_SECRET || env.BLUE_MESSAGING_WORKER_SECRET || '';

export function publicOrigin(env = process.env) {
  const raw = String(env.PUBLIC_SITE_ORIGIN || GREEN_ORIGIN).replace(/\/$/, '');
  let url;
  try { url = new URL(raw); } catch { throw new PilotError('invalid_public_origin', 503); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new PilotError('invalid_public_origin', 503);
  }
  return url.origin;
}

export function convexEndpoints(env = process.env) {
  const cloudRaw = String(env.CONVEX_CLOUD_URL || '');
  const siteRaw = String(env.CONVEX_SITE_URL || cloudRaw.replace(/\.convex\.cloud\/?$/, '.convex.site'));
  try {
    const cloud = new URL(cloudRaw);
    const site = new URL(siteRaw);
    const deployment = cloud.hostname.replace(/\.convex\.cloud$/, '');
    const expectedCloud = String(env.GREEN_CONVEX_CLOUD_URL || '').replace(/\/$/, '');
    const productionReady = env.VERCEL_ENV !== 'production'
      || (!!expectedCloud && cloud.origin === expectedCloud && publicOrigin(env) === GREEN_ORIGIN
        && /^[a-f0-9]{64}$/i.test(env.CONVEX_SERVICE_SECRET || ''));
    if (cloud.protocol !== 'https:' || !cloud.hostname.endsWith('.convex.cloud') || cloud.hostname === BLUE_CLOUD_HOST
      || site.protocol !== 'https:' || !site.hostname.endsWith('.convex.site')
      || site.hostname.replace(/\.convex\.site$/, '') !== deployment
      || !productionReady || (expectedCloud && cloud.origin !== expectedCloud)) throw new Error('endpoint');
    return { cloud: cloud.origin, site: site.origin };
  } catch { throw new PilotError('convex_configuration_missing', 503); }
}

export function convexServiceSecret(env = process.env) {
  // Green has an explicit cloud pin; never inherit a Blue credential there.
  // Retain the legacy credential for isolated Blue deployments.
  const secret = isGreenRuntime(env)
    ? env.CONVEX_SERVICE_SECRET || ''
    : env.CONVEX_SERVICE_SECRET || env.BLUE_REVIEW_SERVICE_SECRET || '';
  return /^[a-f0-9]{64}$/i.test(secret) ? secret : '';
}

export function isGreenConvexConfigured(env = process.env) {
  try {
    if (!env.GREEN_CONVEX_CLOUD_URL || publicOrigin(env) !== GREEN_ORIGIN || !/^[a-f0-9]{64}$/i.test(env.CONVEX_SERVICE_SECRET || '')) return false;
    convexEndpoints(env);
    return true;
  } catch { return false; }
}

export function appUrl(path, env = process.env) {
  return new URL(path, `${publicOrigin(env)}/`).toString();
}

// Storage readiness is independent of permission to send messages.
export function greenDataReady(env = process.env) {
  return env.GREEN_CONVEX_CUTOVER === 'true' && env.GREEN_DATA_MIGRATION_VERIFIED === 'true'
    && env.GREEN_STATE_PATHS_CONVEX === 'true' && isGreenConvexConfigured(env);
}
export const customerSetupEnabled = (env = process.env) => isGreenRuntime(env)
  ? env.LAYLA_CUSTOMER_ONBOARDING_ENABLED === 'true' : env.BLUE_CUSTOMER_SETUP_ENABLED === 'true';
export const whatsappVerifyToken = (env = process.env) => isGreenRuntime(env)
  ? env.GREEN_WHATSAPP_VERIFY_TOKEN || '' : env.BLUE_REVIEW_VERIFY_TOKEN || '';
export function customerSignupConfig(env = process.env) {
  const primary = env.LAYLA_CUSTOMER_CONFIG_ID;
  const alias = env.LAYLA_EMBEDDED_SIGNUP_CONFIG_ID;
  if (primary && alias && primary !== alias) return null;
  const id = primary || alias;
  return /^\d{1,30}$/.test(id || '') ? id : null;
}

export const websiteImportEnabled = (env = process.env) => isGreenRuntime(env)
  ? env.LAYLA_WEBSITE_IMPORT_ENABLED === 'true' : env.BLUE_WEBSITE_IMPORT_ENABLED === 'true';


// Deployment-only owner credentials. Never accept these identifiers from a request body.
export function greenOwnerCredentials(env = process.env) {
  const tuple = env.GREEN_WHATSAPP_OWNER_CONNECT;
  const parts = tuple ? String(tuple).split(':') : null;
  if (parts && (parts.length !== 4 || parts[0].trim().toLowerCase() !== 'ahmed@bznsflowai.com'
    || !parts.slice(1).every(id => /^\d{1,30}$/.test(id)))) return null;
  const waba = parts?.[1] || env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const phone = parts?.[2] || env.WHATSAPP_BUSINESS_NUMBER_ID;
  const token = env.GREEN_WHATSAPP_OWNER_CONNECT_TOKEN || env.ACCESS_TOKEN;
  if ((parts && env.WHATSAPP_BUSINESS_ACCOUNT_ID && waba !== env.WHATSAPP_BUSINESS_ACCOUNT_ID)
    || (parts && env.WHATSAPP_BUSINESS_NUMBER_ID && phone !== env.WHATSAPP_BUSINESS_NUMBER_ID)
    || (env.GREEN_WHATSAPP_OWNER_CONNECT_TOKEN && env.ACCESS_TOKEN && env.GREEN_WHATSAPP_OWNER_CONNECT_TOKEN !== env.ACCESS_TOKEN)) return null;
  if (!/^\d{1,30}$/.test(waba || '') || !/^\d{1,30}$/.test(phone || '')
    || typeof token !== 'string' || token.length < 20 || token.length > 8192) return null;
  return { waba, phone, ...(parts ? {business:parts[3]} : {}), token };
}
