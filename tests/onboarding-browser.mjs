// Browser verification for the guided-setup ladder inside the bzns.md editor.
//
//   npm run test:onboarding-browser -- http://localhost:5199
//
// Deliberately NOT a *.test.mjs file: it needs a running dev server, so it sits
// on an opt-in script like tests/layla-meta-browser.mjs and the other browser
// suites rather than inside `npm test`.
//
// The assertion that matters most is #5: the ladder DRAFTS answers into the
// business document and leaves it unconfirmed. Only the owner ticking the box
// by hand can publish, and Convex re-validates the document before it changes
// any answer (convex/reviewState.js, bzns_publish).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.argv[2] || 'http://localhost:5199';
const browser = await chromium.launch();
let checks = 0;

for (const [lang, url, open, next, skipLabel] of [
  ['en', `${BASE}/en/layla/setup`, 'Guide me through it', 'Next', 'Skip this'],
  ['ar', `${BASE}/layla/setup`, 'أرشدني خطوة بخطوة', 'التالي', 'تخطّي'],
]) {
  const ar = lang === 'ar', t = (en, arabic) => (ar ? arabic : en);
  const page = await browser.newPage();
  const errors = [], writes = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // /layla/setup renders ProductSetup; mock the API so the embedded onboarding mounts.
  await page.route('**/api/product-setup*', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'sign_in_required' }) }));
  await page.route('**/api/layla-meta*', async route => {
    const body = route.request().postDataJSON() || {};
    if (body.action) writes.push(body.action);
    return route.fulfill({ json: { ok: true, available: true, csrfToken: 'c', journeyStep: 0, profileVersion: 1, profile: null, integration: null,
      bzns: { markdown: null, version: 0, publishedRevision: 0, publishedAt: null, unpublishedChanges: false } } });
  });
  await page.goto(url, { waitUntil: 'networkidle' });

  // 1. A new owner starts from a sector template, not a blank page.
  await page.getByLabel(t('Your sector', 'مجال نشاطك')).selectOption('dental');
  await page.getByRole('button', { name: t('Use this template', 'استخدم هذا القالب') }).click();
  const doc = page.locator('.bzns-field textarea');
  assert.match(await doc.inputValue(), /sector: dental/);
  checks++;

  // 2. The guided lane is optional and collapsed behind one summary.
  await page.locator('.bzns-guided summary').click();
  const launch = page.getByRole('button', { name: open });
  await launch.waitFor({ timeout: 15000 });
  checks++;

  // 3. Opening it asks ONE question.
  await launch.click();
  const textareas = page.locator('section.layla-answer textarea');
  await textareas.first().waitFor();
  assert.equal(await textareas.count(), 1, `${lang}: a field rung must ask one thing at a time`);
  checks++;

  // 4. Answering writes into the matching section of the document.
  const typed = t('Cleaning and whitening', 'تنظيف وتبييض الأسنان');
  await textareas.first().fill(typed);
  await page.getByRole('button', { name: next }).click();
  await page.waitForFunction((value) => document.querySelector('.bzns-field textarea')?.value.includes(value), typed, { timeout: 5000 });
  assert.match(await doc.inputValue(), new RegExp(`## ${t('What we offer', 'خدماتنا')}\\n${typed}`));
  checks += 2;

  // 5. THE INVARIANT: a ladder-filled document is never a confirmed one.
  const confirm = page.getByLabel(t('I checked these business details', 'راجعت معلومات النشاط هذه'));
  const publish = page.getByRole('button', { name: t('Publish and continue', 'انشر وتابع') });
  assert.equal(await confirm.isChecked(), false, `${lang}: the ladder must not confirm facts`);
  assert.equal(await publish.isDisabled(), true, `${lang}: publish must stay disabled until confirmed`);
  assert.deepEqual(writes, [], `${lang}: guided answers never reach the server on their own`);
  checks += 3;

  // 6. Skipping advances rather than trapping the customer.
  await page.getByRole('button', { name: skipLabel }).click();
  await page.locator('section.layla-answer textarea').first().waitFor();
  checks++;

  assert.deepEqual(errors, [], `${lang}: console errors: ${errors.join(' | ')}`);
  checks++;
  console.log(`  ✓ ${lang}: guided setup drafts the business document and leaves it unconfirmed`);
  await page.close();

  // 9. Coming back from Instagram with a failure explains it in the page's language.
  const back = await browser.newPage();
  await back.route('**/api/product-setup*', route => route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } }));
  await back.goto(`${url}?instagram=connection_failed&reason=asset_in_use`, { waitUntil: 'networkidle' });
  const alert = back.getByRole('alert').filter({ hasText: lang === 'ar' ? 'حساب إنستغرام هذا مرتبط' : 'This Instagram account is already connected' });
  await alert.waitFor({ timeout: 10000 });
  checks++;
  // An unknown reason never leaks into the page; the generic message shows instead.
  await back.goto(`${url}?instagram=connection_failed&reason=%3Cscript%3E`, { waitUntil: 'networkidle' });
  await back.getByRole('alert').filter({ hasText: lang === 'ar' ? 'تعذّر إكمال ربط إنستغرام' : 'Instagram connection could not finish' }).waitFor({ timeout: 10000 });
  checks++;
  await back.close();
}

await browser.close();
console.log(`\n✓ guided-check: ${checks} assertions passed in both languages\n`);
