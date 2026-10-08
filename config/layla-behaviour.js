// Layla's behaviour settings for Catalyst's BznsBrain: tone, which details she asks for, and the
// owner's rules for pointing customers to the team. Validated settings own behaviour; bzns.md owns
// what the business says, and the catalog owns services and prices.
//
// Pure module shared by Convex, the Vercel API and the dashboard. Accounts set up before BznsBrain
// have no record: their tone and handoff rules are read from the published bzns.md, so nobody
// re-enters anything.
import { TONE_IDS, toneOf } from './layla-tones.js';
import { qualificationPack } from './layla-qualification.js';
import { parseBzns } from '../src/lib/bzns-doc.js';

export const HANDOFF_NOTE_MAX = 600;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MONEY = /(\d[\d.,]*)\s*(omr|r\.?o\.?|rial|riyal|aed|sar|usd|\$|ر\.?\s?ع|ريال|درهم)|(omr|aed|sar|usd|\$|ريال)\s*\d/i;

/** The details a sector may ask for, in the order Layla asks them. */
export function askableFields(sectorId) {
  return qualificationPack(sectorId).fields.filter(f => f.askable !== false).map(f => ({ key: f.key, en: f.en, ar: f.ar, required: !!f.required, appointment: !!f.appointment }));
}

/** What a sector does when nothing is configured: ask the name, then the required details. */
export function defaultBehaviour(sectorId, tone) {
  const pack = qualificationPack(sectorId);
  return { tone: toneOf(tone), askName: true, ask: pack.fields.filter(f => f.required && f.askable !== false && !f.appointment).map(f => f.key),
    appointmentPreferences: pack.archetype === 'booking', handoffNote: '' };
}

/** Behaviour read from an account set up before BznsBrain: bzns.md front matter and its handoff section. */
export function legacyBehaviour(row, sectorId) {
  const parsed = parseBzns(row?.bznsPublished?.markdown || row?.bznsDraft?.markdown || '');
  const note = parsed.sections.find(s => s.key === 'handoff')?.body?.trim() || '';
  return { ...defaultBehaviour(sectorId, parsed.meta.tone || row?.profile?.tone), handoffNote: note.slice(0, HANDOFF_NOTE_MAX) };
}

/** The behaviour Layla follows now, and whether it still comes from the old bzns.md. */
export function effectiveBehaviour(row, sectorId) {
  if (row?.behaviour) return { ...row.behaviour, legacy: false };
  return { ...legacyBehaviour(row, sectorId), version: 0, legacy: true };
}

/**
 * Closed vocabularies only: an unknown tone, a field the sector does not have, or a note with prices
 * or markup is refused. Returns the clean record or a reason code.
 * @returns {{ ok: true, value: object } | { ok: false, reason: string }}
 */
export function validateBehaviour(input, sectorId) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'invalid_behaviour' };
  if (!TONE_IDS.includes(input.tone)) return { ok: false, reason: 'invalid_tone' };
  if (typeof input.askName !== 'boolean' || typeof input.appointmentPreferences !== 'boolean') return { ok: false, reason: 'invalid_behaviour' };
  const keys = new Set(askableFields(sectorId).map(f => f.key));
  if (!Array.isArray(input.ask) || input.ask.length > 8 || input.ask.some(k => typeof k !== 'string' || !keys.has(k)) || new Set(input.ask).size !== input.ask.length) return { ok: false, reason: 'invalid_ask' };
  const note = typeof input.handoffNote === 'string' ? input.handoffNote.trim() : '';
  if (typeof input.handoffNote !== 'string' || note.length > HANDOFF_NOTE_MAX || CONTROL.test(note) || /<[a-z/!]/i.test(note)) return { ok: false, reason: 'invalid_handoff_note' };
  if (MONEY.test(note)) return { ok: false, reason: 'handoff_note_money' };
  return { ok: true, value: { tone: input.tone, askName: input.askName, ask: [...input.ask], appointmentPreferences: input.appointmentPreferences, handoffNote: note } };
}
