import React, { useEffect, useRef, useState } from 'react';
import { callApi } from '../../lib/api-client.js';
import { sampleCsv } from '../../lib/dashboard/import.js';
import { sampleStockCsv } from '../../lib/hasib/stockImport.js';
import { download } from '../../lib/dashboard/exports.js';
import { extractInformation } from '../../lib/information-import.js';

/** Reviewed knowledge never invokes stock, customer, service or money mutations. */
export function AddInformation({ lang = 'ar', request: websiteRequest, operationalHref }) {
  const ar = lang === 'ar', tr = (en, arabic) => ar ? arabic : en;
  const explainError = reason => ({
    prices_require_catalog_review: tr('Price statements must be reviewed in Services and prices. Remove pricing from this knowledge answer.', 'يجب مراجعة الأسعار في الخدمات والأسعار. احذف معلومات الأسعار من هذه الإجابة.'),
    question_mapping_required: tr('Map at least one customer question to an answer from the extracted references.', 'اربط سؤال عميل واحداً على الأقل بإجابة من المراجع المستخرجة.'),
    invalid_question_mapping: tr('Each mapped passage needs both a question and answer. Use at most 20 per source.', 'كل مقطع مرتبط يحتاج سؤالاً وإجابة. الحد ٢٠ لكل مصدر.'),
    conflicting_question: tr('This question already has an approved answer. Review a replacement of that source.', 'لهذا السؤال إجابة معتمدة. راجع بديلاً للمصدر الحالي.'),
    conflicting_source: tr('A source with this title already exists. Review its replacement instead.', 'يوجد مصدر بهذا العنوان. راجع بديلاً له.'),
    duplicate_source: tr('This information is already published. Review the existing source.', 'المعلومات منشورة بالفعل. راجع المصدر الحالي.'),
    draft_changed: tr('The draft changed or is no longer editable. Resume its saved version.', 'تغيرت المسودة أو لم تعد قابلة للتعديل. تابع النسخة المحفوظة.'),
    source_changed: tr('The published source changed since this draft began. Open a new replacement to avoid overwriting newer facts.', 'تغير المصدر المنشور منذ إنشاء المسودة. افتح بديلاً جديداً لتجنب استبدال معلومات أحدث.'),
    knowledge_limit: tr('The source or active-draft limit was reached. Discard an unused draft before retrying.', 'وصلت إلى حد المصادر أو المسودات النشطة. ألغِ مسودة غير مستخدمة وأعد المحاولة.'),
  }[reason] || tr('Unable to complete this step. Check the file or your access and retry. Your saved information is preserved.', 'تعذر إكمال الخطوة. تحقق من الملف أو صلاحياتك وأعد المحاولة. تبقى معلوماتك المحفوظة كما هي.'));
  const [state, setState] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [destination, setDestination] = useState('knowledge'), [source, setSource] = useState('guided');
  const [title, setTitle] = useState(''), [text, setText] = useState(''), [url, setUrl] = useState('');
  const [draft, setDraft] = useState(null), [references, setReferences] = useState([]), [partial, setPartial] = useState(false);
  const [warnings, setWarnings] = useState([]), [scanned, setScanned] = useState(false), [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false), [acceptPartial, setAcceptPartial] = useState(false), [progress, setProgress] = useState('');
  const controller = useRef(null), running = useRef(false), live = useRef(true);
  const importWebsite = websiteRequest || (async body => {
    const setup = await callApi('/api/layla-meta?surface=customer');
    return callApi('/api/layla-meta?surface=customer', {body,csrf:setup.csrfToken,timeout:60000});
  });
  const request = body => callApi('/api/knowledge', { body, csrf: state?.csrfToken || '', timeout: 60000 });
  const restore = async () => { const result = await callApi('/api/knowledge'); if (live.current) setState(result); };
  useEffect(() => { live.current = true; restore().catch(e => setError(e.message)); return () => { live.current = false; controller.current?.abort(); }; }, []);
  const act = async work => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setNotice('');
    try { await work(); } catch (e) { if (live.current) e.name === 'AbortError' ? setNotice(tr('Extraction cancelled. No information was published.', 'أُلغي الاستخراج. لم تُنشر معلومات.')) : setError(explainError(e.message)); }
    finally { running.current = false; if (live.current) { setBusy(false); setProgress(''); } }
  };
  function resetReview() { setConfirmed(false); setAcceptPartial(false); }
  function resume(value) {
    setDraft(value); setTitle(value.title); setText(value.text); setSource(value.kind); setReferences(value.references); setPartial(value.partial); resetReview(); setWarnings([]);
  }
  async function saveDraft() {
    const identity = draft || {requestId:crypto.randomUUID(),sourceKey:crypto.randomUUID(),version:0};
    // Retain the idempotency keys before the network request, including on timeout.
    if (!draft) setDraft(identity);
    const result = await request({ operation:'save', requestId:identity.requestId, sourceKey:identity.sourceKey, title, text, kind:source, references, partial, version:identity.version });
    setDraft(result.draft); resetReview(); await restore();
    setNotice(result.duplicate ? tr(`Duplicate candidate: ${result.duplicate.title}. Review the existing source before publishing.`, `محتوى مكرر محتمل: ${result.duplicate.title}. راجع المصدر الحالي قبل النشر.`) : tr('Draft saved. Review the exact answer and confirm publication.', 'حُفظت المسودة. راجع الإجابة وأكّد النشر.'));
  }
  const dirty = draft && (title !== draft.title || text !== draft.text || source !== draft.kind || partial !== draft.partial || JSON.stringify(references) !== JSON.stringify(draft.references));
  return <section className="information-entry" aria-labelledby="information-heading" dir={ar ? 'rtl' : 'ltr'}>
    <h2 id="information-heading">{tr('Add information', 'إضافة معلومات')}</h2>
    <p>{tr('Choose a source → extract → review → validate → publish. Original files stay in your browser. Saved drafts and approved text belong to your business.', 'اختر المصدر ← استخراج ← مراجعة ← تحقق ← نشر. تبقى الملفات الأصلية في متصفحك. تُحفظ المسودات والنصوص المعتمدة في حساب نشاطك.')}</p>
    {error && <p role="alert" className="layla-error">{error} <button type="button" onClick={() => act(restore)}>{tr('Retry connection', 'إعادة المحاولة')}</button></p>}
    {notice && <p role="status" className="layla-notice">{notice}</p>}
    <label>{tr('Destination', 'الوجهة')}<select value={destination} disabled={busy} onChange={e => setDestination(e.target.value)}><option value="knowledge">{tr('Layla knowledge', 'معلومات ليلى')}</option><option value="operations">{tr('Supported operational data', 'بيانات العمليات المدعومة')}</option></select></label>
    {destination === 'operations' ? <div><p>{tr('Use the matching operational importer to review columns, invalid rows, duplicates and prices. Knowledge uploads do not create operational records.', 'استخدم مستورد العمليات المناسب لمراجعة الأعمدة والصفوف غير الصالحة والتكرار والأسعار. لا تنشئ ملفات معلومات ليلى سجلات تشغيلية.')}</p><a className="layla-secondary" href={operationalHref || `${ar ? '' : '/en'}/layla/dashboard?tab=stock`}>{tr('Open stock and operational imports', 'فتح المخزون واستيراد العمليات')}</a><a className="layla-secondary" href={`${ar ? '' : '/en'}/layla/dashboard?tab=customers`}>{tr('Open customer import', 'فتح استيراد العملاء')}</a>
      <button type="button" onClick={() => download('stock-template.csv', sampleStockCsv(), 'text/csv;charset=utf-8')}>{tr('Download stock CSV template', 'تنزيل نموذج CSV للمخزون')}</button>
      <button type="button" onClick={() => download('customers-template.csv', sampleCsv(), 'text/csv;charset=utf-8')}>{tr('Download customer CSV template', 'تنزيل نموذج CSV للعملاء')}</button>
      <p>{tr('Sector-specific variant and device columns are available in the stock importer.', 'أعمدة المتغيرات والأجهزة الخاصة بالقطاع متاحة في مستورد المخزون.')}</p></div> : <>
      {state?.drafts?.length > 0 && <details><summary>{tr('Resume saved drafts', 'متابعة المسودات المحفوظة')} ({state.drafts.length})</summary>{state.drafts.map(item => <button key={item.requestId} type="button" disabled={busy} onClick={() => resume(item)}>{item.title}</button>)}</details>}
      <label>{tr('Source', 'المصدر')}<select value={source} disabled={busy} onChange={e => { setSource(e.target.value); resetReview(); }}><option value="guided">{tr('Guided question and answer', 'سؤال وإجابة موجهان')}</option><option value="paste">{tr('Paste text', 'لصق نص')}</option><option value="website">{tr('Public website', 'موقع عام')}</option><option value="file">{tr('File or image', 'ملف أو صورة')}</option></select></label>
      {source === 'website' && <><label>{tr('Public page URL', 'رابط الصفحة العامة')}<input type="url" value={url} maxLength={2000} onChange={e => setUrl(e.target.value)} /></label><button type="button" disabled={busy || !url} onClick={() => act(async () => {
        const result = await importWebsite({ action:'import_website', url }); const imported = result.imported;
        const extracted = imported.text || imported.extracted?.questions?.whatTheyAre || '';
        if (!extracted.trim()) throw Error('knowledge_file_empty');
        setText(extracted.slice(0, 100000)); setTitle(url); let remaining = 100000;
        const refs=(imported.sections || [{label:imported.url || url,text:extracted}]).flatMap(ref => { const value=String(ref.text || '').slice(0,remaining); remaining-=value.length;return value?[{label:ref.label,text:value}]:[]; });
        setReferences(refs); setPartial(!!imported.partial || extracted.length > 100000); setDraft(null); resetReview();
      })}>{tr('Extract page', 'استخراج الصفحة')}</button></>}
      {source === 'file' && <>
        <p>{tr('PDF, DOCX, TXT, CSV, XLSX, PNG, JPEG or WebP · up to 15 MB. Files are processed one at a time. OCR may require downloading language data.', 'PDF وDOCX وTXT وCSV وXLSX وPNG وJPEG وWebP · حتى ١٥ ميغابايت. تُعالج الملفات تباعاً. قد يتطلب التعرف على النص تنزيل بيانات اللغة.')}</p>
        <label><input type="checkbox" checked={scanned} disabled={busy} onChange={e => setScanned(e.target.checked)} />{tr('Scanned PDF: use OCR on each page', 'ملف PDF ممسوح: التعرف على النص في كل صفحة')}</label>
        <input type="file" accept=".pdf,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.webp" aria-label={tr('Select information file','اختيار ملف المعلومات')} disabled={busy} onChange={e => { const file=e.target.files?.[0]; e.target.value=''; if (file) act(async () => {
          controller.current = new AbortController(); const result = await extractInformation(file, { signal:controller.current.signal, scanned, onProgress:setProgress });
          setText(result.text); setTitle(file.name); setReferences(result.references); setPartial(result.partial); setWarnings(result.warnings); setDraft(null); resetReview();
        }); }} />
        {busy && controller.current && <button type="button" onClick={() => controller.current.abort()}>{tr('Cancel extraction', 'إلغاء الاستخراج')}</button>}
      </>}
      {busy && <p role="status">{tr('Working…', 'جارٍ العمل…')} {progress}</p>}
      {warnings.map((warning, n) => <p key={n} className="layla-notice">{warning}</p>)}
      <label>{source === 'guided' ? tr('Customer question (exact wording)', 'سؤال العميل (النص الدقيق)') : tr('Source title / exact customer question', 'عنوان المصدر / سؤال العميل الدقيق')}<input value={title} maxLength={200} disabled={busy} onChange={e => { setTitle(e.target.value); resetReview(); }} /></label>
      <label>{source === 'guided' ? tr('Approved answer', 'الإجابة المعتمدة') : tr('Review extracted text', 'مراجعة النص المستخرج')}<textarea rows={8} value={text} maxLength={100000} disabled={busy} onChange={e => { setText(e.target.value); resetReview(); }} /></label>
      {references.length === 0 && text.trim() && <button type="button" disabled={busy} onClick={() => { setReferences([{label:title || tr('Pasted text','نص ملصق'),text}]); resetReview(); }}>{tr('Map this text to customer questions', 'ربط النص بأسئلة العملاء')}</button>}
      <p>{tr('Map extracted facts to customer questions below. Layla returns the approved answer when that exact question is asked. Use up to 20 answers per source, 2,000 characters each. Price information must go through catalog review.', 'اربط الحقائق المستخرجة بأسئلة العملاء أدناه. تجيب ليلى بالإجابة المعتمدة عند طرح السؤال نفسه. حتى ٢٠ إجابة لكل مصدر، و٢٠٠٠ حرف للإجابة. تُراجع معلومات الأسعار في الكتالوج.')}</p>
      {!!references.length && <details><summary>{tr('Review references and map customer questions', 'مراجعة المراجع وربط أسئلة العملاء')} ({references.length})</summary>{references.map((ref, n) => <details key={n}><summary>{ref.label}</summary><p style={{ whiteSpace:'pre-wrap', overflowWrap:'anywhere' }}>{ref.text}</p>
        <label>{tr('Customer question for this passage (optional)', 'سؤال العميل لهذا المقطع (اختياري)')}<input maxLength={200} value={ref.question || ''} disabled={busy} onChange={e => { setReferences(current => current.map((value, index) => index === n ? {...value, question:e.target.value} : value)); resetReview(); }} /></label>
        <label>{tr('Reviewed answer from this passage', 'الإجابة المراجعة من هذا المقطع')}<textarea maxLength={2000} rows={3} value={ref.answer || ''} disabled={busy} onChange={e => { setReferences(current => current.map((value, index) => index === n ? {...value, answer:e.target.value} : value)); resetReview(); }} /></label>
        <button type="button" disabled={busy} onClick={() => { setReferences(current => current.map((value, index) => index === n ? {...value, answer:value.text.slice(0,2000)} : value)); resetReview(); }}>{tr('Use this passage as answer (first 2,000 characters)', 'استخدام المقطع كإجابة (أول ٢٠٠٠ حرف)')}</button>
        <button type="button" disabled={busy || references.length >= 500} onClick={() => { setReferences(current => [...current, {label:ref.label,text:'',question:'',answer:''}]); resetReview(); }}>{tr('Add another question for this reference', 'إضافة سؤال آخر لهذا المرجع')}</button>
      </details>)}</details>}
      {partial && <p className="layla-notice">{tr('Partial extraction. Review missing pages or rows and retry with a smaller file before publishing.', 'استخراج جزئي. راجع الصفحات أو الصفوف الناقصة وأعد المحاولة بملف أصغر قبل النشر.')}</p>}
      <button type="button" className="layla-secondary" disabled={busy || !state || !title.trim() || !text.trim()} onClick={() => act(saveDraft)}>{tr('Save review draft', 'حفظ مسودة المراجعة')}</button>
      {draft && <>
        <label><input type="checkbox" checked={confirmed} disabled={busy || !!dirty} onChange={e => setConfirmed(e.target.checked)} />{tr('I reviewed the facts, permissions and prices. This answer is approved for customers.', 'راجعت الحقائق والصلاحيات والأسعار. هذه الإجابة معتمدة للعملاء.')}</label>
        {partial && <label><input type="checkbox" checked={acceptPartial} onChange={e => setAcceptPartial(e.target.checked)} />{tr('I accept the explicitly partial extraction.', 'أوافق على الاستخراج الجزئي الموضح.')}</label>}
        {dirty && <p>{tr('Save the changed draft before publishing.', 'احفظ تعديل المسودة قبل النشر.')}</p>}
        <button type="button" className="layla-primary" disabled={busy || !confirmed || !!dirty || (partial && !acceptPartial)} onClick={() => act(async () => {
          const existingRevision = draft.baseRevision || 0;
          await request({ operation:'publish', requestId:draft.requestId, version:draft.version, confirmed, acceptPartial, ...(existingRevision ? { expectedRevision:existingRevision } : {}) });
          setDraft(null); setText(''); setTitle(''); setReferences([]); resetReview(); await restore(); setNotice(tr('Published. Only approved current information is available to Layla.', 'تم النشر. المعلومات الحالية المعتمدة فقط متاحة لليلى.'));
        })}>{tr('Validate and publish', 'تحقق وانشر')}</button>
        <button type="button" disabled={busy} onClick={() => act(async () => { await request({ operation:'cancel', requestId:draft.requestId }); setDraft(null); await restore(); })}>{tr('Discard draft', 'إلغاء المسودة')}</button>
      </>}
      <details><summary>{tr('Published sources', 'المصادر المنشورة')} ({state?.sources?.filter(item => item.status === 'published').length || 0})</summary>{state?.sources?.filter(item => item.status === 'published').map(item => <p key={item.sourceKey}>{item.title} · {tr('Revision', 'الإصدار')} {item.revision}
        <button type="button" disabled={busy} onClick={() => act(async () => {
          const result = await request({ operation:'open', sourceKey:item.sourceKey });
          const next = { requestId:crypto.randomUUID(), sourceKey:item.sourceKey, title:item.title, kind:item.kind, text:result.revision.text, references:result.revision.references, partial:false };
          const saved = await request({ operation:'save', ...next }); resume(saved.draft); await restore();
        })}>{tr('Review replacement', 'مراجعة البديل')}</button>
        <button type="button" disabled={busy} onClick={() => act(async () => { await request({ operation:'archive', sourceKey:item.sourceKey, expectedRevision:item.revision }); await restore(); setNotice(tr('Archived. Layla no longer retrieves this source.', 'تمت الأرشفة. لم يعد المصدر متاحاً لليلى.')); })}>{tr('Archive', 'أرشفة')}</button></p>)}</details>
    </>}
  </section>;
}
