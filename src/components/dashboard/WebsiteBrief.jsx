import React, { useEffect, useState } from 'react';
import { BRIEF_MAX_PHOTOS, BRIEF_PAGES, BRIEF_STYLES, normalizeBrief } from '../../../config/website-brief.js';
import { briefAction, loadBrief, uploadBriefFile } from '../../lib/dashboard/website-brief';

// Ascend's free lead-capture website (Ahmed, 2026-10-18): the owner tells BznsFlow about the business
// and how the site should look, adds a logo and photos, and sends it. Each send emails the whole brief
// to Ahmed; the owner can update and send again. Prefilled from the business details already confirmed.

const W = {
  title: ['Your free website', 'موقعك المجاني'],
  intro: ['Tell us about your business and how your website should look. Everything you send goes to the BznsFlow team, who build your site and contact you before it goes live.', 'أخبرنا عن نشاطك وكيف تريد أن يبدو موقعك. كل ما ترسله يصل إلى فريق BznsFlow الذي يبني موقعك ويتواصل معك قبل نشره.'],
  business: ['Your business', 'نشاطك'], contact: ['Contact details', 'بيانات التواصل'], social: ['Social media', 'التواصل الاجتماعي'],
  look: ['Look and feel', 'الهوية البصرية'], site: ['Pages and languages', 'الصفحات واللغات'], files: ['Logo and photos', 'الشعار والصور'], more: ['Anything else', 'أي شيء آخر'],
  nameEn: ['Business name in English', 'اسم النشاط بالإنجليزية'], nameAr: ['Business name in Arabic', 'اسم النشاط بالعربية'],
  about: ['What your business does', 'ماذا يقدّم نشاطك'], services: ['Services or products to feature', 'الخدمات أو المنتجات التي تريد إبرازها'],
  phone: ['Phone or WhatsApp', 'الهاتف أو واتساب'], email: ['Email', 'البريد الإلكتروني'], address: ['Address', 'العنوان'],
  mapUrl: ['Google Maps link', 'رابط خرائط جوجل'], hours: ['Opening hours', 'ساعات العمل'],
  instagram: ['Instagram', 'إنستغرام'], facebook: ['Facebook', 'فيسبوك'], tiktok: ['TikTok', 'تيك توك'], otherSocial: ['Other', 'أخرى'],
  colors: ['Brand colours (up to 3)', 'ألوان العلامة (حتى 3)'], addColor: ['Add a colour', 'أضف لونًا'], addLink: ['Add another link', 'أضف رابطًا آخر'], remove: ['Remove', 'إزالة'],
  style: ['Style', 'الطابع'], fontNotes: ['Fonts you like (optional)', 'الخطوط التي تفضلها (اختياري)'],
  references: ['Websites you like (up to 3 links)', 'مواقع تعجبك (حتى 3 روابط)'],
  pages: ['Pages', 'الصفحات'], languages: ['Website language', 'لغة الموقع'],
  domainStatus: ['Domain', 'النطاق (الدومين)'], domain: ['Your domain name', 'اسم نطاقك'],
  logo: ['Logo (PNG, JPG or WebP, up to 5 MB)', 'الشعار (PNG أو JPG أو WebP، حتى 5 ميغابايت)'],
  designLogo: ['I don’t have a logo. Please design a simple one.', 'ليس لدي شعار. صمّموا لي شعارًا بسيطًا.'],
  photos: [`Photos: storefront, products, team (up to ${BRIEF_MAX_PHOTOS})`, `صور: المحل والمنتجات والفريق (حتى ${BRIEF_MAX_PHOTOS})`],
  notes: ['Anything else we should know', 'أي شيء آخر يجب أن نعرفه'],
  send: ['Send to BznsFlow', 'أرسل إلى BznsFlow'], update: ['Send update', 'أرسل التحديث'], sending: ['Sending…', 'جارٍ الإرسال…'],
  uploading: ['Uploading…', 'جارٍ الرفع…'], loading: ['Loading…', 'جارٍ التحميل…'],
  sent: ['Sent on {date}. We’ll contact you before your website goes live.', 'أُرسل في {date}. سنتواصل معك قبل نشر موقعك.'],
  notEmailed: ['Your details are saved, but we couldn’t send them yet.', 'تم حفظ بياناتك، لكن تعذّر إرسالها بعد.'], resend: ['Send again', 'أرسل مجددًا'],
  required: ['Required', 'مطلوب'],
};
const OPTIONS = {
  style: { modern: ['Modern', 'عصري'], classic: ['Classic', 'كلاسيكي'], playful: ['Playful', 'مرح'], minimal: ['Minimal', 'بسيط'], luxury: ['Luxury', 'فاخر'] },
  pages: { home: ['Home', 'الرئيسية'], about: ['About', 'من نحن'], services: ['Services', 'الخدمات'], gallery: ['Gallery', 'المعرض'], contact: ['Contact', 'تواصل معنا'], faq: ['FAQ', 'الأسئلة الشائعة'] },
  languages: { both: ['Arabic and English', 'العربية والإنجليزية'], ar: ['Arabic', 'العربية'], en: ['English', 'الإنجليزية'] },
  domainStatus: { have: ['I have a domain', 'لدي نطاق'], need: ['Please advise me', 'انصحوني'] },
};
const ERRORS = {
  brief_required: ['Fill in the required fields.', 'أكمل الحقول المطلوبة.'], invalid_brief: ['Check the highlighted field.', 'راجع الحقل المحدد.'],
  brief_too_long: ['One of the fields is too long.', 'أحد الحقول طويل جدًا.'], brief_conflict: ['This brief changed in another tab. Reload the page first.', 'تغيّر هذا الطلب في نافذة أخرى. أعد تحميل الصفحة أولًا.'],
  photo_type: ['Use a PNG, JPG or WebP image.', 'استخدم صورة PNG أو JPG أو WebP.'], photo_size: ['Use an image under 5 MB.', 'استخدم صورة أقل من 5 ميغابايت.'],
  invalid_file: ['That file isn’t a valid image.', 'هذا الملف ليس صورة صالحة.'], upload_limit: ['Too many uploads today. Try again tomorrow.', 'رفعت صورًا كثيرة اليوم. حاول غدًا.'],
  too_many_files: ['Too many files. Remove one and try again.', 'ملفات كثيرة. احذف واحدًا وحاول مجددًا.'],
  brief_email_failed: ['Saved, but not sent yet. Try “Send again”.', 'تم الحفظ لكن لم يُرسل بعد. جرّب «أرسل مجددًا».'],
};

