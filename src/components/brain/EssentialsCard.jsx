import React, { useEffect, useState } from 'react';
import { parseBzns, sectionText, setMeta, upsertSection } from '../../lib/bzns-doc.js';

const HINT = /^\s*(?:[-*•]\s+)?\[[^\]\n]*\]\s*$/;
// A template hint is not something the owner wrote, so the field starts empty instead.
const written = text => String(text || '').split('\n').filter(line => line.trim() && !HINT.test(line)).join('\n');

/**
 * The three things every business must give before Layla can go live: its name, what it offers
 * and who a customer can reach when they want a person. Each is written straight into bzns.md;
 * everything else in the starter template is optional and left out at publish if unchanged.
 */
export function EssentialsCard({ lang, markdown, version, request, take, act, busy }) {
  const ar = lang === 'ar', tr = (en, arabic) => (ar ? arabic : en);
  const read = () => ({ name: written(parseBzns(markdown).meta.name), offer: written(sectionText(markdown, 'offer')), contact: written(sectionText(markdown, 'contact')) });
  const [form, setForm] = useState(read), [saved, setSaved] = useState(false);
  useEffect(() => { setForm(read()); }, [markdown]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = key => e => { setSaved(false); setForm(f => ({ ...f, [key]: e.target.value })); };
  const save = () => act('essentials', async () => {
    let next = markdown;
    if (form.name.trim()) {
      next = setMeta(next, 'name', form.name.trim());
      next = next.replace(/^#\s+\[[^\]\n]*\]\s*$/m, `# ${form.name.trim()}`);
    }
    if (form.offer.trim()) next = upsertSection(next, 'offer', form.offer, { replace: true, lang });
    if (form.contact.trim()) next = upsertSection(next, 'contact', form.contact, { replace: true, lang });
    if (next !== markdown) take(await request({ action: 'bzns_save', markdown: next, version }));
    setSaved(true);
  });
  const complete = form.name.trim() && form.offer.trim() && form.contact.trim();
  return (
    <form className="brain-card brain-essentials" onSubmit={e => { e.preventDefault(); save(); }}>
      <p className="brain-card-title">{tr('The essentials', 'الأساسيات')}</p>
      <p className="ld-help">{tr('Layla needs these three before she can go live. Everything else is optional.', 'تحتاج ليلى هذه الثلاثة قبل أن تبدأ. كل ما عداها اختياري.')}</p>
      <label>{tr('Business name', 'اسم النشاط')}<input type="text" dir="auto" maxLength={100} value={form.name} onChange={set('name')} disabled={!!busy} autoComplete="organization" /></label>
      <label>{tr('What you offer', 'ما تقدمه')}<textarea rows={3} dir="auto" maxLength={1500} value={form.offer} onChange={set('offer')} disabled={!!busy}
        placeholder={tr('One service or product per line. No prices here: they go in the Catalog.', 'خدمة أو منتج في كل سطر. لا أسعار هنا: مكانها الكتالوج.')} /></label>
      <label>{tr('Team contact', 'جهة اتصال الفريق')}<input type="text" dir="auto" maxLength={120} value={form.contact} onChange={set('contact')} disabled={!!busy}
        placeholder={tr('e.g. WhatsApp +968 9100 2000 (Sara)', 'مثال: واتساب ‎+968 9100 2000 (سارة)')} /></label>
      <p className="ld-help">{tr('Layla shares the team contact when a customer asks for a person.', 'تشارك ليلى جهة اتصال الفريق عندما يطلب العميل شخصاً.')}</p>
      <div className="brain-actions">
        <button type="submit" className="ld-button ld-primary" disabled={!!busy || !(form.name.trim() || form.offer.trim() || form.contact.trim())}>{tr('Save', 'حفظ')}</button>
        {saved && <span className="brain-note" role="status">{complete ? tr('Saved. Layla has what she needs to go live.', 'تم الحفظ. لدى ليلى ما تحتاجه لتبدأ.') : tr('Saved.', 'تم الحفظ.')}</span>}
      </div>
    </form>
  );
}
