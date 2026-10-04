import test from 'node:test';
import assert from 'node:assert/strict';
import { greenSubscriptionReady, ownerConnection } from '../api/_lib/layla/review-api.js';
import { createHandler as createWebhookHandler } from '../api/layla-meta-webhook.js';
import { GREEN_CLOUD, GREEN_ORIGIN, GREEN_SECRET, GREEN_SITE } from './helpers/green-env.mjs';

const account={email:'Ahmed@bznsflowai.com'};
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;},end(body){this.body=body;}});
const ownerEnv={VERCEL_ENV:'production',GREEN_CONVEX_CLOUD_URL:GREEN_CLOUD,CONVEX_CLOUD_URL:GREEN_CLOUD,CONVEX_SITE_URL:GREEN_SITE,
  CONVEX_SERVICE_SECRET:GREEN_SECRET,PUBLIC_SITE_ORIGIN:GREEN_ORIGIN,GREEN_WHATSAPP_OWNER_CONNECT_ENABLED:'true',
  GREEN_WHATSAPP_OWNER_CONNECT:'ahmed@bznsflowai.com:111:222:333',GREEN_WHATSAPP_OWNER_CONNECT_TOKEN:'system-user-token-'.repeat(3),
  GREEN_WHATSAPP_VERIFY_TOKEN:'green-webhook-test-token',LAYLA_META_APP_SECRET:'app-secret',LAYLA_CREDENTIAL_ENCRYPTION_KEY:'b'.repeat(64)};

test('Green owner connection is exact-email and requires Green-only credentials',()=>{
  const readyOwnerEnv={...ownerEnv,GREEN_CONVEX_CUTOVER:'true',GREEN_DATA_MIGRATION_VERIFIED:'true',GREEN_STATE_PATHS_CONVEX:'true',GREEN_WHATSAPP_ENABLED:'true'};
  assert.equal(greenSubscriptionReady(ownerEnv),false);
  assert.equal(greenSubscriptionReady({...readyOwnerEnv,GREEN_WHATSAPP_ENABLED:'false'}),true);
  assert.equal(greenSubscriptionReady(readyOwnerEnv),true);
  assert.deepEqual(ownerConnection(readyOwnerEnv,account),{waba:'111',phone:'222',business:'333'});
  assert.equal(ownerConnection(ownerEnv,account),null);
  assert.deepEqual(ownerConnection({...readyOwnerEnv,GREEN_WHATSAPP_ENABLED:'false'},account),{waba:'111',phone:'222',business:'333'});
  assert.equal(ownerConnection(ownerEnv,{email:'someone@example.com'}),null);
  assert.equal(ownerConnection({...ownerEnv,GREEN_WHATSAPP_OWNER_CONNECT_ENABLED:'false'},account),null);
  assert.equal(ownerConnection({VERCEL_ENV:'production',...ownerEnv,GREEN_WHATSAPP_OWNER_CONNECT:'',BLUE_OWNER_CONNECT:ownerEnv.GREEN_WHATSAPP_OWNER_CONNECT,BLUE_OWNER_CONNECT_TOKEN:ownerEnv.GREEN_WHATSAPP_OWNER_CONNECT_TOKEN},account),null);
});

test('Green webhook challenge uses its configured callback token without touching legacy storage',async()=>{
  let legacy=0,messaging=0;
  const handler=createWebhookHandler({env:ownerEnv,store:{read:async()=>{legacy++;},cas:async()=>{legacy++;}},messaging:async()=>{messaging++;}});
  const res=response();
  await handler({method:'GET',url:'/api/layla-meta-webhook?hub.mode=subscribe&hub.verify_token=green-webhook-test-token&hub.challenge=probe',headers:{}},res);
  assert.equal(res.statusCode,200);assert.equal(res.body,'probe');assert.equal(legacy,0);assert.equal(messaging,0);
});

