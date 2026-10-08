// bzns.md editor rehearsal on the Catalyst setup page: synthetic API, no external traffic.
// Proves template start, live checks (placeholders, prices, HTML), safe preview, draft save,
// publish handoff to the next step, accessibility and overflow at three widths in EN/AR.
//   npm run build && node scripts/preview.mjs --port 5199 & node tests/bzns-editor-browser.mjs http://127.0.0.1:5199
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { validateBzns, deriveProfile, setMeta } from '../src/lib/bzns-doc.js';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const valid = {
  en: `---\nname: Qurum Coast Properties\nsector: real-estate\n---\n# Qurum Coast Properties\n\n## About us\nFamily agency in Muscat since 2012.\n\n## What we offer\n- Rentals and sales\n- **Free** valuations\n\n## Hours\nSunday to Thursday 8:30 to 17:30\n\n## Location\nAl Qurum, Muscat. [Map](https://maps.example.test/qcp)\n\n## Team contact\nWhatsApp +968 9100 2000 (Sara)\n\n## FAQ\nQ: Are viewings free?\nA: Yes.\n`,
  ar: `---\nname: عقارات ساحل القرم\nsector: real-estate\n---\n# عقارات ساحل القرم\n\n## من نحن\nوكالة عائلية في مسقط منذ 2012.\n\n## خدماتنا\n- الإيجار والبيع\n- تقييم العقارات\n\n## ساعات العمل\nمن الأحد إلى الخميس\n\n## الموقع\nالقرم، مسقط\n\n## جهة اتصال الفريق\nواتساب 96891002000 (سارة)\n\n## الأسئلة الشائعة\nس: هل المعاينة مجانية؟\nج: نعم\n`,
};

