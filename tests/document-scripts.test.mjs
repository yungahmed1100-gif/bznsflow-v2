import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { documentScripts } from '../src/document-scripts.js';

test('private owner documents never initialize marketing scripts or analytics storage', () => {
  const script = documentScripts.find(s => s.includes('fbevents.js'));
  assert(script);
  for (const pathname of [
    '/owner/layla',
    '/owner/layla/',
    '/owner',
    '/layla/setup',
    '/reviewer/layla',
    '/en/owner',
    '/en/owner/preview/retail',
    '/en/layla/dashboard',
  ])
    runInNewContext(script, {
      window: { location: { pathname } },
      get document() {
        throw Error('analytics touched document');
      },
      get localStorage() {
        throw Error('analytics touched storage');
      },
    });
});
