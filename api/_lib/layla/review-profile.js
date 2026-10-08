import { PilotError } from './config.js';
import { TONE_IDS } from '../../../config/layla-tones.js';

const fields = ['sector', 'services', 'prices', 'hours', 'location', 'humanContact'];
export function validateReviewProfile(input) {
  if (!input || input.reviewed !== true) throw new PilotError('profile_unreviewed', 409);
  const profile = { reviewed: true };
  for (const field of fields) {
    const value = input[field] ?? '';
    if (typeof value !== 'string' || value.length > (field === 'humanContact' ? 120 : 350) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new PilotError('invalid_profile');
    profile[field] = value.trim();
  }
  if (!profile.sector || !profile.services) throw new PilotError('invalid_profile');
  const faqs = input.faqs || [];
  if (!Array.isArray(faqs) || faqs.length > 12 || faqs.some(f=>!f || typeof f.question !== 'string' || !f.question.trim() || f.question.length>200 || typeof f.answer !== 'string' || !f.answer.trim() || f.answer.length>700)) throw new PilotError('invalid_profile');
  profile.faqs = faqs.map(f=>({question:f.question.trim(),answer:f.answer.trim()}));
  if (input.handoffMode !== undefined && input.handoffMode !== 'inbox') throw new PilotError('invalid_profile');
  if (input.handoffMode === 'inbox') profile.handoffMode = 'inbox';
  if (input.tone !== undefined && !TONE_IDS.includes(input.tone)) throw new PilotError('invalid_profile');
  if (input.tone) profile.tone = input.tone;
  return profile;
}
