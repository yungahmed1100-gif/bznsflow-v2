// Advice boundaries for regulated sectors. Layla shares a firm's own facts (its
// services, fees from the catalog, how to book) but never answers a customer's
// legal or financial question about their own situation. Clinics keep their
// separate, stricter rule in clinic-safety.js (their text is not even stored).
const SECTORS = {
  legal: { sector: /(?:legal|law\s*firm|lawyer|advocate|قانون|محاماة|محامي)/iu,
    advice: /\b(?:is (?:it|this|that) legal|legally|should i (?:sue|sign|file)|can i sue|my case|my contract|my rights|lawsuit|take (?:them|him|her) to court)\b|قانوني|قضيتي|حقوقي|أرفع قضية|ارفع قضية|هل يحق لي|استشارة قانونية/iu },
  finance: { sector: /(?:financ|accounting|invest|wealth|insurance|مالي|محاسب|استثمار|تأمين)/iu,
    advice: /\b(?:should i (?:invest|buy|sell)|is (?:it|this) a good investment|guaranteed returns?|which (?:stock|fund|share)s? should|tax advice|how should i invest)\b|هل أستثمر|هل استثمر|نصيحة استثمار|عائد مضمون|أي سهم|اي سهم|استشارة مالية/iu },
};

/**
 * @param {string} text
 * @param {{ sector?: string }} profile
 * @returns {{ boundary: boolean, sector?: 'legal'|'finance' }}
 */
export function adviceDecision(text, profile) {
  const label = String(profile?.sector || '');
  for (const [sector, rule] of Object.entries(SECTORS)) {
    if (rule.sector.test(label) && rule.advice.test(String(text || ''))) return { boundary: true, sector };
  }
  return { boundary: false };
}
