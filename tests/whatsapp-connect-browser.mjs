// WhatsApp setup rehearsal: API and Meta SDK are synthetic, external traffic blocked.
// Proves the readiness journey, v4 launch options, a finished coexistence connection, and recovery from a Meta refusal.
// Not evidence of Meta consent or delivery.
//   npm run build && npx vite preview --port 5199 & node tests/whatsapp-connect-browser.mjs http://127.0.0.1:5199
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const OUT = 'work/whatsapp-connect';
await mkdir(OUT, { recursive: true });
// Records FB.login options, opens a popup like the SDK does, then reports a declined login.
const FAKE_SDK = `window.FB={init(o){window.__fbInit=o;},login(cb,o){window.__fbLogin=o;window.open('about:blank','fb');setTimeout(()=>cb({status:'not_authorized'}),50);}};`;
const browser = await chromium.launch();
let checks = 0;
try {
  for (const [lang, width] of [['en', 1440], ['ar', 768], ['en', 320]]) {
    const ar = lang === 'ar', t = (en, arabic) => ar ? arabic : en;
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' }), page = await context.newPage();
    const calls = [], begins = [], apiCalls = [], errors = [];
    const state = { ok: true, available: true, account: { email: 'owner@example.test' }, accountSaveAvailable: true, savedToAccount: true, journeyStep: 1, profileVersion: 1, csrfToken: 'c',
      profile: { businessName: 'Noor Abayas', sector: 'Retail', services: 'Abayas', humanContact: 'team@example.test', reviewed: true, faqs: [] }, integration: null };
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.hostname === 'connect.facebook.net') return route.fulfill({ contentType: 'text/javascript', body: FAKE_SDK });
      if (u.origin !== BASE) return route.abort();
      if (u.pathname === '/api/layla-meta') {
        const body = route.request().postDataJSON() || {}, surface = u.searchParams.get('surface');
        if (surface !== 'customer') return route.fulfill({ json: { ok: true, connected: false, available: false } });
        calls.push(body.action || 'get');
        if (body.action === 'begin') begins.push(body);
        if (body.action === 'begin') return route.fulfill({ json: { ...state, attempt: `a-${calls.length}`, state: 'f'.repeat(64), path: body.path, expiresAt: Date.now() + 600000, appId: '1388038082832745', configId: '998877665544', version: 'v25.0', esVersion: 'v4' } });
        return route.fulfill({ json: state });
      }
      if (u.pathname.startsWith('/api/product-setup')) return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
      if (u.pathname.startsWith('/api/')) { apiCalls.push(u.pathname); return route.fulfill({ status: 404, json: { ok: false } }); }
      return route.continue();
    });
    await page.goto(`${BASE}/${ar ? '' : 'en/'}catalyst/setup`);
    await page.getByRole('heading', { name: t('Connect a channel', 'اربط قناة'), exact: true }).waitFor();
    assert.equal(calls.includes('begin'), false, 'no Meta attempt before the customer asks for WhatsApp'); checks++;
    const card = page.getByRole('region', { name: 'WhatsApp', exact: true });
    await card.getByRole('button', { name: t('Connect WhatsApp', 'ربط واتساب'), exact: true }).click();
    assert.equal(calls.filter(c => c === 'begin').length, 0, 'opening help does not start a Meta attempt'); checks++;
    await page.screenshot({ path: `${OUT}/${lang}-${width}-choose-app.png`, fullPage: true });
    // Two choices, no portfolio IDs and no second question (Ahmed, 2026-10-25).
    const radios = card.getByRole('radio');
    assert.equal(await radios.count(), 2, 'two number choices'); checks++;
    const businessChoice = card.getByRole('radio', { name: new RegExp(t('My WhatsApp Business number', 'رقم واتساب للأعمال الخاص بي')) });
    const otherChoice = card.getByRole('radio', { name: new RegExp(t('A different number', 'رقم آخر')) });
    assert.equal(await businessChoice.isChecked(), true, 'the WhatsApp Business number is chosen by default'); checks++;
    assert.equal(await card.getByText(t('My number is in a different Meta business portfolio', 'رقمي في محفظة أعمال مختلفة')).count(), 0, 'no portfolio IDs'); checks++;
    assert.equal(await card.getByRole('heading', { name: t('Which WhatsApp do you use for your shop?', 'أي واتساب تستخدم لمتجرك؟') }).count(), 0, 'no second question'); checks++;
    const switchGuide = card.getByText(t('Only have regular WhatsApp? How to switch', 'تستخدم واتساب العادي؟ طريقة الانتقال'), { exact: true });
    assert.equal(await card.getByRole('link', { name: 'App Store (iPhone)' }).isVisible(), false, 'the switch guide starts closed'); checks++;
    await switchGuide.click();
    assert.equal(await card.getByRole('link', { name: 'App Store (iPhone)' }).isVisible(), true); checks++;
    assert.equal(await card.getByRole('link', { name: 'Google Play (Android)' }).isVisible(), true); checks++;
    assert.equal(await businessChoice.isChecked(), true, 'opening the guide does not change the choice'); checks++;
    // One short line instead of the ten-item checklist (Ahmed, 2026-10-24): nothing to tick, Meta is one press away.
    await card.locator('.layla-ready-line').waitFor();
    assert.equal(await card.locator('.layla-ready-line').textContent(), t('Have your phone with WhatsApp Business (updated) and your Facebook login ready.', 'جهّز هاتفك وعليه واتساب للأعمال (محدّث) وتسجيل دخول فيسبوك.')); checks++;
    assert.equal(await card.getByRole('heading', { name: t('Before you start, have these ready', 'قبل أن تبدأ، جهّز ما يلي') }).count(), 0, 'no checklist'); checks++;
    assert.equal(await card.getByRole('checkbox').count(), 0, 'nothing to tick'); checks++;
    assert.equal(await card.getByRole('button', { name: t('Get Meta ready', 'تجهيز الربط مع Meta'), exact: true }).isDisabled(), false, 'Meta is ready to prepare straight away'); checks++;
    await page.screenshot({ path: `${OUT}/${lang}-${width}-ready-line.png`, fullPage: true });
    const metaGuide = card.getByText(t('What you’ll see in Facebook’s window', 'ما ستراه في نافذة فيسبوك'), { exact: true });
    await metaGuide.waitFor();
    assert.equal(calls.filter(c => c === 'begin').length, 0, 'the owner chooses when to prepare Meta'); checks++;
    // The setup help chat is retired: BznsBrain and the WhatsApp card carry their own guidance.
    assert.equal(await page.getByRole('button', { name: t('Open setup help chat', 'فتح محادثة مساعدة الإعداد') }).count(), 0); checks++;
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = axe.violations.filter(item => ['serious', 'critical'].includes(item.impact));
    assert.deepEqual(serious.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), [], `serious accessibility findings at ${lang}/${width}`); checks++;
    await card.getByRole('button', { name: t('Get Meta ready', 'تجهيز الربط مع Meta'), exact: true }).click();
    const connect = card.getByRole('button', { name: t('Connect with Facebook', 'الربط عبر فيسبوك'), exact: true });
    await connect.waitFor();
    // Switching the number type releases the unused attempt before preparing another.
    await otherChoice.check();
    assert.equal(await card.locator('.layla-ready-line').count(), 0, 'the app line is only for the WhatsApp Business number'); checks++;
    await card.getByRole('button', { name: t('Get Meta ready', 'تجهيز الربط مع Meta'), exact: true }).click();
    await connect.waitFor();
    assert.deepEqual(calls.filter(c => ['begin', 'cancel'].includes(c)), ['begin', 'cancel', 'begin']); checks++;
    assert.deepEqual(begins, [{ action: 'begin', path: 'coexistence' }, { action: 'begin', path: 'new_number' }], 'a different number is a new_number attempt with nothing else'); checks++;
    await page.screenshot({ path: `${OUT}/${lang}-${width}-ready.png`, fullPage: true });
    await connect.click();
    await page.getByRole('alert').filter({ hasText: t('Meta permissions were declined', 'رُفضت أذونات Meta') }).waitFor(); checks++;
    const options = await page.evaluate(() => window.__fbLogin);
    assert.deepEqual(options.extras, {}, 'v4 extras stay empty for a new number'); checks++;
    assert.equal(options.config_id, '998877665544'); assert.equal(options.auth_type, undefined); checks++;
    assert.equal((await page.evaluate(() => window.__fbInit)).fedCM, false); checks++;
    assert.equal(calls.at(-1), 'cancel', 'the declined attempt is released'); checks++;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `no horizontal scroll at ${width}px`); checks++;
    await page.screenshot({ path: `${OUT}/${lang}-${width}-declined.png`, fullPage: true });
    assert.deepEqual(errors, []); checks++;
    await context.close();
  }
  // My WhatsApp Business number, end to end: Meta finishes, the page says it is finishing, then shows the connection.
  // `message` sends Meta's finish event (any FINISH name); without it the code goes alone and the server finds the WABA.
  for (const [lang, width, message] of [['en', 1280, 'FINISH'], ['ar', 375, 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'], ['en', 768, null]]) {
    const ar = lang === 'ar', t = (en, arabic) => ar ? arabic : en;
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' }), page = await context.newPage();
    const calls = [], finishes = [], errors = [];
    const state = { ok: true, available: true, account: { email: 'owner@example.test' }, accountSaveAvailable: true, savedToAccount: true, journeyStep: 1, profileVersion: 1, csrfToken: 'c',
      profile: { businessName: 'Noor Abayas', sector: 'Retail', services: 'Abayas', humanContact: 'team@example.test', reviewed: true, faqs: [] }, integration: null };
    // Meta's event comes from a facebook.com window that is not the popup handle (a phone-only flow finishes in another tab).
    const sdk = `window.FB={init(o){},login(cb,o){window.open('about:blank','fb');setTimeout(()=>{${message ? `window.dispatchEvent(new MessageEvent('message',{origin:'https://web.facebook.com',data:JSON.stringify({type:'WA_EMBEDDED_SIGNUP',event:'${message}',data:{waba_id:'111222',phone_number_id:'333444'}})}));` : ''}cb({status:'connected',authResponse:{code:'meta-code'}});},50);}};`;
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.hostname === 'connect.facebook.net') return route.fulfill({ contentType: 'text/javascript', body: sdk });
      if (u.origin !== BASE) return route.abort();
      if (u.pathname === '/api/layla-meta') {
        const body = route.request().postDataJSON() || {}, surface = u.searchParams.get('surface');
        if (surface !== 'customer') return route.fulfill({ json: { ok: true, connected: false, available: false } });
        calls.push(body.action || 'get');
        if (body.action === 'begin') return route.fulfill({ json: { ...state, attempt: 'a-1', state: 'f'.repeat(64), path: body.path, expiresAt: Date.now() + 1800000, appId: '1388038082832745', configId: '998877665544', version: 'v25.0', esVersion: 'v4' } });
        if (body.action === 'finish') {
          finishes.push(body);
          await new Promise(r => setTimeout(r, 700));
          Object.assign(state, { status: 'connected', integration: { id: 'i1', sender: '96890000000', path: 'coexistence', status: 'connected' }, connectionChecks: { path: true, registered: true, routing: true, nameStatus: 'APPROVED' } });
        }
        return route.fulfill({ json: state });
      }
      if (u.pathname.startsWith('/api/product-setup')) return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
      if (u.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
      return route.continue();
    });
    await page.goto(`${BASE}/${ar ? '' : 'en/'}catalyst/setup`);
    const card = page.getByRole('region', { name: 'WhatsApp', exact: true });
    await card.getByRole('button', { name: t('Connect WhatsApp', 'ربط واتساب'), exact: true }).click();
    await card.getByRole('button', { name: t('Get Meta ready', 'تجهيز الربط مع Meta'), exact: true }).click();
    await card.getByRole('button', { name: t('Connect with Facebook', 'الربط عبر فيسبوك'), exact: true }).click();
    await card.getByRole('button', { name: t('Finishing your connection…', 'جارٍ إكمال الربط…') }).waitFor({ timeout: 8000 }); checks++;
    assert.equal(await card.getByRole('button', { name: t('Cancel this attempt', 'إلغاء هذه المحاولة') }).count(), 0, 'nothing to cancel once Meta has answered'); checks++;
    await card.getByRole('heading', { name: t('Connected ✓ What’s next', 'تم الربط ✓ ما التالي') }).waitFor({ timeout: 10000 }); checks++;
    assert.equal(finishes.length, 1, 'finished exactly once'); checks++;
    assert.deepEqual({ ...finishes[0], state: undefined }, { action: 'finish', attempt: 'a-1', state: undefined, code: 'meta-code', ...(message ? { waba: '111222', phone: '333444' } : {}) },
      message ? `${message} from another facebook.com window is used` : 'no message: the code goes alone and the server finds the WABA'); checks++;
    assert.equal(calls.includes('cancel'), false, 'the attempt is not thrown away'); checks++;
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    assert.deepEqual(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact)).map(item => item.id), [], `${lang}/${width}: accessibility`); checks++;
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 1, `${lang}/${width}: no horizontal scroll`); checks++;
    await page.screenshot({ path: `${OUT}/${lang}-${width}-connected${message ? '' : '-code-only'}.png`, fullPage: true });
    assert.deepEqual(errors, []); checks++;
    await context.close();
  }
  // A signed-in owner whose setup is still only in this browser gets it attached to the account automatically.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }), page = await context.newPage();
    const calls = [];
    const state = { ok: true, available: true, account: { email: 'owner@example.test' }, accountSaveAvailable: true, savedToAccount: false, journeyStep: 1, profileVersion: 1, csrfToken: 'c',
      profile: { businessName: 'Qurum Coast Properties', sector: 'Real estate', services: 'Sales', humanContact: '96892183502', reviewed: true, faqs: [] }, integration: null };
    await page.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.hostname === 'connect.facebook.net') return route.fulfill({ contentType: 'text/javascript', body: FAKE_SDK });
      if (u.origin !== BASE) return route.abort();
      if (u.pathname === '/api/layla-meta') {
        const body = route.request().postDataJSON() || {};
        if (u.searchParams.get('surface') !== 'customer') return route.fulfill({ json: { ok: true, connected: false, available: false } });
        calls.push(body.action || 'get');
        // The first (automatic) claim is refused; the owner recovers from the checklist.
        if (body.action === 'claim_draft' && calls.filter(c => c === 'claim_draft').length === 1) return route.fulfill({ status: 409, json: { ok: false, reason: 'draft_operation_in_progress' } });
        if (body.action === 'claim_draft') state.savedToAccount = true;
        return route.fulfill({ json: state });
      }
      if (u.pathname.startsWith('/api/product-setup')) return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
      if (u.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
      return route.continue();
    });
    await page.goto(`${BASE}/catalyst/setup`);
    const card = page.getByRole('region', { name: 'WhatsApp', exact: true });
    const alert = card.getByRole('alert');
    await alert.waitFor();
    assert.equal(calls.filter(c => c === 'claim_draft').length, 1, 'the setup is claimed once automatically'); checks++;
    assert.match(await alert.textContent(), /خطوة ربط ما زالت قيد الإنهاء/, 'the refusal says what to do'); checks++;
    assert.equal(await alert.evaluate(el => document.activeElement === el), true, 'the message takes focus'); checks++;
    await card.getByRole('button', { name: 'ربط واتساب', exact: true }).click();
    const prepare = card.getByRole('button', { name: 'تجهيز الربط مع Meta' });
    assert.equal(await prepare.isDisabled(), true); checks++;
    assert.match(await prepare.getAttribute('aria-describedby'), /whatsapp-requirements/, 'the disabled button points to what is missing'); checks++;
    await card.getByRole('button', { name: 'احفظ إعدادي في حسابي' }).click();
    await page.waitForFunction(() => !document.querySelector('#whatsapp-requirements button'));
    assert.equal(calls.filter(c => c === 'claim_draft').length, 2, 'one press saves the setup'); checks++;
    assert.equal(await page.getByRole('heading', { name: 'احفظ إعدادك لربط القنوات' }).count(), 0, 'no hidden save prompt for a signed-in owner'); checks++;
    await context.close();
  }
  // Meta's connection switched off on our side: the card says so first, with no choices or checklist to work through.
  for (const lang of ['en', 'ar']) {
    const ar = lang === 'ar', t = (en, arabic) => ar ? arabic : en;
    const page = await browser.newPage();
    const state = { ok: true, available: false, account: { email: 'owner@example.test' }, accountSaveAvailable: true, savedToAccount: true, journeyStep: 1, profileVersion: 1, csrfToken: 'c',
      profile: { businessName: 'Noor Abayas', sector: 'Retail', services: 'Abayas', humanContact: 'team@example.test', reviewed: true, faqs: [] }, integration: null };
    await page.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.origin !== BASE) return route.abort();
      if (u.pathname === '/api/layla-meta') return route.fulfill({ json: u.searchParams.get('surface') === 'customer' ? state : { ok: true, connected: false, available: false } });
      if (u.pathname.startsWith('/api/product-setup')) return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
      if (u.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
      return route.continue();
    });
    await page.goto(`${BASE}/${ar ? '' : 'en/'}catalyst/setup`);
    await page.getByRole('heading', { name: t('Connect a channel', 'اربط قناة'), exact: true }).waitFor();
    const card = page.getByRole('region', { name: 'WhatsApp', exact: true });
    await card.getByText(t('WhatsApp connection is paused on our side.', 'ربط واتساب متوقف مؤقتاً من جهتنا.'), { exact: false }).waitFor(); checks++;
    assert.equal(await card.getByRole('button', { name: t('Connect WhatsApp', 'ربط واتساب'), exact: true }).count(), 0, `${lang}: nothing to start while it is paused`); checks++;
    assert.equal(await page.getByText(t('Instagram connection isn’t available yet.', 'ربط إنستغرام غير متاح بعد.')).count(), 1, `${lang}: Instagram says it is off instead of vanishing`); checks++;
    await page.close();
  }
  console.log(`${checks} WhatsApp connect checks passed. Synthetic rehearsal; no Meta consent or delivery evidence.`);
} finally { await browser.close(); }
