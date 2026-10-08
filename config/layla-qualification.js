// Deterministic lead qualification for Layla's 22 sector packs.
//
// Pure module shared by Convex (ingest), the dashboard API and tests. It never
// calls a model: fields come from closed vocabularies, approved catalog names
// and bounded patterns. Medical, legal and finance packs only collect
// operational booking details and never keep contextual free text.
import { phrase } from './layla-tones.js';
import { INDUSTRIES } from '../src/lib/industries.js';

export const QUALIFICATION_VERSION = 'qualification-v1';
export const MAX_QUESTIONS = 3;
export const MAX_ASKS_PER_FIELD = 2;
export const ASK_COOLDOWN_MS = 30 * 60000;
export const MIN_CONFIDENCE = 0.6;
const SENSITIVE_SECTORS = new Set(['clinic', 'dental', 'legal', 'finance']);

const opt = (id, en, ar, match = []) => ({ id, en, ar, match: [en.toLowerCase(), ar, ...match] });

// Reusable field definitions. `ask` is a short noun phrase used inside a question.
const F = {
  service: (options = []) => ({ key: 'service', kind: 'catalog', en: 'Service', ar: 'الخدمة', options,
    ask: { en: 'which service you would like', ar: 'ما الخدمة التي تريدها' } }),
  item: (options = []) => ({ key: 'item', kind: 'catalog', en: 'Item', ar: 'المنتج', options,
    ask: { en: 'which item you would like', ar: 'ما المنتج الذي تريده' } }),
  need: (options = [], ask) => ({ key: 'need', kind: options.length ? 'enum' : 'text', en: 'Need', ar: 'الاحتياج', options,
    ask: ask || { en: 'what you need help with', ar: 'ما الذي تحتاجه تحديداً' } }),
  preferredTime: () => ({ key: 'preferred_time', kind: 'datetime', en: 'Preferred date and time', ar: 'الموعد المفضل',
    ask: { en: 'your preferred date and time', ar: 'اليوم والوقت المناسبين لك' } }),
  dateNeeded: () => ({ key: 'date_needed', kind: 'datetime', en: 'Date needed', ar: 'التاريخ المطلوب',
    ask: { en: 'the date you need it', ar: 'التاريخ الذي تحتاجه فيه' } }),
  location: (options = []) => ({ key: 'location', kind: 'area', en: 'Location', ar: 'الموقع', options,
    ask: { en: 'your area or preferred branch', ar: 'منطقتك أو الفرع المناسب لك' } }),
  area: () => ({ key: 'area', kind: 'area', en: 'Area', ar: 'المنطقة',
    ask: { en: 'your area', ar: 'منطقتك' } }),
  quantity: (ask) => ({ key: 'quantity', kind: 'number', en: 'Quantity', ar: 'الكمية',
    ask: ask || { en: 'the quantity', ar: 'الكمية المطلوبة' } }),
  fulfilment: (dineIn = false) => ({ key: 'fulfilment', kind: 'enum', en: 'Delivery or pickup', ar: 'التوصيل أو الاستلام',
    options: [opt('delivery', 'Delivery', 'توصيل', ['deliver', 'delivered', 'وصلوها', 'توصيله', 'دليفري']),
      opt('pickup', 'Pickup', 'استلام', ['pick up', 'pick-up', 'collect', 'takeaway', 'take away', 'بستلم', 'استلمه', 'من المحل']),
      ...(dineIn ? [opt('dine_in', 'Dine in', 'في المطعم', ['dine-in', 'eat in', 'table', 'طاولة', 'جلسة'])] : [])],
    ask: { en: dineIn ? 'whether you prefer delivery, pickup or dining in' : 'whether you prefer delivery or pickup',
      ar: dineIn ? 'هل تفضل التوصيل أو الاستلام أو الجلوس' : 'هل تفضل التوصيل أو الاستلام' } }),
  budget: () => ({ key: 'budget', kind: 'budget', en: 'Budget', ar: 'الميزانية',
    ask: { en: 'your approximate budget', ar: 'ميزانيتك التقريبية' } }),
  timeline: () => ({ key: 'timeline', kind: 'timeline', en: 'Timeline', ar: 'الوقت المتوقع',
    ask: { en: 'when you would like to start', ar: 'متى تريد البدء' } }),
  count: (key, en, ar, ask) => ({ key, kind: 'number', en, ar, ask }),
  text: (key, en, ar, ask) => ({ key, kind: 'text', en, ar, ask }),
  choice: (key, en, ar, options, ask) => ({ key, kind: 'enum', en, ar, options, ask }),
};

const inPerson = [opt('branch', 'Branch visit', 'زيارة الفرع', ['clinic', 'office', 'visit', 'العيادة', 'المكتب', 'زيارة']),
  opt('online', 'Online', 'أونلاين', ['video', 'zoom', 'عن بعد', 'اون لاين']), opt('phone', 'Phone call', 'مكالمة', ['call', 'اتصال'])];

// `flow: 'reception'`: in Catalyst's BznsBrain mode the sector asks one detail at a time, name → service → (on
// appointment interest) preferred time, and records an appointment request for reception.
const sector = (archetype, fields, groups, flow) => ({ archetype, fields, groups, ...(flow ? { flow } : {}) });
const req = (field, required = true) => ({ ...field, required });

