import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUSINESS_INDUSTRIES } from '../src/lib/industries.js';
import { BZNS_TEMPLATE_SECTORS, brainTemplate, bznsTemplate } from '../config/bzns-templates.js';
import { parseBzns, validateBzns, deriveProfile } from '../src/lib/bzns-doc.js';
import { validateProfile } from '../api/_lib/auth.js';
import { sectorIdFor, extractQualification, mergeFields, qualificationStatus, nextQuestions } from '../config/layla-qualification.js';
import { defaultBehaviour, validateBehaviour } from '../config/layla-behaviour.js';
import { SECTOR_PACKS } from '../config/layla-sector-packs.js';
import { executeReview } from '../convex/reviewState.js';
import { executeBrain } from '../convex/brainState.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { blueHarness, seedTenant } from './helpers/blue-tenant.mjs';

test('every named Catalyst industry has its own starter; Other keeps the generic starter', () => {
  assert.equal(BUSINESS_INDUSTRIES.length, 25);
  assert.equal(BUSINESS_INDUSTRIES.at(-1).id, 'other');
  assert.deepEqual(new Set(BZNS_TEMPLATE_SECTORS), new Set(['generic', ...BUSINESS_INDUSTRIES.filter(i => i.id !== 'other').map(i => i.id)]));
  for (const lang of ['en', 'ar']) {
    const bodies = BUSINESS_INDUSTRIES.filter(i => i.id !== 'other').map(i => brainTemplate(i.id, lang).replace(/^sector:.*$/m, 'sector: ignored'));
    assert.equal(new Set(bodies).size, bodies.length, `${lang}: distinct business information, not a renamed generic template`);
    for (const unknown of ['unknown', '__proto__', 'constructor', 'toString']) {
      assert.equal(brainTemplate(unknown, lang), brainTemplate('generic', lang));
      assert.equal(bznsTemplate(unknown, lang), bznsTemplate('generic', lang));
    }
    assert.equal(brainTemplate('other', lang).replace('sector: other', `sector: ${lang === 'ar' ? '[مجال نشاطك]' : '[your sector]'}`), brainTemplate('generic', lang));
  }
});

for (const industry of BUSINESS_INDUSTRIES) for (const lang of ['en', 'ar']) {
  test(`Catalyst ${industry.id}/${lang}: starter → draft → owner completion → published business`, async () => {
    const starter = brainTemplate(industry.id, lang);
    assert.equal(parseBzns(starter).meta.sector, industry.id);
    assert.equal(parseBzns(bznsTemplate(industry.id, lang)).meta.sector, industry.id);
    assert.doesNotMatch(starter, /tone:|## FAQ|## الأسئلة الشائعة|## When Layla|## متى تحوّل/);
    const checked = validateBzns(starter);
    assert.equal(checked.ok, false);
    assert.ok(checked.errors.every(e => e.code === 'bzns_placeholder'), JSON.stringify(checked.errors));

    const m = convexMemory(), sessionHash = 'a'.repeat(64);
    const run = (operation, args = {}) => executeReview(m.ctx, { operation, sessionHash, ...args }, m.now());
    assert.equal((await run('create')).ok, true);
    assert.equal((await run('bzns_save', { markdown: starter, version: 0 })).ok, true);
    const row = () => m.table('blueReviewSessions')[0];
    assert.equal(row().bznsDraft.markdown, starter);
    assert.equal(row().profile, undefined, 'saving hints does not activate business facts');
    assert.equal((await run('bzns_publish', { markdown: starter, version: 1 })).reason, 'bzns_invalid');

    // Synthetic owner completion, not real claims about any customer business.
    const completed = starter.replace(/\[[^\]\n]+\]/g, lang === 'ar' ? 'معلومة معتمدة من صاحب النشاط' : 'Owner-approved business information');
    assert.equal(validateBzns(completed).ok, true);
    assert.equal(deriveProfile(parseBzns(completed)).profile.sector, industry[lang]);
    assert.equal((await run('bzns_publish', { markdown: completed, version: 1 })).ok, true);
    assert.equal(row().bznsPublished.markdown, completed);
    assert.equal(row().profile.sector, industry[lang]);
    assert.equal(row().profile.reviewed, true);
    assert.equal((await run('bzns_save', { markdown: starter, version: 1 })).reason, 'bzns_conflict', 'stale edits cannot replace the published document');
  });
}

test('Media is accepted by profile validation, bilingual routing and the legacy intent configuration', () => {
  const media = BUSINESS_INDUSTRIES.find(i => i.id === 'media');
  for (const label of [media.id, media.en, media.ar]) assert.equal(sectorIdFor(label), 'media');
  assert.equal(validateProfile({ name: 'Studio owner', phone: '91234567', country: 'OM', industry: 'media', lang: 'ar' }).ok, true);
  const routing = JSON.parse(readFileSync(new URL('../config/layla-sectors.json', import.meta.url), 'utf8'));
  assert.ok(routing.archetypes.project.sectors.includes('media'));
  assert.equal(SECTOR_PACKS.media.archetype, 'project');
  const behaviour = defaultBehaviour('media');
  assert.deepEqual(behaviour.ask, ['need', 'date_needed', 'area']);
  assert.equal(behaviour.appointmentPreferences, false);
  assert.equal(validateBehaviour(behaviour, 'media').ok, true);
});

test('Media captures real bilingual production requests and asks only for missing details', () => {
  const cases = [
    ['I need photography in Muscat tomorrow at 5pm', 'photography'],
    ['أريد تصوير فوتوغرافي في مسقط بكرة الساعة 5 مساء', 'photography'],
    ['Need video production in Muscat tomorrow', 'video'],
    ['أريد تصوير فيديو في مسقط بكرة', 'video'],
    ['Podcast recording in Muscat tomorrow', 'audio'],
    ['أريد بودكاست في مسقط بكرة', 'audio'],
    ['Editing in Muscat tomorrow', 'editing'],
    ['أريد مونتاج في مسقط بكرة', 'editing'],
  ];
  for (const [text, need] of cases) {
    const fields = mergeFields([], extractQualification({ text, sectorId: 'media' }).updates, 1).fields;
    assert.equal(fields.find(f => f.key === 'need')?.value, need, text);
    assert.equal(qualificationStatus('media', fields), 'qualified', text);
    assert.deepEqual(nextQuestions('media', fields), [], text);
  }
  const fields = mergeFields([], extractQualification({ text: 'I need video production', sectorId: 'media' }).updates, 1).fields;
  assert.deepEqual(nextQuestions('media', fields).map(f => f.key), ['date_needed', 'area']);
});

test('Media survives the Catalyst backend state and inbound contact path', async () => {
  const h = blueHarness();
  await h.enable();
  const t = await seedTenant(h.m, { name: 'media', sector: 'Media & production' });
  const state = await executeBrain(h.m.ctx, { operation: 'state', sessionHash: t.sessionHash }, h.m.now());
  assert.equal(state.ok, true);
  assert.equal(state.value.sectorId, 'media');
  assert.deepEqual(state.value.askable.map(f => f.key), ['need', 'date_needed', 'area', 'budget']);
  assert.equal((await h.messaging('activate', { sessionHash: t.sessionHash })).ok, true);
  assert.equal((await h.inbound(t, { text: 'I need video production in Muscat tomorrow', turn: false })).ok, true);
  const contact = h.m.table('blueContacts')[0];
  assert.equal(contact.sectorId, 'media');
  assert.equal(contact.fields.find(f => f.key === 'need')?.value, 'video');
  assert.equal(contact.qualificationStatus, 'qualified');
});
