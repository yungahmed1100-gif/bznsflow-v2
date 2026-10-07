import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBzns, validateBzns, deriveProfile, bznsChunks, applySections, profileToBzns, BZNS_MAX_CHARS } from '../src/lib/bzns-doc.js';
import { bznsTemplate, BZNS_TEMPLATE_SECTORS } from '../config/bzns-templates.js';
import { validateReviewProfile } from '../api/_lib/layla/review-profile.js';

const doc = `---
name: Qurum Coast Properties
sector: real-estate
---

# Qurum Coast Properties

## About us
Family-run agency in Muscat since 2012.

## What we offer
- Buying and selling residential property
- Rentals: apartments and villas
- Free valuations for owners

## Hours
Sunday–Thursday 8:30–17:30. Closed Friday.

## Location
Al Qurum, Way 2601, Muscat. https://maps.example.test/qcp

## FAQ
**Q:** Do you charge for viewings?
A: No, viewings are free.

**Q:** Can foreigners buy?
A: Yes, in approved integrated tourism complexes.
`;

test('parses front matter and bilingual section headings', () => {
  const parsed = parseBzns(doc);
  assert.equal(parsed.meta.name, 'Qurum Coast Properties');
  assert.equal(parsed.meta.sector, 'real-estate');
  assert.deepEqual(parsed.sections.map(s => s.key), ['about', 'offer', 'hours', 'location', 'faq']);
  const ar = parseBzns('---\nname: عقارات القرم\nsector: real-estate\n---\n## من نحن\nوكالة عائلية\n## خدماتنا\n- بيع وشراء\n## ساعات العمل\nمن الأحد إلى الخميس\n## الموقع\nالقرم\n## الأسئلة الشائعة\n**س:** هل المعاينة مجانية؟\nج: نعم');
  assert.deepEqual(ar.sections.map(s => s.key), ['about', 'offer', 'hours', 'location', 'faq']);
  assert.deepEqual(ar.faqs, [{ question: 'هل المعاينة مجانية؟', answer: 'نعم' }]);
});

test('a valid document derives a profile the existing validator accepts', () => {
  const result = validateBzns(doc);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const { businessName, profile } = deriveProfile(parseBzns(doc));
  assert.equal(businessName, 'Qurum Coast Properties');
  assert.match(profile.services, /Buying and selling residential property; Rentals/);
  assert.match(profile.hours, /Sunday/);
  assert.match(profile.location, /Way 2601/);
  assert.equal(profile.handoffMode, 'inbox');
  assert.equal(profile.faqs.length, 2);
  assert.doesNotThrow(() => validateReviewProfile(profile));
});

test('required fields, placeholders, HTML and size are reported per section', () => {
  const codes = text => validateBzns(text).errors.map(e => `${e.code}:${e.section || ''}`);
  assert.deepEqual(codes('## About us\nhello'), ['bzns_name_required:', 'bzns_sector_required:', 'bzns_offer_required:offer']);
  assert.ok(codes(doc.replace('Family-run agency', '[Who you are]')).includes('bzns_placeholder:about'));
  assert.ok(!codes(doc.replace('https://maps.example.test/qcp', '[Map](https://maps.example.test/qcp)')).includes('bzns_placeholder:location'), 'markdown links are not placeholders');
  assert.ok(codes(doc.replace('Family-run', '<script>x</script>')).includes('bzns_html:about'));
  assert.ok(codes(doc + 'x'.repeat(BZNS_MAX_CHARS)).includes('bzns_too_long:'));
});

test('money amounts are blocked but free wording is allowed', () => {
  const sectionOf = text => validateBzns(doc.replace('Family-run agency in Muscat since 2012.', text)).errors.filter(e => e.code === 'bzns_money').map(e => e.section);
  for (const amount of ['Rent from 500 OMR', 'الإيجار ٥٠٠ ر.ع', 'Viewing fee RO 10', 'Deposit $200', 'Commission 2% of the sale', 'عمولة ٢٪', 'رسوم ٥٠ ريال']) assert.deepEqual(sectionOf(amount), ['about'], amount);
  for (const ok of ['Viewings are free', 'We charge a commission on sale', 'Open since 2012', 'Way 2601', '3 bedrooms']) assert.deepEqual(sectionOf(ok), [], ok);
});