export function WebsiteBrief({ s }) {
  const tr = pair => pair[s.ar ? 1 : 0];
  const [state, setState] = useState({ loading: true });
  const [fields, setFields] = useState({});
  const [logo, setLogo] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState({ reason: '', field: '' });

  useEffect(() => {
    let live = true;
    loadBrief().then(({ brief, csrfToken }) => {
      if (!live) return;
      setState({ csrf: csrfToken, version: brief.version, submittedAt: brief.submittedAt, emailedAt: brief.emailedAt });
      setFields(brief.fields || {}); setLogo(brief.logo); setPhotos(brief.photos || []);
    }).catch(e => live && setState({ failed: e.reason || 'brief_unavailable' }));
    return () => { live = false; };
  }, []);

  if (state.loading) return <p className="ld-state" role="status">{tr(W.loading)}</p>;
  if (state.failed) return null; // Not an Ascend manager, or unavailable: the rest of Business details still works.

  const set = (key, value) => setFields(f => ({ ...f, [key]: value }));
  const toggle = (key, item) => set(key, (fields[key] || []).includes(item) ? fields[key].filter(x => x !== item) : [...(fields[key] || []), item]);
  const fail = (reason, field = '') => setError({ reason, field });
  const message = reason => tr(ERRORS[reason] || ['Something went wrong. Please try again.', 'حدث خطأ. حاول مجددًا.']);

  const upload = async (kind, files) => {
    setBusy('upload'); fail('');
    try {
      for (const file of files) {
        const id = await uploadBriefFile(state.csrf, kind, file);
        const preview = { id, url: window.URL.createObjectURL(file) };
        if (kind === 'logo') setLogo(preview); else setPhotos(p => [...p, preview].slice(0, BRIEF_MAX_PHOTOS));
      }
    } catch (e) { fail(e.reason); } finally { setBusy(''); }
  };

  const submit = async event => {
    event.preventDefault();
    const checked = normalizeBrief(fields);
    if (!checked.ok) return fail(checked.reason, checked.field);
    if (!logo && !fields.designLogo) return fail('brief_required', 'logo');
    setBusy('send'); fail('');
    try {
      const result = await briefAction(state.csrf, 'submit', { version: state.version, fields: checked.value, logoId: logo?.id || null, photoIds: photos.map(p => p.id) });
      setState(st => ({ ...st, version: result.version, submittedAt: Date.now(), emailedAt: Date.now() }));
    } catch (e) {
      if (e.reason === 'brief_email_failed') setState(st => ({ ...st, version: st.version + 1, submittedAt: Date.now(), emailedAt: null }));
      fail(e.reason);
    } finally { setBusy(''); }
  };

  const resend = async () => {
    setBusy('send'); fail('');
    try { await briefAction(state.csrf, 'resend'); setState(st => ({ ...st, emailedAt: Date.now() })); } catch (e) { fail(e.reason); } finally { setBusy(''); }
  };

  const text = (key, { area, required, type = 'text', dir } = {}) => {
    const Tag = area ? 'textarea' : 'input';
    return <label className={`ld-field${error.field === key ? ' is-invalid' : ''}`}>
      <span>{tr(W[key])}{required && <em className="ld-brief-required"> · {tr(W.required)}</em>}</span>
      <Tag {...(area ? {} : { type })} dir={dir} value={fields[key] || ''} onChange={e => set(key, e.target.value)} aria-invalid={error.field === key || undefined} />
    </label>;
  };
  const choice = key => <fieldset className={`ld-brief-choice${error.field === key ? ' is-invalid' : ''}`}><legend>{tr(W[key])}</legend>
    {Object.entries(OPTIONS[key]).map(([value, label]) => <label key={value}><input type="radio" name={key} checked={fields[key] === value} onChange={() => set(key, value)} /> {tr(label)}</label>)}
  </fieldset>;
  const date = ms => new Intl.DateTimeFormat(s.ar ? 'ar-OM-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Muscat' }).format(new Date(ms));
  const colors = fields.colors || [];
  const references = fields.references?.length ? fields.references : [''];

  return (
    <form className="ld-brief" id="website" onSubmit={submit} aria-labelledby="ld-brief-title" noValidate>
      <h2 id="ld-brief-title">{tr(W.title)}</h2>
      <p>{tr(W.intro)}</p>
      {state.submittedAt && state.emailedAt && <p className="ld-brief-status is-done" role="status">{tr(W.sent).replace('{date}', date(state.emailedAt))}</p>}
      {state.submittedAt && !state.emailedAt && <p className="ld-brief-status" role="status">{tr(W.notEmailed)} <button type="button" className="ld-button" disabled={!!busy} onClick={resend}>{tr(W.resend)}</button></p>}

      <fieldset><legend>{tr(W.business)}</legend>
        {text('nameEn', { required: true, dir: 'ltr' })}{text('nameAr', { dir: 'rtl' })}{text('about', { area: true })}{text('services', { area: true })}
      </fieldset>
      <fieldset><legend>{tr(W.contact)}</legend>
        {text('phone', { required: true, type: 'tel', dir: 'ltr' })}{text('email', { type: 'email', dir: 'ltr' })}{text('address')}{text('mapUrl', { type: 'url', dir: 'ltr' })}{text('hours')}
      </fieldset>
      <fieldset><legend>{tr(W.social)}</legend>
        {text('instagram', { dir: 'ltr' })}{text('facebook', { dir: 'ltr' })}{text('tiktok', { dir: 'ltr' })}{text('otherSocial', { dir: 'ltr' })}
      </fieldset>
      <fieldset><legend>{tr(W.look)}</legend>
        <div className={`ld-brief-colors${error.field === 'colors' ? ' is-invalid' : ''}`}><span>{tr(W.colors)}</span>
          {colors.map((c, i) => <span key={i} className="ld-brief-color"><input type="color" value={c} aria-label={`${tr(W.colors)} ${i + 1}`} onChange={e => set('colors', colors.map((x, k) => (k === i ? e.target.value : x)))} /><code dir="ltr">{c}</code>
            <button type="button" className="ld-button" onClick={() => set('colors', colors.filter((_, k) => k !== i))}>{tr(W.remove)}</button></span>)}
          {colors.length < 3 && <button type="button" className="ld-button" onClick={() => set('colors', [...colors, '#1f4f7a'])}>{tr(W.addColor)}</button>}
        </div>
        {choice('style')}{text('fontNotes')}
        <div className={`ld-brief-refs${error.field === 'references' ? ' is-invalid' : ''}`}><span>{tr(W.references)}</span>
          {references.map((r, i) => <input key={i} type="url" dir="ltr" value={r} aria-label={`${tr(W.references)} ${i + 1}`} placeholder="https://"
            onChange={e => set('references', references.map((x, k) => (k === i ? e.target.value : x)))} />)}
          {references.length < 3 && references[references.length - 1] && <button type="button" className="ld-button" onClick={() => set('references', [...references, ''])}>{tr(W.addLink)}</button>}
        </div>
      </fieldset>
      <fieldset><legend>{tr(W.site)}</legend>
        <fieldset className="ld-brief-choice"><legend>{tr(W.pages)}</legend>
          {BRIEF_PAGES.map(page => <label key={page}><input type="checkbox" checked={(fields.pages || []).includes(page)} onChange={() => toggle('pages', page)} /> {tr(OPTIONS.pages[page])}</label>)}
        </fieldset>
        {choice('languages')}{choice('domainStatus')}{fields.domainStatus === 'have' && text('domain', { dir: 'ltr' })}
      </fieldset>
      <fieldset><legend>{tr(W.files)}</legend>
        <label className={`ld-field${error.field === 'logo' ? ' is-invalid' : ''}`}><span>{tr(W.logo)}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={e => { upload('logo', [...e.target.files].slice(0, 1)); e.target.value = ''; }} />
        </label>
        {logo && <figure className="ld-brief-thumb"><img src={logo.url} alt="" /><button type="button" className="ld-button" onClick={() => setLogo(null)}>{tr(W.remove)}</button></figure>}
        <label className="ld-brief-check"><input type="checkbox" checked={!!fields.designLogo} onChange={e => set('designLogo', e.target.checked)} /> {tr(W.designLogo)}</label>
        <label className="ld-field"><span>{tr(W.photos)}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={!!busy || photos.length >= BRIEF_MAX_PHOTOS} onChange={e => { upload('photo', [...e.target.files].slice(0, BRIEF_MAX_PHOTOS - photos.length)); e.target.value = ''; }} />
        </label>
        {photos.length > 0 && <div className="ld-brief-photos">{photos.map(p => <figure key={p.id} className="ld-brief-thumb"><img src={p.url} alt="" /><button type="button" className="ld-button" onClick={() => setPhotos(all => all.filter(x => x.id !== p.id))}>{tr(W.remove)}</button></figure>)}</div>}
        {busy === 'upload' && <p role="status">{tr(W.uploading)}</p>}
      </fieldset>
      <fieldset><legend>{tr(W.more)}</legend>{text('notes', { area: true })}</fieldset>

      {error.reason && <p className="ld-inline-error" role="alert">{message(error.reason)}</p>}
      <button type="submit" className="ld-button ld-primary" disabled={!!busy}>{busy === 'send' ? tr(W.sending) : state.version ? tr(W.update) : tr(W.send)}</button>
    </form>
  );
}
