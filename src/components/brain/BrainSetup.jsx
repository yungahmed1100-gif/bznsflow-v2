import React, { useEffect, useMemo, useRef, useState } from 'react';
import { prepareForPublish, validateBzns } from '../../lib/bzns-doc.js';
import { bznsMessages, serverBznsProblems } from '../../lib/bzns-messages.js';
import { brainTemplate } from '../../../config/bzns-templates.js';
import { revealStep } from '../../lib/reveal-step.js';
import { Icon } from '../ui/Icon.jsx';
import { brainStrings } from '../../lib/brain/strings.js';
import { useBrain } from './useBrain.js';
import { BznsTab } from './BznsTab.jsx';
import { CatalogTab } from './CatalogTab.jsx';
import { AddSource } from './AddSource.jsx';
import { EssentialsCard } from './EssentialsCard.jsx';
import { ReviewCard } from './ReviewCard.jsx';
import { BehaviourCard } from './BehaviourCard.jsx';
import { TestLaylaPanel } from './TestLaylaPanel.jsx';
import { BznsWord } from './BznsWord.jsx';
import '../../styles/brain.css';

// Catalyst is the same for every business (Ahmed, 2026-10-17): no industry step, one general starter.
const STEPS = ['information', 'review', 'behaviour', 'publish'];
// Saved brainStep values still count the retired industry step as 0, so older setups resume in place.
const SAVED_OFFSET = 1;
const COPY = {
  information: [['Add your information', 'أضف معلوماتك'], ['Upload a price list or document, read your website, or write it yourself.', 'ارفع قائمة أسعار أو مستنداً، أو اقرأ موقعك، أو اكتبها بنفسك.']],
  review: [['Review the facts', 'راجع المعلومات'], ['Accept what is right, fix what is not. Services and prices go to the Catalog.', 'اقبل الصحيح وعدّل غيره. الخدمات والأسعار تذهب إلى الكتالوج.']],
  behaviour: [['Configure Layla', 'اضبط ليلى'], ['Her style, what she asks for, and when she gives your team\'s contact.', 'أسلوبها، وما تسأل عنه، ومتى تعطي رقم فريقك.']],
  publish: [['Test and publish', 'جرّب وانشر'], ['Try Layla on your draft, then publish. Next you connect a channel.', 'جرّب ليلى على مسودتك، ثم انشر. بعدها تربط قناة.']],
};

/**
 * Catalyst setup's first stage, built from BznsBrain's own parts and records: information → review →
 * behaviour → test and publish. Progress is saved on the setup, so it resumes anywhere. Each finished
 * card offers the next step, and every step change scrolls the new step into view.
 */
