// Links within the site are built by src/lib/paths.js and nowhere else, so a
// page always links in its own language and every button that means the same
// thing leads to the same place.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditPath,
  dashboardPath,
  homePath,
  localePath,
  otherLanguagePath,
  plansPath,
  setupPath,
  signInPath,
} from '../src/lib/paths.js';
import { inPlace, isPlainClick } from '../src/lib/plain-click.js';
import { NEXT_PATH } from '../config/signin-destination.js';
import { livePackSummaries } from '../config/hasib-packs.js';
import { compact, readSource } from './helpers/source.mjs';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
// Where language prefixes may be written by hand: the builders themselves, and
// English content whose links are already English (each language has its own copy).
const ALLOWED = new Set(['lib/paths.js', 'lib/route-table.js', 'content/terms.js']);

function sourceFiles(dir = SRC) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'i18n' ? [] : sourceFiles(path);
    return /\.(jsx?|tsx?)$/.test(entry.name) ? [path] : [];
  });
}

/** Code without its comments, so prose that mentions /en is not counted. */
const code = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

test('no page builds a language prefix by hand', () => {
  const files = sourceFiles();
  assert.ok(files.length > 100, `scanned ${files.length} files`);
  const found = files
    .map(file => [
      relative(SRC, file),
      code(readSource(relative(fileURLToPath(new URL('../', import.meta.url)), file))),
    ])
    .filter(([name]) => !ALLOWED.has(name))
    .flatMap(([name, text]) =>
      [...compact(text).matchAll(/['"`]\/en(?:['"`/#?]|\$\{)|\?'':'\/en'|\?'\/en':''/g)].map(m => `${name}: ${m[0]}`),
    );
  assert.deepEqual(found, [], 'use localePath, homePath, auditPath, plansPath… from src/lib/paths.js');
});

test('paths stay in the language asked for', () => {
  assert.equal(localePath('ar', '/audit'), '/audit');
  assert.equal(localePath('en', '/audit'), '/en/audit');
  assert.equal(homePath('ar'), '/');
  assert.equal(homePath('en'), '/en');
  assert.equal(otherLanguagePath('ar', '/'), '/en');
  assert.equal(otherLanguagePath('en', '/mcp'), '/mcp');
  assert.equal(otherLanguagePath('ar', '/layla/dashboard?tab=work'), '/en/layla/dashboard?tab=work');
});

test('each named destination is the one page for its purpose', () => {
  assert.equal(auditPath('ar'), '/audit');
  assert.equal(auditPath('en'), '/en/audit');
  assert.equal(plansPath('ar'), '/#tiers');
  assert.equal(plansPath('en'), '/en#tiers');
  assert.equal(setupPath('en'), '/en/catalyst/setup');
  assert.equal(setupPath('ar', 'dashboard'), '/catalyst/setup?next=dashboard');
  assert.equal(dashboardPath('ar'), '/layla/dashboard');
  assert.equal(
    dashboardPath('en', { tab: 'settings', view: 'business' }),
    '/en/layla/dashboard?tab=settings&view=business',
  );
});

test('sign-in links carry a way back that sign-in accepts', () => {
  assert.equal(signInPath('ar'), '/signin');
  assert.equal(signInPath('en', '/en/owner/access'), '/en/signin?next=%2Fen%2Fowner%2Faccess');
  for (const lang of ['ar', 'en'])
    for (const page of ['/', '/mcp', '/owner', '/owner/apex', '/catalyst/setup', '/layla/dashboard']) {
      const next = new URL(signInPath(lang, localePath(lang, page)), 'https://x').searchParams.get('next');
      assert.match(next, NEXT_PATH, `${lang} ${page}`);
    }
});

test('only a plain left click is handled in the page', () => {
  assert.equal(isPlainClick({ button: 0 }), true);
  for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'])
    assert.equal(isPlainClick({ button: 0, [modifier]: true }), false, modifier);
  assert.equal(isPlainClick({ button: 1 }), false);
});

test('a link that works in place follows itself only on a modified click', () => {
  const calls = [];
  const click = modifiers => {
    let prevented = false;
    inPlace(() => calls.push(modifiers))({ button: 0, ...modifiers, preventDefault: () => (prevented = true) });
    return prevented;
  };
  assert.equal(click({}), true);
  assert.equal(click({ metaKey: true }), false);
  assert.deepEqual(calls, [{}]);
});

test('the admin home describes every live sector it previews', () => {
  const owner = compact(readSource('src/pages/OwnerHome.jsx'));
  const work = owner.slice(owner.indexOf('const WORK={'), owner.indexOf('};', owner.indexOf('const WORK={')));
  for (const { id } of livePackSummaries())
    assert.ok(work.includes(`'${id}':`) || work.includes(`${id}:`), `${id} has no description on the admin home`);
});
