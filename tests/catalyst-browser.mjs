// Catalyst owner journeys in a real browser, against the real-logic demo
// (scripts/hasib-demo.mjs --plan=catalyst): every chat, reply and customer
// change goes through the production Layla/dashboard Convex state code.
// Usage: npm run build && node scripts/hasib-demo.mjs 5320 --plan=catalyst & node tests/catalyst-browser.mjs http://127.0.0.1:5320
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] || 'http://127.0.0.1:5320';
const OUT = process.env.CATALYST_BROWSER_OUT || 'work/hardening/catalyst/browser';
await mkdir(OUT, { recursive: true });
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page => (await new AxeBuilder({ page }).include('.ld').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.length}`);
// Settings → Business details and Instagram call surfaces the demo does not serve; they are checked live.
const DEMO_ONLY = /surface=(customer|instagram)/;

const browser = await chromium.launch();
let count = 0;
const open = async (width, lang, path) => {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(`pageerror ${e.message}`));
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400 && !DEMO_ONLY.test(r.url())) problems.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${BASE}${lang === 'ar' ? '' : '/en'}${path}`);
  await page.locator('.ld-nav a').first().waitFor({ state: 'attached' });
  return { page, context, problems };
};
const current = page => page.locator('.ld-nav a[aria-current="page"]').innerText();

