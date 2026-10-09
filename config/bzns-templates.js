// Starter bzns.md documents, one per named Catalyst industry and language.
//
// Every [bracket] is something the owner must replace; publish is refused while any
// remain. Prices, fees and stock are deliberately absent: Layla reads them live from
// Hasib or Services & Prices.
import { ADDITIONAL_BZNS_TEMPLATES } from './bzns-industry-templates.js';
import { INDUSTRY_IDS } from '../src/lib/industries.js';

const COMMON = {
  en: {
    name: '[Your business name]',
    about: ['About us', '[Two or three sentences: who you are, since when, and what makes you different.]'],
    areas: ['Areas we cover', '[The cities or neighbourhoods you serve.]'],
    location: ['Location', '[Building, street, area and city. Add your Google Maps link.]'],
    hours: ['Hours', '[For example: Sunday to Thursday 8:30 to 17:30, Saturday 9:00 to 13:00, closed Friday.]'],
    handoff: ['When Layla should hand over to the team', '[Complaints, negotiations, legal or medical questions, and anything not written in this document.]'],
    contact: ['Team contact', '[The phone, WhatsApp number or email Layla gives a customer she can’t help, for example: WhatsApp +968 9123 4567 (Sara). Required.]'],
    faq: ['FAQ', '**Q:** [A question customers often ask]\nA: [Your approved answer]\n\n**Q:** [Another common question]\nA: [Your approved answer]'],
  },
  ar: {
    name: '[اسم نشاطك التجاري]',
    about: ['من نحن', '[جملتان أو ثلاث: من أنتم ومنذ متى وما الذي يميزكم.]'],
    areas: ['المناطق التي نغطيها', '[المدن أو الأحياء التي تخدمونها.]'],
    location: ['الموقع', '[المبنى والشارع والمنطقة والمدينة. أضف رابط خرائط Google.]'],
    hours: ['ساعات العمل', '[مثال: من الأحد إلى الخميس من 8:30 إلى 17:30، والسبت من 9:00 إلى 13:00، والجمعة إجازة.]'],
    handoff: ['متى تحوّل ليلى المحادثة للفريق', '[الشكاوى والتفاوض والأسئلة القانونية أو الطبية وأي شيء غير مكتوب في هذا المستند.]'],
    contact: ['جهة اتصال الفريق', '[الهاتف أو رقم واتساب أو البريد الذي تعطيه ليلى لعميل لا تستطيع مساعدته، مثال: واتساب 96891234567 (سارة). مطلوب.]'],
    faq: ['الأسئلة الشائعة', '**س:** [سؤال يسأله العملاء كثيراً]\nج: [إجابتك المعتمدة]\n\n**س:** [سؤال شائع آخر]\nج: [إجابتك المعتمدة]'],
  },
};

