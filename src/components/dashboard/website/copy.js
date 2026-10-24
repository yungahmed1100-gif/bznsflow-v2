// The free website's onboarding, in both languages: [English, Arabic].
import { BRIEF_MAX_PHOTOS } from '../../../../config/website-brief.js';

export const W = {
  title: ['Your free website', 'موقعك المجاني'],
  intro: ['Tell us about your business once. We build your website, register your domain and set up your business email, ready within 3 business days.',
    'أخبرنا عن نشاطك مرة واحدة. نبني موقعك ونسجّل نطاقك ونجهّز بريد عملك، خلال 3 أيام عمل.'],
  stepOf: ['Step {n} of {total}', 'الخطوة {n} من {total}'],
  steps: {
    business: ['Your business', 'نشاطك'], contact: ['Contact & location', 'التواصل والموقع'], look: ['Look & feel', 'الهوية البصرية'],
    site: ['Pages & languages', 'الصفحات واللغات'], domain: ['Domain & email', 'النطاق والبريد'], review: ['Review & send', 'المراجعة والإرسال'],
  },
  back: ['Back', 'السابق'], next: ['Next', 'التالي'], saving: ['Saving…', 'جارٍ الحفظ…'], saved: ['Saved. You can leave and come back.', 'تم الحفظ. يمكنك المغادرة والعودة لاحقًا.'],
  fromBrain: ['From your BznsBrain. Check it.', 'من BznsBrain الخاص بك. راجعه.'],
  required: ['Required', 'مطلوب'], loading: ['Loading…', 'جارٍ التحميل…'], edit: ['Edit', 'تعديل'],
  nameEn: ['Business name in English', 'اسم النشاط بالإنجليزية'], nameAr: ['Business name in Arabic', 'اسم النشاط بالعربية'],
  about: ['What your business does', 'ماذا يقدّم نشاطك'], services: ['Services or products to feature', 'الخدمات أو المنتجات التي تريد إبرازها'],
  phone: ['Phone or WhatsApp', 'الهاتف أو واتساب'], email: ['Email shown on the website', 'البريد الظاهر في الموقع'], address: ['Address', 'العنوان'],
  mapUrl: ['Google Maps link', 'رابط خرائط جوجل'], hours: ['Opening hours', 'ساعات العمل'],
  instagram: ['Instagram', 'إنستغرام'], facebook: ['Facebook', 'فيسبوك'], tiktok: ['TikTok', 'تيك توك'], otherSocial: ['Other social', 'حسابات أخرى'],
  colors: ['Brand colours (up to 3)', 'ألوان العلامة (حتى 3)'], addColor: ['Add a colour', 'أضف لونًا'], addLink: ['Add another link', 'أضف رابطًا آخر'], remove: ['Remove', 'إزالة'],
  style: ['Style', 'الطابع'], fontNotes: ['Fonts you like (optional)', 'الخطوط التي تفضلها (اختياري)'],
  references: ['Websites you like (up to 3 links)', 'مواقع تعجبك (حتى 3 روابط)'],
  pages: ['Pages', 'الصفحات'], languages: ['Website language', 'لغة الموقع'],
  logo: ['Logo (PNG, JPG or WebP, up to 5 MB)', 'الشعار (PNG أو JPG أو WebP، حتى 5 ميغابايت)'],
  designLogo: ['I don’t have a logo. Please design a simple one.', 'ليس لدي شعار. صمّموا لي شعارًا بسيطًا.'],
  photos: [`Photos: storefront, products, team (up to ${BRIEF_MAX_PHOTOS})`, `صور: المحل والمنتجات والفريق (حتى ${BRIEF_MAX_PHOTOS})`],
  uploading: ['Uploading…', 'جارٍ الرفع…'], notes: ['Anything else we should know', 'أي شيء آخر يجب أن نعرفه'],
  logoAdded: ['Logo added', 'أُضيف الشعار'], photosAdded: ['{n} photos added', 'أُضيفت {n} صور'],
  domainChoice: ['Domain', 'النطاق'], domainAlternates: ['Backups', 'البدائل'], mailboxLocal: ['Business email', 'بريد العمل'],

  domainIntro: ['Included in Ascend: your domain for as long as you’re subscribed, and one business mailbox.', 'ضمن أسيند: نطاقك طوال مدة اشتراكك، وصندوق بريد واحد لعملك.'],
  domainSearch: ['The name you want', 'الاسم الذي تريده'], domainHint: ['Use English letters, e.g. your business name', 'استخدم أحرفًا إنجليزية، مثل اسم نشاطك'],
  check: ['Check', 'تحقّق'], checking: ['Checking…', 'جارٍ التحقق…'],
  available: ['Available', 'متاح'], taken: ['Taken', 'محجوز'], unavailable: ['Not included', 'غير مشمول'], unknown: ['Couldn’t check', 'تعذّر التحقق'],
  choose: ['Choose', 'اختر'], chosen: ['Your domain', 'نطاقك'], backup: ['Add as backup', 'أضف كبديل'], backups: ['If it’s taken by then, these instead', 'إن حُجز قبل التسجيل، فهذه بدلًا منه'],
  noLatin: ['Type the name in English letters to search.', 'اكتب الاسم بأحرف إنجليزية للبحث.'],
  checkDown: ['We couldn’t check names right now. Type the exact name you want (like mybusiness.com) and we’ll confirm it.', 'تعذّر التحقق الآن. اكتب الاسم الذي تريده بالضبط (مثل mybusiness.com) وسنؤكده لك.'],
  useTyped: ['Use this name', 'استخدم هذا الاسم'],
  mailbox: ['Your business email', 'بريد عملك'], mailboxHint: ['A full mailbox on Zoho Mail. You’ll get the sign-in by email.', 'صندوق بريد كامل على Zoho Mail. ستصلك بيانات الدخول بالبريد.'],
  recoveryEmail: ['Where we send the mailbox sign-in', 'أين نرسل بيانات دخول البريد'],

  send: ['Send to BznsFlow', 'أرسل إلى BznsFlow'], update: ['Send changes', 'أرسل التعديلات'], sending: ['Sending…', 'جارٍ الإرسال…'],
  notEmailed: ['Your details are saved, but we couldn’t send them yet.', 'تم حفظ بياناتك، لكن تعذّر إرسالها بعد.'], resend: ['Send again', 'أرسل مجددًا'],

  trackTitle: ['Your website is on its way', 'موقعك في الطريق'], liveTitle: ['Your website is live', 'موقعك منشور'],
  readyBy: ['Ready by {date}', 'جاهز بحلول {date}'], late: ['Taking longer: {reason}. New date: {date}.', 'يتأخر قليلًا: {reason}. الموعد الجديد: {date}.'],
  stage: {
    received: ['Details received', 'استلمنا التفاصيل'], domain: ['Domain registered', 'تسجيل النطاق'], mailbox: ['Business email ready', 'تجهيز بريد العمل'],
    building: ['Website built', 'بناء موقعك'], live: ['Live', 'منشور'],
  },
  visit: ['Visit your website', 'زر موقعك'], openMail: ['Open Zoho Mail', 'افتح Zoho Mail'], toEmail: ['Send email campaigns', 'أرسل حملات بريدية'],
  change: ['Change my details', 'عدّل بياناتي'], cancelChange: ['Keep my sent details', 'أبقِ ما أرسلته'],
};

