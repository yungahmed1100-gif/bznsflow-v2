// PostHog (Ahmed, 2026-10-27): public pages on the live site only. These checks keep every private
// route out of analytics and keep the disclosure, the proxy and the key in step with the code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAnalyticsHost, isPrivatePath } from '../src/lib/posthog.js';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const routePaths = [...read('src/routes.ts').matchAll(/"?path"?:\s*["']([^"']+)["']/g)].map(([, path]) => `/${path}`);
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
  const source = read('src/lib/posthog.js');
  assert.match(source, /const PROJECT_KEY = 'phc_[A-Za-z0-9]{20,60}';/);
  assert.doesNotMatch(source, /phx_|sk-|secret/i, 'only the public key belongs in the page');
  assert.match(source, /api_host: '\/ingest'/);
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
  const privacy = read('src/content/privacy.js');
  assert.equal(privacy.match(/\['PostHog'/g)?.length, 2, 'processor row in English and Arabic');
  assert.equal(privacy.match(/\['ph_phc_…_posthog'/g)?.length, 2, 'cookie row in English and Arabic');
});