export const QUALIFICATION_PACKS = {
  'real-estate': sector('project', [
    req(F.need([opt('buy', 'Buy', 'شراء', ['purchase', 'buying', 'for sale', 'اشتري', 'أشتري', 'تمليك']), opt('rent', 'Rent', 'إيجار', ['rental', 'lease', 'renting', 'for rent', 'استئجار', 'أستأجر', 'ايجار']), opt('sell', 'Sell', 'بيع', ['selling', 'أبيع', 'ابيع']), opt('invest', 'Invest', 'استثمار', ['investment', 'investing'])],
      { en: 'whether you want to buy, rent, sell or invest', ar: 'هل تريد الشراء أو الإيجار أو البيع أو الاستثمار' })),
    req(F.choice('property_type', 'Property type', 'نوع العقار', [opt('apartment', 'Apartment', 'شقة', ['flat', 'شقه', 'شقق']), opt('villa', 'Villa', 'فيلا', ['house', 'بيت', 'منزل', 'فلل']), opt('land', 'Land', 'أرض', ['plot', 'ارض', 'اراضي']), opt('office', 'Office', 'مكتب', ['مكاتب']), opt('shop', 'Shop', 'محل', ['retail unit', 'showroom', 'معرض', 'محلات'])],
      { en: 'the property type', ar: 'نوع العقار' })),
    req(F.area()), req(F.budget()), F.count('bedrooms', 'Bedrooms', 'غرف النوم', { en: 'how many bedrooms you need', ar: 'عدد غرف النوم المطلوبة' }),
    req(F.choice('finance_readiness', 'Finance readiness', 'جاهزية التمويل', [opt('cash', 'Cash ready', 'نقداً', ['cash buyer', 'نقد', 'كاش']), opt('approved', 'Finance approved', 'التمويل موافق عليه', ['mortgage approved', 'pre approved', 'موافقة بنكية']), opt('in_progress', 'Finance in progress', 'التمويل قيد الإجراء', ['applying', 'بانتظار البنك']), opt('unknown', 'Not decided', 'لم يقرر', ['not sure', 'ما قررت'])], { en: 'whether finance is ready, in progress, or cash', ar: 'هل التمويل جاهز أو قيد الإجراء أو نقداً' })),
    req(F.choice('decision_maker', 'Decision maker', 'صاحب القرار', [opt('ready', 'I decide', 'أنا صاحب القرار', ['i decide', 'my decision', 'قراري']), opt('consulting', 'Deciding with someone', 'أقرر مع شخص آخر', ['with my spouse', 'with partner', 'مع زوجي', 'مع شريكي']), opt('unknown', 'Not confirmed', 'غير مؤكد', ['not sure', 'غير متأكد'])], { en: 'whether you are the decision maker', ar: 'هل أنت صاحب القرار' })),
    req(F.timeline()), F.text('must_haves', 'Must-haves', 'المتطلبات الأساسية', { en: 'any must-have features', ar: 'أي متطلبات أساسية' }),
  ], [['need', 'property_type', 'area'], ['budget', 'finance_readiness', 'decision_maker'], ['timeline', 'bedrooms', 'must_haves']]),
  dental: sector('booking', [
    req(F.service([opt('checkup', 'Check-up', 'فحص', ['check up', 'examination', 'كشف']), opt('cleaning', 'Cleaning', 'تنظيف', ['scaling', 'تنظيف أسنان']), opt('whitening', 'Whitening', 'تبييض'), opt('orthodontics', 'Orthodontics', 'تقويم', ['braces', 'aligners']), opt('implants', 'Implants', 'زراعة', ['implant']), opt('fillings', 'Fillings', 'حشوة', ['filling', 'حشو'])])),
    req({ ...F.preferredTime(), appointment: true }), req({ ...F.location(inPerson.slice(0, 1)), askable: false }),
  ], [['service', 'preferred_time', 'location']], 'reception'),
  clinic: sector('booking', [
    req(F.choice('service', 'Visit type', 'نوع الزيارة', [opt('consultation', 'Consultation', 'استشارة', ['doctor', 'appointment with doctor', 'كشف', 'دكتور']), opt('follow_up', 'Follow-up', 'متابعة', ['follow up', 'review visit', 'مراجعة']), opt('checkup', 'Check-up', 'فحص عام', ['general check', 'checkup', 'فحص']), opt('vaccination', 'Vaccination', 'تطعيم', ['vaccine', 'لقاح']), opt('lab_test', 'Lab test', 'تحليل', ['blood test', 'lab', 'مختبر', 'تحاليل'])],
      { en: 'the type of visit', ar: 'نوع الزيارة' })),
    req(F.preferredTime()), req(F.location(inPerson.slice(0, 2))),
  ], [['service', 'preferred_time', 'location']]),
  hvac: sector('project', [
    req(F.need([opt('installation', 'Installation', 'تركيب', ['install', 'new unit', 'new ac']), opt('repair', 'Repair', 'تصليح', ['fix', 'not cooling', 'broken', 'صيانة عطل', 'خربان', 'ما يبرد']), opt('maintenance', 'Maintenance', 'صيانة', ['service', 'servicing']), opt('cleaning', 'Cleaning', 'تنظيف', ['wash', 'غسيل'])],
      { en: 'whether you need installation, repair, maintenance or cleaning', ar: 'هل تحتاج تركيب أو تصليح أو صيانة أو تنظيف' })),
    F.count('units', 'Units', 'عدد الوحدات', { en: 'how many units', ar: 'عدد الوحدات' }),
    req(F.area()), req(F.timeline()),
  ], [['need', 'area', 'timeline'], ['units']]),
  construction: sector('project', [
    req(F.need([opt('new_build', 'New build', 'بناء جديد', ['build a house', 'construction of', 'بناء', 'بيت جديد']), opt('renovation', 'Renovation', 'ترميم', ['renovate', 'refurbish', 'تجديد']), opt('extension', 'Extension', 'توسعة', ['extend', 'addition', 'ملحق']), opt('fit_out', 'Fit-out', 'تشطيب', ['fit out', 'finishing', 'تشطيبات'])],
      { en: 'the type of project', ar: 'نوع المشروع' })),
    req(F.area()), req(F.budget()), req(F.timeline()),
  ], [['need', 'area', 'timeline'], ['budget']]),
  cakes: sector('catalog', [
    req(F.item()), req(F.quantity({ en: 'how many pieces or servings', ar: 'عدد القطع أو الأشخاص' })), req(F.fulfilment()), req(F.dateNeeded()),
  ], [['item', 'quantity', 'date_needed'], ['fulfilment']]),
  cafe: sector('catalog', [req(F.item()), req(F.quantity()), req(F.fulfilment(true))], [['item', 'quantity', 'fulfilment']]),
  restaurant: sector('catalog', [req(F.item()), req(F.quantity()), req(F.fulfilment(true))], [['item', 'quantity', 'fulfilment']]),
  retail: sector('catalog', [req(F.item()), req(F.quantity()), req(F.fulfilment()), F.area()], [['item', 'quantity', 'fulfilment'], ['area']]),
  beauty: sector('booking', [
    req(F.service()), req(F.preferredTime()),
    req(F.location([opt('salon', 'At the salon', 'في الصالون', ['salon', 'branch', 'الصالون', 'المحل']), opt('home', 'Home service', 'خدمة منزلية', ['home visit', 'at home', 'في البيت', 'بالبيت'])])),
  ], [['service', 'preferred_time', 'location']]),
  fitness: sector('booking', [
    req(F.service([opt('membership', 'Membership', 'اشتراك', ['subscription', 'join', 'عضوية']), opt('personal_training', 'Personal training', 'تدريب شخصي', ['personal trainer', 'pt', 'مدرب']), opt('class', 'Class', 'حصة', ['classes', 'session', 'كلاس']), opt('trial', 'Trial', 'تجربة', ['free trial', 'try'])])),
    req(F.preferredTime()), req(F.location()),
  ], [['service', 'preferred_time', 'location']]),
  education: sector('project', [
    req(F.need([], { en: 'which course or programme interests you', ar: 'ما الدورة أو البرنامج الذي يهمك' })),
    req(F.choice('location', 'Study mode', 'طريقة الدراسة', [opt('online', 'Online', 'أونلاين', ['remote', 'zoom', 'عن بعد', 'اون لاين']), opt('in_person', 'In person', 'حضوري', ['classroom', 'campus', 'center', 'centre', 'المعهد'])],
      { en: 'whether you prefer online or in person', ar: 'هل تفضل الدراسة أونلاين أو حضورياً' })),
    req(F.budget()), req(F.timeline()),
  ], [['need', 'location', 'timeline'], ['budget']]),
  automotive: sector('booking', [
    req(F.service([opt('maintenance', 'Maintenance', 'صيانة', ['service', 'oil change', 'تغيير زيت']), opt('repair', 'Repair', 'تصليح', ['fix', 'problem', 'عطل']), opt('inspection', 'Inspection', 'فحص', ['check', 'فحص السيارة']), opt('detailing', 'Detailing', 'تلميع', ['polish', 'wash', 'غسيل']), opt('tyres', 'Tyres', 'إطارات', ['tires', 'tyre', 'tire', 'تواير', 'كفرات'])])),
    F.text('vehicle', 'Vehicle', 'السيارة', { en: 'your vehicle make and model', ar: 'نوع السيارة وموديلها' }),
    req(F.preferredTime()), req(F.location()),
  ], [['service', 'preferred_time', 'location'], ['vehicle']]),
  logistics: sector('project', [
    req(F.need([opt('delivery', 'Delivery', 'توصيل', ['deliver', 'parcel', 'طرد']), opt('freight', 'Freight', 'شحن', ['shipping', 'cargo', 'container', 'حاوية']), opt('moving', 'Moving', 'نقل أثاث', ['movers', 'relocation', 'نقل']), opt('courier', 'Courier', 'مندوب', ['same day', 'express', 'سريع'])],
      { en: 'the type of delivery service', ar: 'نوع خدمة التوصيل' })),
    req(F.area()), F.quantity({ en: 'the approximate size or number of items', ar: 'الحجم أو عدد القطع تقريباً' }), req(F.timeline()),
  ], [['need', 'area', 'timeline'], ['quantity']]),
  travel: sector('project', [
    req(F.text('destination', 'Destination', 'الوجهة', { en: 'your destination', ar: 'وجهتك' })),
    req({ ...F.dateNeeded(), key: 'travel_dates', en: 'Travel dates', ar: 'تواريخ السفر', ask: { en: 'your travel dates', ar: 'تواريخ السفر' } }),
    req(F.count('travellers', 'Travellers', 'عدد المسافرين', { en: 'how many travellers', ar: 'عدد المسافرين' })),
    F.budget(),
  ], [['destination', 'travel_dates', 'travellers'], ['budget']]),
  events: sector('project', [
    req(F.choice('event_type', 'Event type', 'نوع المناسبة', [opt('wedding', 'Wedding', 'عرس', ['marriage', 'زواج', 'زفاف']), opt('birthday', 'Birthday', 'عيد ميلاد', ['bday']), opt('corporate', 'Corporate', 'فعالية شركة', ['conference', 'company event', 'مؤتمر']), opt('graduation', 'Graduation', 'تخرج'), opt('engagement', 'Engagement', 'ملكة', ['خطوبة'])],
      { en: 'the type of event', ar: 'نوع المناسبة' })),
    req({ ...F.dateNeeded(), key: 'event_date', en: 'Event date', ar: 'تاريخ المناسبة', ask: { en: 'the event date', ar: 'تاريخ المناسبة' } }),
    req(F.count('guests', 'Guests', 'عدد الضيوف', { en: 'the number of guests', ar: 'عدد الضيوف' })),
    req(F.area()), F.budget(),
  ], [['event_type', 'event_date', 'guests'], ['area', 'budget']]),
  legal: sector('booking', [
    req(F.choice('service', 'Consultation type', 'نوع الاستشارة', [opt('contracts', 'Contracts', 'عقود', ['contract', 'agreement', 'عقد']), opt('company_setup', 'Company setup', 'تأسيس شركة', ['company registration', 'incorporation', 'تسجيل شركة']), opt('employment', 'Employment', 'عمالي', ['labour', 'labor', 'work', 'عمل']), opt('real_estate', 'Property', 'عقاري', ['property', 'lease', 'عقار']), opt('consultation', 'General consultation', 'استشارة عامة', ['consultation', 'advice', 'استشارة'])],
      { en: 'the general type of consultation', ar: 'النوع العام للاستشارة' })),
    req(F.preferredTime()), req(F.location(inPerson)),
  ], [['service', 'preferred_time', 'location']]),
  finance: sector('booking', [
    req(F.choice('service', 'Service', 'الخدمة', [opt('bookkeeping', 'Bookkeeping', 'مسك دفاتر', ['accounting', 'accounts', 'محاسبة']), opt('vat', 'VAT and tax', 'ضريبة القيمة المضافة', ['tax', 'vat return', 'ضريبة']), opt('audit', 'Audit', 'تدقيق', ['auditing', 'مراجعة حسابات']), opt('payroll', 'Payroll', 'رواتب', ['salaries', 'wps']), opt('company_setup', 'Company setup', 'تأسيس شركة', ['company registration', 'تسجيل شركة'])],
      { en: 'which service you need', ar: 'الخدمة التي تحتاجها' })),
    req(F.preferredTime()), req(F.location(inPerson)),
  ], [['service', 'preferred_time', 'location']]),
  marketing: sector('project', [
    req(F.need([opt('social_media', 'Social media', 'سوشال ميديا', ['instagram', 'tiktok', 'social', 'التواصل الاجتماعي']), opt('ads', 'Paid ads', 'إعلانات', ['ads', 'advertising', 'campaign', 'اعلانات', 'حملة']), opt('branding', 'Branding', 'هوية', ['logo', 'brand', 'شعار']), opt('website', 'Website', 'موقع', ['web site', 'landing page', 'موقع إلكتروني']), opt('content', 'Content', 'محتوى', ['video', 'photography', 'تصوير'])])),
    req(F.budget()), req(F.timeline()),
  ], [['need', 'budget', 'timeline']]),
  technology: sector('project', [
    req(F.need([opt('website', 'Website', 'موقع', ['web site', 'web app', 'موقع إلكتروني']), opt('mobile_app', 'Mobile app', 'تطبيق', ['app', 'ios', 'android', 'تطبيق جوال']), opt('automation', 'Automation', 'أتمتة', ['automate', 'workflow', 'chatbot', 'بوت']), opt('software', 'Custom software', 'برنامج مخصص', ['system', 'erp', 'crm', 'نظام']), opt('it_support', 'IT support', 'دعم فني', ['support', 'network', 'شبكة'])])),
    req(F.budget()), req(F.timeline()),
  ], [['need', 'budget', 'timeline']]),
  manufacturing: sector('project', [
    req(F.need([], { en: 'which product you need', ar: 'المنتج الذي تحتاجه' })),
    req(F.quantity()), req(F.area()), req(F.timeline()), F.budget(),
  ], [['need', 'quantity', 'timeline'], ['area', 'budget']]),
  cleaning: sector('booking', [
    req(F.service([opt('home', 'Home cleaning', 'تنظيف منزل', ['house', 'apartment', 'villa', 'بيت', 'منزل', 'شقة']), opt('office', 'Office cleaning', 'تنظيف مكتب', ['office', 'مكتب']), opt('deep_clean', 'Deep cleaning', 'تنظيف عميق', ['deep clean', 'deep']), opt('sofa_carpet', 'Sofa and carpet', 'كنب وسجاد', ['sofa', 'carpet', 'upholstery', 'كنب', 'سجاد', 'موكيت']), opt('move', 'Move-in or move-out', 'قبل أو بعد الانتقال', ['move in', 'move out', 'moving', 'انتقال'])])),
    req(F.preferredTime()), req(F.location()),
  ], [['service', 'preferred_time', 'location']]),
  other: sector('project', [req(F.need()), req(F.area()), req(F.timeline())], [['need', 'area', 'timeline']]),
};

