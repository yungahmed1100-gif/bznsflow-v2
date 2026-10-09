// Additional Catalyst starters. Bracketed examples are owner prompts, never approved facts.
// Prices belong in the Catalog; availability and commitments require the business to confirm.
const payment = {
  en: ['Payment methods', '[Accepted payment methods and when payment is due. Put amounts in the Catalog.]'],
  ar: ['طرق الدفع', '[طرق الدفع المقبولة وموعد السداد. ضع المبالغ في الكتالوج.]'],
};

const templates = {
  clinic: {
    en: { offer: ['[Departments and consultation types you actually offer]', '[Routine visits and follow-up services]'], extra: [
      ['Appointment requests', '[How patients request a visit, choose a branch and share a preferred time. The reception team confirms availability.]'],
      ['First visit and insurance', '[What to bring, accepted insurers and how coverage is checked. Do not ask for medical records in chat.]'],
      ['Reception boundaries', '[Layla handles reception only. Explain how medical questions reach a clinician; do not collect symptoms, diagnoses or treatment history.]'],
      ['Urgent help', '[Your approved urgent-contact instructions. Do not describe this chat as an emergency or diagnosis service.]'],
      ['Rescheduling and cancellation', '[How to change or cancel a visit and any notice required.]'],
    ] },
    ar: { offer: ['[الأقسام وأنواع الاستشارات التي تقدمونها فعلياً]', '[الزيارات الدورية وخدمات المتابعة]'], extra: [
      ['طلبات المواعيد', '[كيف يطلب المراجع زيارة ويختار الفرع والوقت المفضل. يؤكد فريق الاستقبال توفر الموعد.]'],
      ['الزيارة الأولى والتأمين', '[ما يحضره المراجع وشركات التأمين المقبولة وطريقة التحقق من التغطية. لا تطلب تقارير طبية في المحادثة.]'],
      ['حدود خدمة الاستقبال', '[ليلى للاستقبال فقط. وضّح كيف تُحوّل الأسئلة الطبية للمختص؛ لا تجمع الأعراض أو التشخيص أو تاريخ العلاج.]'],
      ['المساعدة العاجلة', '[تعليمات التواصل العاجل المعتمدة لديكم. لا تصف المحادثة كخدمة طوارئ أو تشخيص.]'],
      ['تغيير الموعد وإلغاؤه', '[طريقة تغيير الزيارة أو إلغائها ومدة الإشعار المطلوبة.]'],
    ] },
  },
  hvac: {
    en: { offer: ['[AC installation, maintenance and repair services]', '[Unit types and brands you support]'], extra: [
      ['Requesting a service visit', '[Ask for the service type, number of units, area and preferred timing. The team confirms the visit.]'],
      ['Inspection and quotes', '[What needs an inspection, how estimates are approved and how extra work is authorized. No automatic diagnosis or fixed quote.]'],
      ['Access and preparation', '[Parking, building access and preparation needed before the technician arrives. Leave repair instructions to the technician.]'],
      ['Parts and warranty', '[How parts availability is checked and what your workmanship or parts warranty covers.]'],
      ['Maintenance contracts', '[Contract scope, visit scheduling and how customers request renewal or cancellation.]'],
    ] },
    ar: { offer: ['[خدمات تركيب المكيفات وصيانتها وإصلاحها]', '[أنواع الأجهزة والعلامات التي تخدمونها]'], extra: [
      ['طلب زيارة صيانة', '[نوع الخدمة وعدد الأجهزة والمنطقة والوقت المفضل. يؤكد الفريق الزيارة.]'],
      ['الفحص وعروض الأسعار', '[ما يحتاج فحصاً وكيف يعتمد العميل التقدير والعمل الإضافي. لا تشخيص تلقائياً ولا سعر نهائي دون تأكيد.]'],
      ['الوصول والاستعداد', '[المواقف ودخول المبنى والتحضيرات قبل وصول الفني. تُترك تعليمات الإصلاح للفني.]'],
      ['القطع والضمان', '[طريقة التحقق من توفر القطع وما يشمله ضمان العمل أو القطع.]'],
      ['عقود الصيانة', '[نطاق العقد وجدولة الزيارات وطريقة التجديد أو الإلغاء.]'],
    ] },
  },
  cakes: {
    en: { offer: ['[Cakes, baked goods and customization you offer]', '[Sizes, flavours and serving options]'], extra: [
      ['How to order a cake', '[What to send: cake type, servings, design reference, inscription and date needed. The team confirms the order.]'],
      ['Lead time and design approval', '[Ordering notice, design review and the last point for changes. Explain how urgent requests are checked.]'],
      ['Ingredients and allergens', '[Approved ingredient information and how allergen questions reach the team. Never promise allergen-free preparation without confirmation.]'],
      ['Delivery, pickup and storage', '[Delivery areas, pickup arrangements and your approved storage and handling guidance.]'],
      ['Changes and cancellation', '[How customers request changes, cancellation or help with an order problem.]'],
    ] },
    ar: { offer: ['[الكيك والمخبوزات وخيارات التخصيص المتوفرة]', '[الأحجام والنكهات وعدد الحصص]'], extra: [
      ['طريقة طلب الكيك', '[نوع الكيك وعدد الحصص وصورة التصميم والعبارة والتاريخ المطلوب. يؤكد الفريق الطلب.]'],
      ['مدة التجهيز واعتماد التصميم', '[مهلة الطلب ومراجعة التصميم وآخر وقت للتعديل وكيفية التحقق من الطلبات العاجلة.]'],
      ['المكونات والحساسية', '[المعلومات المعتمدة عن المكونات وطريقة تحويل أسئلة الحساسية للفريق. لا تضمن تحضيراً خالياً من مسببات الحساسية دون تأكيد.]'],
      ['التوصيل والاستلام والحفظ', '[مناطق التوصيل وترتيبات الاستلام وتعليمات الحفظ والتعامل المعتمدة.]'],
      ['التعديل والإلغاء', '[طريقة طلب التعديل أو الإلغاء أو المساعدة عند وجود مشكلة في الطلب.]'],
    ] },
  },
  cafe: {
    en: { offer: ['[Drinks, desserts and light meals you serve]', '[Available customizations]'], extra: [
      ['Ordering and pickup', '[How to order, choose size and extras, and request pickup or delivery. The team confirms availability.]'],
      ['Seating and group visits', '[Walk-in seating, reservation policy and how group requests are handled.]'],
      ['Ingredients and dietary requests', '[Approved milk, ingredient and allergen information. Refer unconfirmed dietary questions to the team.]'],
      ['Delivery and order changes', '[Delivery areas, handling of delays and the point after which an order cannot be changed.]'],
    ] },
    ar: { offer: ['[المشروبات والحلويات والوجبات الخفيفة المتوفرة]', '[خيارات التخصيص المتاحة]'], extra: [
      ['الطلب والاستلام', '[طريقة الطلب واختيار الحجم والإضافات والاستلام أو التوصيل. يؤكد الفريق التوفر.]'],
      ['الجلسات وزيارات المجموعات', '[الجلسات دون حجز وسياسة الحجز وطريقة استقبال طلبات المجموعات.]'],
      ['المكونات والطلبات الغذائية', '[المعلومات المعتمدة عن الحليب والمكونات والحساسية. حوّل الأسئلة غير المؤكدة للفريق.]'],
      ['التوصيل وتعديل الطلب', '[مناطق التوصيل والتعامل مع التأخير والمرحلة التي لا يمكن بعدها تعديل الطلب.]'],
    ] },
  },
  restaurant: {
    en: { offer: ['[Cuisine, dishes and meal options you serve]', '[Catering or group menus, if offered]'], extra: [
      ['Orders and reservations', '[How to request a meal or table, specify party size and timing, and receive team confirmation.]'],
      ['Delivery and takeaway', '[Delivery areas, pickup instructions and how estimated times are confirmed.]'],
      ['Ingredients and allergens', '[Approved ingredient details and how the kitchen checks dietary requests. Do not guarantee suitability without confirmation.]'],
      ['Group orders and catering', '[Notice required, information needed and how menus and arrangements are approved.]'],
      ['Changes and order problems', '[Cancellation rules and who handles missing items, delays or complaints.]'],
    ] },
    ar: { offer: ['[نوع المطبخ والأطباق وخيارات الوجبات]', '[قوائم المجموعات أو التموين إن كانت متاحة]'], extra: [
      ['الطلبات وحجز الطاولات', '[طريقة طلب الوجبة أو الطاولة وعدد الأشخاص والوقت وكيف يؤكد الفريق الطلب.]'],
      ['التوصيل والسفري', '[مناطق التوصيل وتعليمات الاستلام وكيفية تأكيد الوقت المتوقع.]'],
      ['المكونات والحساسية', '[تفاصيل المكونات المعتمدة وكيف يتحقق المطبخ من الطلبات الغذائية. لا تضمن الملاءمة دون تأكيد.]'],
      ['طلبات المجموعات والتموين', '[مهلة الطلب والمعلومات المطلوبة وطريقة اعتماد القوائم والترتيبات.]'],
      ['التعديل ومشكلات الطلب', '[قواعد الإلغاء ومن يتولى النواقص والتأخير والشكاوى.]'],
    ] },
  },
  beauty: {
    en: { offer: ['[Salon, beauty and grooming services]', '[Branch or home-service options actually available]'], extra: [
      ['Booking a service', '[Service, preferred time, branch or home area, and any provider preference. The team confirms availability.]'],
      ['Consultation and preparation', '[Your approved preparation instructions and how suitability questions reach a qualified team member.]'],
      ['Appointments and delays', '[Arrival guidance, late-arrival policy, rescheduling and cancellation.]'],
      ['Packages and gift bookings', '[What packages include, redemption steps and expiry or transfer rules. Put prices in the Catalog.]'],
    ] },
    ar: { offer: ['[خدمات الصالون والتجميل والعناية]', '[الفروع أو الخدمات المنزلية المتوفرة فعلياً]'], extra: [
      ['حجز الخدمة', '[الخدمة والوقت المفضل والفرع أو منطقة المنزل ومقدم الخدمة المفضل. يؤكد الفريق التوفر.]'],
      ['الاستشارة والاستعداد', '[تعليمات الاستعداد المعتمدة وكيف تُحوّل أسئلة ملاءمة الخدمة للمختص.]'],
      ['المواعيد والتأخير', '[إرشادات الحضور وسياسة التأخر وتغيير الموعد وإلغائه.]'],
      ['الباقات وحجوزات الهدايا', '[محتويات الباقات وطريقة استخدامها وقواعد الانتهاء أو التحويل. الأسعار في الكتالوج.]'],
    ] },
  },
  fitness: {
    en: { offer: ['[Memberships, classes and coaching you provide]', '[Facilities and access options]'], extra: [
      ['Trials and class bookings', '[How to request a trial or class, choose a branch and preferred time. Staff confirm the place.]'],
      ['Membership terms', '[Access hours, membership duration, freezes, renewals, cancellation and guest rules.]'],
      ['First visit', '[What to bring, arrival time and how to meet the trainer. Health or injury questions go to a qualified professional.]'],
      ['Classes and coaching', '[Class levels, age requirements and how schedules or trainer availability are checked. Do not promise health results.]'],
    ] },
    ar: { offer: ['[العضويات والحصص والتدريب المتوفر]', '[المرافق وخيارات الدخول]'], extra: [
      ['حجز التجربة والحصص', '[طريقة طلب تجربة أو حصة واختيار الفرع والوقت المفضل. يؤكد الموظفون الحجز.]'],
      ['شروط العضوية', '[ساعات الدخول ومدة العضوية والتجميد والتجديد والإلغاء وقواعد الضيوف.]'],
      ['الزيارة الأولى', '[ما يحضره العميل ووقت الوصول والتواصل مع المدرب. تُحوّل الأسئلة الصحية أو الإصابات لمختص مؤهل.]'],
      ['الحصص والتدريب', '[مستويات الحصص ومتطلبات العمر وطريقة التحقق من المواعيد والمدربين. لا تَعِد بنتائج صحية.]'],
    ] },
  },
  education: {
    en: { offer: ['[Courses, programmes and tutoring subjects]', '[Teaching languages and online or classroom options]'], extra: [
      ['Course inquiries and enrolment', '[Course of interest, study mode, preferred start and how staff confirm eligibility and a place.]'],
      ['Entry requirements', '[Prerequisites, placement steps and the minimum enrolment information required. Use the approved channel for documents.]'],
      ['Schedules and attendance', '[How timetables are confirmed, attendance rules, missed lessons and rescheduling.]'],
      ['Certificates and outcomes', '[Only verified certification or accreditation details. Do not guarantee examination results or employment.]'],
      ['Withdrawals and transfers', '[Rules for withdrawal, course transfer and refund review.]'],
    ] },
    ar: { offer: ['[الدورات والبرامج ومواد التقوية]', '[لغات التدريس وخيارات الدراسة عن بعد أو حضورياً]'], extra: [
      ['الاستفسار والتسجيل', '[الدورة المطلوبة وطريقة الدراسة وموعد البدء المفضل وكيف يؤكد الموظفون الأهلية والمقعد.]'],
      ['متطلبات القبول', '[المتطلبات السابقة وتحديد المستوى والحد الأدنى لمعلومات التسجيل. تُرسل المستندات عبر القناة المعتمدة.]'],
      ['الجداول والحضور', '[طريقة تأكيد الجداول وقواعد الحضور والدروس الفائتة وتغيير المواعيد.]'],
      ['الشهادات والنتائج', '[تفاصيل الشهادات أو الاعتماد الموثقة فقط. لا تضمن نتائج الاختبارات أو التوظيف.]'],
      ['الانسحاب والتحويل', '[قواعد الانسحاب والتحويل بين الدورات ومراجعة طلب الاسترداد.]'],
    ] },
  },
  cleaning: {
    en: { offer: ['[Home, office, deep-cleaning or specialist services]', '[One-off and recurring options]'], extra: [
      ['Requesting a cleaning visit', '[Service type, property size, area and preferred time. The team confirms scope and the visit.]'],
      ['What is included', '[Tasks included, exclusions, supplies provided and how extra tasks are approved.]'],
      ['Access and preparation', '[How to arrange access and prepare the property. Never ask customers to send door codes or keys in chat.]'],
      ['Recurring visits and changes', '[Scheduling, rescheduling, cancellation and missed-access policy.]'],
      ['Quality concerns', '[How customers report an issue and how your team assesses follow-up work.]'],
    ] },
    ar: { offer: ['[تنظيف المنازل والمكاتب والتنظيف العميق أو المتخصص]', '[خيارات الزيارة الواحدة والزيارات الدورية]'], extra: [
      ['طلب زيارة تنظيف', '[نوع الخدمة وحجم العقار والمنطقة والوقت المفضل. يؤكد الفريق النطاق والزيارة.]'],
      ['ما تشمله الخدمة', '[المهام المشمولة والاستثناءات والمستلزمات المقدمة وطريقة اعتماد المهام الإضافية.]'],
      ['الدخول والاستعداد', '[طريقة ترتيب الدخول وتجهيز العقار. لا تطلب رموز الأبواب أو المفاتيح في المحادثة.]'],
      ['الزيارات الدورية والتعديلات', '[الجدولة وتغيير الموعد والإلغاء وسياسة تعذر الدخول.]'],
      ['ملاحظات الجودة', '[كيف يبلغ العميل عن مشكلة وكيف يقيّم الفريق الحاجة لعمل إضافي.]'],
    ] },
  },
  logistics: {
    en: { offer: ['[Courier, delivery, freight or moving services]', '[Domestic and international routes you actually serve]'], extra: [
      ['Requesting a shipment quote', '[Origin, destination, item type, approximate size or quantity and required timing. Staff confirm suitability and the quote.]'],
      ['Collection and delivery', '[Booking steps, packaging responsibility, access requirements and how delivery estimates are checked.]'],
      ['Restricted goods and documents', '[Your approved restrictions and how staff review required shipping documents. Do not promise customs clearance.]'],
      ['Tracking and delivery issues', '[Where customers check shipment status and how delays, loss or damage are escalated.]'],
      ['Changes and cancellation', '[When addresses or collection times can change and how cancellation is handled.]'],
    ] },
    ar: { offer: ['[خدمات المندوب والتوصيل والشحن أو النقل]', '[المسارات المحلية والدولية التي تخدمونها فعلياً]'], extra: [
      ['طلب عرض شحن', '[موقع الإرسال والوجهة ونوع الشحنة وحجمها أو كميتها والوقت المطلوب. يؤكد الموظفون الملاءمة والعرض.]'],
      ['الاستلام والتسليم', '[خطوات الحجز ومسؤولية التغليف ومتطلبات الدخول وطريقة التحقق من مواعيد التسليم المتوقعة.]'],
      ['المواد المقيدة والمستندات', '[القيود المعتمدة وطريقة مراجعة مستندات الشحن المطلوبة. لا تضمن التخليص الجمركي.]'],
      ['التتبع ومشكلات التسليم', '[طريقة متابعة الشحنة وتحويل التأخير أو الفقدان أو التلف للفريق.]'],
      ['التعديل والإلغاء', '[متى يمكن تغيير العنوان أو وقت الاستلام وكيف يُتعامل مع الإلغاء.]'],
    ] },
  },
  travel: {
    en: { offer: ['[Trips, accommodation and travel services you arrange]', '[Destinations and package types]'], extra: [
      ['Travel inquiries and booking', '[Destination, travel dates, number of travellers and preferences. The team confirms availability before booking.]'],
      ['Package inclusions', '[What is included and excluded, transfer arrangements and optional activities. Put prices in the Catalog.]'],
      ['Travel documents', '[How staff check document requirements through an approved channel. Do not collect passport scans in chat or guarantee a visa.]'],
      ['Changes, cancellations and refunds', '[Supplier-specific rules and how the team checks change or refund requests.]'],
      ['Support during travel', '[The approved assistance contact and hours, including how urgent travel problems are handled.]'],
    ] },
    ar: { offer: ['[الرحلات والإقامة وخدمات السفر التي ترتبونها]', '[الوجهات وأنواع الباقات]'], extra: [
      ['استفسارات السفر والحجز', '[الوجهة وتواريخ السفر وعدد المسافرين والتفضيلات. يؤكد الفريق التوفر قبل الحجز.]'],
      ['محتويات الباقة', '[ما تشمله الباقة والاستثناءات والتنقل والأنشطة الاختيارية. الأسعار في الكتالوج.]'],
      ['مستندات السفر', '[طريقة تحقق الموظفين من المتطلبات عبر قناة معتمدة. لا تجمع صور الجوازات في المحادثة ولا تضمن التأشيرة.]'],
      ['التعديل والإلغاء والاسترداد', '[قواعد مقدمي الخدمة وكيف يتحقق الفريق من طلبات التعديل أو الاسترداد.]'],
      ['المساعدة أثناء السفر', '[جهة المساعدة المعتمدة وساعاتها وكيف تُعالج مشكلات السفر العاجلة.]'],
    ] },
  },
  events: {
    en: { offer: ['[Event planning, styling, equipment or coordination services]', '[Event types and sizes you handle]'], extra: [
      ['Requesting an event quote', '[Event type, date, guest count, location and scope. The team confirms feasibility and availability.]'],
      ['Planning and approvals', '[Briefing, design approval, supplier coordination and which decisions require the customer to approve.]'],
      ['Setup and venue access', '[Venue coordination, setup and removal windows, and responsibility for permissions.]'],
      ['Changes and postponement', '[Scope-change approval, cancellation, postponement and weather contingencies.]'],
    ] },
    ar: { offer: ['[خدمات تنظيم المناسبات والتنسيق والتجهيزات]', '[أنواع المناسبات وأحجامها التي تتولونها]'], extra: [
      ['طلب عرض للمناسبة', '[نوع المناسبة وتاريخها وعدد الضيوف والموقع والنطاق. يؤكد الفريق الإمكانية والتوفر.]'],
      ['التخطيط والاعتماد', '[المتطلبات واعتماد التصميم وتنسيق الموردين والقرارات التي تحتاج موافقة العميل.]'],
      ['التجهيز ودخول الموقع', '[التنسيق مع الموقع وأوقات التركيب والإزالة ومسؤولية التصاريح.]'],
      ['التعديل والتأجيل', '[اعتماد تغيير النطاق والإلغاء والتأجيل وترتيبات تغير الطقس.]'],
    ] },
  },
  legal: {
    en: { offer: ['[Practice areas and consultation types your team handles]', '[Consultation languages and meeting options]'], extra: [
      ['Requesting a consultation', '[General consultation category, preferred time and meeting mode only. Do not request case narratives or documents in chat.]'],
      ['Intake and engagement', '[How the team checks conflicts and confirms an engagement through an approved private channel.]'],
      ['Advice and deadlines', '[Legal advice, case merits and deadlines are handled by a qualified professional. Layla must not promise outcomes.]'],
      ['Meeting changes', '[Rescheduling, cancellation and how urgent contact requests reach the team.]'],
    ] },
    ar: { offer: ['[مجالات الممارسة وأنواع الاستشارات التي يتولاها الفريق]', '[لغات الاستشارة وطرق الاجتماع]'], extra: [
      ['طلب استشارة', '[الفئة العامة للاستشارة والوقت المفضل وطريقة الاجتماع فقط. لا تطلب سرد القضية أو المستندات في المحادثة.]'],
      ['الاستقبال والاتفاق', '[كيف يتحقق الفريق من تعارض المصالح ويؤكد الاتفاق عبر قناة خاصة معتمدة.]'],
      ['المشورة والمواعيد النظامية', '[يتولى المختص المشورة وتقييم القضية والمواعيد النظامية. لا تَعِد ليلى بنتيجة.]'],
      ['تغيير الاجتماع', '[تغيير الموعد والإلغاء وطريقة إيصال طلبات التواصل العاجلة للفريق.]'],
    ] },
  },
  finance: {
    en: { offer: ['[Bookkeeping, accounting, audit or tax services you provide]', '[Business types and consultation options]'], extra: [
      ['Booking an introductory meeting', '[Service category, preferred time and meeting mode. Do not collect account balances, bank details or financial records in chat.]'],
      ['Scope and document exchange', '[How staff agree the scope and provide an approved private document channel. Never request passwords or verification codes.]'],
      ['Professional review', '[Tax, accounting and financial recommendations require professional review. Do not promise returns, compliance outcomes or filing acceptance.]'],
      ['Recurring work and deadlines', '[How the team confirms reporting schedules, responsibilities and changes to an engagement.]'],
    ] },
    ar: { offer: ['[خدمات مسك الدفاتر والمحاسبة والتدقيق أو الضرائب]', '[أنواع الأنشطة وخيارات الاستشارة]'], extra: [
      ['حجز اجتماع تعريفي', '[فئة الخدمة والوقت المفضل وطريقة الاجتماع. لا تجمع الأرصدة أو البيانات البنكية أو السجلات المالية في المحادثة.]'],
      ['النطاق وتبادل المستندات', '[كيف يتفق الموظفون على النطاق ويوفرون قناة خاصة معتمدة للمستندات. لا تطلب كلمات المرور أو رموز التحقق.]'],
      ['مراجعة المختص', '[التوصيات الضريبية والمحاسبية والمالية تحتاج مراجعة مختص. لا تَعِد بعوائد أو نتائج امتثال أو قبول إقرارات.]'],
      ['العمل الدوري والمواعيد', '[كيف يؤكد الفريق مواعيد التقارير والمسؤوليات وتعديلات الاتفاق.]'],
    ] },
  },
  marketing: {
    en: { offer: ['[Marketing, branding, content or campaign services]', '[Channels and project types you support]'], extra: [
      ['Requesting a proposal', '[Service needed, goals, approximate budget and timing. The team reviews scope before confirming a proposal.]'],
      ['Briefs and approvals', '[How briefs, creative drafts, revisions and campaign approvals work.]'],
      ['Account access and ownership', '[Your approved method for granting platform access and ownership of deliverables. Never ask for passwords in chat.]'],
      ['Reporting and expectations', '[Reporting cadence and what is measured. Do not guarantee leads, sales, reach or platform approval.]'],
      ['Retainers and changes', '[Term, scope changes, renewal, cancellation and handover arrangements.]'],
    ] },
    ar: { offer: ['[خدمات التسويق والهوية والمحتوى أو الحملات]', '[القنوات وأنواع المشاريع التي تدعمونها]'], extra: [
      ['طلب عرض', '[الخدمة والأهداف والميزانية التقريبية والوقت المطلوب. يراجع الفريق النطاق قبل تأكيد العرض.]'],
      ['المتطلبات والاعتماد', '[طريقة تسليم المتطلبات والمسودات والتعديلات واعتماد الحملات.]'],
      ['صلاحيات الحسابات والملكية', '[الطريقة المعتمدة لمنح صلاحيات المنصات وملكية المخرجات. لا تطلب كلمات المرور في المحادثة.]'],
      ['التقارير والتوقعات', '[دورية التقارير وما يُقاس. لا تضمن عملاء محتملين أو مبيعات أو وصولاً أو موافقة المنصة.]'],
      ['العقود والتعديلات', '[المدة وتعديل النطاق والتجديد والإلغاء وترتيبات التسليم.]'],
    ] },
  },
  media: {
    en: { offer: ['[Photography, video, audio or podcast production services]', '[Studio, location and post-production options]'], extra: [
      ['Requesting a production quote', '[Production type, intended deliverables, location and shoot or delivery date. The team confirms crew and studio availability.]'],
      ['Brief and production approval', '[How references, scripts, shot lists and the production schedule are reviewed and approved.]'],
      ['Delivery and revisions', '[Deliverable formats, editing rounds, review deadlines, raw-file policy and how delivery timing is confirmed.]'],
      ['Usage rights and consent', '[Agreed usage rights, music or asset licensing, participant consent and responsibility for location permissions. Refer exceptions to the team.]'],
      ['Rescheduling and cancellation', '[How shoot dates, weather changes, scope changes and cancellations are handled.]'],
    ] },
    ar: { offer: ['[خدمات التصوير الفوتوغرافي والفيديو والإنتاج الصوتي أو البودكاست]', '[خيارات الاستوديو والتصوير الخارجي وما بعد الإنتاج]'], extra: [
      ['طلب عرض إنتاج', '[نوع الإنتاج والمخرجات المطلوبة والموقع وتاريخ التصوير أو التسليم. يؤكد الفريق توفر الطاقم والاستوديو.]'],
      ['المتطلبات واعتماد الإنتاج', '[طريقة مراجعة واعتماد المراجع والنصوص وقائمة اللقطات وجدول الإنتاج.]'],
      ['التسليم والتعديلات', '[صيغ المخرجات وجولات التعديل ومهل المراجعة وسياسة الملفات الأصلية وكيفية تأكيد موعد التسليم.]'],
      ['حقوق الاستخدام والموافقات', '[حقوق الاستخدام المتفق عليها وتراخيص الموسيقى والمواد وموافقة المشاركين ومسؤولية تصاريح المواقع. حوّل الاستثناءات للفريق.]'],
      ['تغيير الموعد والإلغاء', '[طريقة التعامل مع تغيير موعد التصوير والطقس ونطاق العمل والإلغاء.]'],
    ] },
  },
  technology: {
    en: { offer: ['[Websites, applications, automation or IT services]', '[Supported platforms and project types]'], extra: [
      ['Requesting a project quote', '[Business need, existing systems, approximate budget and desired timing. The team confirms feasibility and scope.]'],
      ['Discovery and delivery', '[Requirements review, milestones, acceptance criteria and how changes are approved.]'],
      ['Access and data', '[How staff arrange approved access and data handling. Never collect passwords, API keys or customer datasets in chat.]'],
      ['Support and maintenance', '[Support hours, issue reporting, included maintenance and escalation arrangements.]'],
      ['Ownership and handover', '[Source code or licence ownership, hosting responsibility and handover documents. Only state commitments actually agreed.]'],
    ] },
    ar: { offer: ['[المواقع والتطبيقات والأتمتة أو خدمات تقنية المعلومات]', '[المنصات وأنواع المشاريع المدعومة]'], extra: [
      ['طلب عرض مشروع', '[احتياج النشاط والأنظمة الحالية والميزانية التقريبية والوقت المطلوب. يؤكد الفريق الإمكانية والنطاق.]'],
      ['دراسة المتطلبات والتسليم', '[مراجعة المتطلبات والمراحل ومعايير القبول وطريقة اعتماد التغييرات.]'],
      ['الصلاحيات والبيانات', '[كيف يرتب الموظفون الصلاحيات والتعامل المعتمد مع البيانات. لا تجمع كلمات المرور أو مفاتيح الواجهات أو بيانات العملاء في المحادثة.]'],
      ['الدعم والصيانة', '[ساعات الدعم والإبلاغ عن المشكلات والصيانة المشمولة وطريقة التصعيد.]'],
      ['الملكية والتسليم', '[ملكية الكود أو التراخيص ومسؤولية الاستضافة ووثائق التسليم. اذكر الالتزامات المتفق عليها فعلياً فقط.]'],
    ] },
  },
  manufacturing: {
    en: { offer: ['[Products, materials and manufacturing processes available]', '[Standard and custom-order options]'], extra: [
      ['Requesting a manufacturing quote', '[Product, specifications, quantity, delivery area and required timing. The team confirms capacity and the quote.]'],
      ['Samples and specifications', '[How drawings, samples, tolerances and materials are reviewed and approved before production.]'],
      ['Production and quality checks', '[Order approval, lead-time confirmation, inspection and the handling of non-conforming items. State only verified certifications.]'],
      ['Packaging and delivery', '[Packaging responsibility, collection or shipping arrangements and delivery confirmation.]'],
      ['Changes and warranty', '[When order changes are possible and how warranty or quality claims are reviewed.]'],
    ] },
    ar: { offer: ['[المنتجات والمواد وعمليات التصنيع المتوفرة]', '[خيارات الطلبات القياسية والمخصصة]'], extra: [
      ['طلب عرض تصنيع', '[المنتج والمواصفات والكمية ومنطقة التسليم والوقت المطلوب. يؤكد الفريق القدرة والعرض.]'],
      ['العينات والمواصفات', '[كيف تُراجع وتُعتمد الرسومات والعينات والتفاوتات والمواد قبل الإنتاج.]'],
      ['الإنتاج وفحص الجودة', '[اعتماد الطلب وتأكيد مدة الإنتاج والفحص والتعامل مع المنتجات غير المطابقة. اذكر الشهادات الموثقة فقط.]'],
      ['التغليف والتسليم', '[مسؤولية التغليف وترتيبات الاستلام أو الشحن وتأكيد التسليم.]'],
      ['التعديلات والضمان', '[متى يمكن تعديل الطلب وكيف تُراجع مطالبات الضمان أو الجودة.]'],
    ] },
  },
};

export const ADDITIONAL_BZNS_TEMPLATES = Object.fromEntries(Object.entries(templates).map(([id, languages]) => [id,
  Object.fromEntries(Object.entries(languages).map(([lang, content]) => [lang, { ...content, extra: [...content.extra, payment[lang]] }])),
]));
