import { greenOwnerCredentials } from '../api/_lib/green-config.js';
const env = process.env;
const stage = process.argv.includes("--data") ? "data" : "live";
const checks = [];
const check = (name, passed, detail) => checks.push({ name, passed: !!passed, detail });
const has = key => typeof env[key] === 'string' && env[key].length > 0;
const validSecret = key => /^[a-f0-9]{64}$/i.test(env[key] || '');
const ownerBindingValid = !!greenOwnerCredentials(env);

let targetMatches = false;
try {
  const cloud = new URL(env.CONVEX_CLOUD_URL || '');
  const expected = new URL(env.GREEN_CONVEX_CLOUD_URL || '');
  const site = new URL(env.CONVEX_SITE_URL || String(env.CONVEX_CLOUD_URL || '').replace(/\.convex\.cloud\/?$/, '.convex.site'));
  targetMatches = cloud.protocol === 'https:' && cloud.hostname.endsWith('.convex.cloud')
    && expected.origin === cloud.origin && cloud.hostname !== 'quaint-nightingale-675.eu-west-1.convex.cloud'
    && site.protocol === 'https:' && site.hostname.endsWith('.convex.site')
    && site.hostname.replace(/\.convex\.site$/, '') === cloud.hostname.replace(/\.convex\.cloud$/, '');
} catch { /* reported as a failed readiness check below */ }

check('dedicated Green Convex production target', targetMatches, 'CONVEX_CLOUD_URL must equal GREEN_CONVEX_CLOUD_URL; site URL must match');
check('server-only Convex service secret', validSecret('CONVEX_SERVICE_SECRET'), '64-hex secret required in Vercel and Green Convex');
check('Green public origin', env.PUBLIC_SITE_ORIGIN === 'https://www.bznsflowai.com', 'PUBLIC_SITE_ORIGIN must be the verified Green origin');
check('email OTP delivery configured', has('LEAD_ENDPOINT') && has('OTP_SHARED_SECRET') && env.OTP_SHARED_SECRET.length >= 16, 'Apps Script endpoint and shared secret are required');
check('Google sign-in configured', has('GOOGLE_CLIENT_ID') && has('GOOGLE_CLIENT_SECRET'), 'Google OIDC client pair required');
check('LinkedIn sign-in configured', has('LINKEDIN_CLIENT_ID') && has('LINKEDIN_CLIENT_SECRET'), 'LinkedIn OIDC client pair required');
check('Microsoft sign-in disabled', !has('MS_CLIENT_ID') && !has('MS_CLIENT_SECRET'), 'Remove Microsoft credentials until separately tested');
// Meta approved Instagram (2026-10-07). Open needs the app pair and its own webhook verify token; closed is also fine.
const instagramOpen = env.GREEN_INSTAGRAM_APPROVED === 'true' && env.GREEN_INSTAGRAM_ENABLED === 'true';
check('Instagram configured when open', !instagramOpen || ((has('GREEN_INSTAGRAM_APP_ID') || has('MAIN_INSTAGRAM_APP_ID')) && (has('GREEN_INSTAGRAM_APP_SECRET') || has('MAIN_INSTAGRAM_APP_SECRET')) && has('GREEN_INSTAGRAM_VERIFY_TOKEN')),
  'Instagram app ID and secret (MAIN_ or GREEN_INSTAGRAM_*) and GREEN_INSTAGRAM_VERIFY_TOKEN are required once both Instagram flags are on');
check('reviewed data migration gate', env.GREEN_DATA_MIGRATION_VERIFIED === 'true', 'Freeze source writes and verify Ahmed-only source/destination counts before cutover');
check('all production state paths use Convex', env.GREEN_STATE_PATHS_CONVEX === 'true', 'Auth, website, Layla, customer, dashboard and background routes must be migrated');
check('Green worker credential', validSecret('GREEN_MESSAGING_WORKER_SECRET'), 'Dedicated 64-hex Convex-to-Vercel worker secret required');
if (stage === 'live') {
check('Green owner number binding', ownerBindingValid && env.GREEN_WHATSAPP_OWNER_CONNECT_ENABLED === 'true'
  && !!env.GREEN_WHATSAPP_VERIFY_TOKEN
  && !!env.LAYLA_META_APP_SECRET && validSecret('LAYLA_CREDENTIAL_ENCRYPTION_KEY'), 'Green-only owner WABA, phone, business, system-user token, webhook verify token, app secret and encryption key are required');
check('WhatsApp explicitly enabled for Green', env.GREEN_WHATSAPP_ENABLED === 'true', 'Enable only after migration and owner connection are verified');
check('WhatsApp owner smoke test', env.GREEN_WHATSAPP_SMOKE_VERIFIED === 'true', 'Owner-controlled end-to-end check and Convex rollout evidence are required before broad sending');
}
check('no Supabase production write credentials', !has('SUPABASE_SERVICE_ROLE_KEY'), 'Remove Supabase service role from production after cutover; keep archive intact');

for (const item of checks) console.log(`${item.passed ? 'PASS' : 'BLOCK'} ${item.name}: ${item.detail}`);
const failed = checks.filter(item => !item.passed);
console.log(`Green ${stage} readiness: ${checks.length - failed.length}/${checks.length} gates passed`);
if (failed.length) process.exitCode = 1;
