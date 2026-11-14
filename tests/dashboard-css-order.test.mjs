// The dashboard's phone layout must not depend on the order the bundler emits its stylesheets.
// layla-dashboard.css and dashboard-polish.css both set the phone grid; when their selectors had
// equal weight, adding an unrelated stylesheet (loading dots, 14 Nov 2026) reordered the bundle and
// pushed the tab bar to the top of the screen. The polish rule must outweigh the base rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** [ids, classes/attributes/pseudo-classes, elements] for one selector, ignoring :has() arguments. */
export function specificity(selector) {
  const s = selector.replace(/:has\((?:[^()]|\([^()]*\))*\)/g, ':has');
  return [
    (s.match(/#[\w-]+/g) || []).length,
    (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length,
    (s.replace(/\[[^\]]+\]/g, '').match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length,
  ];
}
const weigh = list => list.map(specificity).sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0];
const heavier = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Selectors of rules inside the phone media query that set the dashboard grid's rows. */
function phoneGridSelectors(file) {
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [];
  for (const media of css.matchAll(/@media\s*\(max-width:\s*768px\)\s*\{/g)) {
    const start = media.index + media[0].length;
    let depth = 1,
      i = start;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
    }
    const body = css.slice(start, i);
    for (const rule of body.matchAll(/([^{}]+)\{([^{}]*)\}/g))
      if (/grid-template-rows/.test(rule[2]))
        for (const sel of rule[1].split(','))
          if (/^\s*\.ld(\[|\s*$)/.test(sel.trim()) || sel.trim() === '.ld') found.push(sel.trim());
  }
  return found;
}

test('specificity counts classes, attributes and pseudo-classes, not :has() arguments', () => {
  assert.deepEqual(specificity('.ld'), [0, 1, 0]);
  assert.deepEqual(specificity(".ld[lang='ar']"), [0, 2, 0]);
  assert.deepEqual(specificity(".ld[dir][lang='ar']"), [0, 3, 0]);
  assert.deepEqual(specificity('.ld:has(.ld-chats.has-thread)'), [0, 2, 0]);
});

test('the phone grid in dashboard-polish.css outweighs the base rule, whatever the stylesheet order', () => {
  const base = phoneGridSelectors('src/styles/layla-dashboard.css');
  const polish = phoneGridSelectors('src/styles/dashboard-polish.css');
  assert.ok(base.length && polish.length, `found ${base} and ${polish}`);
  // Every base selector (plain and Arabic) must be outweighed by its polish counterpart.
  for (const lang of [false, true]) {
    const pick = list => list.filter(sel => sel.includes('lang=') === lang);
    assert.ok(
      heavier(weigh(pick(polish)), weigh(pick(base))) > 0,
      `${lang ? 'Arabic' : 'plain'}: ${pick(polish)} vs ${pick(base)}`,
    );
  }
});
