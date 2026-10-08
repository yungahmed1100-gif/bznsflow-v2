import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { blueHarness, seedTenant } from './helpers/blue-tenant.mjs';
import { approvedKnowledge } from '../convex/knowledgeSourceState.js';
import { extractInformation } from '../src/lib/information-import.js';
const bundle = await build({ entryPoints:[fileURLToPath(new URL('../convex/knowledgeSources.ts',import.meta.url))], bundle:true, write:false, platform:'node', format:'esm' });
const { execute } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
async function setup() {
  const h = blueHarness(), a = await seedTenant(h.m), b = await seedTenant(h.m,{name:'b'});
  for (const [tokenHash, owner] of [['a',a],['b',b]]) await h.m.db.insert('sessions',{tokenHash,accountId:owner.accountId,expiresAt:Date.now()+100000});
  const call = (operation,args={},tokenHash='a') => execute._handler(h.m.ctx,{operation,tokenHash,...args});
  const save = (args={}) => call('save',{requestId:'draft-1',sourceKey:'source-1',title:'Can I bring my dog?',kind:'guided',text:'Dogs are welcome in the garden.',references:[],partial:false,...args});
  const publish = (args={}) => call('publish',{requestId:'draft-1',version:1,confirmed:true,...args});
  return {h,a,b,call,save,publish};
}
test('actual Convex entry rejects missing, expired, revoked and employee sessions',async()=>{
  const {h,a,call}=await setup();
  assert.equal((await call('list',{},'missing')).reason,'sign_in_required');
  const session=h.m.table('sessions')[0]; await h.m.db.patch(session._id,{expiresAt:1});
  assert.equal((await call('list')).reason,'sign_in_required'); await h.m.db.patch(session._id,{expiresAt:Date.now()+100000});
  const grant=h.m.table('blueAccessGrants')[0];await h.m.db.patch(grant._id,{status:'revoked'});
  assert.equal((await call('list')).reason,'access_required');await h.m.db.patch(grant._id,{status:'active'});
  await h.m.db.insert('ascendWorkspaceMembers',{accountId:a.accountId,status:'active'});
  assert.equal((await call('list')).reason,'manager_required');
});
test('saved and cancelled drafts cannot enter retrieval; partial extraction requires acknowledgement',async()=>{
  const {h,a,call,save,publish}=await setup();
  assert.equal((await save({partial:true})).ok,true);
  assert.deepEqual(await approvedKnowledge(h.m.ctx,a.accountId),[]);
  assert.equal((await publish()).reason,'review_required');
  assert.equal((await call('cancel',{requestId:'draft-1'})).ok,true);
  assert.equal((await publish({acceptPartial:true})).reason,'draft_changed');
});
test('publication is idempotent, current revisions replace retrieval and archive removes evidence',async()=>{
  const {h,a,call,save,publish}=await setup(); await save(); assert.equal((await publish()).ok,true);
  assert.equal((await publish()).value.replay,true); assert.equal(h.m.table('knowledgeRevisions').length,1);
  const old=await approvedKnowledge(h.m.ctx,a.accountId);assert.equal(old.find(k=>k.title==='Can I bring my dog?')?.text,'Dogs are welcome in the garden.','published answers reach Layla’s AI turn');
  await save({requestId:'draft-2',text:'Dogs are welcome on the terrace.'});
  assert.equal((await publish({requestId:'draft-2'})).reason,'source_changed');
  await publish({requestId:'draft-2',expectedRevision:1});
  assert.equal((await approvedKnowledge(h.m.ctx,a.accountId))[0].revision,2);
  assert.equal(h.m.table('hasibItems').length,0); assert.equal(h.m.table('blueCatalogEntries').length,0);
  await call('archive',{sourceKey:'source-1',expectedRevision:2}); assert.deepEqual(await approvedKnowledge(h.m.ctx,a.accountId),[]);
});
test('foreign drafts, revisions and archive attempts are refused by ownership',async()=>{
  const {call,save,publish}=await setup(); await save();await publish();
  assert.equal((await call('publish',{requestId:'draft-1',version:1,confirmed:true},'b')).reason,'draft_not_found');
  assert.equal((await call('open',{sourceKey:'source-1'},'b')).reason,'source_not_found');
  assert.equal((await call('archive',{sourceKey:'source-1',expectedRevision:1},'b')).reason,'source_not_found');
  assert.deepEqual((await call('list',{},'b')).value.sources,[]);
});
test('optimistic drafts, duplicate content, conflicting titles and invalid content are explicit',async()=>{
  const {save,publish,call}=await setup(); await save();
  assert.equal((await save({version:0,text:'Stale competing edit'})).reason,'draft_changed');
  assert.equal((await save({version:1,text:'Updated answer.'})).value.draft.version,2);
  assert.equal((await publish()).reason,'draft_changed');await publish({version:2});
  const result=await save({requestId:'draft-2',sourceKey:'source-2',title:'Different question',text:'Updated answer.'});
  assert.equal(result.value.duplicate.sourceKey,'source-1');
  assert.equal((await publish({requestId:'draft-2'})).reason,'duplicate_source');
  await save({requestId:'draft-3',sourceKey:'source-3',text:'Conflicting answer'});
  assert.equal((await publish({requestId:'draft-3'})).reason,'conflicting_source');
  assert.equal((await save({requestId:'bad',text:'\0'})).reason,'invalid_import');
  assert.equal((await call('save',{requestId:'bad'})).reason,'invalid_import');
});
test('cancellation terminates the parsing worker and does not resolve stale output',async()=>{
  const old=globalThis.Worker; let worker;
  globalThis.Worker=class { constructor(){worker=this;} postMessage(){} terminate(){this.terminated=true;} };
  try {
    const controller=new AbortController();const pending=extractInformation({name:'catalog.pdf'},{signal:controller.signal});controller.abort();
    await assert.rejects(pending,{name:'AbortError'});assert.equal(worker.terminated,true);
    const stopped=new AbortController();stopped.abort();await assert.rejects(extractInformation({}, {signal:stopped.signal}),{name:'AbortError'});
  } finally {globalThis.Worker=old;}
});