test('FAQ extraction keeps the first twelve pairs for the profile', () => {
  const many = doc.replace(/## FAQ[\s\S]*/, '## FAQ\n' + Array.from({ length: 15 }, (_, i) => `Q: Question ${i}\nA: Answer ${i}`).join('\n\n'));
  assert.equal(deriveProfile(parseBzns(many)).profile.faqs.length, 12);
  assert.equal(parseBzns(many).faqs.length, 15, 'all pairs stay in the document chunks');
});

test('chunks are one per section, tenant scoped, normalized and hashed', () => {
  const rows = bznsChunks(parseBzns(doc), { tenantId: 'acct1', revision: 3, now: 5 });
  assert.equal(rows.length, 5);
  for (const row of rows) {
    assert.equal(row.tenantId, 'acct1'); assert.equal(row.revision, 3); assert.equal(row.approved, true);
    assert.equal(row.source, 'bzns'); assert.match(row.contentHash, /^[a-f0-9]{8,}$/); assert.ok(row.text.length <= 12000);
  }
  assert.equal(bznsChunks(parseBzns('---\nname: ع\nsector: x\n---\n## الموقع\nمسقط'), { tenantId: 't', revision: 1, now: 1 })[0].locale, 'ar');
});

test('every live sector has English and Arabic templates that only fail on placeholders', () => {
  for (const sector of BZNS_TEMPLATE_SECTORS) for (const lang of ['en', 'ar']) {
    const template = bznsTemplate(sector, lang);
    const result = validateBzns(template);
    assert.ok(result.errors.length > 0, `${sector}/${lang} must not publish unedited`);
    assert.ok(result.errors.every(e => e.code === 'bzns_placeholder'), `${sector}/${lang}: ${JSON.stringify(result.errors)}`);
    assert.ok(parseBzns(template).sections.some(s => s.key === 'offer'), `${sector}/${lang} has an offer section`);
  }
  assert.equal(bznsTemplate('unknown-sector', 'en'), bznsTemplate('generic', 'en'));
});

test('guided answers replace or add the matching sections and never add prices', () => {
  const next = applySections(doc, { services: 'Sales, rentals and valuations', hours: 'Daily 9 to 9', prices: 'Rent from 400 OMR', faqs: [{ question: 'Do you manage property?', answer: 'Yes.' }] }, 'en');
  const parsed = parseBzns(next);
  assert.equal(parsed.sections.find(s => s.key === 'offer').body, 'Sales, rentals and valuations');
  assert.equal(parsed.sections.find(s => s.key === 'hours').body, 'Daily 9 to 9');
  assert.match(parsed.sections.find(s => s.key === 'location').body, /Way 2601/, 'untouched sections stay');
  assert.ok(!next.includes('400 OMR'));
  assert.deepEqual(parsed.faqs.at(-1), { question: 'Do you manage property?', answer: 'Yes.' });
  assert.equal(parsed.faqs.length, 3, 'new questions are appended, existing ones kept');
  const added = parseBzns(applySections('---\nname: X\nsector: retail\n---\n', { location: 'مسقط' }, 'ar'));
  assert.deepEqual(added.sections.map(s => [s.key, s.heading]), [['location', 'الموقع']]);
});

test('saved details convert into a publishable document without prices', () => {
  const md = profileToBzns({ businessName: 'Noor Abayas', profile: { sector: 'Retail & e-commerce', services: 'Abayas and scarves', prices: 'From 25 OMR', hours: '10am to 10pm', location: 'Muscat Grand Mall', faqs: [{ question: 'Do you deliver?', answer: 'Yes, across Muscat.' }] },
    answers: [{ question: 'Can I return an item?', answer: 'Within 7 days.' }], lang: 'en' });
  const result = validateBzns(md);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.parsed.meta.sector, 'retail');
  assert.ok(!md.includes('25 OMR'));
  assert.deepEqual(result.parsed.faqs.map(f => f.question), ['Do you deliver?', 'Can I return an item?']);
});

