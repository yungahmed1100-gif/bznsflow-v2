// Operator CLI: uses the signed-in Convex operator and a fixed Green deployment.
// Private snapshot bodies and provider errors are never written to the console.
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const [websiteFile, ownerFile] = process.argv.slice(2);
if (!websiteFile || !ownerFile) throw Error('Usage: node ops/migration/apply-green-snapshots.mjs <website-snapshot> <owner-snapshot>');
const website = JSON.parse(await readFile(websiteFile, 'utf8'));
const owner = JSON.parse(await readFile(ownerFile, 'utf8'));
if (website.format !== 1 || website.source !== 'supabase-read-only'
  || owner.format !== 1 || owner.source !== 'blue-owner-read-only'
  || owner.ownerEmail !== 'ahmed@bznsflowai.com') throw Error('Unrecognized migration snapshots');
function call(name, args) {
  const result = spawnSync('npx', ['convex', 'run', '--deployment', 'rare-fish-465', name, JSON.stringify(args)], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) {
    const reason = result.stderr.match(/(?:owner|migration|green)_[a-z_]+/)?.[0] || 'provider_error';
    throw Error(`${name} failed: ${reason}; source data remains intact`);
  }
  return JSON.parse(result.stdout);
}
const payload = Object.fromEntries(['accounts', 'identities', 'conversations', 'messages', 'expected'].map(key => [key, website[key]]));
call('migrate:importReviewed', payload);
const verification = call('migrate:verify', { expected: website.expected });
if (!verification.ok) throw Error('Website migration integrity failed');
console.log(JSON.stringify({ website: verification }));
const imported = call('greenOwnerImport:importReviewed', { snapshot: owner, draftHash: randomBytes(32).toString('hex') });
// The identical second application exercises persisted relationship verification.
const repeated = call('greenOwnerImport:importReviewed', { snapshot: owner, draftHash: randomBytes(32).toString('hex') });
if (!repeated.repeated) throw Error('Owner migration repeat verification failed');
console.log(JSON.stringify({ owner: imported, repeatVerified: true, sendingEnabled: false }));
