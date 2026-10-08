// Layla's three built-in styles. The model writes her replies in the chosen style (config/layla-ai.js);
// the lines kept here are the few that stay exact: the honest fallback, the team pointer, the
// flood notice, the lead question, and the stock, order and listing facts.
// Tone changes only the connecting sentences:
// owner facts (profile text, FAQ answers, catalog, stock, prices, listings) and
// safety copy are never reworded. `informative` is the default and keeps the
// wording Layla used before styles existed, apart from `unknown`, which no
// longer asks a customer to clarify a chat that is already with the team.
//
// Shared by Vercel (replies) and Convex (qualification, orders, listings), so it
// must stay a pure module. Phrases never contain prices or currencies.

export const DEFAULT_TONE = 'informative';
export const TONES = Object.freeze([
  { id: 'sharp', en: 'Professional & sharp', ar: 'احترافية ومباشرة', descEn: 'Short, precise replies. Best for B2B and premium brands.', descAr: 'ردود قصيرة ودقيقة. مناسبة للشركات والعلامات الراقية.' },
  { id: 'sweet', en: 'Helpful & sweet', ar: 'ودودة ولطيفة', descEn: 'Warm and friendly, with the occasional emoji.', descAr: 'دافئة وودودة مع رمز تعبيري أحياناً.' },
  { id: 'informative', en: 'Informative & nice', ar: 'مفيدة ولطيفة', descEn: 'Clear, polite and complete. The default.', descAr: 'واضحة ومهذبة ومكتملة. الخيار الافتراضي.' },
]);
export const TONE_IDS = Object.freeze(TONES.map(t => t.id));
export const toneOf = value => (TONE_IDS.includes(value) ? value : DEFAULT_TONE);

const P = {
  informative: {
    en: {
      welcome: 'Hello{customer}, I’m Layla from {business}.',
      teamLater: 'Our team will get back to you.',
      contactSuffix: 'Please contact our team directly: {contact}',
      unknown: 'I don’t have confirmed information about that.',
      askMore: 'To help you further, could you share {list}?',
      orderReceived: 'Order #{number} received — the team will confirm availability and the total shortly.',
      orderConfirmed: 'Order #{number} confirmed — {items}, {total}. We’ll message you about delivery or pickup.',
      outOfStock: '{name} is out of stock right now — we’ll let you know when it’s back.',
      inStock: '{name} — in stock · {price}',
      available: '{name} — available in {options} · {price}',
      propertyNoMatch: 'The team will check suitable properties and return with confirmed details.',
      replyLimit: 'Our team will take it from here and reply shortly.',
    },
    ar: {
      welcome: 'أهلاً{customer}، معك ليلى من {business}.',
      teamLater: 'سيتواصل معك فريقنا.',
      contactSuffix: 'يرجى التواصل مع فريقنا مباشرة: {contact}',
      unknown: 'لا تتوفر لدي معلومة مؤكدة عن ذلك.',
      askMore: 'حتى نساعدك بشكل أفضل، ممكن تخبرنا {list}؟',
      orderReceived: 'تم استلام طلبك رقم {number} — سيؤكد الفريق التوفّر والمجموع قريباً.',
      orderConfirmed: 'تم تأكيد طلبك رقم {number} — {items}، {total}. سنراسلك بخصوص التوصيل أو الاستلام.',
      outOfStock: '{name} — نفدت الكمية حالياً، وسنبلغك فور وصول كمية جديدة.',
      inStock: '{name} — في المخزون · {price}',
      available: '{name} — المتوفر: {options} · {price}',
      propertyNoMatch: 'سيتحقق الفريق من العقارات المناسبة ويعود إليك بالمعلومات المؤكدة.',
      replyLimit: 'سيتابع فريقنا معك من هنا ويرد قريباً.',
    },
  },
  sharp: {
    en: {
      welcome: 'Hello{customer}. Layla, {business}.',
      teamLater: 'Our team will get back to you.',
      contactSuffix: 'Contact our team directly: {contact}',
      unknown: 'I don’t have confirmed information on that.',
      askMore: 'To proceed, please share {list}.',
      orderReceived: 'Order #{number} received. The team will confirm availability and total shortly.',
      orderConfirmed: 'Order #{number} confirmed: {items}, {total}. Delivery or pickup details to follow.',
      outOfStock: '{name}: out of stock. We’ll notify you when it’s back.',
      inStock: '{name} — in stock · {price}',
      available: '{name} — options: {options} · {price}',
      propertyNoMatch: 'The team will check matching properties and confirm details.',
      replyLimit: 'Our team will continue from here.',
    },
    ar: {
      welcome: 'أهلاً{customer}. معك ليلى، {business}.',
      teamLater: 'سيتواصل معك فريقنا.',
      contactSuffix: 'تواصل مع فريقنا مباشرة: {contact}',
      unknown: 'لا معلومة مؤكدة لدي عن ذلك.',
      askMore: 'للمتابعة نحتاج معرفة {list}.',
      orderReceived: 'تم استلام الطلب رقم {number}. سيؤكد الفريق التوفّر والمجموع قريباً.',
      orderConfirmed: 'تم تأكيد الطلب رقم {number}: {items}، {total}. ستصلك تفاصيل التوصيل أو الاستلام.',
      outOfStock: '{name}: غير متوفر حالياً. سنبلغك عند توفره.',
      inStock: '{name} — متوفر · {price}',
      available: '{name} — الخيارات: {options} · {price}',
      propertyNoMatch: 'سيتحقق الفريق من العقارات المطابقة ويؤكد التفاصيل.',
      replyLimit: 'سيكمل فريقنا معك من هنا.',
    },
  },
  sweet: {
    en: {
      welcome: 'Hi{customer}! I’m Layla from {business} 😊',
      teamLater: 'Our team will get back to you very soon 💛',
      contactSuffix: 'Our lovely team will be happy to help, just reach them directly: {contact}',
      unknown: 'I’m not sure about that one.',
      askMore: 'So I can help you better, could you tell me {list}? 🙏',
      orderReceived: 'Yay, order #{number} is in! The team will confirm availability and the total very soon.',
      orderConfirmed: 'Order #{number} is confirmed: {items}, {total}. We’ll message you about delivery or pickup 😊',
      outOfStock: 'Sorry, {name} is out of stock right now. We’ll let you know as soon as it’s back.',
      inStock: '{name} — in stock · {price}',
      available: '{name} — available in {options} · {price}',
      propertyNoMatch: 'Our team will look for the right properties for you and come back with confirmed details.',
      replyLimit: 'Our team will take it from here and reply very soon 💛',
    },
    ar: {
      welcome: 'أهلاً وسهلاً{customer}! معك ليلى من {business} 😊',
      teamLater: 'فريقنا بيتواصل معك قريباً 💛',
      contactSuffix: 'فريقنا يسعده يساعدك، تواصل معهم مباشرة: {contact}',
      unknown: 'ما عندي معلومة أكيدة عن هذا.',
      askMore: 'عشان أساعدك أكثر، ممكن تخبرني {list}؟ 🙏',
      orderReceived: 'وصلنا طلبك رقم {number}! الفريق بيأكد التوفّر والمجموع قريباً جداً.',
      orderConfirmed: 'تم تأكيد طلبك رقم {number}: {items}، {total}. بنراسلك بخصوص التوصيل أو الاستلام 😊',
      outOfStock: 'للأسف {name} نفد حالياً، وبنبلغك أول ما يتوفر.',
      inStock: '{name} — متوفر · {price}',
      available: '{name} — متوفر بخيارات {options} · {price}',
      propertyNoMatch: 'فريقنا بيدور لك على العقارات المناسبة ويرجع لك بالتفاصيل المؤكدة.',
      replyLimit: 'فريقنا بيكمل معك من هنا ويرد قريباً 💛',
    },
  },
};