test('the checklist only ticks sections the owner has actually written', () => {
  const ticked = text => validateBzns(text).checklist.filter(i => i.present).map(i => i.key);
  assert.deepEqual(ticked(bznsTemplate('real-estate', 'en')), [], 'template hints are not done');
  assert.deepEqual(ticked(doc), ['about', 'offer', 'location', 'faq']);
  assert.ok(!validateBzns(doc).checklist.some(i => i.key === 'hours'), 'Layla is 24/7: hours are optional');
});

test('the tone line picks Layla\'s style; missing or unknown falls back to Informative & nice', async () => {
  const { setMeta } = await import('../src/lib/bzns-doc.js');
  assert.equal(deriveProfile(parseBzns(doc)).profile.tone, 'informative');
  const sharp = setMeta(doc, 'tone', 'sharp');
  assert.match(sharp, /^---\nname: Qurum Coast Properties\nsector: real-estate\ntone: sharp\n---/);
  assert.equal(deriveProfile(parseBzns(sharp)).profile.tone, 'sharp');
  assert.equal(deriveProfile(parseBzns(setMeta(sharp, 'tone', 'sweet'))).profile.tone, 'sweet');
  assert.equal((setMeta(sharp, 'tone', 'sweet').match(/^tone:/gm) || []).length, 1, 'replaced, not duplicated');
  assert.equal(deriveProfile(parseBzns(setMeta(doc, 'tone', 'shouty'))).profile.tone, 'informative');
  assert.match(setMeta('## What we offer\n- x', 'tone', 'sweet'), /^---\ntone: sweet\n---\n\n## What we offer/);
  assert.doesNotThrow(() => validateReviewProfile(deriveProfile(parseBzns(sharp)).profile));
});

test('a Team contact section becomes the contact Layla gives a customer who asks for a person', async () => {
  const { answer } = await import('../api/_lib/layla/domain.js');
  const doc = (contact) => `---\nname: Qurum Coast\nsector: real-estate\ntone: informative\n---\n# Qurum Coast\n## About us\nFamily agency.\n## What we offer\n- Rentals\n${contact}`;
  const withContact = deriveProfile(validateBzns(doc('## Team contact\nWhatsApp +968 9123 4567 (Huda)\n')).parsed).profile;
  assert.equal(withContact.teamContact, 'WhatsApp +968 9123 4567 (Huda)', 'a phone number is not mistaken for a price');
  assert.equal(withContact.humanContact, '', 'kept apart from any legacy contact');
  assert.equal(withContact.handoffMode, 'inbox', 'the chat still waits in the owner’s inbox');
  assert.match(answer('I want to talk to a person', { ...withContact, businessName: 'Qurum Coast' }, true).text, /WhatsApp \+968 9123 4567 \(Huda\)$/);
  const arabic = deriveProfile(validateBzns(doc('## جهة اتصال الفريق\nواتساب 96891234567\n')).parsed).profile;
  assert.equal(arabic.teamContact, 'واتساب 96891234567');
  // Without the section Layla only promises a reply in the chat, and other answers never carry a contact.
  const none = deriveProfile(validateBzns(doc('')).parsed).profile;
  assert.equal(none.teamContact, undefined);
  assert.equal(answer('I want to talk to a person', { ...none, businessName: 'Qurum Coast' }, true).text, 'I’ll leave this conversation for our team to follow up here.');
  assert.doesNotMatch(answer('what is the price of a 3 bedroom villa', { ...withContact, businessName: 'Qurum Coast' }, true).text, /9123/);
});
