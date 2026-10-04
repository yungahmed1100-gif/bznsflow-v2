// Apply and verify a private export against the explicitly pinned Green target.
import { readFile } from 'node:fs/promises';
const filename = process.argv[2];
if (!filename) throw new Error('Usage: node ops/migration/import-green-supabase.mjs /private/path/green-snapshot.json');
const cloud = process.env.GREEN_CONVEX_CLOUD_URL || '';
const site = process.env.CONVEX_SITE_URL || cloud.replace(/\.convex\.cloud\/?$/, '.convex.site');
const secret = process.env.CONVEX_SERVICE_SECRET || '';
if (!/^https:\/\/[a-z0-9-]+\.eu-west-1\.convex\.cloud$/.test(cloud) || !site.endsWith('.eu-west-1.convex.site') || !/^[a-f0-9]{64}$/i.test(secret)) {
  throw new Error('A pinned Green EU production endpoint and service secret are required');
}
const data = JSON.parse(await readFile(filename, 'utf8'));
if (data.format !== 1 || data.source !== 'supabase-read-only' || !data.expected) throw new Error('Unrecognized migration snapshot');
const call = async body => {
  const response = await fetch(`${site}/green-migrate`, { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) throw new Error(`Green migration endpoint failed: HTTP ${response.status}`);
  return result;
};
const imported = await call({ operation: 'import', accounts: data.accounts, identities: data.identities,
  conversations: data.conversations, messages: data.messages, expected: data.expected });
const verified = await call({ operation: 'verify', expected: data.expected });
if (!verified.ok || Object.keys(data.expected).some(key => verified.actual?.[key] !== data.expected[key])) {
  throw new Error('Green destination row counts did not match the reviewed source snapshot');
}
console.log(JSON.stringify({ imported: imported.imported, destinationCounts: verified.actual, integrity: verified.integrity, countsMatch: true }));
