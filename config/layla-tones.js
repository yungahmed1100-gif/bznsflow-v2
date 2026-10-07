// Layla's three built-in styles. Tone changes only the connecting sentences:
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
      greeting: 'I’m Layla, the virtual assistant for {business}. How can I help?',
      welcome: 'Hello{customer}, I’m Layla from {business}.',
      handoffInbox: 'I’ll leave this conversation for our team to follow up here.',
      handoffContact: 'You can speak with our team directly.',
      contactSuffix: ' You can contact our team: {contact}',
      disabled: 'Our team will arrange this booking with you and confirm it here shortly.',
      unknown: 'I don’t have confirmed information about that yet. Our team will reply here shortly.',
      askMore: 'To help you further, could you share {list}?',
      orderReceived: 'Order #{number} received — the team will confirm availability and the total shortly.',
      orderConfirmed: 'Order #{number} confirmed — {items}, {total}. We’ll message you about delivery or pickup.',
      outOfStock: '{name} is out of stock right now — we’ll let you know when it’s back.',
      inStock: '{name} — in stock · {price}',
      available: '{name} — available in {options} · {price}',
      propertyNoMatch: 'The team will check suitable properties and return with confirmed details.',
      negotiation: 'Our team handles pricing questions like this one and will reply here shortly.',
      abuse: 'I’m here to help with questions about {business}. I’ve passed this conversation to our team.',
      media: 'Thanks, I’ve received your message. Our team will review it and reply here.',
      tooLong: 'Thanks for the details. Our team will read your message and reply here.',
      adviceBoundary: 'I can’t give legal or financial advice here. Our team will follow up with you directly.',
      replyLimit: 'Our team will take it from here and reply shortly.',
      thanks: 'Thank you{customer}.',
      howHelp: 'How can I help you today?',
      youreWelcome: 'You’re welcome. If you need anything else, just message here.',
    },
    ar: {
      greeting: 'أنا ليلى، المساعدة الافتراضية لدى {business}. كيف أساعدك؟',
      welcome: 'أهلاً{customer}، معك ليلى من {business}.',
      handoffInbox: 'سأترك هذه المحادثة لفريقنا للمتابعة هنا.',
      handoffContact: 'أفهمك. يمكنك التواصل مع الفريق مباشرة.',
      contactSuffix: ' للتواصل مع الفريق: {contact}',
      disabled: 'سيرتب فريقنا الحجز معك ويؤكده هنا قريباً.',
      unknown: 'لا تتوفر لدي معلومة مؤكدة عن ذلك بعد. سيرد عليك فريقنا هنا قريباً.',
      askMore: 'حتى نساعدك بشكل أفضل، ممكن تخبرنا {list}؟',
      orderReceived: 'تم استلام طلبك رقم {number} — سيؤكد الفريق التوفّر والمجموع قريباً.',
      orderConfirmed: 'تم تأكيد طلبك رقم {number} — {items}، {total}. سنراسلك بخصوص التوصيل أو الاستلام.',
      outOfStock: '{name} — نفدت الكمية حالياً، وسنبلغك فور وصول كمية جديدة.',
      inStock: '{name} — في المخزون · {price}',
      available: '{name} — المتوفر: {options} · {price}',
      propertyNoMatch: 'سيتحقق الفريق من العقارات المناسبة ويعود إليك بالمعلومات المؤكدة.',
      negotiation: 'يتولى فريقنا أسئلة الأسعار مثل هذا السؤال وسيرد عليك هنا قريباً.',
      abuse: 'أنا هنا للمساعدة في أسئلتك عن {business}. حوّلت المحادثة لفريقنا.',
      media: 'شكراً، وصلتني رسالتك. سيراجعها فريقنا ويرد عليك هنا.',
      tooLong: 'شكراً على التفاصيل. سيقرأ فريقنا رسالتك ويرد عليك هنا.',
      adviceBoundary: 'لا أستطيع تقديم استشارات قانونية أو مالية هنا. سيتواصل معك فريقنا مباشرة.',
      replyLimit: 'سيتابع فريقنا معك من هنا ويرد قريباً.',
      thanks: 'شكراً{customer}.',
      howHelp: 'كيف أساعدك اليوم؟',
      youreWelcome: 'العفو. إذا احتجت أي شيء آخر، راسلنا هنا.',
    },
  },
  sharp: {
    en: {
      greeting: 'Layla, {business}. How can I help?',
      welcome: 'Hello{customer}. Layla, {business}.',
      handoffInbox: 'Our team will follow up in this chat.',
      handoffContact: 'Our team can help you directly.',
      contactSuffix: ' Team contact: {contact}',
      disabled: 'Our team will confirm the booking here.',
      unknown: 'I don’t have confirmed information on that. Our team will reply here.',
      askMore: 'To proceed, please share {list}.',
      orderReceived: 'Order #{number} received. The team will confirm availability and total shortly.',
      orderConfirmed: 'Order #{number} confirmed: {items}, {total}. Delivery or pickup details to follow.',
      outOfStock: '{name}: out of stock. We’ll notify you when it’s back.',
      inStock: '{name} — in stock · {price}',
      available: '{name} — options: {options} · {price}',
      propertyNoMatch: 'The team will check matching properties and confirm details.',
      negotiation: 'Pricing decisions are handled by our team. They’ll reply here.',
      abuse: 'I can help with questions about {business}. This chat is now with our team.',
      media: 'Received. Our team will review and reply here.',
      tooLong: 'Received. Our team will review your message and reply here.',
      adviceBoundary: 'I can’t give legal or financial advice. Our team will follow up directly.',
      replyLimit: 'Our team will continue from here.',
      thanks: 'Noted{customer}.',
      howHelp: 'How can I help?',
      youreWelcome: 'You’re welcome.',
    },
    ar: {
      greeting: 'ليلى، {business}. كيف أساعدك؟',
      welcome: 'أهلاً{customer}. معك ليلى، {business}.',
      handoffInbox: 'سيتابع فريقنا معك في هذه المحادثة.',
      handoffContact: 'يمكن لفريقنا مساعدتك مباشرة.',
      contactSuffix: ' تواصل الفريق: {contact}',
      disabled: 'سيؤكد فريقنا الحجز هنا.',
      unknown: 'لا تتوفر لدي معلومة مؤكدة عن ذلك. سيرد فريقنا هنا.',
      askMore: 'للمتابعة نحتاج معرفة {list}.',
      orderReceived: 'تم استلام الطلب رقم {number}. سيؤكد الفريق التوفّر والمجموع قريباً.',
      orderConfirmed: 'تم تأكيد الطلب رقم {number}: {items}، {total}. ستصلك تفاصيل التوصيل أو الاستلام.',
      outOfStock: '{name}: غير متوفر حالياً. سنبلغك عند توفره.',
      inStock: '{name} — متوفر · {price}',
      available: '{name} — الخيارات: {options} · {price}',
      propertyNoMatch: 'سيتحقق الفريق من العقارات المطابقة ويؤكد التفاصيل.',
      negotiation: 'قرارات الأسعار يتولاها فريقنا. سيرد عليك هنا.',
      abuse: 'أستطيع المساعدة في الأسئلة عن {business}. المحادثة الآن مع فريقنا.',
      media: 'تم الاستلام. سيراجع فريقنا ويرد هنا.',
      tooLong: 'تم الاستلام. سيراجع فريقنا رسالتك ويرد هنا.',
      adviceBoundary: 'لا أستطيع تقديم استشارات قانونية أو مالية. سيتابع فريقنا معك مباشرة.',
      replyLimit: 'سيكمل فريقنا معك من هنا.',
      thanks: 'شكراً{customer}.',
      howHelp: 'كيف أساعدك؟',
      youreWelcome: 'العفو.',
    },
  },
  sweet: {
    en: {
      greeting: 'Hi! I’m Layla from {business} 😊 How can I help you today?',
      welcome: 'Hi{customer}! I’m Layla from {business} 😊',
      handoffInbox: 'I’ve asked our team to jump in, they’ll reply right here.',
      handoffContact: 'Our lovely team can help you directly.',
      contactSuffix: ' You can reach our team here: {contact}',
      disabled: 'Lovely! Our team will arrange your booking and confirm it right here 😊',
      unknown: 'I’m not sure about that one, so I’ve asked our team. They’ll reply right here 💛',
      askMore: 'So I can help you better, could you tell me {list}? 🙏',
      orderReceived: 'Yay, order #{number} is in! The team will confirm availability and the total very soon.',
      orderConfirmed: 'Order #{number} is confirmed: {items}, {total}. We’ll message you about delivery or pickup 😊',
      outOfStock: 'Sorry, {name} is out of stock right now. We’ll let you know as soon as it’s back.',
      inStock: '{name} — in stock · {price}',
      available: '{name} — available in {options} · {price}',
      propertyNoMatch: 'Our team will look for the right properties for you and come back with confirmed details.',
      negotiation: 'Let me pass this to our team, they’re the best people to help with pricing 😊',
      abuse: 'I’m here to help with anything about {business}. I’ve passed this chat to our team.',
      media: 'Thank you! I’ve got your message and our team will take a look and reply here 😊',
      tooLong: 'Thank you for all the details! Our team will read it and reply here.',
      adviceBoundary: 'I’m not able to give legal or financial advice, but our team will follow up with you directly.',
      replyLimit: 'Our team will take it from here and reply very soon 💛',
      thanks: 'Thank you{customer}! 😊',
      howHelp: 'What can I help you with today?',
      youreWelcome: 'You’re very welcome! 😊 Message me anytime.',
    },
    ar: {
      greeting: 'أهلاً! أنا ليلى من {business} 😊 كيف أقدر أساعدك اليوم؟',
      welcome: 'أهلاً وسهلاً{customer}! معك ليلى من {business} 😊',
      handoffInbox: 'طلبت من فريقنا يتابع معك، وبيردون عليك هنا.',
      handoffContact: 'فريقنا يسعده يساعدك مباشرة.',
      contactSuffix: ' تقدر تتواصل مع فريقنا هنا: {contact}',
      disabled: 'جميل! فريقنا راح يرتب حجزك ويؤكده لك هنا 😊',
      unknown: 'ما عندي معلومة أكيدة عن هذا، فطلبت من فريقنا يرد عليك هنا 💛',
      askMore: 'عشان أساعدك أكثر، ممكن تخبرني {list}؟ 🙏',
      orderReceived: 'وصلنا طلبك رقم {number}! الفريق بيأكد التوفّر والمجموع قريباً جداً.',
      orderConfirmed: 'تم تأكيد طلبك رقم {number}: {items}، {total}. بنراسلك بخصوص التوصيل أو الاستلام 😊',
      outOfStock: 'للأسف {name} نفد حالياً، وبنبلغك أول ما يتوفر.',
      inStock: '{name} — متوفر · {price}',
      available: '{name} — متوفر بخيارات {options} · {price}',
      propertyNoMatch: 'فريقنا بيدور لك على العقارات المناسبة ويرجع لك بالتفاصيل المؤكدة.',
      negotiation: 'خليني أحول سؤالك لفريقنا، هم أفضل من يساعدك في الأسعار 😊',
      abuse: 'أنا هنا عشان أساعدك في أي شيء عن {business}. حوّلت المحادثة لفريقنا.',
      media: 'شكراً لك! وصلتني رسالتك وفريقنا بيراجعها ويرد عليك هنا 😊',
      tooLong: 'شكراً على كل التفاصيل! فريقنا بيقرأ رسالتك ويرد عليك هنا.',
      adviceBoundary: 'ما أقدر أقدم استشارات قانونية أو مالية، لكن فريقنا بيتواصل معك مباشرة.',
      replyLimit: 'فريقنا بيكمل معك من هنا ويرد قريباً 💛',
      thanks: 'شكراً لك{customer}! 😊',
      howHelp: 'بإيش أقدر أساعدك اليوم؟',
      youreWelcome: 'العفو! 😊 راسلني في أي وقت.',
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