export const PHRASE_KEYS = Object.freeze(Object.keys(P.informative.en));

/**
 * One connecting sentence in the business's chosen style.
 * @param {string|undefined} tone
 * @param {string} key one of PHRASE_KEYS
 * @param {'en'|'ar'} lang
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function phrase(tone, key, lang = 'en', vars = {}) {
  const set = P[toneOf(tone)][lang === 'ar' ? 'ar' : 'en'];
  const template = set[key] ?? P.informative[lang === 'ar' ? 'ar' : 'en'][key] ?? '';
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

/** Who a customer can reach when Layla can't help: the bzns.md team contact. Inbox mode never advertises a legacy contact. */
export const teamContactOf = profile => String((profile?.handoffMode === 'inbox' ? profile?.teamContact : profile?.humanContact || profile?.teamContact) || '').trim();
/**
 * Layla is the whole front office: what she can't handle gets a polite pointer to the team,
 * and she stays on the chat. `lead` is what she says first ("Pricing decisions are made by our team.").
 */
export function withTeamPointer(lead, profile, lang = 'en') {
  const contact = teamContactOf(profile);
  return [lead, phrase(profile?.tone, contact ? 'contactSuffix' : 'teamLater', lang, { contact })].filter(Boolean).join(' ');
}

/** The welcome greeting's customer slot: ", Sara" in English, " سارة" in Arabic, or nothing. */
export const customerSlot = (name, lang) => (name ? (lang === 'ar' ? ` ${name}` : `, ${name}`) : '');
/** Layla answers in the customer's language: any Arabic letter means Arabic. */
export const langOf = text => (/[؀-ۿ]/.test(String(text || '')) ? 'ar' : 'en');
const EMOJI = /\p{Extended_Pictographic}/u;
export const hasEmoji = text => EMOJI.test(String(text || ''));
/** Light emoji means at most one per message: Layla's own phrases drop theirs when another is already there. */
export const stripEmoji = text => {
  const plain = String(text || '').replace(/ ?\p{Extended_Pictographic}\uFE0F?/gu, '').trimEnd();
  // "…delivery or pickup 😊" keeps its full stop once the emoji is gone.
  return plain && plain !== String(text).trimEnd() && !/[.!?؟…]$/.test(plain) ? `${plain}.` : plain;
};
