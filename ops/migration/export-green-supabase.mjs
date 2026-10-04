// Read-only, allowlisted export for the Green migration. The output contains
// customer data; use a private path and never commit or upload it publicly.
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const output = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Usage: node ops/migration/export-green-supabase.mjs /private/path/green-snapshot.json');
const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase read credentials are unavailable');

async function rows(table, select) {
  const all = [];
  for (let offset = 0; ; offset += 500) {
    const endpoint = new URL(`${url}/rest/v1/${table}`);
    endpoint.searchParams.set('select', select);
    endpoint.searchParams.set('order', 'id.asc');
    endpoint.searchParams.set('limit', '500');
    endpoint.searchParams.set('offset', String(offset));
    const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!response.ok) throw new Error(`Supabase export failed for ${table}: HTTP ${response.status}`);
    const batch = await response.json();
    all.push(...batch);
    if (batch.length < 500) return all;
  }
}
const ms = value => value ? Date.parse(value) : undefined;
const accounts = (await rows('web_accounts', 'id,email,name,phone,country,industry,lang,verified_at,created_at,last_login_at,sheet_synced'))
  .map(x => ({ id: x.id, email: x.email, ...(x.name ? { name: x.name } : {}), ...(x.phone ? { phone: x.phone } : {}),
    ...(x.country ? { country: x.country } : {}), ...(x.industry ? { industry: x.industry } : {}),
    ...(x.lang === 'ar' || x.lang === 'en' ? { lang: x.lang } : {}), ...(ms(x.verified_at) ? { verifiedAt: ms(x.verified_at) } : {}),
    createdAt: ms(x.created_at), ...(ms(x.last_login_at) ? { lastLoginAt: ms(x.last_login_at) } : {}), crmSynced: false }));
const identities = (await rows('web_identities', 'id,provider,subject,email,created_at'))
  .filter(x => x.provider === 'google' || x.provider === 'linkedin')
  .map(x => ({ id: x.id, provider: x.provider, subject: x.subject, email: x.email || '', createdAt: ms(x.created_at) }));
const conversations = (await rows('web_conversations', 'id,session_key,lang,handoff,created_at,last_seen_at'))
  .map(x => ({ id: x.id, sessionKey: x.session_key, lang: x.lang === 'ar' ? 'ar' : 'en', handoff: !!x.handoff,
    createdAt: ms(x.created_at), lastAt: ms(x.last_seen_at || x.created_at) }));
const messages = (await rows('web_messages', 'id,conversation_id,role,content,created_at,seq'))
  .filter(x => x.role === 'user' || x.role === 'assistant')
  .map(x => ({ id: x.id, conversationId: x.conversation_id, role: x.role, content: x.content, createdAt: ms(x.created_at), seq: Number(x.seq) }));
const snapshot = { format: 1, source: 'supabase-read-only', exportedAt: new Date().toISOString(),
  accounts, identities, conversations, messages,
  expected: { accounts: accounts.length, identities: identities.length, conversations: conversations.length, messages: messages.length },
  exclusions: { web_auth_codes: 'not queried', web_sessions: 'not queried; all expire at cutover', web_rate_limits: 'not queried; ephemeral',
    layla_meta_state: 'not exported; synthetic mock rows only, separately verified empty of contacts/jobs/credentials' } };
await mkdir(dirname(output), { recursive: true, mode: 0o700 });
await writeFile(output, JSON.stringify(snapshot), { mode: 0o600, flag: 'wx' });
await chmod(output, 0o600);
console.log(JSON.stringify({ output: '<private snapshot>', counts: snapshot.expected, exclusions: snapshot.exclusions }));
