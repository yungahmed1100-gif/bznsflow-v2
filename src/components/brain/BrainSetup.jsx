import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parseBzns, setMeta, validateBzns } from '../../lib/bzns-doc.js';
import { bznsMessages } from '../../lib/bzns-messages.js';
import { BUSINESS_INDUSTRIES } from '../../lib/industries.js';
import { brainTemplate } from '../../../config/bzns-templates.js';
import { brainStrings } from '../../lib/brain/strings.js';
import { useBrain } from './useBrain.js';
import { BznsTab } from './BznsTab.jsx';
import { CatalogTab } from './CatalogTab.jsx';
import { AddSource } from './AddSource.jsx';
import { ReviewCard } from './ReviewCard.jsx';
import { BehaviourCard } from './BehaviourCard.jsx';
import { TestLaylaPanel } from './TestLaylaPanel.jsx';
import { BznsWord } from './BznsWord.jsx';
import '../../styles/brain.css';

const STEPS = ['industry', 'information', 'review', 'behaviour', 'publish'];
const COPY = {
  industry: [['Choose your industry', 'اختر مجالك'], ['Layla starts from a template made for it.', 'تبدأ ليلى من قالب مُعدّ له.']],
  information: [['Add your information', 'أضف معلوماتك'], ['Upload a price list or document, read your website, or write it yourself.', 'ارفع قائمة أسعار أو مستنداً، أو اقرأ موقعك، أو اكتبها بنفسك.']],
  review: [['Review the facts', 'راجع المعلومات'], ['Accept what is right, fix what is not. Services and prices go to the Catalog.', 'اقبل الصحيح وعدّل غيره. الخدمات والأسعار تذهب إلى الكتالوج.']],
  behaviour: [['Configure Layla', 'اضبط ليلى'], ['Her style, what she asks for, and when she gives your team\'s contact.', 'أسلوبها، وما تسأل عنه، ومتى تعطي رقم فريقك.']],
  publish: [['Test and publish', 'جرّب وانشر'], ['Try Layla on your draft, then publish. Next you connect a channel.', 'جرّب ليلى على مسودتك، ثم انشر. بعدها تربط قناة.']],
};

/**
 * Catalyst setup's first stage, built from BznsBrain's own parts and records: industry → information →
 * review → behaviour → test and publish. Progress is saved on the setup, so it resumes anywhere.
 */
