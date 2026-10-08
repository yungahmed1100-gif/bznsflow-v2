import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BZNS_MAX_CHARS, applySections, profileToBzns, setMeta, validateBzns } from '../../lib/bzns-doc.js';
import { TONES, phrase, toneOf } from '../../../config/layla-tones.js';
import { bznsMessage, bznsMessages, sectionLabel } from '../../lib/bzns-messages.js';
import { bznsTemplate } from '../../../config/bzns-templates.js';
import { BUSINESS_INDUSTRIES } from '../../lib/industries.js';
import { GuidedSetup } from '../onboarding/GuidedSetup.jsx';
import { BznsPreview } from './BznsPreview.jsx';

const TEXT_FILE = /\.(md|markdown|txt)$/i;

/**
 * The one place an owner writes how their business works (bzns.md).
 *
 * Saving a draft never changes Layla's answers; publishing does, after the same
 * checks the server repeats. Prices and stock stay in Hasib or Services & Prices.
 *
 * @param {{
 *   lang?: 'en'|'ar',
 *   data: { bzns?: { markdown: string|null, version: number, publishedRevision: number, unpublishedChanges: boolean }, profile?: object|null },
 *   request: (body: object) => Promise<object>,
 *   onState: (state: object) => void,
 *   disabled?: boolean,
 *   sectorControl?: boolean,
 * }} props
 *
 * The sector comes from sign-up. `sectorControl` (Settings → Business) is the one place it can change.
 */