test('reviewed passage mapping retrieves uploaded facts and refuses pricing or missing mappings',async()=>{
 const {h,a,save,publish}=await setup();
 const text='Long extracted document. '.repeat(200);
 await save({text,references:[{label:'Page 2',text:'Dogs are welcome.',question:'Can my dog come?',answer:'Dogs are welcome.'}]});
 assert.equal((await publish()).ok,true);
 assert.equal((await approvedKnowledge(h.m.ctx,a.accountId)).find(k=>k.title==='Can my dog come?')?.text,'Dogs are welcome.');
 await save({requestId:'other',sourceKey:'other',title:'Other',text,references:[]});
 // Duplicate raw source is explicitly detected before a second publication.
 assert.equal((await publish({requestId:'other'})).reason,'duplicate_source');
 await save({requestId:'prices',sourceKey:'prices',title:'Price sheet',text:'Cost ٥٠ دولار',references:[]});
 assert.equal((await publish({requestId:'prices'})).reason,'prices_require_catalog_review');
});
test('replacement drafts retain their original revision and cannot overwrite a later publication',async()=>{
 const {save,publish,call}=await setup();await save();await publish();
 await save({requestId:'older',text:'First replacement'});await save({requestId:'newer',text:'Second replacement'});
 assert.equal((await publish({requestId:'newer',expectedRevision:1})).ok,true);
 assert.equal((await publish({requestId:'older',expectedRevision:2})).reason,'source_changed');
 const current=(await call('list')).value.drafts.find(d=>d.requestId==='older');assert.equal(current.baseRevision,1);
});
test('finished drafts do not consume active quota, archives are idempotent and publication fences old replies',async()=>{
 const {h,a,save,publish,call}=await setup();
 for(let i=0;i<105;i++) await h.m.db.insert('knowledgeImportDrafts',{accountId:a.accountId,requestId:`done-${i}`,status:'cancelled'});
 assert.equal((await save()).ok,true);assert.equal((await call('list')).value.drafts.length,1);await publish();
 assert.equal((await h.m.db.get(a.rowId)).profileVersion,2);
 await call('archive',{sourceKey:'source-1',expectedRevision:1});await call('archive',{sourceKey:'source-1',expectedRevision:1});
 assert.equal(h.m.table('knowledgeAudit').filter(row=>row.action==='archived').length,1);
 assert.equal((await h.m.db.get(a.rowId)).profileVersion,3);
});

test('a lost save response replays the same draft without a version increment',async()=>{
 const {h,save}=await setup();const first=await save({version:0});const retry=await save({version:0});
 assert.equal(first.value.draft.version,1);assert.equal(retry.value.replay,true);assert.equal(retry.value.draft.version,1);
 assert.equal(h.m.table('knowledgeImportDrafts').length,1);
});

test('knowledge HTTP boundary checks origin, CSRF and derives identity only from the cookie',async()=>{
 const {createKnowledgeApi}=await import('../api/_lib/knowledge-api.js');
 const {hashAccountToken}=await import('../api/_lib/blue-auth.js');
 let forwarded;
 const api=createKnowledgeApi({env:{PUBLIC_SITE_ORIGIN:'https://app.example.com'},store:async(operation,args)=>{forwarded={operation,...args};return {sources:[],drafts:[]};}});
 const invoke=async(req)=>{const headers={};const res={status(code){this.code=code;},setHeader(key,value){headers[key]=value;},getHeader(key){return headers[key];},end(value){this.body=JSON.parse(value);}};await api(req,res);return res;};
 const base={method:'POST',headers:{host:'app.example.com',origin:'https://app.example.com',cookie:`bf_session=${'c'.repeat(64)}; bf_csrf=token`,'x-csrf-token':'token'},body:{operation:'save',tokenHash:'forged',accountId:'foreign',references:[{label:'Page 2',text:'A fact',question:'A question?',answer:'An answer'}],baseRevision:999,approvedAnswers:[{question:'forged',answer:'forged'}]}};
 assert.equal((await invoke({...base,headers:{...base.headers,origin:'https://evil.example'}})).code,403);
 assert.equal((await invoke({...base,headers:{...base.headers,'x-csrf-token':'wrong'}})).code,403);
 assert.equal((await invoke(base)).code,200);assert.equal(forwarded.tokenHash,hashAccountToken('c'.repeat(64)));assert.equal(forwarded.accountId,undefined);assert.equal(forwarded.references[0].answer,'An answer');assert.equal(forwarded.baseRevision,undefined);assert.equal(forwarded.approvedAnswers,undefined);
});