export function BrainSetup({ lang, onPublished }) {
  const b = useMemo(() => brainStrings(lang), [lang]);
  const { setup, brain, catalog, error, busy, loadError, request, take, load, loadCatalog, act } = useBrain();
  const [step, setStep] = useState(null), [testing, setTesting] = useState(false), [problems, setProblems] = useState([]), [part, setPart] = useState('bzns');
  const [sector, setSector] = useState('');
  const heading = useRef(null);
  const markdown = setup?.bzns?.markdown || '';
  const chosen = parseBzns(markdown).meta.sector || '';
  // Resume where the owner left off (saved on the setup); a sign-up industry preselects the first step.
  useEffect(() => { if (brain && step === null) setStep(Math.min(brain.brainStep || 0, STEPS.length - 1)); }, [brain, step]);
  useEffect(() => { if (!sector) setSector(BUSINESS_INDUSTRIES.some(r => r.id === chosen) ? chosen : setup?.account?.industry || ''); }, [chosen, setup?.account?.industry]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (step !== null) heading.current?.focus(); }, [step]);
  if (loadError) return <div className="ld-state" role="alert"><p>{b.reason(loadError)}</p><button type="button" className="ld-button" onClick={load}>{b.t('retry')}</button></div>;
  if (!setup || !brain || step === null) return <p className="ld-state" role="status">{b.t('loading')}</p>;
  const id = STEPS[step], [title, intro] = COPY[id].map(pair => pair[b.ar ? 1 : 0]);
  const go = next => act('step', async () => { take(await request({ action: 'brain_step', brainStep: next })); setStep(next); setProblems([]); });
  const chooseIndustry = () => act('industry', async () => {
    // A new document starts from the industry's template; an existing one only changes its sector line.
    const next = markdown.trim() ? setMeta(markdown, 'sector', sector) : brainTemplate(sector, lang);
    if (next !== markdown) take(await request({ action: 'bzns_save', markdown: next, version: setup.bzns?.version || 0 }));
    take(await request({ action: 'brain_step', brainStep: 1 }));
    setStep(1);
  });
  const publish = () => act('publish', async () => {
    const check = validateBzns(markdown);
    if (!check.ok) { setProblems(bznsMessages(check.errors, lang)); setPart('bzns'); return; }
    take(await request({ action: 'brain_publish' }));
    await onPublished?.();
  });
  return (
    <div className="brain brain-setup" dir={b.ar ? 'rtl' : 'ltr'} lang={lang}>
      <ol className="brain-setup-steps" aria-label={b.t('stepsTitle')}>
        {STEPS.map((s, i) => <li key={s} data-state={i < step ? 'done' : i === step ? 'current' : 'upcoming'} aria-current={i === step ? 'step' : undefined}>
          <span aria-hidden="true">{i < step ? '✓' : i + 1}</span> {COPY[s][0][b.ar ? 1 : 0]}
        </li>)}
      </ol>
      <header className="brain-setup-head">
        <h3 ref={heading} tabIndex={-1}>{title}</h3>
        <p className="ld-help">{intro}</p>
      </header>
      {(error || problems.length > 0) && <div className="brain-problems" role="alert">{problems.length ? <><p>{b.t('beforePublish')}</p><ul>{problems.map((line, i) => <li key={i}>{line}</li>)}</ul></> : <p>{b.reason(error)}</p>}</div>}

      {id === 'industry' && <form className="brain-setup-industry" onSubmit={e => { e.preventDefault(); if (sector) chooseIndustry(); }}>
        <label>{b.t('industry')}<select value={sector} onChange={e => setSector(e.target.value)} disabled={!!busy} required>
          <option value="">{b.ar ? 'اختر مجالك' : 'Choose your industry'}</option>
          {BUSINESS_INDUSTRIES.map(r => <option key={r.id} value={r.id}>{b.ar ? r.ar : r.en}</option>)}
        </select></label>
        <div className="brain-actions"><button type="submit" className="ld-button ld-primary" disabled={!!busy || !sector}>{b.ar ? 'متابعة' : 'Continue'}</button></div>
      </form>}

      {id === 'information' && <>
        <AddSource b={b} request={request} take={take} act={act} busy={busy} websiteAvailable={!!setup.websiteImportAvailable} onDone={() => loadCatalog()} open />
        <details className="brain-card"><summary><span className="brain-card-title">{b.ar ? 'أو اكتب ' : 'Or write your '}<BznsWord />{b.ar ? ' بنفسك' : ' yourself'}</span></summary>
          <BznsTab b={b} lang={lang} setup={setup} request={request} take={take} act={act} busy={busy} industry={chosen} /></details>
      </>}

      {id === 'review' && <>
        {brain.total > 0 ? <ReviewCard b={b} lang={lang} brain={brain} request={request} take={take} act={act} busy={busy} onAccepted={p => (p.kind === 'catalog_entry' ? loadCatalog() : null)} open />
          : <p className="brain-note">{b.t('reviewNone')}</p>}
        <div className="brain-tabs">
          <div role="tablist" aria-label={b.t('tabsLabel')} className="brain-tablist">
            {['bzns', 'catalog'].map(t => <button key={t} type="button" role="tab" aria-selected={part === t} aria-controls="brain-setup-panel" id={`brain-setup-tab-${t}`} tabIndex={part === t ? 0 : -1} className="brain-tab" onClick={() => setPart(t)}>{t === 'bzns' ? <BznsWord /> : b.t('tabCatalog')}</button>)}
          </div>
          <div role="tabpanel" id="brain-setup-panel" aria-labelledby={`brain-setup-tab-${part}`} className="brain-panel">
            {part === 'catalog' ? <CatalogTab b={b} catalog={catalog} request={request} take={take} act={act} busy={busy} loadCatalog={loadCatalog} />
              : <BznsTab b={b} lang={lang} setup={setup} request={request} take={take} act={act} busy={busy} industry={chosen} />}
          </div>
        </div>
      </>}

      {id === 'behaviour' && <BehaviourCard b={b} lang={lang} brain={brain} request={request} take={take} act={act} busy={busy} industry={chosen} open />}

      {id === 'publish' && <div className="brain-setup-publish">
        <button type="button" className="ld-button" onClick={() => setTesting(true)}>{b.t('testLayla')}</button>
        <button type="button" className="ld-button ld-primary" disabled={!!busy} onClick={publish}>{busy === 'publish' ? b.t('publishing') : b.t('publish')}</button>
      </div>}

      {id !== 'industry' && <div className="brain-setup-nav">
        <button type="button" className="ld-button ld-quiet" disabled={!!busy} onClick={() => go(step - 1)}>{b.ar ? 'رجوع' : 'Back'}</button>
        {id !== 'publish' && <button type="button" className="ld-button ld-primary" disabled={!!busy} onClick={() => go(step + 1)}>{b.ar ? 'متابعة' : 'Continue'}</button>}
      </div>}
      {testing && <TestLaylaPanel b={b} request={request} take={take} hasDraft onClose={() => setTesting(false)} />}
    </div>
  );
}
