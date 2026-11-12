// The site's routes are listed in three places: src/routes.ts (what the app
// renders), react-router.config.ts (what is prerendered; Vercel serves no SPA
// fallback, so an unprerendered route is a live 404) and src/routes-manifest.js
// (what the sitemap and hreflang publish). They must agree, and every page must
// exist in Arabic (no prefix) and English (/en).
import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGES } from '../src/routes-manifest.js';
import { prerenderedPaths, routedPaths } from './helpers/source.mjs';

const routed = (await routedPaths()).map(p => `/${p}`.replace(/\/$/, '') || '/');
const prerendered = await prerenderedPaths();
const DEV_ONLY = ['/owner/ascend-draft', '/en/owner/ascend-draft'];

/** A routed path as a matcher: `:param` matches one segment. */
const matcher = path => new RegExp(`^${path.replace(/:[^/]+/g, '[^/]+')}$`);
const isRouted = path => routed.some(r => matcher(r).test(path));
const english = path => (path === '/' ? '/en' : `/en${path}`);

test('the route list loads without the development-only pages', () => {
  assert.ok(routed.length > 30, `found ${routed.length} routes`);
  for (const path of DEV_ONLY) assert.ok(!routed.includes(path), `${path} must stay development-only`);
});

test('every route without a parameter is prerendered', () => {
  const missing = routed.filter(p => !p.includes(':') && !prerendered.includes(p));
  assert.deepEqual(missing, [], 'routed but not prerendered (a live 404)');
});

test('every parameterised route has at least one prerendered page', () => {
  for (const route of routed.filter(p => p.includes(':')))
    assert.ok(
      prerendered.some(p => matcher(route).test(p)),
      `${route} has no prerendered page`,
    );
});

test('every prerendered path is a route', () => {
  assert.deepEqual(
    prerendered.filter(p => !isRouted(p)),
    [],
  );
});

test('every Arabic page has an English twin and the other way round', () => {
  const arabic = routed.filter(p => p !== '/en' && !p.startsWith('/en/'));
  const englishPages = routed.filter(p => p === '/en' || p.startsWith('/en/'));
  assert.deepEqual(
    arabic.filter(p => !routed.includes(english(p))),
    [],
    'Arabic pages without an English route',
  );
  assert.deepEqual(
    englishPages.filter(p => !routed.includes(p.replace(/^\/en/, '') || '/')),
    [],
    'English pages without an Arabic route',
  );
  for (const path of prerendered.filter(p => p !== '/en' && !p.startsWith('/en/')))
    assert.ok(prerendered.includes(english(path)), `${path} is prerendered only in Arabic`);
});

test('every sitemap page is routed and prerendered in both languages', () => {
  for (const { path } of PAGES) {
    assert.ok(routed.includes(path), `${path} is in the sitemap but not routed`);
    assert.ok(
      prerendered.includes(path) && prerendered.includes(english(path)),
      `${path} is not prerendered in both languages`,
    );
  }
});
