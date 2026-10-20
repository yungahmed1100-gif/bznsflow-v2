import assert from 'node:assert/strict';
import test from 'node:test';
import {requestEmailSubscription} from '../api/_lib/email-subscription.js';
const valid={emailOptIn:true,emailConsentVersion:'subscriber-v1',email:'test@example.test',name:'Test',language:'en'};
test('unchecked and legacy callers never request a subscription',async()=>{
 for(const body of [{},{...valid,emailOptIn:false},{...valid,emailOptIn:'true'}])
 assert.deepEqual(await requestEmailSubscription(body,{fetcher:()=>assert.fail('unexpected request')}),{subscription:'not_requested'});
});
test('stale consent wording or missing configuration cannot enroll',async()=>{
 assert.deepEqual(await requestEmailSubscription({...valid,emailConsentVersion:'old'}),{subscription:'failed'});
 assert.deepEqual(await requestEmailSubscription(valid,{env:{}}),{subscription:'failed'});
});
test('bridge uses narrow bearer, rejects redirects and reports durable acceptance',async()=>{
 const result=await requestEmailSubscription(valid,{env:{OUTREACH_SUBSCRIPTION_TOKEN:'test-secret'},fetcher:async(url,opts)=>{
 assert.equal(url,'https://dawn-brook-73ff.ahmed-2d3.workers.dev/subscribe');
 assert.equal(opts.headers.authorization,'Bearer test-secret');assert.equal(opts.redirect,'error');
 assert.deepEqual(JSON.parse(opts.body),{emailOptIn:true,consentVersion:'subscriber-v1',email:valid.email,name:'Test',language:'en'});
 return {ok:true,json:async()=>({ok:true,subscription:'confirmation_pending'})};}});
 assert.deepEqual(result,{subscription:'confirmation_pending'});
});
test('timeouts and rejected persistence are surfaced instead of claiming success',async()=>{
 for(const fetcher of [async()=>{throw Error('timeout')},async()=>({ok:false,json:async()=>({error:'failed'})}),async()=>({ok:true,json:async()=>({ok:true})})])
 assert.deepEqual(await requestEmailSubscription(valid,{env:{OUTREACH_SUBSCRIPTION_TOKEN:'test-secret'},fetcher}),{subscription:'failed'});
});