export function BznsEditor({ lang = 'en', data, request, onState, disabled = false, sectorControl = false }) {
  const ar = lang === 'ar', tr = (en, arabic) => (ar ? arabic : en);
  const saved = data?.bzns?.markdown ?? '';
  const [text, setText] = useState(saved);
  const signup = BUSINESS_INDUSTRIES.find(row => row.id === data?.account?.industry) || null;
  // The owner's pick, else the sign-up sector (which can arrive after the first render).
  const [picked, setSector] = useState('');
  const sector = picked || signup?.id || '';
  const sectorName = id => { const row = BUSINESS_INDUSTRIES.find(item => item.id === id); return row ? (ar ? row.ar : row.en) : id; };
  const [view, setView] = useState('edit');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  // Adopt the server's text when it changes (first load, another save) unless the owner has unsaved edits.
  const lastSaved = useRef(saved);
  useEffect(() => {
    setText(current => (current === lastSaved.current ? saved : current));
    lastSaved.current = saved;
  }, [saved]);
  const check = useMemo(() => validateBzns(text), [text]);
  const dirty = text !== saved;
  const version = data?.bzns?.version || 0;
  const published = data?.bzns?.publishedRevision > 0;

  const edit = next => { setText(next); setConfirmed(false); setNotice(''); };
  async function send(action) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const next = await request({ action, markdown: text, version });
      onState(next);
      setNotice(action === 'bzns_publish' ? tr('Published. Layla now answers from this version.', 'تم النشر. تجيب ليلى الآن من هذه النسخة.') : tr('Draft saved. Layla keeps answering from the published version until you publish.', 'تم حفظ المسودة. تستمر ليلى في الإجابة من النسخة المنشورة حتى تنشر.'));
      if (action === 'bzns_publish') setConfirmed(false);
    } catch (e) { setError(bznsMessage(e?.reason || e?.message || 'unavailable', lang)); }
    finally { setBusy(false); }
  }
  async function upload(file) {
    if (!file) return;
    setError('');
    try {
      const raw = TEXT_FILE.test(file.name) ? await file.text() : (await (await import('../../lib/information-import.js')).extractInformation(file)).text;
      edit(String(raw || '').slice(0, BZNS_MAX_CHARS + 500));
    } catch { setError(tr('That file could not be read. Try a .md, .txt or .docx file.', 'تعذّرت قراءة الملف. جرّب ملف ‎.md أو ‎.txt أو ‎.docx.')); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  }

  if (!text.trim()) {
    return (
      <section className="bzns-editor bzns-start" aria-labelledby="bzns-start-title">
        <h3 id="bzns-start-title">{tr('Start your business document', 'ابدأ مستند نشاطك')}</h3>
        <p>{tr('One document tells Layla how your business works. Pick your sector to get a template with every section filled with hints.', 'مستند واحد يخبر ليلى كيف يعمل نشاطك. اختر مجالك لتحصل على قالب فيه كل الأقسام مع أمثلة توضيحية.')}</p>
        {signup && !sectorControl ? <p className="bzns-sector">{tr('Your sector', 'مجال نشاطك')}: <strong>{sectorName(signup.id)}</strong></p>
          : <label>{tr('Your sector', 'مجال نشاطك')}
          <select value={sector} onChange={e => setSector(e.target.value)} disabled={disabled}>
            <option value="">{tr('Choose your sector', 'اختر مجالك')}</option>
            {BUSINESS_INDUSTRIES.map(row => <option key={row.id} value={row.id}>{ar ? row.ar : row.en}</option>)}
          </select>
        </label>}
        <div className="bzns-actions">
          <button type="button" className="layla-primary" disabled={!sector || disabled} onClick={() => edit(bznsTemplate(sector, lang).replace(/^sector: .*$/m, `sector: ${sector}`))}>{tr('Use this template', 'استخدم هذا القالب')}</button>
          {data?.profile && <button type="button" className="layla-secondary" disabled={disabled} onClick={() => edit(profileToBzns({ businessName: data.profile.businessName, profile: data.profile, lang }))}>{tr('Start from my saved details', 'ابدأ من معلوماتي المحفوظة')}</button>}
          <button type="button" className="layla-secondary" disabled={disabled} onClick={() => fileRef.current?.click()}>{tr('Upload my own file', 'ارفع ملفي')}</button>
          <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.docx" hidden onChange={e => upload(e.target.files?.[0])} aria-label={tr('Upload business document', 'رفع مستند النشاط')} />
        </div>
        {error && <p className="layla-error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="bzns-editor" aria-labelledby="bzns-title">
      <div className="bzns-head">
        <h3 id="bzns-title">{tr('Your business document', 'مستند نشاطك')}</h3>
        <p className={published && !dirty && !data?.bzns?.unpublishedChanges ? 'layla-saved' : 'layla-saved layla-saved--preview'} role="status">
          {!published ? tr('Not published yet', 'لم يُنشر بعد') : dirty || data?.bzns?.unpublishedChanges ? tr('Changes not published yet', 'تعديلات لم تُنشر بعد') : tr('Layla is answering from this version', 'تجيب ليلى من هذه النسخة')}
        </p>
      </div>
      {sectorControl && <label className="bzns-sector">{tr('Sector', 'المجال')}
        <select value={check.parsed.meta.sector || ''} onChange={e => edit(setMeta(text, 'sector', e.target.value))} disabled={disabled || busy}>
          {!BUSINESS_INDUSTRIES.some(row => row.id === check.parsed.meta.sector) && <option value={check.parsed.meta.sector || ''}>{check.parsed.meta.sector || tr('Choose your sector', 'اختر مجالك')}</option>}
          {BUSINESS_INDUSTRIES.map(row => <option key={row.id} value={row.id}>{ar ? row.ar : row.en}</option>)}
        </select>
      </label>}
      <ul className="bzns-rules">
        <li>{tr('Write in Arabic or English. Layla replies in the customer\'s language.', 'اكتب بالعربية أو الإنجليزية. ترد ليلى بلغة العميل.')}</li>
        <li>{tr('No prices, rents or stock here. Layla reads them live from Services & Prices or Hasib.', 'لا تكتب أسعاراً أو إيجارات أو مخزوناً هنا. تقرأها ليلى مباشرة من الخدمات والأسعار أو حاسب.')}</li>
        <li>{tr('Not sure about something? Leave it out. Layla hands those questions to your team.', 'لست متأكداً من شيء؟ اتركه. ستحوّل ليلى هذه الأسئلة لفريقك.')}</li>
      </ul>
      <fieldset className="bzns-tone" disabled={disabled || busy}>
        <legend>{tr('Layla\'s style', 'أسلوب ليلى')}</legend>
        <div className="bzns-tone-options">
          {TONES.map(option => {
            const selected = toneOf(check.parsed.meta.tone) === option.id;
            return <label key={option.id} className="bzns-tone-option" data-selected={selected}>
              <input type="radio" name="bzns-tone" value={option.id} checked={selected} onChange={() => edit(setMeta(text, 'tone', option.id))} />
              <span className="bzns-tone-name">{ar ? option.ar : option.en}</span>
              <span className="bzns-tone-desc">{ar ? option.descAr : option.descEn}</span>
              <span className="bzns-tone-sample" dir="auto">{phrase(option.id, 'welcome', lang, { customer: '', business: check.parsed.meta.name && !/\[/.test(check.parsed.meta.name) ? check.parsed.meta.name : tr('your business', 'نشاطك') })}</span>
            </label>;
          })}
        </div>
      </fieldset>
      <div className="bzns-tabs" role="tablist" aria-label={tr('Document view', 'عرض المستند')}>
        {[['edit', tr('Write', 'كتابة')], ['preview', tr('Preview', 'معاينة')]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} className="bzns-tab" onClick={() => setView(id)}>{label}</button>
        ))}
      </div>
      {view === 'edit' ? (
        <label className="bzns-field">{tr('bzns.md', 'bzns.md')}
          <textarea value={text} dir="auto" rows={22} spellCheck onChange={e => edit(e.target.value)} disabled={disabled || busy} aria-describedby="bzns-count" />
          <span id="bzns-count" className={text.length > BZNS_MAX_CHARS ? 'bzns-count bzns-count--over' : 'bzns-count'}>{`${text.length.toLocaleString(ar ? 'ar-EG' : 'en')} / ${BZNS_MAX_CHARS.toLocaleString(ar ? 'ar-EG' : 'en')}`}</span>
        </label>
      ) : <BznsPreview markdown={text} lang={lang} />}
      <div className="bzns-side">
        <h4>{tr('Sections', 'الأقسام')}</h4>
        <ul className="bzns-checklist">
          {check.checklist.map(item => <li key={item.key} data-done={item.present}><span aria-hidden="true">{item.present ? '✓' : '○'}</span> {sectionLabel(item.key, lang)}<span className="ld-visually-hidden">{item.present ? tr(' — added', ' — مضاف') : tr(' — missing', ' — غير مضاف')}</span></li>)}
        </ul>
        <details className="bzns-guided">
          <summary>{tr('Answer a few questions instead', 'أجب عن بعض الأسئلة بدلاً من ذلك')}</summary>
          <GuidedSetup lang={lang} sectorId={check.parsed.meta.sector || sector || 'other'} busy={busy || disabled} onApply={patch => edit(applySections(text, patch, lang))} onDone={() => setView('preview')} />
        </details>
      </div>
      {check.errors.length > 0 && (
        <div className="layla-notice layla-notice--problem" aria-live="polite">
          <p>{tr('Before publishing:', 'قبل النشر:')}</p>
          <ul>{bznsMessages(check.errors, lang).map((line, i) => <li key={i}>{line}</li>)}</ul>
        </div>
      )}
      {error && <p className="layla-error" role="alert">{error}</p>}
      {notice && <p className="layla-notice layla-notice--done" role="status">{notice}</p>}
      <div className="bzns-actions">
        <button type="button" className="layla-secondary" disabled={!dirty || busy || disabled || text.length > BZNS_MAX_CHARS} onClick={() => send('bzns_save')}>{busy ? tr('Saving…', 'جارٍ الحفظ…') : tr('Save draft', 'حفظ المسودة')}</button>
        <label className="bzns-confirm"><input type="checkbox" checked={confirmed} disabled={!check.ok || busy || disabled} onChange={e => setConfirmed(e.target.checked)} />{tr('I checked these business details', 'راجعت معلومات النشاط هذه')}</label>
        <button type="button" className="layla-primary" disabled={!check.ok || !confirmed || busy || disabled || (!dirty && !data?.bzns?.unpublishedChanges && published)} onClick={() => send('bzns_publish')}>{published ? tr('Publish changes', 'نشر التعديلات') : tr('Publish and continue', 'انشر وتابع')}</button>
      </div>
    </section>
  );
}
