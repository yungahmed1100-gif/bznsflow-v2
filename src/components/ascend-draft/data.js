// Fictional, browser-only product examples. No production records or transports.
export const pair = (en, ar) => ({ en, ar });
const workflows = {
  project: [pair('Brief received', 'استلام المتطلبات'), pair('Proposal', 'عرض السعر'), pair('In progress', 'قيد التنفيذ'), pair('Client review', 'مراجعة العميل')],
  booking: [pair('Requested', 'طلب جديد'), pair('Confirmed', 'مؤكد'), pair('Upcoming', 'قريباً'), pair('Completed', 'مكتمل')],
  order: [pair('New', 'جديد'), pair('Confirmed', 'مؤكد'), pair('Preparing', 'قيد التجهيز'), pair('Ready', 'جاهز')],
  job: [pair('Requested', 'طلب جديد'), pair('Estimate', 'عرض السعر'), pair('In progress', 'قيد التنفيذ'), pair('Ready', 'جاهز')],
};
// id, family, work label, sample record, follow-up trigger, industry detail.
const rows = [
  ['media','project','Projects','المشاريع','Brand film · autumn collection','فيلم العلامة · مجموعة الخريف','First cut awaiting feedback','النسخة الأولى بانتظار الملاحظات','Deliverables & revision rounds','المخرجات وجولات التعديل'],
  ['real-estate','project','Deals','الصفقات','Two-bedroom apartment · Al Mouj','شقة بغرفتين · الموج','Viewing feedback pending','بانتظار ملاحظات المعاينة','Property & buyer requirements','العقار ومتطلبات المشتري'],
  ['retail','order','Orders','الطلبات','Linen collection · pickup order','مجموعة الكتان · طلب استلام','Order ready for collection','الطلب جاهز للاستلام','Variants & collection date','المقاسات وموعد الاستلام'],
  ['retail-tech','job','Repairs & sales','الصيانة والمبيعات','Laptop screen replacement','استبدال شاشة حاسوب','Repair estimate awaiting approval','عرض الصيانة بانتظار الموافقة','Device, warranty & parts','الجهاز والضمان والقطع'],
  ['dental','booking','Visits','الزيارات','Routine appointment · reception','موعد دوري · الاستقبال','Appointment confirmation needed','الموعد يحتاج إلى تأكيد','Provider & visit time','مقدم الخدمة ووقت الزيارة'],
  ['clinic','booking','Visits','الزيارات','Reception appointment request','طلب موعد للاستقبال','Appointment confirmation needed','الموعد يحتاج إلى تأكيد','Reception & schedule resource','الاستقبال ومورد الجدولة'],
  ['automotive','job','Workshop','الورشة','Vehicle service · work order','خدمة مركبة · أمر عمل','Service estimate awaiting approval','عرض الخدمة بانتظار الموافقة','Vehicle, parts & promised date','المركبة والقطع والموعد الموعود'],
  ['construction','project','Projects','المشاريع','Villa extension · phase two','توسعة فيلا · المرحلة الثانية','Variation awaiting approval','تغيير بانتظار الموافقة','Milestones & certified balance','المراحل والمستحقات المعتمدة'],
  ['hvac','job','Service jobs','أعمال الصيانة','AC preventive maintenance','صيانة وقائية للتكييف','Maintenance visit confirmation','تأكيد زيارة الصيانة','Site, units & service history','الموقع والوحدات وسجل الصيانة'],
  ['cleaning','job','Visits','الزيارات','Office deep clean','تنظيف عميق لمكتب','Access details needed','بيانات الدخول مطلوبة','Crew, site & checklist','الفريق والموقع وقائمة المهام'],
  ['beauty','booking','Bookings','الحجوزات','Styling appointment','موعد تصفيف','Booking confirmation needed','الحجز يحتاج إلى تأكيد','Service, staff & duration','الخدمة والموظف والمدة'],
  ['fitness','booking','Memberships','العضويات','Starter membership · trial','عضوية مبتدئ · تجربة','Trial visit reminder','تذكير بزيارة التجربة','Attendance & membership expiry','الحضور وانتهاء العضوية'],
  ['education','booking','Classes','الدروس','Language course · enrollment','دورة لغة · تسجيل','Trial lesson confirmation','تأكيد الدرس التجريبي','Course, credits & attendance','الدورة والرصيد والحضور'],
  ['restaurant','order','Orders','الطلبات','Team lunch · catering order','غداء فريق · طلب تموين','Catering quote awaiting response','عرض التموين بانتظار الرد','Menu, servings & collection','القائمة والحصص والاستلام'],
  ['cafe','order','Orders','الطلبات','Coffee box · office delivery','صندوق قهوة · توصيل مكتب','Pickup time confirmation','تأكيد وقت الاستلام','Menu, extras & pickup','القائمة والإضافات والاستلام'],
  ['cakes','order','Cake orders','طلبات الكيك','Celebration cake · custom design','كيكة احتفال · تصميم خاص','Cake design awaiting approval','تصميم الكيكة بانتظار الموافقة','Design, event date & deposit','التصميم وتاريخ المناسبة والعربون'],
  ['logistics','job','Shipments','الشحنات','Muscat delivery · collection','توصيل مسقط · استلام','Delivery address incomplete','عنوان التوصيل غير مكتمل','Pickup, address & shipment status','الاستلام والعنوان وحالة الشحنة'],
  ['travel','project','Bookings','الحجوزات','Weekend stay · family inquiry','إقامة نهاية الأسبوع · استفسار عائلي','Travel proposal awaiting response','عرض السفر بانتظار الرد','Dates, guests & supplier confirmation','التواريخ والضيوف وتأكيد المورد'],
  ['events','project','Events','المناسبات','Private celebration · event brief','احتفال خاص · متطلبات المناسبة','Event brief incomplete','متطلبات المناسبة غير مكتملة','Venue, vendors & guest count','المكان والموردون وعدد الضيوف'],
  ['marketing','project','Client work','أعمال العملاء','Autumn campaign · creative brief','حملة الخريف · متطلبات التصميم','Creative assets awaiting approval','المواد الإبداعية بانتظار الموافقة','Deliverables, retainer & approvals','المخرجات والعقد والموافقات'],
  ['technology','project','Projects','المشاريع','Customer portal · discovery','بوابة عملاء · دراسة المتطلبات','Requirements awaiting confirmation','المتطلبات بانتظار التأكيد','Requirements, milestones & acceptance','المتطلبات والمراحل والقبول'],
  ['manufacturing','project','Production','الإنتاج','Packaging run · custom order','دفعة تغليف · طلب خاص','Sample awaiting approval','العينة بانتظار الموافقة','Specification, quantity & dispatch','المواصفات والكمية والشحن'],
  ['legal','project','Engagements','التكليفات','Consultation · administrative intake','استشارة · استقبال إداري','Consultation confirmation needed','الاستشارة تحتاج إلى تأكيد','Staff-set tasks & document checklist','مهام يحددها الفريق وقائمة المستندات'],
  ['finance','project','Client work','أعمال العملاء','Monthly review · engagement','مراجعة شهرية · تكليف','Requested documents outstanding','المستندات المطلوبة لم تصل','Period, documents & review date','الفترة والمستندات وتاريخ المراجعة'],
  ['other','project','Work','الأعمال','Service inquiry · new request','استفسار عن خدمة · طلب جديد','Proposal awaiting response','العرض بانتظار الرد','Scope, owner & next action','النطاق والمسؤول والخطوة التالية'],
];
export const DRAFT_PACKS = Object.fromEntries(rows.map(([id,family,en,ar,title,titleAr,trigger,triggerAr,detail,detailAr]) => [id, {
  id,family,work:pair(en,ar),title:pair(title,titleAr),trigger:pair(trigger,triggerAr),detail:pair(detail,detailAr),stages:workflows[family],
}]));
DRAFT_PACKS.media.stages = [pair('Briefing','المتطلبات'),pair('Scheduled','مجدول'),pair('In production','قيد الإنتاج'),pair('Client review','مراجعة العميل')];
DRAFT_PACKS['real-estate'].stages = [pair('Qualified','مؤهل'),pair('Viewing','معاينة'),pair('Offer','عرض'),pair('Closing','إغلاق')];
export const customers = [pair('Maha · sample','مها · تجريبي'),pair('Omar · sample','عمر · تجريبي'),pair('Noor · sample','نور · تجريبي'),pair('Salim · sample','سالم · تجريبي')];
const mediaTitles = [pair('Brand film · autumn collection','فيلم العلامة · مجموعة الخريف'),pair('Product shoot · ceramics','تصوير منتجات · خزف'),pair('Podcast · episode 04','بودكاست · الحلقة ٠٤'),pair('Launch event · photography','تصوير · حفل إطلاق'),pair('Social edits · October','مقاطع اجتماعية · أكتوبر'),pair('Studio portrait session','جلسة تصوير في الاستوديو')];
export function seedDraft(packId, now = Date.now()) {
  const pack = DRAFT_PACKS[packId];
  const jobs = Array.from({length:6},(_,i)=>({id:`work-${i}`,title:packId==='media'?mediaTitles[i]:i===0?pack.title:pair(`${pack.work.en} · sample ${i+1}`,`${pack.work.ar} · نموذج ${i+1}`),customer:i%4,stage:[3,2,0,1,2,1][i],amount:[480000,220000,150000,360000,180000,95000][i],dueAt:now+(i+1)*86400000}));
  const followups = [
    {id:'followup-0',jobId:'work-0',kind:'approval',reason:pack.trigger,status:'approval',dueAt:now-3600000,channel:'WhatsApp',mode:'approval'},
    {id:'followup-1',jobId:'work-1',kind:'confirmation',reason:pair('Confirm the next appointment','تأكيد الموعد القادم'),status:'scheduled',dueAt:now+10800000,channel:'WhatsApp',mode:'automatic'},
    {id:'followup-2',jobId:'work-2',kind:'details',reason:pair('Collect the missing details','جمع التفاصيل الناقصة'),status:'blocked',dueAt:now,channel:'Instagram',mode:'task'},
    {id:'followup-3',jobId:'work-3',kind:'quote',reason:pair('Follow up on the approved quote','متابعة عرض السعر المعتمد'),status:'approval',dueAt:now+86400000,channel:'WhatsApp',mode:'approval'},
  ];
  return {version:1,jobs,followups,paused:false,events:[]};
}
export const STATUS = {approval:pair('Needs approval','تحتاج موافقة'),scheduled:pair('Scheduled','مجدولة'),blocked:pair('Needs attention','تحتاج انتباهاً'),completed:pair('Completed','مكتملة'),cancelled:pair('Stopped · customer replied','متوقفة · رد العميل')};
export const MODES = {task:pair('Internal task','مهمة داخلية'),approval:pair('Approve before sending','موافقة قبل الإرسال'),automatic:pair('Approved automatic message','رسالة آلية معتمدة')};
export function draftMessage(pack, job, lang) {
  return lang==='ar' ? `مرحباً ${customers[job.customer].ar.split(' · ')[0]}، نتابع معك بخصوص «${job.title.ar}». هل لديك تحديث أو تحتاج إلى مساعدة للخطوة التالية؟` : `Hi ${customers[job.customer].en.split(' · ')[0]}, checking in about “${job.title.en}”. Do you have an update, or can we help with the next step?`;
}
