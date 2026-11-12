// PostHog (Ahmed, 2026-10-27): public pages on the live site only. These checks keep every private
// route out of analytics and keep the disclosure, the proxy and the key in step with the code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WIZARD_EVENTS, isAnalyticsHost, isPrivatePath, privateEvent } from '../src/lib/posthog.js';
import { readCompact, routedPaths } from './helpers/source.mjs';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const routePaths = (await routedPaths()).map(path => `/${path}`);
const PRIVATE_ROOTS = /^\/(?:en\/)?(?:owner|layla|catalyst|mcp|signin)(?:\/|$)/;

test('every private route in routes.ts is kept out of analytics, in Arabic and English', () => {
  const privateRoutes = routePaths.filter(path => PRIVATE_ROOTS.test(path));
  assert.ok(privateRoutes.length >= 15, `found ${privateRoutes.length} private routes`);
  for (const path of privateRoutes) assert.equal(isPrivatePath(path.replace(':packId', 'dental')), true, path);
  for (const path of ['/layla/dashboard?tab=chats', '/en/owner/apex/', '/signin', '/en/signin', '/mcp', '/catalyst/setup']) {
    assert.equal(isPrivatePath(path.split('?')[0]), true, path);
  }
});

test('the public pages are measured', () => {
  const publicRoutes = ['/', ...routePaths.filter(path => !PRIVATE_ROOTS.test(path))];
  assert.ok(publicRoutes.includes('/apex') && publicRoutes.includes('/en/audit'));
  for (const path of publicRoutes) assert.equal(isPrivatePath(path), false, path);
  // A public page whose name only starts like a private one stays public.
  assert.equal(isPrivatePath('/ownership'), false);
  assert.equal(isPrivatePath('/en/signing'), false);
});

test('only the live site sends events; local, preview and test hosts never do', () => {
  assert.equal(isAnalyticsHost('www.bznsflowai.com'), true);
  assert.equal(isAnalyticsHost('bznsflowai.com'), true);
  for (const host of ['127.0.0.1', 'localhost', 'bznsflow-main.vercel.app', 'bznsflow-blue.vercel.app', 'www.bznsflowai.com.evil.test']) {
    assert.equal(isAnalyticsHost(host), false, host);
  }
});

test('the key is the public project key, sent through our own /ingest proxy to PostHog US', () => {
  const source = readCompact('src/lib/posthog.js');
  assert.match(source, /const PROJECT_KEY='phc_[A-Za-z0-9]{20,60}';/);
  assert.doesNotMatch(source, /phx_|sk-|secret/i, 'only the public key belongs in the page');
  assert.match(source, /api_host:'\/ingest'/);
  const rewrites = JSON.parse(read('vercel.json')).rewrites;
  const ingest = rewrites.filter(r => r.source.startsWith('/ingest/'));
  assert.deepEqual(ingest.map(r => [r.source, r.destination]), [
    ['/ingest/static/:path*', 'https://us-assets.i.posthog.com/static/:path*'],
    ['/ingest/array/:path*', 'https://us-assets.i.posthog.com/array/:path*'],
    ['/ingest/:path*', 'https://us.i.posthog.com/:path*'],
  ]);
  assert.equal(rewrites.indexOf(ingest[2]), 2, 'the catch-all /ingest rewrite comes after the asset ones');
});

test('PostHog is disclosed in COOKIES.md and in the privacy policy, in both languages', () => {
  assert.match(read('COOKIES.md'), /`ph_phc_…_posthog`/);
  const privacy = readCompact('src/content/privacy.js');
  assert.equal(privacy.match(/\['PostHog'/g)?.length, 2, 'processor row in English and Arabic');
  assert.equal(privacy.match(/\['ph_phc_…_posthog'/g)?.length, 2, 'cookie row in English and Arabic');
});

test('on a private page only the website brief\'s funnel events leave, stripped to what they need', () => {
  const location = { origin: 'https://www.bznsflowai.com', pathname: '/layla/dashboard' };
  for (const event of ['$pageview', '$pageleave', '$autocapture', '$snapshot', '$exception', 'WhatsAppClick', 'website_brief_anything']) {
    assert.equal(privateEvent({ event, properties: { $current_url: 'https://www.bznsflowai.com/layla/dashboard' } }, location), null, event);
  }
  const sent = privateEvent({ event: 'website_brief_document_added', $set: { email: 'owner@example.com' }, $set_once: { a: 1 },
    properties: { slot: 'doc_id', name: 'id-sara.jpg', phone: '+968 9123 4567', reason: 'x'.repeat(41), token: 'phc_x', distinct_id: 'anon', $browser: 'Chrome',
      $current_url: 'https://www.bznsflowai.com/layla/dashboard?tab=website&conversation=c1', $pathname: '/layla/dashboard', $referrer: 'https://mail.example/inbox', $referring_domain: 'mail.example',
      $session_entry_url: 'https://www.bznsflowai.com/layla/dashboard?conversation=c1#m2' } }, location);
  assert.deepEqual(sent, { event: 'website_brief_document_added', properties: { slot: 'doc_id', token: 'phc_x', distinct_id: 'anon', $browser: 'Chrome',
    $current_url: 'https://www.bznsflowai.com/layla/dashboard', $pathname: '/layla/dashboard', $session_entry_url: 'https://www.bznsflowai.com/layla/dashboard' } },
  'no file name, phone, long value, query string (in any URL property), referrer or person properties');
  assert.ok(WIZARD_EVENTS.every(name => name.startsWith('website_brief_')));
  const source = readCompact('src/lib/posthog.js');
  assert.match(source, /persistence:'memory',disable_session_recording:true/, 'private mode stores nothing and records nothing');
});