// Per sector: what the business offers, plus sector sections between Areas and Location.
const SECTORS = {
  ...ADDITIONAL_BZNS_TEMPLATES,
  generic: {
    en: { offer: ['[Your main service or product]', '[Another service or product]'], extra: [['How to order or book', '[What the customer should send and what happens next.]'], ['Payment methods', '[Cash, card, bank transfer or payment links. No amounts here: prices live in Services & prices.]']] },
    ar: { offer: ['[خدمتك أو منتجك الرئيسي]', '[خدمة أو منتج آخر]'], extra: [['طريقة الطلب أو الحجز', '[ما الذي يرسله العميل وماذا يحدث بعد ذلك.]'], ['طرق الدفع', '[نقداً أو بطاقة أو تحويل بنكي أو رابط دفع. بدون مبالغ هنا: الأسعار في الخدمات والأسعار.]']] },
  },
  'real-estate': {
    en: {
      offer: ['Buying and selling residential and commercial property', 'Rentals: [apartments, villas, offices, shops]', '[Property management for landlords]', '[Valuations for owners]'],
      extra: [
        ['How viewings work', '[How to book, what the customer should send, which days viewings run, and who attends.]'],
        ['Renting: documents and steps', '[ID or passport, residence card for expats, salary letter; deposit and contract steps. Leave amounts out.]'],
        ['Buying: steps', '[Reservation, contract and registration. Which areas non-Omanis can buy in (check the current rules).]'],
        ['Listing your property with us', '[What the owner sends, how you value it, how you market it, and whether you need exclusivity.]'],
      ],
    },
    ar: {
      offer: ['بيع وشراء العقارات السكنية والتجارية', 'الإيجار: [شقق، فلل، مكاتب، محلات]', '[إدارة العقارات للملاك]', '[تقييم العقارات للملاك]'],
      extra: [
        ['المعاينات', '[طريقة الحجز وما يرسله العميل وأيام المعاينة ومن يحضرها.]'],
        ['الإيجار: المستندات والخطوات', '[الهوية أو جواز السفر وبطاقة الإقامة للوافدين وشهادة الراتب، وخطوات التأمين والعقد. لا تكتب مبالغ.]'],
        ['الشراء: الخطوات', '[الحجز ثم العقد ثم التسجيل، والمناطق المسموح لغير العمانيين التملك فيها (تأكد من الأنظمة الحالية).]'],
        ['عرض عقارك لدينا', '[ما يرسله المالك وطريقة التقييم والتسويق وهل تطلبون حصرية.]'],
      ],
    },
  },
  retail: {
    en: { offer: ['[Your main product categories]', '[Brands you carry]', '[Gift wrapping or custom orders]'], extra: [
      ['How to order', '[Order on WhatsApp, in store or online; what the customer should send.]'],
      ['Delivery and pickup', '[Which areas you deliver to, how long it takes, and pickup options. Leave delivery charges in Hasib.]'],
      ['Returns and exchanges', '[How many days, condition required, and how refunds work.]'],
      ['Payment methods', '[Cash, card, bank transfer, payment links.]'],
    ] },
    ar: { offer: ['[فئات منتجاتك الرئيسية]', '[العلامات التجارية المتوفرة]', '[تغليف الهدايا أو الطلبات الخاصة]'], extra: [
      ['طريقة الطلب', '[الطلب عبر واتساب أو في المتجر أو أونلاين، وما يرسله العميل.]'],
      ['التوصيل والاستلام', '[مناطق التوصيل ومدته وخيارات الاستلام. رسوم التوصيل تبقى في حاسب.]'],
      ['الاسترجاع والاستبدال', '[عدد الأيام والحالة المطلوبة وطريقة الاسترداد.]'],
      ['طرق الدفع', '[نقداً، بطاقة، تحويل بنكي، روابط دفع.]'],
    ] },
  },
  'retail-tech': {
    en: { offer: ['[Phones, laptops and accessories you sell]', '[Repairs you handle]', '[Trade-ins]'], extra: [
      ['How to order', '[Order on WhatsApp, in store or online; what the customer should send.]'],
      ['Warranty', '[Who provides the warranty, how long it lasts, and what it covers.]'],
      ['Repairs and trade-ins', '[How to book a repair, typical turnaround, and how trade-in values are checked.]'],
      ['Delivery and pickup', '[Areas you deliver to and pickup options.]'],
      ['Returns', '[Return window and condition required.]'],
      ['Payment methods', '[Cash, card, bank transfer or payment links. No amounts here: prices live in Services & prices.]'],
    ] },
    ar: { offer: ['[الهواتف والحواسيب والإكسسوارات التي تبيعونها]', '[أعمال الصيانة]', '[الاستبدال بأجهزة مستعملة]'], extra: [
      ['طريقة الطلب', '[الطلب عبر واتساب أو في المتجر أو أونلاين، وما يرسله العميل.]'],
      ['الضمان', '[من يقدم الضمان ومدته وما يشمله.]'],
      ['الصيانة والاستبدال', '[طريقة حجز الصيانة والمدة المعتادة وكيف تُقيَّم الأجهزة المستعملة.]'],
      ['التوصيل والاستلام', '[مناطق التوصيل وخيارات الاستلام.]'],
      ['الاسترجاع', '[مدة الاسترجاع والحالة المطلوبة.]'],
      ['طرق الدفع', '[نقداً أو بطاقة أو تحويل بنكي أو رابط دفع. بدون مبالغ هنا: الأسعار في الخدمات والأسعار.]'],
    ] },
  },
  dental: {
    en: { offer: ['[General check-ups and cleaning]', '[Fillings, root canal, crowns]', '[Orthodontics, implants, whitening]'], extra: [
      ['Booking an appointment', '[How to book, what the patient should send, and how far ahead you book.]'],
      ['First visit', '[What to bring and how long it takes.]'],
      ['Insurance', '[Which insurers you accept.]'],
      ['Emergencies', '[What counts as an emergency and how patients reach you. Layla never gives medical advice.]'],
      ['Rescheduling and cancellation', '[How patients move or cancel an appointment, and how much notice you need.]'],
      ['Payment methods', '[Cash, card, bank transfer or payment links. No amounts here: prices live in Services & prices.]'],
    ] },
    ar: { offer: ['[الفحص والتنظيف]', '[الحشوات وعلاج العصب والتيجان]', '[التقويم والزراعة والتبييض]'], extra: [
      ['حجز موعد', '[طريقة الحجز وما يرسله المريض ومدة الحجز المسبق.]'],
      ['الزيارة الأولى', '[ما يحضره المريض والمدة المتوقعة.]'],
      ['التأمين', '[شركات التأمين المعتمدة.]'],
      ['الحالات الطارئة', '[ما يعد حالة طارئة وكيف يتواصل المريض معكم. ليلى لا تقدم نصائح طبية.]'],
      ['تغيير الموعد أو إلغاؤه', '[كيف يغيّر المريض موعده أو يلغيه، وكم يلزم من إشعار مسبق.]'],
      ['طرق الدفع', '[نقداً أو بطاقة أو تحويل بنكي أو رابط دفع. بدون مبالغ هنا: الأسعار في الخدمات والأسعار.]'],
    ] },
  },
  construction: {
    en: { offer: ['[Villas and residential buildings]', '[Fit-out and renovation]', '[Maintenance contracts]'], extra: [
      ['Projects we take on', '[Project types and sizes you accept.]'],
      ['How quotes work', '[What the customer should send (drawings, location, scope) and how long a quote takes.]'],
      ['Site visits', '[How to book a site visit and who attends.]'],
      ['Timelines and handover', '[Typical stages, handover and defect period.]'],
    ] },
    ar: { offer: ['[الفلل والمباني السكنية]', '[التشطيبات والترميم]', '[عقود الصيانة]'], extra: [
      ['المشاريع التي ننفذها', '[أنواع وأحجام المشاريع التي تقبلونها.]'],
      ['طريقة عروض الأسعار', '[ما يرسله العميل (المخططات والموقع ونطاق العمل) ومدة إعداد العرض.]'],
      ['زيارات الموقع', '[طريقة حجز زيارة الموقع ومن يحضرها.]'],
      ['المدة والتسليم', '[المراحل المعتادة والتسليم وفترة الضمان.]'],
    ] },
  },
  automotive: {
    en: { offer: ['[Servicing and oil changes]', '[Diagnostics and repairs]', '[Tyres, batteries and parts]'], extra: [
      ['Booking a service', '[How to book, what the customer should send (car model, year, issue).]'],
      ['Parts', '[Genuine or aftermarket, and how you confirm availability.]'],
      ['Approval and collection', '[How you ask approval before extra work and how collection works.]'],
      ['Warranty', '[Warranty on parts and labour.]'],
      ['Pickup and drop-off', '[Whether you collect and return cars, which areas, and how to arrange it.]'],
      ['Payment methods', '[Cash, card, bank transfer or payment links. No amounts here: prices live in Services & prices.]'],
    ] },
    ar: { offer: ['[الصيانة الدورية وتغيير الزيت]', '[الفحص والإصلاح]', '[الإطارات والبطاريات وقطع الغيار]'], extra: [
      ['حجز الصيانة', '[طريقة الحجز وما يرسله العميل (الطراز والسنة والمشكلة).]'],
      ['قطع الغيار', '[أصلية أو تجارية وكيف تتأكدون من توفرها.]'],
      ['الموافقة والاستلام', '[كيف تطلبون الموافقة قبل أي عمل إضافي وطريقة الاستلام.]'],
      ['الضمان', '[الضمان على القطع والعمل.]'],
      ['استلام السيارة وتوصيلها', '[هل تستلمون السيارة وتعيدونها، وأي مناطق، وكيف يتم الترتيب.]'],
      ['طرق الدفع', '[نقداً أو بطاقة أو تحويل بنكي أو رابط دفع. بدون مبالغ هنا: الأسعار في الخدمات والأسعار.]'],
    ] },
  },
};

