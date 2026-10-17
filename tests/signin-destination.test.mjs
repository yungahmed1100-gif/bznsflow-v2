import test from 'node:test';
import assert from 'node:assert/strict';
import { signinDestination } from '../config/signin-destination.js';

// One rule for every way into sign-in, shared with the OAuth callback so a social sign-in lands in one hop.
const granted = { profileComplete: true, accessPlan: 'catalyst', hasWorkspace: true };

test('a finished, granted account goes to its dashboard, or to setup while it has no workspace', () => {
  assert.equal(signinDestination({ account: granted, lang: 'ar' }), '/layla/dashboard');
  assert.equal(signinDestination({ account: { ...granted, hasWorkspace: false }, lang: 'en' }), '/en/catalyst/setup');
});

test('a profile still to fill, or no plan and nowhere to resume, stays on sign-in', () => {
  assert.equal(signinDestination({ account: { ...granted, profileComplete: false }, lang: 'en' }), null);
  assert.equal(signinDestination({ account: { profileComplete: true, accessPlan: null }, lang: 'en' }), null);
  assert.equal(signinDestination({ account: null }), null);
});

test('a saved destination is resumed, except the dashboard before a workspace exists (it would bounce back)', () => {
  assert.equal(signinDestination({ account: granted, next: '/mcp' }), '/mcp');
  assert.equal(signinDestination({ account: { ...granted, hasWorkspace: false }, next: '/en/layla/dashboard' }), '/en/catalyst/setup');
  assert.equal(signinDestination({ account: { profileComplete: true, accessPlan: null }, next: '/catalyst/setup' }), '/catalyst/setup');
});

test('only the known pages can be resumed', () => {
  assert.equal(signinDestination({ account: granted, lang: 'ar', next: '//evil.example' }), '/layla/dashboard');
  assert.equal(signinDestination({ account: granted, lang: 'ar', next: 'https://evil.example/layla/dashboard' }), '/layla/dashboard');
});
