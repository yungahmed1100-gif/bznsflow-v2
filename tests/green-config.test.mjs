import test from 'node:test';
import assert from 'node:assert/strict';
import { convexConfigured } from '../api/_lib/convex.js';
import { appUrl, convexEndpoints, isGreenConvexConfigured, instagramMessagingEnabled, messagingWorkerSecret, whatsappMessagingEnabled, broadcastMessagingEnabled } from '../api/_lib/green-config.js';
import { createInstagramApi, instagramConfig } from '../api/_lib/layla/instagram.js';
import { GREEN_ORIGIN } from './helpers/green-env.mjs';

const secret = 'a'.repeat(64);
const green = {
  GREEN_CONVEX_CLOUD_URL: 'https://green-prod.eu-west-1.convex.cloud',
  CONVEX_CLOUD_URL: 'https://green-prod.eu-west-1.convex.cloud',
  CONVEX_SITE_URL: 'https://green-prod.eu-west-1.convex.site',
  CONVEX_SERVICE_SECRET: secret,
  PUBLIC_SITE_ORIGIN: 'https://www.bznsflowai.com',
};

test('Green Convex must match the pinned cloud target, site deployment and server secret', () => {
  assert.equal(convexConfigured(green), true);
  assert.equal(isGreenConvexConfigured(green), true);
  assert.deepEqual(convexEndpoints(green), {
    cloud: green.CONVEX_CLOUD_URL,
    site: green.CONVEX_SITE_URL,
  });
  assert.equal(convexConfigured({ ...green, CONVEX_CLOUD_URL: 'https://other.eu-west-1.convex.cloud' }), false);
  assert.equal(convexConfigured({ ...green, CONVEX_SITE_URL: 'https://other.eu-west-1.convex.site' }), false);
  assert.equal(convexConfigured({ ...green, CONVEX_SERVICE_SECRET: 'short' }), false);
  assert.equal(convexConfigured({ ...green, GREEN_CONVEX_CLOUD_URL: undefined, VERCEL_ENV: 'production' }), false);
  assert.equal(convexConfigured({ ...green, BLUE_REVIEW_SERVICE_SECRET: secret, CONVEX_SERVICE_SECRET: undefined, VERCEL_ENV: 'production' }), false);
  assert.equal(convexConfigured({ ...green, CONVEX_CLOUD_URL: 'https://quaint-nightingale-675.eu-west-1.convex.cloud', CONVEX_SITE_URL: 'https://quaint-nightingale-675.eu-west-1.convex.site', GREEN_CONVEX_CLOUD_URL: undefined }), false);
});

test('Green callbacks use the configured public origin', () => {
  assert.equal(appUrl('/api/layla-meta', green), 'https://www.bznsflowai.com/api/layla-meta');
  assert.throws(() => appUrl('/x', { PUBLIC_SITE_ORIGIN: 'http://www.bznsflowai.com' }));
});

test('Green channel controls never inherit Blue live flags or worker credentials', () => {
  const prod={...green,VERCEL_ENV:'production',BLUE_LIVE_MESSAGING_ENABLED:'true',BLUE_INSTAGRAM_SEND_ENABLED:'true',BLUE_MESSAGING_WORKER_SECRET:'blue-only'};
  assert.equal(whatsappMessagingEnabled(prod),false);
  assert.equal(instagramMessagingEnabled(prod),false);
  assert.equal(broadcastMessagingEnabled(prod),false);
  assert.equal(messagingWorkerSecret(prod),'');
  assert.equal(whatsappMessagingEnabled({...prod,GREEN_WHATSAPP_ENABLED:'true'}),true);
  assert.equal(instagramMessagingEnabled({...prod,GREEN_INSTAGRAM_ENABLED:'true'}),false);
  assert.equal(instagramMessagingEnabled({...prod,GREEN_INSTAGRAM_ENABLED:'true',GREEN_INSTAGRAM_APPROVED:'true'}),true);
  assert.equal(broadcastMessagingEnabled({...prod,GREEN_WHATSAPP_ENABLED:'true',GREEN_BROADCAST_ENABLED:'true'}),true);
  assert.equal(messagingWorkerSecret({...prod,GREEN_MESSAGING_WORKER_SECRET:'green-only'}),'green-only');
});

test('Instagram integration refuses traffic without explicit approval', () => {
  assert.throws(() => instagramConfig({
    ...green,
    GREEN_INSTAGRAM_ENABLED: 'true',
    GREEN_INSTAGRAM_APP_ID: '1234',
    GREEN_INSTAGRAM_APP_SECRET: 'test-only',
  }), /instagram_unavailable/);
});

test('Instagram setup API reports unavailable without contacting Meta or storage', async () => {
  const handler=createInstagramApi({
    env:{PUBLIC_SITE_ORIGIN:GREEN_ORIGIN},
    store:async()=>assert.fail('Instagram storage should not be touched'),
    accounts:async()=>assert.fail('Instagram auth should not be touched'),
  });
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;},end(body){this.body=JSON.parse(body);}};
  await handler({method:'GET',url:'/api/layla-meta?surface=instagram',headers:{host:'www.bznsflowai.com'}},res,'instagram');
  assert.equal(res.statusCode,200);
  assert.deepEqual({available:res.body.available,approved:res.body.approved},{available:false,approved:false});
});
