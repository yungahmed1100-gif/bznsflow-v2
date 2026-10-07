import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessAdmin } from '../api/access-admin.js';
import { PilotError } from '../api/_lib/layla/config.js';
import { executeAccess } from '../convex/blueAccessState.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { HASIB_LIVE_PACKS } from '../config/hasib-packs.js';
import { hasibPreviewResponse, dashboardPreviewResponse } from '../api/_lib/hasib/preview.js';

const token = 'a'.repeat(64), csrf = 'b'.repeat(64);
const request = (method = 'GET', body) => ({ method, body, headers: { host: 'www.bznsflowai.com', origin: 'https://www.bznsflowai.com', cookie: `bf_session=${token}; bf_csrf=${csrf}`, 'x-csrf-token': csrf } });
const response = () => ({ headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.statusCode=n; }, end(v) { this.body=JSON.parse(v); } });
test('access API preserves authentication, authorization and validation status', async () => {
  for (const [code,status] of [['sign_in_required',401],['admin_required',403],['invalid_email',400],['invalid_plan',400],['invalid_pack',400],['access_unavailable',503]]) {
    const res=response(); await createAccessAdmin({store:async()=>{throw new PilotError(code,409);}})(request(),res);
    assert.equal(res.statusCode,status); assert.equal(res.body.reason,code);
  }
});
test('access API refuses missing sessions, foreign origins and missing CSRF before writes', async () => {
  for (const edit of [r=>{r.headers.cookie='';},r=>{r.headers.origin='https://evil.example';},r=>{delete r.headers['x-csrf-token'];}]) {
    const req=request('POST',{email:'person@example.com',plan:'ascend'});edit(req); const res=response();
    await createAccessAdmin({store:async()=>{assert.fail('store called');}})(req,res);assert([401,403].includes(res.statusCode));
  }
});
test('Convex independently checks exact normalized owner identity and session expiry',async()=>{
 const m=convexMemory();const now=m.now();const accountId=await m.db.insert('accounts',{email:' AHMED@BZNSFLOWAI.COM '});
 const id=await m.db.insert('sessions',{accountId,tokenHash:token,expiresAt:now+1000});
 const args={operation:'list',sessionHash:token};assert.equal((await executeAccess(m.ctx,args,now)).ok,true);
 await m.db.patch(accountId,{email:'other@example.com'});assert.equal((await executeAccess(m.ctx,args,now)).reason,'admin_required');
 await m.db.patch(id,{expiresAt:now});assert.equal((await executeAccess(m.ctx,args,now)).reason,'sign_in_required');
});
test('grant, sector choice and audit persist together; revoke retains business records',async()=>{
 const m=convexMemory();const now=m.now();const actor=await m.db.insert('accounts',{email:'ahmed@bznsflowai.com'});
 await m.db.insert('sessions',{accountId:actor,tokenHash:token,expiresAt:now+1000});const person=await m.db.insert('accounts',{email:'person@example.com'});
 const args={sessionHash:token,email:'PERSON@example.com',operation:'grant',plan:'ascend',packId:'automotive'};
 assert.equal((await executeAccess(m.ctx,args,now)).ok,true);
 assert.equal((await m.db.query('hasibSettings').collect())[0].packId,'automotive');
 assert.equal((await m.db.query('blueAccessAudit').collect()).length,1);
 assert.equal((await executeAccess(m.ctx,{...args,packId:'clinic'},now)).reason,'invalid_pack');
 assert.equal((await m.db.query('blueAccessAudit').collect()).length,1);
 assert.equal((await executeAccess(m.ctx,{...args,operation:'revoke'},now)).ok,true);
 assert.equal((await m.db.query('blueAccessGrants').collect())[0].status,'revoked');
 assert.equal((await m.db.query('blueAccessAudit').collect()).length,2);
 assert.equal((await m.db.query('hasibSettings').collect())[0].accountId,person);
});
test('every live sector preview refuses writes and returns only synthetic dashboard data',()=>{
 for(const pack of HASIB_LIVE_PACKS){
  assert.equal(hasibPreviewResponse(pack,'overview').readOnly,true);
  assert.equal(dashboardPreviewResponse(pack,'overview').synthetic,true);
  for(const action of ['settings_update','order_create','team_invite','photo_upload_url','automotive_work_order_save']) assert.throws(()=>hasibPreviewResponse(pack,action),e=>e.code==='preview_read_only');
  for(const action of ['contact_update','campaign_create','set_timezone']) assert.throws(()=>dashboardPreviewResponse(pack,action),e=>e.code==='preview_read_only');
 }
});
test('a grant made before signup applies at first sign-in by code or OAuth, and revoking removes it', async () => {
 const { executeBlueAuth } = await import('../convex/blueAuthState.js');
 const m=convexMemory();const now=m.now();const actor=await m.db.insert('accounts',{email:'ahmed@bznsflowai.com'});
 await m.db.insert('sessions',{accountId:actor,tokenHash:token,expiresAt:now+1000});
 for (const [email,plan] of [['new.catalyst@example.com','catalyst'],['new.ascend@example.com','ascend']]) {
  assert.equal((await executeAccess(m.ctx,{sessionHash:token,email:email.toUpperCase(),operation:'grant',plan},now)).ok,true);
 }
 // Emailed code: the API normalizes the address before Convex sees it.
 const h=c=>c.repeat(64);
 await m.db.insert('blueAuthChallenges',{email:'new.catalyst@example.com',codeHash:h('c'),challengeId:'x',createdAt:now,expiresAt:now+600000,attempts:0,sent:true});
 const signedUp=await executeBlueAuth(m.ctx,{operation:'verify_code',email:'new.catalyst@example.com',ipHash:h('1'),codeHash:h('c'),tokenHash:h('d')},now);
 assert.equal(signedUp.ok,true);assert.equal(signedUp.value.accessPlan,'catalyst');assert.equal(signedUp.value.profileComplete,false);
 // OAuth with a differently cased verified address reaches the same grant.
 const oauth=await executeBlueAuth(m.ctx,{operation:'oauth_login',provider:'google',subject:'g-1',email:' New.Ascend@Example.com ',emailVerified:true,name:'New',tokenHash:h('e')},now);
 assert.equal(oauth.ok,true);assert.equal(oauth.value.accessPlan,'ascend');
 await executeAccess(m.ctx,{sessionHash:token,email:'new.ascend@example.com',operation:'revoke'},now);
 const after=await executeBlueAuth(m.ctx,{operation:'session',tokenHash:h('e')},now);
 assert.equal(after.value.email,'new.ascend@example.com');assert.equal(after.value.accessPlan,null);
});
test('the access list shows whether each address has signed up, and keeps revoked addresses visible', async () => {
  // 2026-10-07: access was revoked for the address that signs in and re-granted to a near-identical
  // address with no account. Both facts were invisible: revoked rows vanished and no row said "no account".
  const m = convexMemory(); const now = m.now();
  const actor = await m.db.insert('accounts', { email: 'ahmed@bznsflowai.com' });
  await m.db.insert('sessions', { accountId: actor, tokenHash: token, expiresAt: now + 1000 });
  await m.db.insert('accounts', { email: 'owner@example.com' });
  const act = args => executeAccess(m.ctx, { sessionHash: token, ...args }, now);
  assert.equal((await act({ operation: 'grant', email: 'owner@example.com', plan: 'catalyst' })).value.hasAccount, true);
  assert.equal((await act({ operation: 'revoke', email: 'owner@example.com' })).ok, true);
  const typo = await act({ operation: 'grant', email: 'owner1100@example.com', plan: 'ascend' });
  assert.equal(typo.value.hasAccount, false, 'granting an address nobody signs in with is flagged at once');
  const { grants, revoked } = (await act({ operation: 'list' })).value;
  assert.deepEqual(grants.map(g => [g.email, g.hasAccount]), [['owner1100@example.com', false]]);
  assert.deepEqual(revoked.map(g => [g.email, g.hasAccount, g.plan]), [['owner@example.com', true, 'catalyst']]);
});
