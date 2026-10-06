const normalized = text => String(text || '').normalize('NFKC').toLocaleLowerCase().replace(/[؟?!.،,]/g, '').replace(/\s+/g, ' ').trim();
// Deterministic exact-question lookup. Source text is evidence, never instructions.
// Ambiguous answers and price statements fall back to the existing catalog path.
export function matchPublishedKnowledge(query, sources = []) {
  const key = normalized(query);
  if (key.length < 5) return null;
  const matches = sources.filter(source => normalized(source.title) === key && source.text?.trim());
  if (matches.length !== 1 || matches[0].text.length > 2000 || /(?:\b(?:prices?|costs?|charges?|fees?|rates?)\b|\b(?:OMR|RO|AED|SAR|USD)\b|\b(?:dollars?|riyals?|rials?)\b|درهم|ريال|دولار|سعر|أسعار|اسعار|تكلف|رسوم|ثمن|بكم|ر\.?\s?ع\.?|[$€£])/i.test(matches[0].text)) return null;
  return { text: matches[0].text, sourceKey: matches[0].sourceKey, revision: matches[0].revision };
}