export function BrainSetup({ lang, onPublished }) {
  const b = useMemo(() => brainStrings(lang), [lang]);
  const { setup, brain, catalog, error, busy, loadError, request, take, load, loadCatalog, act } = useBrain();
  const [step, setStep] = useState(null), [testing, setTesting] = useState(false), [problems, setProblems] = useState([]), [part, setPart] = useState('bzns');
  const heading = useRef(null), started = useRef(false), shown = useRef(null);
  const markdown = setup?.bzns?.markdown || '';
  // Resume where the owner left off (saved on the setup).
  useEffect(() => { if (brain && step === null) setStep(Math.min(Math.max((brain.brainStep || 0) - SAVED_OFFSET, 0), STEPS.length - 1)); }, [brain, step]);
  // A new setup starts from the general template; the sign-up industry is only recorded on its sector line.
  useEffect(() => {
    if (!setup || started.current || markdown.trim()) return;
    started.current = true;
    act('template', async () => take(await request({ action: 'bzns_save', markdown: brainTemplate(setup.account?.industry, lang, { general: true }), version: setup.bzns?.version || 0 })));
  }, [setup, markdown]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (step === null) return;
    if (shown.current !== null && shown.current !== step) revealStep(heading.current);
    shown.current = step;
  }, [step]);
  if (loadError) return <div className="ld-state" role="alert"><p>{b.reason(loadError)}</p><button type="button" className="ld-button" onClick={load}>{b.t('retry')}</button></div>;
  if (!setup || !brain || step === null) return <p className="ld-state" role="status">{b.t('loading')}</p>;
  const id = STEPS[step], [title, intro] = COPY[id].map(pair => pair[b.ar ? 1 : 0]);
  const go = next => act('step', async () => { take(await request({ action: 'brain_step', brainStep: next + SAVED_OFFSET })); setStep(next); setProblems([]); });
  const forward = <Icon name="arrow-right" size={14} className="brain-flip" />;
  // Shown beside a card's confirmation, so finishing it always points somewhere.
  const nextCue = STEPS[step + 1] && <button type="button" className="brain-next" disabled={!!busy} onClick={() => go(step + 1)}>
    {b.ar ? 'التالي: ' : 'Next: '}{COPY[STEPS[step + 1]][0][b.ar ? 1 : 0]}{forward}</button>;
  const publish = () => act('publish', async () => {
    // Unreplaced template hints are left out at publish, so only what a customer needs can block.
    const check = validateBzns(prepareForPublish(markdown).markdown);
    if (!check.ok) { setProblems(bznsMessages(check.errors, lang)); setPart('bzns'); return; }
    let result;
    try { result = await request({ action: 'brain_publish' }); } catch (e) {
      const server = serverBznsProblems(e);
      if (!server) throw e;
      setProblems(bznsMessages(server, lang)); setPart('bzns'); return;
    }
    take(result);
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
      {(error || problems.length > 0) && <div className="brain-problems" role="alert">{problems.length ? <><p>{b.t('beforePublish')}</p><ul>{problems.map((line, i) => <li key={i}>{line}</li>)}</ul>
        {id === 'publish' && <button type="button" className="ld-button" disabled={!!busy} onClick={() => go(0)}>{b.ar ? 'أكمل الأساسيات' : 'Fill in the essentials'}</button>}</> : <p>{b.reason(error)}</p>}</div>}

      {id === 'information' && <>
        <EssentialsCard lang={lang} markdown={markdown} version={setup.bzns?.version || 0} request={request} take={take} act={act} busy={busy} next={nextCue} />
        <AddSource b={b} request={request} take={take} act={act} busy={busy} websiteAvailable={!!setup.websiteImportAvailable} onDone={() => loadCatalog()} next={nextCue} open />
        <details className="brain-card"><summary><span className="brain-card-title">{b.ar ? 'أو اكتب ' : 'Or write your '}<BznsWord />{b.ar ? ' بنفسك' : ' yourself'}</span></summary>
          <BznsTab b={b} lang={lang} setup={setup} request={request} take={take} act={act} busy={busy} /></details>
      </>}

      {id === 'review' && <>
        {brain.total > 0 ? <ReviewCard b={b} lang={lang} brain={brain} request={request} take={take} act={act} busy={busy} onAccepted={p => (p.kind === 'catalog_entry' ? loadCatalog() : null)} open />
          : <p className="brain-note">{b.t('reviewNone')} {nextCue}</p>}
        <div className="brain-tabs">
          <div role="tablist" aria-label={b.t('tabsLabel')} className="brain-tablist">
            {['bzns', 'catalog'].map(t => <button key={t} type="button" role="tab" aria-selected={part === t} aria-controls="brain-setup-panel" id={`brain-setup-tab-${t}`} tabIndex={part === t ? 0 : -1} className="brain-tab" onClick={() => setPart(t)}>{t === 'bzns' ? <BznsWord /> : b.t('tabCatalog')}</button>)}
          </div>
          <div role="tabpanel" id="brain-setup-panel" aria-labelledby={`brain-setup-tab-${part}`} className="brain-panel">
            {part === 'catalog' ? <CatalogTab b={b} catalog={catalog} request={request} take={take} act={act} busy={busy} loadCatalog={loadCatalog} />
              : <BznsTab b={b} lang={lang} setup={setup} request={request} take={take} act={act} busy={busy} />}
          </div>
        </div>
      </>}

      {id === 'behaviour' && <BehaviourCard b={b} lang={lang} brain={brain} request={request} take={take} act={act} busy={busy} next={nextCue} open />}

      {id === 'publish' && <div className="brain-setup-publish">
        <button type="button" className="ld-button" onClick={() => setTesting(true)}>{b.t('testLayla')}</button>
        <button type="button" className="ld-button ld-primary" disabled={!!busy} onClick={publish}>{busy === 'publish' ? b.t('publishing') : b.t('publish')}{forward}</button>
      </div>}

      <div className="brain-setup-nav">
        {step > 0 && <button type="button" className="ld-button ld-quiet" disabled={!!busy} onClick={() => go(step - 1)}>{b.ar ? 'رجوع' : 'Back'}</button>}
        {id !== 'publish' && <button type="button" className="ld-button ld-primary" disabled={!!busy} onClick={() => go(step + 1)}>{b.ar ? 'متابعة' : 'Continue'}{forward}</button>}
      </div>
      {testing && <TestLaylaPanel b={b} request={request} take={take} hasDraft onClose={() => setTesting(false)} />}
    </div>
  );
}