try {
  // 1. Catalyst is four tabs: Chats, Broadcasts, Customers, Settings. Deep and old links land on the right
  //    tab; gated tabs fall back to Chats.
  const TABS = ['chats', 'broadcasts', 'customers', 'settings'];
  for (const lang of ['en', 'ar']) {
    for (const width of [1440, 768, 320]) {
      for (const [tab, expected] of [['chats', 0], ['broadcasts', 1], ['broadcast', 1], ['customers', 2], ['settings', 3], ['money', 0], ['orders', 0]]) {
        const { page, context, problems } = await open(width, lang, `/layla/dashboard?tab=${tab}`);
        await page.locator('main h1, main h2, main .ld-state').first().waitFor();
        const labels = await page.locator('.ld-nav a').allInnerTexts();
        assert.equal(labels.length, 4, `${lang} ${width}: four sections`); count++;
        assert.equal((await current(page)).trim(), labels[expected].trim(), `${lang} ${width} ${tab}: highlighted tab`); count++;
        assert.equal(await page.locator('main').getAttribute('data-tab'), TABS[expected]); count++;
        assert.equal(await noOverflow(page), true, `${lang} ${width} ${tab}: overflow`); count++;
        assert.deepEqual(await axe(page), [], `${lang} ${width} ${tab}: axe`); count++;
        assert.deepEqual(problems, [], `${lang} ${width} ${tab}: no page errors or refused calls`); count++;
        if (width === 320) await page.screenshot({ path: `${OUT}/${tab}-${lang}-${width}.png`, fullPage: true });
        await context.close();
      }
    }
  }

  // 2. Settings holds the business document, services & prices and channels, in that order.
  for (const lang of ['en', 'ar']) {
    const { page, context } = await open(1440, lang, '/layla/dashboard?tab=settings');
    const views = await page.locator('.ld-section-tabs a').allInnerTexts();
    assert.deepEqual(views.map(v => v.trim()), lang === 'en' ? ['Business details', 'Services & prices', 'Channels'] : ['بيانات النشاط', 'الخدمات والأسعار', 'القنوات'], `${lang}: Settings views`); count++;
    await context.close();
  }

  // 3. Customers exports its list as CSV only; Broadcasts is its own tab; Chats has no export.
  {
    const { page, context } = await open(1440, 'en', '/layla/dashboard?tab=chats');
    await page.getByText('Salma Al Harthy').first().waitFor();
    assert.equal(await page.getByRole('button', { name: /export/i }).count(), 0, 'no export on Chats'); count++;
    // Layla is the whole front office: no queue of chats waiting for a person.
    assert.equal(await page.getByRole('button', { name: /Human attention|All conversations/ }).count(), 0, 'no attention queue'); count++;
    await page.getByText('Salma Al Harthy').first().click();
    await page.locator('#ld-reply').waitFor();
    assert.equal(await page.getByText(/^Export$/).count(), 0, 'no export in a chat'); count++;
    await page.goto(`${BASE}/en/layla/dashboard?tab=customers`);
    await page.getByRole('heading', { name: 'Contacts' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Export CSV' }).count(), 1, 'the customer list exports as CSV'); count++;
    assert.equal(await page.getByRole('button', { name: /export all|download/i }).count(), 0, 'no full-account archive'); count++;
    assert.equal(await page.getByRole('button', { name: 'Add or import' }).count(), 1, 'contacts can be added'); count++;
    assert.equal(await page.locator('.ld-section-tabs').count(), 0, 'Customers is one list, no sub-tabs'); count++;
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    assert.match((await download).suggestedFilename(), /contacts\.csv$/, 'the CSV downloads'); count++;
    await page.locator('.ld-nav').getByRole('link', { name: 'Broadcasts' }).click();
    await page.waitForFunction(() => document.querySelector('main')?.dataset.tab === 'broadcasts');
    // The demo, like production today, has broadcasting switched off: the tab says so instead of failing.
    await page.locator('.ld-broadcast h1').waitFor();
    assert.equal(await page.locator('.ld-broadcast').count(), 1, 'Broadcasts opens the broadcast page'); count++;
    await context.close();
  }

  // 4. The reminder on Chats names what is still missing and jumps to where it is filled in.
  for (const lang of ['en', 'ar']) {
    const { page, context, problems } = await open(lang === 'en' ? 1440 : 320, lang, '/layla/dashboard?tab=chats');
    const reminder = page.locator('.ld-reminder');
    await reminder.waitFor();
    const links = reminder.getByRole('link');
    assert.equal(await links.count(), 2, `${lang}: services and team contact are both missing in the demo`); count++;
    await links.first().click();
    await page.waitForFunction(() => document.querySelector('main')?.dataset.tab === 'settings');
    assert.match(page.url(), /tab=settings&view=services/, `${lang}: services link opens Settings → Services & prices`); count++;
    await page.goBack();
    await reminder.waitFor();
    await links.nth(1).click();
    await page.waitForFunction(() => document.querySelector('main')?.dataset.tab === 'settings');
    assert.match(page.url(), /tab=settings&view=business/, `${lang}: team contact link opens Settings → Business`); count++;
    assert.deepEqual(problems, [], `${lang}: reminder without errors`); count++;
    await context.close();
  }

  // 5. Take a chat over, reply once (a double click queues one reply), hand it back.
  for (const lang of ['en', 'ar']) {
    const { page, context, problems } = await open(lang === 'en' ? 1440 : 320, lang, '/layla/dashboard?tab=chats');
    await page.getByText('Salma Al Harthy').first().click();
    // One switch per chat: off means the team replies, on hands the chat back to Layla.
    const live = page.getByRole('switch', { name: lang === 'ar' ? /ليلى تعمل في هذه المحادثة/ : /Layla is live in this chat/ });
    const stopped = page.getByRole('switch', { name: lang === 'ar' ? /ليلى متوقفة في هذه المحادثة/ : /Layla is stopped in this chat/ });
    await live.click();
    await stopped.waitFor();
    assert.equal(await stopped.isChecked(), false, `${lang}: Layla stopped in this chat`); count++;
    assert.equal(await page.getByRole('button', { name: /Take over|Return to Layla|Resolve|استلام المحادثة|إعادة إلى ليلى|تم الحل/ }).count(), 0, `${lang}: only the switch, no take-over or resolve buttons`); count++;
    const text = `Owner reply ${lang}`;
    await page.locator('#ld-reply').fill(text);
    const send = page.locator('.ld-composer button[type="submit"]');
    await send.dblclick();
    await page.locator('.ld-messages').getByText(text).waitFor();
    assert.equal(await page.locator('.ld-messages').getByText(text).count(), 1, `${lang}: one reply in the thread`); count++;
    assert.equal(await page.locator('#ld-reply').inputValue(), '', `${lang}: composer cleared`); count++;
    const box = await send.boundingBox(), vh = page.viewportSize().height;
    assert.ok(box && box.y + box.height <= vh, `${lang}: send button is on screen and not covered`); count++;
    await stopped.click();
    await live.waitFor();
    assert.equal(await live.isChecked(), true, `${lang}: Layla live again`); count++;
    assert.deepEqual(problems, [], `${lang}: no errors`); count++;
    await page.screenshot({ path: `${OUT}/thread-${lang}.png`, fullPage: false });
    await context.close();
  }

  // 6. Edit a customer's name, then delete the customer after confirming.
  {
    const { page, context, problems } = await open(1440, 'en', '/layla/dashboard?tab=customers');
    await page.getByText('عائشة الرواحي').first().click();
    await page.getByLabel('Name (your edit)').fill('Aisha (Ruwi)');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Aisha (Ruwi)').first().waitFor(); count++;
    await page.getByRole('button', { name: 'Delete contact' }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor(); count++;
    await confirm.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /Aisha \(Ruwi\)/ }).waitFor({ state: 'detached' }); count++;
    assert.deepEqual(problems, [], 'customer edit/delete: no errors'); count++;
    await context.close();
  }
  console.log(`catalyst browser: ${count} assertions passed`);
} finally {
  await browser.close();
}
