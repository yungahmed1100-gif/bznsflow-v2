// Deterministic checks that outrank qualification in Catalyst's BznsBrain mode: a customer who asks
// for a person, describes a clinical problem, or declines to give their name is never asked for
// another detail that turn. Pure, English and Arabic (Gulf and standard), shared by ingest and tests.
import { normalizeText } from './layla-qualification.js';

const HUMAN = /\b(speak|talk|chat)\s+(to|with)\s+(a\s+)?(human|person|someone|somebody|agent|staff|reception|receptionist|doctor|manager|owner|team)\b|\b(real|actual)\s+(person|human)\b|\b(call|ring)\s+me\b|\b(human|agent|receptionist|reception)\s*(please|pls)?\s*$|اكلم\s*(شخص|احد|موظف|الاستقبال|الدكتور|المدير)|ابي\s*(اكلم|اتكلم|اتواصل)|ابغى\s*(اكلم|اتكلم)|اريد\s*(التحدث|التكلم|التواصل)\s*(مع)?|موظف\s*(حقيقي|بشري)|كلموني|اتصلوا\s*(بي|علي)|(?:^|\s)(الاستقبال|موظف)\s*(لو\s*سمحت|من\s*فضلك)?\s*$/i;
const CLINICAL = /\b(pain|painful|hurts?|hurting|ache|aching|toothache|bleed(?:ing|s)?|swollen|swelling|infection|infected|abscess|pus|fever|broken\s+tooth|cracked\s+tooth|chipped|knocked\s+out|emergency|urgent|sensitive\s+teeth|sensitivity|numb|medication|medicine|antibiotic|painkiller|pregnan(?:t|cy)|allerg(?:y|ic)|diabet(?:es|ic)|symptom)\b|الم|ألم|يوجع|يعور|توجعني|نزيف|ينزف|ورم|انتفاخ|التهاب|خراج|صديد|حرارة|حمى|مكسور|انكسر|طوارئ|طارئ|حساسية|مضاد\s*حيوي|مسكن|دواء|حامل|حمل|سكري|اعراض|أعراض/i;
const NAME_DECLINED = /\b(prefer\s+not|rather\s+not|no\s+name|not\s+(?:giving|sharing)\s+(?:my\s+)?name|skip\s+(?:the\s+)?name|don'?t\s+want\s+to\s+(?:give|share|say)|anonymous|doesn'?t\s+matter|not\s+important)\b|ما\s*(ابي|ابغى|اريد|أريد)\s*(اقول|أقول|اعطي|أعطي)?\s*(اسمي|الاسم)|بدون\s*اسم|بلا\s*اسم|ما\s*يهم\s*(الاسم)?|مو\s*مهم|خلها\s*بدون|لا\s*داعي/i;
const APPOINTMENT = /\b(book|booking|appointment|appt|schedule|reserve|reservation|slot|available\s+(?:time|times|slots)|come\s+in|visit\s+(?:you|the\s+clinic)|when\s+can\s+i\s+come)\b|موعد|مواعيد|احجز|أحجز|حجز|ابي\s*اجي|متى\s*اقدر\s*اجي|اقدر\s*اجي|زيارة/i;

const text = value => normalizeText(String(value || '').slice(0, 1000));
/** The customer wants a person, not Layla. */
export const asksForPerson = value => HUMAN.test(String(value || '')) || HUMAN.test(text(value));
/** A message about symptoms, pain, medicines or an emergency: Layla points to the team and asks nothing. */
export const isClinical = value => CLINICAL.test(String(value || '')) || CLINICAL.test(text(value));
/** The customer does not want to give their name. */
export const declinesName = value => NAME_DECLINED.test(String(value || '')) || NAME_DECLINED.test(text(value));
/** The customer is asking to come in or book. */
export const wantsAppointment = value => APPOINTMENT.test(String(value || '')) || APPOINTMENT.test(text(value));

/**
 * Which override, if any, holds back a qualification question this turn.
 * Clinical only counts in medical sectors; a person request counts everywhere.
 * @returns {'human'|'clinical'|null}
 */
export function overrideFor(value, { medical = false } = {}) {
  if (asksForPerson(value)) return 'human';
  if (medical && isClinical(value)) return 'clinical';
  return null;
}