const browser = await chromium.launch();
let checks = 0;
try {
  for (const lang of ['en', 'ar']) for (const width of [320, 768, 1440]) {
    const ar = lang === 'ar', t = (en, arabic) => (ar ? arabic : en);
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], writes = [];
    page.on('pageerror', e => errors.push(e.message));
    let state = { ok: true, available: true, csrfToken: 'c', journeyStep: 0, profileVersion: 1, profile: null, integration: null, savedToAccount: false, account: null,
      bzns: { markdown: null, version: 0, publishedRevision: 0, publishedAt: null, unpublishedChanges: false } };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== BASE) return route.abort();
      if (url.pathname.startsWith('/api/product-setup')) return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
      if (url.pathname === '/api/layla-meta') {
        const body = route.request().postDataJSON() || {};
        if (url.searchParams.get('surface') !== 'customer') return route.fulfill({ json: { ok: true, available: false } });
        if (body.action) writes.push(body);
        if (body.action === 'bzns_save') state = { ...state, bzns: { ...state.bzns, markdown: body.markdown, version: body.version + 1, unpublishedChanges: true } };
        if (body.action === 'bzns_publish') {
          const checked = validateBzns(body.markdown);
          if (!checked.ok) return route.fulfill({ status: 400, json: { ok: false, reason: 'bzns_invalid', errors: checked.errors } });
          const { businessName, profile } = deriveProfile(checked.parsed);
          state = { ...state, journeyStep: 4, profile: { ...profile, businessName }, bzns: { markdown: body.markdown, version: body.version + 1, publishedRevision: 1, publishedAt: Date.now(), unpublishedChanges: false } };
        }
        return route.fulfill({ json: state });
      }
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
      return route.continue();
    });
    await page.goto(`${BASE}${ar ? '' : '/en'}/catalyst/setup`);
    const editor = page.locator('.bzns-editor');

    // Start: pick a sector and load its template.
    await page.getByRole('heading', { name: t('Start your business document', 'ابدأ مستند نشاطك') }).waitFor();
    const startAudit = (await new AxeBuilder({ page }).include('.bzns-start').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact));
    assert.deepEqual(startAudit.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`), [], `start screen axe at ${lang}/${width}`); checks++;
    await page.getByLabel(t('Your sector', 'مجال نشاطك')).selectOption('real-estate');
    await page.getByRole('button', { name: t('Use this template', 'استخدم هذا القالب') }).click();
    const textarea = editor.locator('.bzns-field textarea');
    assert.match(await textarea.inputValue(), ar ? /## خدماتنا/ : /## What we offer/); checks++;
    assert.match(await textarea.inputValue(), /sector: real-estate/); checks++;

    // Unedited templates cannot be published and say which section to fix.
    await editor.getByText(t('Replace the [brackets]', 'استبدل ما بين [القوسين]'), { exact: false }).first().waitFor(); checks++;
    const publish = editor.getByRole('button', { name: t('Publish and continue', 'انشر وتابع') });
    assert.equal(await publish.isDisabled(), true); checks++;

    // Prices are refused with a pointer to where they belong.
    await textarea.fill(valid[lang].replace(ar ? 'الإيجار والبيع' : 'Rentals and sales', ar ? 'الإيجار من ٤٠٠ ر.ع' : 'Rentals from 400 OMR'));
    await editor.getByText(t('Remove prices or fees in', 'احذف الأسعار أو الرسوم في'), { exact: false }).waitFor(); checks++;

    // Raw HTML is refused and the preview never renders it as markup.
    await textarea.fill(valid[lang].replace(ar ? 'وكالة عائلية' : 'Family agency', '<img src=x onerror="window.__xss=1">'));
    await editor.getByText(t('Remove HTML tags in', 'احذف وسوم HTML في'), { exact: false }).waitFor();
    await editor.getByRole('tab', { name: t('Preview', 'معاينة') }).click();
    assert.equal(await page.locator('.bzns-preview img').count(), 0); checks++;
    assert.equal(await page.evaluate(() => window.__xss), undefined); checks++;
    await editor.getByRole('tab', { name: t('Write', 'كتابة') }).click();

    // A valid document: checklist complete, draft save, preview renders, then publish.
    await textarea.fill(valid[lang]);
    // Layla's style: choosing one rewrites the tone line and shows the welcome customers get first.
    const sweet = editor.getByRole('radio', { name: new RegExp(t('Helpful & sweet', 'ودودة ولطيفة')) });
    assert.equal(await editor.getByRole('radio', { name: new RegExp(t('Informative & nice', 'مفيدة ولطيفة')) }).isChecked(), true, 'Informative & nice is the default'); checks++;
    await sweet.check();
    assert.match(await textarea.inputValue(), /^---\n[\s\S]*tone: sweet\n---/); checks++;
    assert.match(await editor.locator('.bzns-tone-option[data-selected="true"] .bzns-tone-sample').textContent(), /😊/); checks++;
    assert.equal(await editor.locator('.layla-notice--problem').count(), 0); checks++;
    assert.equal(await editor.locator('.bzns-checklist li[data-done="true"]').count(), 5, 'five recommended sections present, team contact included (hours are optional)'); checks++;
    await editor.getByRole('button', { name: t('Save draft', 'حفظ المسودة') }).click();
    await editor.getByText(t('Draft saved.', 'تم حفظ المسودة.'), { exact: false }).waitFor();
    assert.deepEqual(writes.map(w => [w.action, w.version]), [['bzns_save', 0]]); checks++;
    await editor.getByRole('tab', { name: t('Preview', 'معاينة') }).click();
    const preview = page.locator('.bzns-preview');
    await preview.getByRole('heading', { name: ar ? 'عقارات ساحل القرم' : 'Qurum Coast Properties' }).waitFor(); checks++;
    if (!ar) { assert.equal(await preview.locator('a[href="https://maps.example.test/qcp"][rel="noopener noreferrer"]').count(), 1); checks++; }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `overflow at ${lang}/${width}`); checks++;
    const violations = (await new AxeBuilder({ page }).include('.bzns-editor').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact));
    assert.deepEqual(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`), [], `axe at ${lang}/${width}`); checks++;
    await editor.getByRole('tab', { name: t('Write', 'كتابة') }).click();
    assert.equal(await publish.isDisabled(), true, 'publishing needs the owner to confirm'); checks++;
    await editor.getByLabel(t('I checked these business details', 'راجعت معلومات النشاط هذه')).check();
    await publish.click();
    // Publishing goes straight to connecting a channel; there is no reading-only step in between.
    await page.getByRole('heading', { name: t('Connect a channel', 'اربط قناة') }).waitFor(); checks++;
    const sent = writes.find(w => w.action === 'bzns_publish');
    assert.equal(sent.version, 1); assert.equal(sent.markdown, setMeta(valid[lang], 'tone', 'sweet')); checks++;
    assert.equal(deriveProfile(validateBzns(sent.markdown).parsed).profile.tone, 'sweet'); checks++;
    assert.deepEqual(errors, [], `page errors at ${lang}/${width}`); checks++;
    await page.screenshot({ path: `work/bzns-editor-${lang}-${width}.png`, fullPage: false });
    await context.close();
  }
  // A saved draft that arrives after a slow first load opens in the editor, not the start screen.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await context.newPage();
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== BASE) return route.abort();
      if (url.pathname.startsWith('/api/product-setup')) return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
      if (url.pathname === '/api/layla-meta') {
        await new Promise(r => setTimeout(r, 800));
        return route.fulfill({ json: { ok: true, available: true, csrfToken: 'c', journeyStep: 0, profileVersion: 1, profile: null, integration: null,
          bzns: { markdown: valid.en, version: 3, publishedRevision: 0, publishedAt: null, unpublishedChanges: true } } });
      }
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
      return route.continue();
    });
    await page.goto(`${BASE}/en/catalyst/setup`);
    await page.locator('.bzns-field textarea').waitFor();
    assert.equal(await page.locator('.bzns-field textarea').inputValue(), valid.en); checks++;
    await context.close();
  }
  // The sector comes from sign-up: setup shows it, it does not offer a choice.
  for (const lang of ['en', 'ar']) {
    const ar = lang === 'ar', t = (en, arabic) => (ar ? arabic : en);
    const context = await browser.newContext({ viewport: { width: 375, height: 900 } }), page = await context.newPage();
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== BASE) return route.abort();
      if (url.pathname.startsWith('/api/product-setup')) return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
      if (url.pathname === '/api/layla-meta') return route.fulfill({ json: { ok: true, available: true, csrfToken: 'c', journeyStep: 0, profileVersion: 1, profile: null, integration: null,
        savedToAccount: true, account: { email: 'owner@example.com', industry: 'automotive' }, bzns: { markdown: null, version: 0, publishedRevision: 0, publishedAt: null, unpublishedChanges: false } } });
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
      return route.continue();
    });
    await page.goto(`${BASE}${ar ? '' : '/en'}/catalyst/setup`);
    await page.getByRole('heading', { name: t('Start your business document', 'ابدأ مستند نشاطك') }).waitFor();
    assert.equal(await page.locator('.bzns-start select').count(), 0, `${lang}: no sector choice during setup`); checks++;
    assert.match(await page.locator('.bzns-sector').innerText(), ar ? /السيارات/ : /Automotive/, `${lang}: the sign-up sector is shown`); checks++;
    await page.getByRole('button', { name: t('Use this template', 'استخدم هذا القالب') }).click();
    assert.match(await page.locator('.bzns-field textarea').inputValue(), /sector: automotive/, `${lang}: the template carries the sign-up sector`); checks++;
    assert.equal(await page.locator('.bzns-editor select').count(), 0, `${lang}: the editor in setup has no sector picker`); checks++;
    await context.close();
  }

  // Catalyst Settings: the one place the sector changes; Services & prices is its own view;
  // the Chats reminder lists only what is still missing.
  for (const lang of ['en', 'ar']) for (const width of [375, 1280]) {
    const ar = lang === 'ar', t = (en, arabic) => (ar ? arabic : en);
    const context = await browser.newContext({ viewport: { width, height: 900 } }), page = await context.newPage();
    const errors = [], writes = [];
    page.on('pageerror', e => errors.push(e.message));
    let customer = { ok: true, available: true, csrfToken: 'c', profile: { businessName: 'Qurum Coast Properties' }, savedToAccount: true,
      account: { email: 'owner@example.com', industry: 'real-estate' }, bzns: { markdown: valid[lang], version: 2, publishedRevision: 1, publishedAt: 1, unpublishedChanges: false } };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== BASE) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname !== '/api/layla-meta') return route.fulfill({ status: 404, json: { ok: false } });
      const surface = url.searchParams.get('surface'), body = route.request().postDataJSON() || {};
      if (surface === 'dashboard') {
        if (body.action) return route.fulfill({ json: { ok: true, items: [], cursor: null } });
        return route.fulfill({ json: { ok: true, csrfToken: 'c', connected: true, business: { name: 'Qurum Coast' }, plan: 'catalyst', workspaceRole: 'manager', timezone: 'Asia/Muscat',
          capabilities: { chats: true, customers: true, broadcasts: true, imports: true, customerExport: true }, qualification: { fields: [] }, handoffsOpen: 0, migrationPending: false,
          setup: { services: false, teamContact: true }, integration: null, messaging: { available: true, active: false, reason: 'not_activated' },
          instagram: { channel: 'instagram', username: 'qurum.coast', status: 'connected' }, instagramMessaging: { available: true, active: true, reason: '' } } });
      }
      if (surface === 'customer') {
        if (body.action === 'bzns_save') { writes.push(body); customer = { ...customer, bzns: { ...customer.bzns, markdown: body.markdown, version: body.version + 1, unpublishedChanges: true } }; }
        else if (body.action) return route.fulfill({ json: { ...customer, catalog: { entries: [], cursor: null } } });
        return route.fulfill({ json: customer });
      }
      return route.fulfill({ json: { ok: true, csrfToken: 'c' } });
    });
    await page.goto(`${BASE}${ar ? '' : '/en'}/layla/dashboard?tab=settings&view=business`);
    const sector = page.locator('.bzns-editor .bzns-sector select');
    await sector.waitFor();
    assert.equal(await sector.inputValue(), 'real-estate', `${lang}/${width}: Settings shows the current sector`); checks++;
    await sector.selectOption('automotive');
    assert.match(await page.locator('.bzns-field textarea').inputValue(), /sector: automotive/, `${lang}/${width}: changing it edits the document`); checks++;
    await page.getByRole('button', { name: t('Save draft', 'حفظ المسودة') }).click();
    await page.getByText(t('Draft saved', 'تم حفظ المسودة'), { exact: false }).first().waitFor();
    assert.match(writes.at(-1).markdown, /sector: automotive/, `${lang}/${width}: the new sector is saved`); checks++;
    const audit = (await new AxeBuilder({ page }).include('.ld-main').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact));
    assert.deepEqual(audit.map(v => v.id), [], `${lang}/${width}: Settings axe`); checks++;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${lang}/${width}: no overflow`); checks++;

    await page.locator('.ld-section-tabs').getByRole('link', { name: t('Services & prices', 'الخدمات والأسعار') }).click();
    await page.getByRole('heading', { level: 1, name: t('Services & prices', 'الخدمات والأسعار') }).waitFor(); checks++;
    assert.equal(await page.getByText(t('Upload a price list or catalog', 'ارفع قائمة أسعار أو كتالوج'), { exact: false }).count(), 1, `${lang}/${width}: price-list upload is offered`); checks++;

    await page.goto(`${BASE}${ar ? '' : '/en'}/layla/dashboard?tab=chats`);
    const reminder = page.locator('.ld-reminder');
    await reminder.waitFor();
    assert.deepEqual((await reminder.getByRole('link').allInnerTexts()).map(x => x.trim()), [t('Add your services & prices', 'أضف خدماتك وأسعارها')], `${lang}/${width}: only the missing item`); checks++;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${lang}/${width}: chats no overflow`); checks++;
    if (width === 375) await page.screenshot({ path: `work/catalyst-settings-reminder-${lang}.png`, fullPage: false });
    assert.deepEqual(errors, [], `${lang}/${width}: no page errors`); checks++;
    await context.close();
  }

  console.log(`${checks} bzns.md editor checks passed in English/Arabic at 320/768/1440. Synthetic API; no external traffic.`);
} finally { await browser.close(); }
