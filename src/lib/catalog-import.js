const MAX_FILE = 15 * 1024 * 1024;
const MAX_TEXT = 100000;

const normalize = text => String(text || '').replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);

export function extractCatalogRows(text, source = 'catalog') {
  const parts = normalize(text).split(/(?<=[.!؟])\s+|\s*[|•·\t]\s*/).filter(value => value.length > 3 && value.length < 500);
  const pricePattern = /(?:OMR|RO|ر\.?\s?ع\.?|AED|SAR|USD|\$)\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:OMR|RO|ريال|AED|SAR|USD)/i;
  return parts.flatMap(part => {
    const match = part.match(pricePattern);
    if (!match) return [];
    const name = part.slice(0, match.index).replace(/^(price|prices|السعر|الأسعار)\s*[:—-]?/i, '').split(/[:—-]/)[0].trim().slice(0, 160);
    if (name.length < 2) return [];
    const isArabic = /[\u0600-\u06ff]/.test(name);
    const currency = /OMR|RO|ر\.?\s?ع|ريال/i.test(match[0]) ? 'OMR' : /AED/i.test(match[0]) ? 'AED' : /SAR/i.test(match[0]) ? 'SAR' : 'USD';
    return [{
      kind: 'service', nameEn: isArabic ? '' : name, nameAr: isArabic ? name : '', benefitEn: '', benefitAr: '',
      descriptionEn: isArabic ? '' : part, descriptionAr: isArabic ? part : '', category: '', availability: '',
      prices: [{ type: /from|starting|ابتداء/i.test(part) ? 'from' : 'fixed', currency, label: match[0], unit: '' }], source, confidence: 0.7,
      laylaUseEn: 'Answer customer questions about this service and its approved price.', laylaUseAr: 'الإجابة عن أسئلة العملاء حول هذه الخدمة وسعرها المعتمد.',
    }];
  }).slice(0, 1000);
}

/** Existing catalog approval flow shares the cancellable extraction worker. */
export async function readCatalogFile(file, options = {}) {
  if (!file || file.size > MAX_FILE) throw new Error('catalog_file_too_large');
  // Plain text remains usable in non-browser tooling; expensive parsers stay worker-only.
  if (typeof Worker === 'undefined' && /\.(txt|csv)$/i.test(file.name || '')) {
    const raw = new TextDecoder().decode(await file.arrayBuffer());
    const text = normalize(raw);
    if (!text) throw new Error('catalog_file_empty');
    return {text,entries:extractCatalogRows(text,file.name),partial:raw.length > MAX_TEXT};
  }
  const { extractInformation } = await import('./information-import.js');
  const parsed = await extractInformation(file, options);
  return { ...parsed, entries: extractCatalogRows(parsed.text, file.name) };
}