export const OPTIONS = {
  style: { modern: ['Modern', 'عصري'], classic: ['Classic', 'كلاسيكي'], playful: ['Playful', 'مرح'], minimal: ['Minimal', 'بسيط'], luxury: ['Luxury', 'فاخر'] },
  pages: { home: ['Home', 'الرئيسية'], about: ['About', 'من نحن'], services: ['Services', 'الخدمات'], gallery: ['Gallery', 'المعرض'], contact: ['Contact', 'تواصل معنا'], faq: ['FAQ', 'الأسئلة الشائعة'] },
  languages: { both: ['Arabic and English', 'العربية والإنجليزية'], ar: ['Arabic', 'العربية'], en: ['English', 'الإنجليزية'] },
};

export const ERRORS = {
  brief_required: ['Fill in the required fields.', 'أكمل الحقول المطلوبة.'], invalid_brief: ['Check the highlighted field.', 'راجع الحقل المحدد.'],
  brief_too_long: ['One of the fields is too long.', 'أحد الحقول طويل جدًا.'], brief_conflict: ['Your details changed in another tab. Reload the page first.', 'تغيّرت بياناتك في نافذة أخرى. أعد تحميل الصفحة أولًا.'],
  photo_type: ['Use a PNG, JPG or WebP image.', 'استخدم صورة PNG أو JPG أو WebP.'], photo_size: ['Use an image under 5 MB.', 'استخدم صورة أقل من 5 ميغابايت.'],
  invalid_file: ['That file isn’t a valid image.', 'هذا الملف ليس صورة صالحة.'], upload_limit: ['Too many uploads today. Try again tomorrow.', 'رفعت صورًا كثيرة اليوم. حاول غدًا.'],
  too_many_files: ['Too many files. Remove one and try again.', 'ملفات كثيرة. احذف واحدًا وحاول مجددًا.'],
  too_many: ['Too many name checks. Try again in an hour, or type the exact name you want.', 'محاولات تحقق كثيرة. حاول بعد ساعة، أو اكتب الاسم الذي تريده بالضبط.'],
  brief_email_failed: ['Saved, but not sent yet. Try “Send again”.', 'تم الحفظ لكن لم يُرسل بعد. جرّب «أرسل مجددًا».'],
};