test('Green webhook refuses POST before the reviewed cutover gates without acknowledging or writing',async()=>{
  let legacy=0,messaging=0;
  const handler=createWebhookHandler({env:{...ownerEnv,GREEN_CONVEX_CUTOVER:'true',GREEN_DATA_MIGRATION_VERIFIED:'false'},
    store:{read:async()=>{legacy++;},cas:async()=>{legacy++;}},messaging:async()=>{messaging++;}});
  const res=response();
  await handler({method:'POST',url:'/api/layla-meta-webhook',headers:{},on(){assert.fail('body must not be read before release gates pass');}},res);
  assert.equal(res.statusCode,503);assert.equal(JSON.parse(res.body).reason,'green_cutover_not_ready');
  assert.equal(legacy,0);assert.equal(messaging,0);
});

test('signed paused ingress persists before acknowledgement and retries persistence failures',async()=>{
  const {createHmac}=await import('node:crypto');
  const env={...ownerEnv,GREEN_CONVEX_CUTOVER:'true',GREEN_DATA_MIGRATION_VERIFIED:'true',GREEN_STATE_PATHS_CONVEX:'true',GREEN_WHATSAPP_ENABLED:'false'};
  const raw=Buffer.from(JSON.stringify({object:'whatsapp_business_account',entry:[{id:'111',changes:[{field:'messages',value:{messaging_product:'whatsapp',metadata:{phone_number_id:'222'},messages:[{id:'message-test',from:'96891111111',timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:'Hello'}}]}}]}]}));
  const req=()=>({method:'POST',url:'/api/layla-meta-webhook',headers:{'x-hub-signature-256':'sha256='+createHmac('sha256',env.LAYLA_META_APP_SECRET).update(raw).digest('hex')},body:raw});
  const binding={integrationId:'owner-integration',app:'1388038082832745',waba:'111',phone:'222',sender:'96890000000',profile:{services:'Test',reviewed:true},profileVersion:1};
  let stored;
  const handler=createWebhookHandler({env,messaging:async(op,args)=>{
    if(op==='binding')return binding;
    assert.equal(op,'ingest');stored=args;return null;
  }});
  const res=response();await handler(req(),res);
  assert.equal(res.statusCode,200);assert.equal(stored.events.length,1);assert.equal(stored.suppressAutomation,true);
  const failing=createWebhookHandler({env,messaging:async op=>{if(op==='binding')return binding;throw Error('storage failed');}});
  const failure=response();await failing(req(),failure);assert.equal(failure.statusCode,503);
  const invalid=req();invalid.headers['x-hub-signature-256']='sha256='+'0'.repeat(64);
  const rejected=response();await handler(invalid,rejected);assert.equal(rejected.statusCode,403);
});


test('owner connection accepts the existing production variable names and rejects conflicting aliases',()=>{
  const env={...ownerEnv,GREEN_CONVEX_CUTOVER:'true',GREEN_DATA_MIGRATION_VERIFIED:'true',GREEN_STATE_PATHS_CONVEX:'true',
    GREEN_WHATSAPP_OWNER_CONNECT:undefined,GREEN_WHATSAPP_OWNER_CONNECT_TOKEN:undefined,
    ACCESS_TOKEN:ownerEnv.GREEN_WHATSAPP_OWNER_CONNECT_TOKEN,WHATSAPP_BUSINESS_ACCOUNT_ID:'111',WHATSAPP_BUSINESS_NUMBER_ID:'222'};
  assert.deepEqual(ownerConnection(env,account),{waba:'111',phone:'222'});
  assert.equal(ownerConnection(env,{email:'another@example.com'}),null);
  assert.equal(ownerConnection({...env,WHATSAPP_BUSINESS_NUMBER_ID:'+96891234567'},account),null);
  assert.equal(ownerConnection({...env,GREEN_WHATSAPP_OWNER_CONNECT:'ahmed@bznsflowai.com:999:222:333'},account),null);
  assert.equal(ownerConnection({...env,GREEN_WHATSAPP_OWNER_CONNECT_TOKEN:'a-different-token-value'},account),null);
});