export const BZNS_TEMPLATE_SECTORS = Object.freeze(Object.keys(SECTORS));
const OFFER_HEADING = { en: 'What we offer', ar: 'خدماتنا' };
const SECTOR_LINE = { en: '[your sector]', ar: '[مجال نشاطك]' };

/**
 * @param {string} sector An industry id; anything else gets the generic template.
 * @param {'en'|'ar'} lang
 * @returns {string}
 */
export function bznsTemplate(sector, lang = 'en') {
  const id = Object.hasOwn(SECTORS, sector) ? sector : 'generic';
  const l = lang === 'ar' ? 'ar' : 'en';
  const c = COMMON[l], s = SECTORS[id][l];
  const section = ([heading, body]) => `## ${heading}\n${body}`;
  return [
    `---\nname: ${c.name}\nsector: ${INDUSTRY_IDS.has(sector) ? sector : SECTOR_LINE[l]}\ntone: informative\n---`,
    `# ${c.name}`,
    section(c.about),
    section([OFFER_HEADING[l], s.offer.map(line => `- ${line}`).join('\n')]),
    section(c.areas),
    ...s.extra.map(section),
    section(c.location),
    section(c.hours),
    section(c.handoff),
    section(c.contact),
    section(c.faq),
  ].join('\n\n') + '\n';
}