export const QUALIFICATION_SECTOR_IDS = Object.keys(QUALIFICATION_PACKS).filter(id => id !== 'other');
export const isSensitiveSector = id => SENSITIVE_SECTORS.has(id);
export function qualificationPack(id) {
  const pack = QUALIFICATION_PACKS[id] || QUALIFICATION_PACKS.other;
  return { id: QUALIFICATION_PACKS[id] ? id : 'other', sensitive: SENSITIVE_SECTORS.has(id), ...pack };
}
export function fieldKeys(sectorId) { return qualificationPack(sectorId).fields.map(f => f.key); }
export function requiredKeys(sectorId) { return qualificationPack(sectorId).fields.filter(f => f.required).map(f => f.key); }

/** Map a saved profile sector label (English, Arabic or free text) to a pack id. */
export function sectorIdFor(label) {
  const value = String(label || '').trim().toLowerCase();
  const found = INDUSTRIES.find(i => i.id === value || i.en.toLowerCase() === value || i.ar === String(label || '').trim());
  return found && QUALIFICATION_PACKS[found.id] ? found.id : 'other';
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function normalizeText(text) {
  return String(text || '').normalize('NFKC').toLowerCase()
    .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[ً-ٰٟـ]/g, '').replace(/\s+/g, ' ').trim();
}
const isArabicWord = w => /[؀-ۿ]/.test(w);
function containsTerm(haystack, term) {
  const t = normalizeText(term);
  if (t.length < 2) return false;
  if (isArabicWord(t)) return haystack.includes(t);
  // English plurals ("villas", "boxes") match their singular option.
  return new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:e?s)?($|[^a-z0-9])`).test(haystack);
}
const clip = (value, n = 80) => String(value || '').replace(/[ -]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

const PLACES = [
  ['Muscat', 'مسقط'], ['Seeb', 'السيب'], ['Bawshar', 'بوشر', ['bausher']], ['Muttrah', 'مطرح', ['mutrah']], ['Qurum', 'القرم'], ['Al Khuwair', 'الخوير', ['khuwair']],
  ['Ghubra', 'الغبرة', ['ghubrah']], ['Azaiba', 'العذيبة', ['azaibah']], ['Mawaleh', 'الموالح'], ['Khoudh', 'الخوض', ['al khoud']], ['Ruwi', 'روي'], ['Amerat', 'العامرات'],
  ['Barka', 'بركاء'], ['Sohar', 'صحار'], ['Salalah', 'صلالة'], ['Nizwa', 'نزوى'], ['Sur', 'صور'], ['Ibri', 'عبري'], ['Rustaq', 'الرستاق'], ['Duqm', 'الدقم'],
  ['Madinat Sultan Qaboos', 'مدينة السلطان قابوس', ['msq']], ['Al Hail', 'الحيل'], ['Dubai', 'دبي'], ['Abu Dhabi', 'أبوظبي'], ['Sharjah', 'الشارقة'], ['Riyadh', 'الرياض'],
  ['Al Mouj', 'الموج', ['mouj', 'the wave']], ['Muscat Bay', 'خليج مسقط'], ['Al Ansab', 'الأنصب', ['ansab']], ['Wattayah', 'الوطية', ['wattaya']],
  ['Darsait', 'دارسيت'], ['Al Hamriya', 'الحمرية', ['hamriya']], ['Bausher Heights', 'مرتفعات بوشر'], ['Al Amerat Heights', 'مرتفعات العامرات'],
  ['Jeddah', 'جدة'], ['Doha', 'الدوحة'], ['Kuwait City', 'مدينة الكويت'], ['Manama', 'المنامة'], ['Cairo', 'القاهرة'],
];
const WEEKDAYS_EN = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun';
const MONTHS_EN = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec';
const WEEKDAYS_AR = 'الاحد|الاثنين|الثلاثاء|الاربعاء|الخميس|الجمعه|السبت';
const NOT_NAMES = new Set(['interested', 'looking', 'here', 'fine', 'ok', 'okay', 'good', 'from', 'not', 'trying', 'asking', 'a', 'an', 'the', 'in', 'at', 'going', 'planning', 'available', 'sorry', 'new', 'just', 'still', 'also', 'ready', 'waiting']);
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20, 'واحد': 1, 'وحده': 1, 'اثنين': 2, 'ثنتين': 2, 'ثلاث': 3, 'ثلاثه': 3, 'اربع': 4, 'اربعه': 4, 'خمس': 5, 'خمسه': 5, 'ست': 6, 'سته': 6, 'عشر': 10, 'عشره': 10 };

function extractDatetime(t) {
  const patterns = [
    /\b(day after tomorrow|today|tonight|tomorrow|this (?:morning|afternoon|evening|weekend)|next (?:week|month|weekend))\b/,
    new RegExp(`\\b(?:(?:this|next|on)\\s+)?(${WEEKDAYS_EN})\\b(?:\\s+(?:morning|afternoon|evening))?`),
    new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${MONTHS_EN})\\b|\\b(?:${MONTHS_EN})\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`),
    // Slashes only, or a full dd-mm-yyyy: "20.5 OMR" and "5-10 people" are not dates.
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b\d{1,2}-\d{1,2}-\d{4}\b/,
    /\b(?:at\s+)?\d{1,2}(?::\d{2})?\s?(?:am|pm)\b|\bat\s+\d{1,2}(?::\d{2})\b/,
    /(بعد بكره|بكره|بكرا|باكر|غدا|اليوم|الليله|الاسبوع (?:الجاي|القادم)|الشهر (?:الجاي|القادم)|نهايه الاسبوع)/,
    new RegExp(`(?:يوم\\s+)?(${WEEKDAYS_AR})`),
    /(?:الساعه\s*\d{1,2}(?::\d{2})?(?:\s*(?:صباحا|مساء|الصبح|العصر|المغرب|الظهر|بالليل))?|\d{1,2}(?::\d{2})?\s*(?:صباحا|مساء|الصبح|العصر|الظهر|بالليل))/,
  ];
  const found = [];
  for (const re of patterns) { const m = t.match(re); if (m && !found.some(f => f.includes(m[0].trim()))) found.push(m[0].trim()); }
  return found.length ? { value: clip(found.join(' '), 60), confidence: 0.85 } : null;
}
function extractBudget(t) {
  const amount = '(\\d{1,3}(?:[,\\s]\\d{3})+|\\d+(?:\\.\\d+)?)\\s*(k|الف|الاف)?';
  const cur = '(omr|ro|ر\\.?\\s?ع\\.?|ريال|rial|riyal|aed|dirham|درهم|sar|usd|dollars?|\\$|دولار)';
  const range = t.match(new RegExp(`(?:between|from|بين|من)\\s*${amount}\\s*(?:and|to|-|و|الى|لـ)\\s*${amount}\\s*${cur}?`));
  const withCurrency = t.match(new RegExp(`${cur}\\s*${amount}|${amount}\\s*${cur}`));
  const keyword = t.match(new RegExp(`(?:budget|ميزانيه|ميزانيتي|حدود)\\D{0,12}${amount}`));
  const m = range || withCurrency || keyword;
  return m ? { value: clip(m[0], 40), confidence: range || withCurrency ? 0.85 : 0.75 } : null;
}
function extractTimeline(t) {
  const m = t.match(/\b(asap|as soon as possible|urgent(?:ly)?|immediately|right away|this (?:week|month|year)|next (?:week|month|year|quarter)|within \d+ (?:days?|weeks?|months?)|in \d+ (?:days?|weeks?|months?)|by (?:the end of )?(?:this|next) (?:week|month|year))\b/)
    || t.match(/(فورا|بسرعه|باسرع وقت|عاجل|هالاسبوع|هذا الاسبوع|الاسبوع الجاي|الاسبوع القادم|هالشهر|هذا الشهر|الشهر الجاي|الشهر القادم|السنه الجايه|خلال \d+ (?:يوم|ايام|اسبوع|اسابيع|شهر|اشهر|شهور))/);
  if (m) return { value: clip(m[0], 40), confidence: 0.8 };
  const date = extractDatetime(t);
  return date ? { value: date.value, confidence: 0.7 } : null;
}
function extractNumber(t, contextual, itemName = '') {
  const item = normalizeText(itemName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const beforeItem = item && t.match(new RegExp(`(?:^|\\s)(\\d{1,4})\\s+(?:[^\\s]+\\s+)?${item}`));
  if (beforeItem) return { value: String(Number(beforeItem[1])), confidence: 0.8 };
  const unit = /(?:^|\s)(\d{1,4})\s*(?:x\s*)?(pcs|pieces?|units?|kg|kilos?|people|persons?|guests?|servings?|boxes?|trays?|cups?|items?|bags?|rooms?|bedrooms?|beds?|br|bhk|حبه|حبات|قطعه|قطع|كيلو|شخص|اشخاص|ضيف|ضيوف|نفر|انفار|علبه|علب|صحن|وحده|وحدات|غرفه|غرف)(?=\s|$|[.,!؟?])/;
  const m = t.match(unit) || t.match(/(?:^|\s)x\s?(\d{1,4})\b|\b(\d{1,4})\s?x(?=\s|$)/);
  if (m) return { value: String(Number(m[1] || m[2])), confidence: 0.85 };
  // "I want to order 1", "ابي 2": a small number straight after a buying verb.
  const verb = t.match(/(?:^|\s)(?:order|want|need|take|buy|get|ابي|ابغى|ابغي|اريد|بطلب|ابا)\s+(?:to order\s+|عدد\s+)?(\d{1,3})(?=\s|$|[.,!؟?])/);
  if (verb) return { value: String(Number(verb[1])), confidence: 0.75 };
  const word = Object.keys(NUMBER_WORDS).find(w => containsTerm(t, w) && /(people|guests|pieces|units|persons|اشخاص|ضيوف|حبات|قطع|وحدات)/.test(t));
  if (word) return { value: String(NUMBER_WORDS[word]), confidence: 0.75 };
  if (contextual) {
    const bare = t.match(/^(?:about|around|roughly|تقريبا|حوالي)?\s*(\d{1,4})\s*[.!]?$/);
    if (bare) return { value: String(Number(bare[1])), confidence: 0.65 };
  }
  return null;
}
function extractArea(t, original) {
  // Keep the place in the script the customer typed it in.
  for (const [en, ar, extra = []] of PLACES) {
    if (containsTerm(t, ar)) return { value: ar, confidence: 0.9 };
    if ([en, ...extra].some(term => containsTerm(t, term))) return { value: en, confidence: 0.9 };
  }
  const exclude = new RegExp(`^(?:${WEEKDAYS_EN}|${MONTHS_EN}|the|a|an|my|your|stock|person|total|advance|cash|english|arabic)$`, 'i');
  const en = original.match(/\b(?:in|at|near|around|located in|based in)\s+([A-Z][A-Za-z'-]{2,20}(?:\s+[A-Z][A-Za-z'-]{2,20}){0,2})/);
  if (en && !exclude.test(en[1].split(/\s+/)[0])) return { value: clip(en[1], 40), confidence: 0.7 };
  const ar = normalizeText(original).match(/(?:منطقه|حي|ولايه|بالقرب من|قريب من|ساكن في|اسكن في|موقعي في|موقعنا في)\s+([؀-ۿ]{2,20}(?:\s+[؀-ۿ]{2,20})?)/)
    // "ابي فيلا للايجار في الموج": a place named last, after في.
    || normalizeText(original).match(/(?:^|\s)في\s+(ال[؀-ۿ]{2,18}(?:\s+ال[؀-ۿ]{2,18})?)$/);
  if (ar) return { value: clip(ar[1], 40), confidence: 0.7 };
  return null;
}
function extractOption(t, options) {
  const hits = options.filter(o => o.match.some(term => containsTerm(t, term)));
  return hits.length === 1 ? { value: hits[0].id, confidence: 0.9 } : null;
}
function extractCatalog(t, catalog) {
  const names = (catalog || []).flatMap(row => [row.nameEn, row.nameAr].filter(n => typeof n === 'string' && n.trim().length >= 2).map(n => ({ n, row })));
  const hits = names.filter(({ n }) => containsTerm(t, n));
  if (!hits.length) return null;
  const best = hits.sort((a, b) => b.n.length - a.n.length)[0];
  return { value: clip(best.row.nameEn || best.row.nameAr, 80), confidence: 0.9, ...(best.row.entryKey ? { ref: best.row.entryKey } : {}) };
}

