import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler as createLaylaHandler } from '../api/layla-meta.js';
import { createHandler as createWebhookHandler } from '../api/layla-meta-webhook.js';
import { createHandler as createWorkerHandler } from '../api/layla-meta-worker.js';

const response = () => ({ headers: {}, setHeader(k,v){this.headers[k]=v;}, status(n){this.statusCode=n;}, end(body){this.body=body?JSON.parse(body):null;} });

test('Green cutover blocks legacy Layla state writes', async () => {
  let writes=0;
  const env={GREEN_CONVEX_CUTOVER:'true'};
  const store={read:async()=>{writes++;return {state:{}};},cas:async()=>{writes++;return true;}};
  const handler=createLaylaHandler({env,store,configuration:()=>({})});
  const res=response();
  await handler({method:'POST',url:'/api/layla-meta?surface=customer',headers:{host:'www.bznsflowai.com'},body:{action:'save'}},res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.reason,'green_state_migration_required');
  assert.equal(writes,0);
});

test('Green production blocks Convex-backed Layla writes before cutover certification', async () => {
  let calls=0;
  const env={VERCEL_ENV:'production',GREEN_CONVEX_CLOUD_URL:'https://green.eu-west-1.convex.cloud',
    GREEN_DATA_MIGRATION_VERIFIED:'false',GREEN_STATE_PATHS_CONVEX:'false'};
  const handler=createLaylaHandler({env,store:{read:async()=>{calls++;},cas:async()=>{calls++;}},configuration:()=>({})});
  const res=response();
  await handler({method:'POST',url:'/api/layla-meta?surface=customer',headers:{host:'www.bznsflowai.com'},body:{action:'save'}},res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.reason,'green_state_migration_required');
  assert.equal(calls,0);
});

test('Green cutover refuses the legacy Supabase webhook before acknowledging an event', async () => {
  let reads=0;
  const handler=createWebhookHandler({env:{GREEN_CONVEX_CUTOVER:'true'},store:{read:async()=>{reads++;},cas:async()=>{reads++;}}});
  const res=response();
  await handler({method:'GET',url:'/api/layla-meta-webhook?hub.mode=subscribe&hub.verify_token=x&hub.challenge=y',headers:{}},res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.reason,'webhook_configuration_missing');
  assert.equal(reads,0);
});

test('Green worker cannot fall back to Supabase after cutover is requested', async () => {
  let calls=0;
  const env={GREEN_CONVEX_CUTOVER:'true',GREEN_DATA_MIGRATION_VERIFIED:'true',LAYLA_META_WORKER_SECRET:'secret'};
  const handler=createWorkerHandler({env,store:{read:async()=>{calls++;},cas:async()=>{calls++;}}});
  const res=response();
  await handler({method:'POST',headers:{authorization:'Bearer secret'},body:{}},res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.reason,'green_cutover_not_ready');
  assert.equal(calls,0);
});