/**
 * Catalyst BznsBrain's starting document: the same sector template without the parts BznsBrain moved
 * elsewhere. Tone and handoff rules are Layla's behaviour settings; FAQs are gone (each fact has one
 * home: bzns.md for information and policies, the Catalog for services and prices).
 * @param {string} sector @param {'en'|'ar'} lang @returns {string}
 */
export function brainTemplate(sector, lang = 'en') {
  const id = Object.hasOwn(SECTORS, sector) ? sector : 'generic';
  const l = lang === 'ar' ? 'ar' : 'en';
  const c = COMMON[l], s = SECTORS[id][l];
  const section = ([heading, body]) => `## ${heading}\n${String(body).replace(/Services & prices|الخدمات والأسعار/g, l === 'ar' ? 'الكتالوج' : 'the Catalog')}`;
  return [
    `---\nname: ${c.name}\nsector: ${INDUSTRY_IDS.has(sector) ? sector : SECTOR_LINE[l]}\n---`,
    `# ${c.name}`,
    section(c.about),
    section([OFFER_HEADING[l], s.offer.map(line => `- ${line}`).join('\n')]),
    section(c.areas),
    ...s.extra.map(section),
    section(c.location),
    section(c.hours),
    section(c.contact),
  ].join('\n\n') + '\n';
}
