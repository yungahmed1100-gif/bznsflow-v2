// Read-only Ahmed-only export. Never exports auth sessions, sealed credentials,
// pending outbound effects, Instagram state or another customer's records.
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const output = process.argv[2];
if (!output) throw Error('Usage: node ops/migration/export-blue-owner.mjs <private-snapshot.json>');
const query = `
const account = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email','ahmed@bznsflowai.com')).unique();
if (!account) throw Error('owner_missing');
const pick = (row, keys) => Object.fromEntries(keys.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
const contacts = await ctx.db.query('blueContacts').withIndex('by_account_state_activity',q=>q.eq('accountId',account._id)).collect();
const conversations = await ctx.db.query('blueConversations').withIndex('by_account_updated',q=>q.eq('accountId',account._id)).collect();
const whatsappIds = new Set(conversations.filter(r=>!r.channel || r.channel==='whatsapp').map(r=>r._id));
const messages = await ctx.db.query('blueMessages').withIndex('by_account_at',q=>q.eq('accountId',account._id)).collect();
const draft = account.draftHash ? await ctx.db.query('blueReviewSessions').withIndex('by_hash',q=>q.eq('sessionHash',account.draftHash)).unique() : null;
const catalog = await ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order',q=>q.eq('ownerKey',String(account._id))).collect();
const settings = await ctx.db.query('blueBusinessSettings').withIndex('by_account',q=>q.eq('accountId',account._id)).unique();
const pending = new Set(['queued','pending','attempting','ambiguous']);
return { format:1, source:'blue-owner-read-only', ownerEmail:account.email, exportedAt:Date.now(),
 profile:draft?.profile || null, integration:draft?.integration ? pick(draft.integration,['id','app','waba','phone','sender','path']) : null,
 timezone:settings?.timezone || 'Asia/Muscat',
 contacts:contacts.filter(r=>!r.channel || r.channel==='whatsapp').map(r=>pick(r,['_id','state','waId','numberHash','countryIso','ownerName','customerName','profileName','source','sectorId','fields','qualificationStatus','qualificationOverride','asked','askCounts','lastAskedAt','consent','optout','optoutAt','lastActivityAt','lastInboundAt','searchText','createdAt','updatedAt','deletedAt'])),
 conversations:conversations.filter(r=>!r.channel || r.channel==='whatsapp').map(r=>pick(r,['_id','integrationId','number','contactId','version','lastInbound','takeover','optout','updatedAt'])),
 messages:messages.filter(r=>whatsappIds.has(r.conversationId) && !pending.has(r.status)).map(r=>pick(r,['_id','key','integrationId','conversationId','conversationVersion','profileVersion','direction','text','topic','at','expiresAt','textExpiresAt','status','manual','handoff','reason','providerId','errorCode'])),
 catalog:catalog.map(r=>pick(r,['_id','entryKey','kind','status','nameEn','nameAr','category','benefitEn','benefitAr','descriptionEn','descriptionAr','availability','prices','source','confidence','laylaUseEn','laylaUseAr','revision','sortOrder','createdAt','updatedAt'])),
 exclusions:{pendingOutbound:messages.filter(r=>pending.has(r.status)).length,media:messages.filter(r=>r.media).length,authSessions:true,credentials:true,otp:true,instagram:true}
};`;
const result = spawnSync('npx', ['convex','run','--deployment','quaint-nightingale-675','--inline-query',query], { encoding:'utf8', maxBuffer:8*1024*1024 });
if(result.status!==0) throw Error('Blue owner export failed; snapshot was not written');
const data=JSON.parse(result.stdout);
if(data.ownerEmail!=='ahmed@bznsflowai.com') throw Error('Owner mismatch');
data.expected=Object.fromEntries(['contacts','conversations','messages','catalog'].map(k=>[k,data[k].length]));
await mkdir(dirname(resolve(output)),{recursive:true,mode:0o700});
await writeFile(output,JSON.stringify(data),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({counts:data.expected,excluded:data.exclusions,tombstones:data.contacts.filter(r=>r.state==='deleted').length}));
