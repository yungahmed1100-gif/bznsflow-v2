import test from 'node:test';
import assert from 'node:assert/strict';
import { convexMemory, SECRET } from './helpers/convex-memory.mjs';
import { importOwnerSnapshot, bindOwnerImport } from '../convex/greenOwnerImportState.js';
import { numberHash } from '../convex/hash.js';
const draftHash='c'.repeat(64);
function snapshot() { return { format:1,source:'blue-owner-read-only',ownerEmail:'ahmed@bznsflowai.com',exportedAt:1,
 expected:{contacts:1,conversations:1,messages:1,catalog:0},timezone:'Asia/Muscat',profile:null,integration:{id:'old-binding',phone:'123456',waba:'456789'},exclusions:{media:0},
 contacts:[{_id:'source_contact',state:'active',waId:'96890000000',numberHash:'old',source:'inbound',sectorId:'retail',fields:[],qualificationStatus:'new',consent:{status:'revoked'},optout:true,createdAt:1,updatedAt:1,lastActivityAt:1}],
 conversations:[{_id:'source_conversation',integrationId:'old-binding',contactId:'source_contact',number:'96890000000',lastInbound:1,takeover:true,optout:true,updatedAt:1}],
 messages:[{_id:'source_message',key:'msg-original',integrationId:'old-binding',conversationId:'source_conversation',direction:'out',text:'Historic reply',at:1,expiresAt:9999999999999,textExpiresAt:9999999999999,status:'read',providerId:'receipt-original'}],catalog:[] }; }
async function fixture(){const m=convexMemory();const owner=await m.db.insert('accounts',{email:'ahmed@bznsflowai.com',role:'owner',createdAt:1});return {m,owner};}
test('owner import remaps relationships and hashes, preserves consent/receipts, pauses sending and repeats safely',async()=>{
 const {m,owner}=await fixture(),s=snapshot();
 const first=await importOwnerSnapshot(m.ctx,{snapshot:s,draftHash},m.now(),SECRET);assert.equal(first.repeated,false);
 const contact=(await m.db.query('blueContacts').collect())[0],conversation=(await m.db.query('blueConversations').collect())[0],message=(await m.db.query('blueMessages').collect())[0];
 assert.equal(contact.accountId,owner);assert.equal(contact.numberHash,numberHash(SECRET,owner,contact.waId));assert.equal(contact.optout,true);assert.equal(contact.consent.status,'revoked');
 assert.equal(conversation.contactId,contact._id);assert.equal(conversation.takeover,true);assert.equal(message.conversationId,conversation._id);assert.equal(message.status,'read');assert.equal(message.providerId,'receipt-original');
 assert.equal((await m.db.query('blueMessagingSettings').collect())[0].enabled,false);
 assert.equal((await importOwnerSnapshot(m.ctx,{snapshot:s,draftHash},m.now(),SECRET)).repeated,true);
 assert.equal((await m.db.query('blueMessages').collect()).length,1);assert.equal((await m.db.query('sessions').collect()).length,0);
});
test('binding requires the verified original number and preserves historical delivery state without enabling sends',async()=>{
 const {m,owner}=await fixture(),s=snapshot();
 s.messages[0].key='incoming:old-binding:receipt-original';
 await importOwnerSnapshot(m.ctx,{snapshot:s,draftHash},m.now(),SECRET);
 await assert.rejects(()=>bindOwnerImport(m.ctx),/connection_required/);
 await m.db.patch(owner,{draftHash});
 const draftId=await m.db.insert('blueReviewSessions',{sessionHash:draftHash,accountId:owner,status:'paused',integration:{id:'green-binding',phone:'wrong',waba:'456789'},connectionChecks:{routing:true,registered:true,path:true}});
 await assert.rejects(()=>bindOwnerImport(m.ctx),/binding_mismatch/);
 await m.db.patch(draftId,{integration:{id:'green-binding',phone:'123456',waba:'456789'}});
 assert.deepEqual(await bindOwnerImport(m.ctx),{bound:true,repeated:false});
 const message=(await m.db.query('blueMessages').collect())[0];
 assert.equal(message.key,'incoming:green-binding:receipt-original');
 assert.equal(message.integrationId,'green-binding');
 assert.equal(message.status,'read');assert.equal(message.providerId,'receipt-original');
 assert.equal((await m.db.query('blueConversations').collect())[0].integrationId,'green-binding');
 assert.equal((await m.db.query('blueMessagingSettings').collect())[0].enabled,false);
 assert.deepEqual(await bindOwnerImport(m.ctx),{bound:true,repeated:true});
 assert.equal(m.scheduled.length,0);
});
test('owner import refuses foreign identities, pending outbound work, suppression ambiguity and changed snapshots',async()=>{
 for(const mutate of [s=>s.ownerEmail='other@example.com',s=>s.messages[0].status='queued',s=>s.contacts[0].state='deleted',s=>s.expected.messages=2]){
  const {m}=await fixture(),s=snapshot();mutate(s);await assert.rejects(()=>importOwnerSnapshot(m.ctx,{snapshot:s,draftHash},m.now(),SECRET));
  assert.equal((await m.db.query('blueMessages').collect()).length,0);
 }
 const {m}=await fixture(),s=snapshot();await importOwnerSnapshot(m.ctx,{snapshot:s,draftHash},m.now(),SECRET);s.messages[0].text='Changed source';
 await assert.rejects(()=>importOwnerSnapshot(m.ctx,{snapshot:s,draftHash},m.now(),SECRET),/reconcile_required/);
});