const CONNECTORS = /^(and|or|but|i|im|i'm|want|wanted|would|need|needs|from|here|looking|calling|interested|with|my|the|a|an|to|for|please|asking|about|so|also|actually|again)$/i;
/** Customer-provided name, never a guess from a greeting. */
export function extractCustomerName(original) {
  const en = String(original || '').match(/\b(?:my name is|this is|i am|i'm|im)\s+([A-Za-z][A-Za-z'-]{1,20}(?:\s+[A-Z][A-Za-z'-]{1,20})?)\b/i);
  if (en) {
    const [first, second] = en[1].split(/\s+/);
    const introduced = /my name is|this is/i.test(en[0]);
    // "my name is Aisha and I want…": a joining word is not a surname.
    const name = second && CONNECTORS.test(second) ? first : en[1];
    if (!NOT_NAMES.has(first.toLowerCase()) && (introduced || /^[A-Z]/.test(first))) return clip(name, 40);
  }
  const ar = String(original || '').match(/(?:اسمي|أنا اسمي|انا اسمي|معك|معاك)\s+([؀-ۿ]{2,20}(?:\s+[؀-ۿ]{2,20})?)/);
  if (ar && !/^(ال)?(سؤال|استفسار|طلب)$/.test(ar[1].split(/\s+/)[0])) return clip(ar[1], 40);
  return null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?$/;
const EXTRACTORS = { datetime: extractDatetime, budget: extractBudget, timeline: extractTimeline };

/**
 * Sensitive packs keep only what Layla herself could capture: a listed option, an
 * approved catalog name, a known place, or a bounded date, time or amount. Anything
 * else (symptoms, case details, notes) is refused, whoever typed it.
 */
function capturable(field, value, catalog) {
  const t = normalizeText(value);
  const option = (field.options || []).find(o => o.id === value || normalizeText(o.en) === t || normalizeText(o.ar) === t);
  if (option) return option.id;
  if (field.kind === 'catalog') {
    const row = (catalog || []).find(r => [r.nameEn, r.nameAr].some(n => typeof n === 'string' && n.trim() && normalizeText(n) === t));
    return row ? clip(row.nameEn || row.nameAr, 80) : null;
  }
  if (field.kind === 'area') {
    const place = PLACES.find(([en, ar, extra = []]) => [en, ar, ...extra].some(n => normalizeText(n) === t));
    return place ? (isArabicWord(t) ? place[1] : place[0]) : null;
  }
  if (field.kind === 'datetime' && ISO_DATE.test(value)) return value;
  if (field.kind === 'number') return /^\d{1,6}$/.test(value) ? value : null;
  const hit = EXTRACTORS[field.kind]?.(t);
  return hit && normalizeText(hit.value) === t ? value : null;
}

/** A field value an owner, an import or a message may store. `catalog` is the approved catalog, for catalog-kind fields. */
export function validateFieldValue(sectorId, key, value, catalog = []) {
  const pack = qualificationPack(sectorId);
  const field = pack.fields.find(f => f.key === key);
  if (!field || typeof value !== 'string') return null;
  const clean = clip(value, field.kind === 'text' ? 120 : 80);
  if (!clean) return null;
  if (pack.sensitive) return capturable(field, clean, catalog);
  if (field.kind === 'enum' && !field.options.some(o => o.id === clean)) return null;
  if (field.kind === 'number' && !/^\d{1,6}$/.test(clean)) return null;
  return clean;
}

/**
 * Extract sector fields from one inbound message.
 * @param {{ text: string, sectorId: string, catalog?: Array, asked?: string[], existing?: Array, intent?: string }} input
 * @returns {{ updates: Array<{key:string,value:string,confidence:number,source:string}>, customerName: string|null }}
 */
const NO_FIELDS_INTENTS = new Set(['location', 'hours', 'identity']);
const FILLER = /^(yes|yeah|yep|no|nope|ok|okay|sure|thanks?|thank you|hi|hello|hey|please|maybe|later|not sure|i don'?t know|still interested|interested|good|great|fine|cool|نعم|اي|ايوه|لا|اوكي|اوك|تمام|طيب|شكرا|شكرا لك|مرحبا|السلام عليكم|ممكن|مهتم|ان شاء الله|انشاءالله|ما ادري|مو متاكد|لاحقا|بعدين)[.!,،\s]*$/i;
export function extractQualification({ text, sectorId, catalog = [], asked = [], askedRecently = true, existing = [], intent = '' }) {
  const original = String(text || '').slice(0, 1000);
  // "شقق للبيع" (flats for sale) is someone buying, not selling.
  const t = normalizeText(original).replace(/(^|\s)للبيع(?=[\s؟?!.,،]|$)/g, '$1شراء');
  const pack = qualificationPack(sectorId);
  const have = new Map(existing.map(f => [f.key, f]));
  const updates = [];
  if (!t || intent === 'optout') return { updates, customerName: null };
  // "Where is your office?" asks about the business; it says nothing about what the customer wants.
  if (NO_FIELDS_INTENTS.has(intent)) return { updates, customerName: extractCustomerName(original) };
  const catalogHit = extractCatalog(t, catalog);
  for (const field of pack.fields) {
    let hit = null;
    if (field.kind === 'enum') hit = extractOption(t, field.options);
    else if (field.kind === 'catalog') hit = catalogHit || (field.options?.length ? extractOption(t, field.options) : null);
    else if (field.kind === 'datetime') hit = extractDatetime(t);
    else if (field.kind === 'budget') hit = extractBudget(t);
    else if (field.kind === 'timeline') hit = extractTimeline(t);
    else if (field.kind === 'number') hit = extractNumber(t, askedRecently && asked.includes(field.key), catalogHit?.value);
    else if (field.kind === 'area') hit = (field.options?.length ? extractOption(t, field.options) : null) || extractArea(t, original);
    if (hit && hit.confidence >= MIN_CONFIDENCE) updates.push({ key: field.key, ...hit, source: 'customer' });
  }
  // A short direct answer to the single outstanding question. Sensitive packs
  // never keep free text, so symptoms or case details cannot be captured here.
  const words = original.trim().split(/\s+/).length;
  const missingAsked = asked.filter(key => !have.get(key)?.value && !updates.some(u => u.key === key));
  const field = missingAsked.length === 1 && pack.fields.find(f => f.key === missingAsked[0]);
  // Only when nothing else was understood: "ابي فيلا في الموج" is not an area called "ابي فيلا في الموج".
  if (field && !updates.length && askedRecently && !pack.sensitive && ['text', 'area'].includes(field.kind) && words <= 8 && original.length <= 80 && !/[?؟]\s*$/.test(original)
    && !FILLER.test(normalizeText(original)) && !['human', 'optout', 'prices', 'hours', 'location', 'identity', 'greeting'].includes(intent)) {
    updates.push({ key: field.key, value: clip(original, 80), confidence: 0.6, source: 'contextual' });
  }
  return { updates: updates.filter(u => validateFieldValue(pack.id, u.key, u.value, catalog)), customerName: extractCustomerName(original) };
}

/** Merge extracted updates. Owner-entered values are never overwritten by a message. */
export function mergeFields(existing = [], updates = [], now = Date.now()) {
  const map = new Map(existing.map(f => [f.key, f]));
  let changed = false;
  for (const u of updates) {
    const old = map.get(u.key);
    if (old?.source === 'owner') continue;
    if (old && old.value === u.value) continue;
    if (old && u.confidence < old.confidence - 0.1) continue;
    map.set(u.key, { key: u.key, value: u.value, source: u.source, confidence: Math.round(u.confidence * 100) / 100, at: now, ...(u.ref ? { ref: u.ref } : {}) });
    changed = true;
  }
  return { fields: [...map.values()], changed };
}

export function qualificationStatus(sectorId, fields = []) {
  const have = new Set(fields.filter(f => f.value).map(f => f.key));
  const required = requiredKeys(sectorId);
  if (required.length && required.every(k => have.has(k))) return 'qualified';
  return have.size ? 'in_progress' : 'new';
}
export function effectiveStatus(contact) {
  return contact?.qualificationOverride || contact?.qualificationStatus || 'new';
}

/** Next related questions: the first group with missing required fields, at most three. */
export function nextQuestions(sectorId, fields = [], askCounts = []) {
  const pack = qualificationPack(sectorId);
  const have = new Set(fields.filter(f => f.value).map(f => f.key));
  const counts = new Map(askCounts.map(c => [c.key, c.count]));
  for (const group of pack.groups) {
    const missing = group.map(key => pack.fields.find(f => f.key === key))
      .filter(f => f && f.required && !have.has(f.key) && (counts.get(f.key) || 0) < MAX_ASKS_PER_FIELD);
    if (missing.length) return missing.slice(0, MAX_QUESTIONS);
  }
  return [];
}

function joinList(parts, ar) {
  if (parts.length <= 1) return parts[0] || '';
  if (ar) return `${parts.slice(0, -1).join('، ')} و${parts.at(-1)}`;
  return parts.length === 2 ? `${parts[0]} and ${parts[1]}` : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}
export function questionText(fields, lang, tone) {
  if (!fields.length) return '';
  const ar = lang === 'ar';
  return phrase(tone, 'askMore', ar ? 'ar' : 'en', { list: joinList(fields.map(f => f.ask[ar ? 'ar' : 'en']), ar) });
}

// Name first, then interest: the fewest messages to a lead the team can act on.
export const NAME_FIELD = Object.freeze({ key: 'customer_name', ask: { en: 'your name', ar: 'اسمك' } });
// Any of these words means the reply is small talk, not a name ("Hello there", "السلام عليكم").
// Any of these words means the reply is small talk or a question, not a name ("Hello there", "bye", "كم سعرها").
const NAME_GREETINGS = /^(hi|hello|hey|there|salam|salaam|thanks|thank|you|ok|okay|yes|no|yeah|yep|nope|please|morning|evening|good|bye|goodbye|sure|great|cool|perfect|done|noted|welcome|alright|again|later|what|where|when|how|why|which|who|price|much|مرحبا|مرحباً|السلام|سلام|عليكم|هلا|اهلا|أهلا|شكرا|شكراً|نعم|لا|تمام|اوكي|صباح|مساء|الخير|مع|السلامة|طيب|زين|مشكور|مشكورة|يعطيك|العافية|كم|وين|متى|هل|ايش|شو|ليش|كيف|عندكم|ابي|ابغى|أبي|أبغى|اريد|أريد|ممكن|سعر|سعرها|سعره|بكم|اوك|خلاص|باي)$/i;
/** True for a question rather than a statement: a question mark, or a question word up front. */
export function isQuestion(text) {
  // A greeting up front ("helo do u have…") does not make a question a statement.
  const t = String(text || '').trim().toLowerCase().replace(/^(?:hi+|hel+o+|hey+|salam|مرحبا|السلام عليكم|هلا)[\s,،!.]+/, '');
  return /[?؟]/.test(t) || /^(u|what|where|when|how|which|who|why|whats|do|does|did|is|are|can|could|will|would|should|any|هل|كم|وين|متى|كيف|ايش|إيش|شو|ليش|لماذا|ماذا|أين|اين|عندكم|فيه|في عندكم|بكم)(?=[\s,،.!?؟]|$)/.test(t);
}
/** A short bare reply to "your name?" ("Sara", "سارة الهنائي") is the customer's name. */
export function extractBareName(original) {
  if (isQuestion(original)) return null;
  const t = String(original || '').trim().replace(/[.!]+$/, '');
  if (!t || t.split(/\s+/).some(word => NAME_GREETINGS.test(word) || NOT_NAMES.has(word.toLowerCase()))) return null;
  if (/^[A-Za-z][A-Za-z'-]{1,20}(?:\s+[A-Za-z][A-Za-z'-]{1,20}){0,2}$/.test(t) && !NOT_NAMES.has(t.split(/\s+/)[0].toLowerCase())) return clip(t, 40);
  if (/^[؀-ۿ]{2,20}(?:\s+[؀-ۿ]{2,20}){0,2}$/.test(t)) return clip(t, 40);
  return null;
}

/**
 * Decide whether Layla should append qualification questions to this reply.
 * @returns {{ text: string, keys: string[] }}
 */
export function planQuestions({ sectorId, fields, askCounts = [], asked = [], lastAskedAt = 0, answeredNow = false, intent, handoff, now = Date.now(), lang, tone, knownName = true }) {
  // A redirect already gave the team contact, so asking for details would contradict it.
  if (handoff === 'redirect' || (handoff && intent !== 'disabled')) return { text: '', keys: [] };
  if (!['services', 'prices', 'hours', 'location', 'faq', 'disabled', 'catalog', 'greeting', 'identity'].includes(intent)) return { text: '', keys: [] };
  // Do not repeat an unanswered question too soon; once it is answered, move on.
  const have = new Set(fields.filter(f => f.value).map(f => f.key));
  if (knownName) have.add(NAME_FIELD.key);
  // An unanswered name never holds back the next question; it is simply asked once more later.
  const stillOpen = asked.some(key => key !== NAME_FIELD.key && !have.has(key));
  if (intent !== 'disabled' && lastAskedAt && stillOpen && !answeredNow && now - lastAskedAt < ASK_COOLDOWN_MS) return { text: '', keys: [] };
  const counts = new Map(askCounts.map(c => [c.key, c.count]));
  const wantName = !knownName && (counts.get(NAME_FIELD.key) || 0) < MAX_ASKS_PER_FIELD;
  // With the name, ask for just one more thing (the interest) so the question stays short.
  const questions = [...(wantName ? [NAME_FIELD] : []), ...nextQuestions(sectorId, fields, askCounts)].slice(0, wantName ? 2 : MAX_QUESTIONS);
  // The very same question again within the cooldown reads as a broken record; wait instead.
  // A booking request is the moment for the date and time, even if they were just asked.
  if (intent !== 'disabled' && lastAskedAt && now - lastAskedAt < ASK_COOLDOWN_MS && questions.length && questions.every(q => asked.includes(q.key))) return { text: '', keys: [] };
  return { text: questionText(questions, lang, tone), keys: questions.map(q => q.key) };
}

/** Public, bilingual description of a pack for the dashboard. */
export function packDescription(sectorId) {
  const pack = qualificationPack(sectorId);
  return { id: pack.id, archetype: pack.archetype, sensitive: pack.sensitive,
    fields: pack.fields.map(f => ({ key: f.key, kind: f.kind, en: f.en, ar: f.ar, required: !!f.required,
      options: (f.options || []).map(o => ({ id: o.id, en: o.en, ar: o.ar })) })) };
}

/**
 * Catalyst's BznsBrain mode: one detail per turn, in the owner's order, never while an override holds.
 * Name first (unless known, declined or switched off), then the owner's chosen details, then, once
 * the customer wants to come in, the appointment preferences. A question just asked and not yet
 * answered is not repeated within the cooldown.
 * @returns {{ text: '', keys: string[] }}
 */
export function planReception({ sectorId, fields = [], askCounts = [], asked = [], lastAskedAt = 0, answeredNow = false, now = Date.now(),
  knownName = false, nameDeclined = false, appointmentInterest = false, override = null, behaviour = null }) {
  if (override) return { text: '', keys: [] };
  const pack = qualificationPack(sectorId);
  const rules = behaviour || { askName: true, ask: pack.fields.filter(f => f.required && f.askable !== false && !f.appointment).map(f => f.key), appointmentPreferences: pack.archetype === 'booking' };
  const have = new Set(fields.filter(f => f.value).map(f => f.key));
  const counts = new Map(askCounts.map(c => [c.key, c.count]));
  const open = key => !have.has(key) && (counts.get(key) || 0) < MAX_ASKS_PER_FIELD;
  const order = [
    ...(rules.askName && !knownName && !nameDeclined ? [NAME_FIELD.key] : []),
    ...rules.ask.filter(key => pack.fields.some(f => f.key === key && f.askable !== false && !f.appointment)),
    ...(rules.appointmentPreferences && appointmentInterest ? pack.fields.filter(f => f.appointment).map(f => f.key) : []),
  ];
  const next = order.find(open);
  if (!next) return { text: '', keys: [] };
  if (!answeredNow && asked.includes(next) && lastAskedAt && now - lastAskedAt < ASK_COOLDOWN_MS) return { text: '', keys: [] };
  return { text: '', keys: [next] };
}
