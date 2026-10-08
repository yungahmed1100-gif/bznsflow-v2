import React, { useMemo, useRef, useState } from 'react';
import { parseBzns, setMeta, validateBzns } from '../../lib/bzns-doc.js';
import { bznsMessages } from '../../lib/bzns-messages.js';
import { BUSINESS_INDUSTRIES } from '../../lib/industries.js';
import { brainStrings } from '../../lib/brain/strings.js';
import { useBrain } from './useBrain.js';
import { BznsWord } from './BznsWord.jsx';
import { BznsTab } from './BznsTab.jsx';
import { CatalogTab } from './CatalogTab.jsx';
import { AddSource } from './AddSource.jsx';
import { ReviewCard } from './ReviewCard.jsx';
import { BehaviourCard } from './BehaviourCard.jsx';
import { TestLaylaPanel } from './TestLaylaPanel.jsx';
import '../../styles/brain.css';

const TABS = ['bzns', 'catalog'];

/** Which setup steps are done, from what is saved (connections included), never from the browser alone. */
export function brainSteps({ setup, brain, catalog, channel, active, tested }) {
  const markdown = setup?.bzns?.markdown || '';
  const sector = parseBzns(markdown).meta.sector || setup?.profile?.sector || '';
  return [
    ['industry', BUSINESS_INDUSTRIES.some(r => r.id === sector || r.en === sector || r.ar === sector)],
    ['information', !!markdown.trim() || !!catalog?.entries?.length],
    ['review', !!brain && !brain.total && (!!markdown.trim() || !!catalog?.entries?.length)],
    ['behaviour', !!brain?.behaviour && !brain.behaviour.legacy],
    ['test', !!tested || !!setup?.lastPreview],
    ['channel', !!channel],
    ['active', !!active],
  ].map(([id, done]) => ({ id, done }));
}

/**
 * Settings › BznsBrain: one page for everything Layla knows and does. Two data-entry tabs (bzns.md
 * and the Catalog), Layla's behaviour, the review queue, Test Layla, and one Publish. Setup reuses it.
 * @param {{ lang: 'en'|'ar', part?: string, onPart?: (part: string) => void, channel?: boolean, active?: boolean, onGo?: (tab: string, extra?: object) => void, mode?: 'settings'|'setup' }} props
 */
export function BrainPage({ lang, part = 'bzns', onPart, channel = false, active = false, onGo, mode = 'settings' }) {
  const b = useMemo(() => brainStrings(lang), [lang]);
  const brainData = useBrain();
  const { setup, brain, catalog, error, busy, loadError, request, take, load, loadCatalog, act } = brainData;
  const [testing, setTesting] = useState(false), [tested, setTested] = useState(false), [published, setPublished] = useState(''), [problems, setProblems] = useState([]);
  const tabRefs = useRef({});
  if (loadError) return <div className="ld-state" role="alert"><p>{b.reason(loadError)}</p><button type="button" className="ld-button" onClick={load}>{b.t('retry')}</button></div>;
  if (!setup || !brain) return <p className="ld-state" role="status">{b.t('loading')}</p>;
  const markdown = setup.bzns?.markdown || '';
  const industry = parseBzns(markdown).meta.sector || brain.sectorId || '';
  const catalogChanges = (catalog?.entries || []).some(e => e.state && e.state !== 'published' && e.source !== 'hasib_stock');
  const bznsChanges = !!setup.bzns?.unpublishedChanges || (!setup.bzns?.publishedRevision && !!markdown.trim());
  const status = !setup.bzns?.publishedRevision ? 'statusNew' : bznsChanges || catalogChanges ? 'statusChanges' : 'statusLive';
  const steps = brainSteps({ setup, brain, catalog, channel, active, tested });
  const done = steps.filter(s => s.done).length;
  const select = next => { onPart?.(next); requestAnimationFrame(() => tabRefs.current[next]?.focus()); };
  const onTabKey = e => {
    const i = TABS.indexOf(part);
    const dir = { ArrowRight: lang === 'ar' ? -1 : 1, ArrowLeft: lang === 'ar' ? 1 : -1 }[e.key];
    if (dir) { e.preventDefault(); select(TABS[(i + dir + TABS.length) % TABS.length]); }
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); select(TABS[e.key === 'Home' ? 0 : TABS.length - 1]); }
  };
  const publish = () => act('publish', async () => {
    setPublished(''); setProblems([]);
    if (bznsChanges) {
      const check = validateBzns(markdown);
      if (!check.ok) { setProblems(bznsMessages(check.errors, lang)); select('bzns'); return; }
    }
    take(await request({ action: 'brain_publish' }));
    await loadCatalog();
    setPublished(b.t('published'));
  });
  const changeIndustry = id => act('industry', async () => {
    if (!id) return;
    take(await request({ action: 'bzns_save', markdown: setMeta(markdown || '---\n---\n', 'sector', id), version: setup.bzns?.version || 0 }));
  });
  const STEP_GO = { industry: () => document.querySelector('.brain-behaviour')?.setAttribute('open', ''), information: () => document.querySelector('.brain-add')?.setAttribute('open', ''),
    review: () => document.querySelector('.brain-review')?.scrollIntoView({ block: 'start' }), behaviour: () => document.querySelector('.brain-behaviour')?.setAttribute('open', ''),
    test: () => setTesting(true), channel: () => onGo?.('settings', { view: 'channels' }), active: () => onGo?.('settings', { view: 'channels' }) };
  return (
    <div className="brain" dir={b.ar ? 'rtl' : 'ltr'} lang={lang}>
      <header className="brain-head">
        <div>
          <h1 className="brain-title">{b.t('title')}</h1>
          <p className="ld-help">{b.t('intro')}</p>
        </div>
        <div className="brain-head-actions">
          <span className={`ld-chip ${status === 'statusLive' ? 'is-green' : 'is-yellow'}`} role="status">{b.t(status)}</span>
          <button type="button" className="ld-button" onClick={() => setTesting(true)}>{b.t('testLayla')}</button>
          <button type="button" className="ld-button ld-primary" disabled={!!busy || !(bznsChanges || catalogChanges)} onClick={publish}>{busy === 'publish' ? b.t('publishing') : b.t('publish')}</button>
        </div>
      </header>
      {published && <p className="brain-note" role="status">{published}</p>}
      {(problems.length > 0 || error) && <div className="brain-problems" role="alert">{problems.length ? <><p>{b.t('beforePublish')}</p><ul>{problems.map((line, i) => <li key={i}>{line}</li>)}</ul></> : <p>{b.reason(error)}</p>}</div>}
      {done < steps.length && <details className="brain-card brain-steps" open={mode === 'setup' || undefined}>
        <summary><span className="brain-card-title">{b.t('stepsTitle')}</span><span className="ld-help">{b.t('stepsDone', { done, total: steps.length })}</span></summary>
        <ol className="brain-step-list">{steps.map(step => <li key={step.id} data-done={step.done}>
          <span aria-hidden="true">{step.done ? '✓' : '○'}</span> {b.t(`step_${step.id}`)}<span className="ld-visually-hidden"> — {b.t(step.done ? 'added' : 'missing')}</span>
          {!step.done && <button type="button" className="ld-button ld-quiet brain-step-go" onClick={STEP_GO[step.id]}>{b.t('open')}</button>}
        </li>)}</ol>
      </details>}
      {brain.total > 0 && <ReviewCard b={b} lang={lang} brain={brain} request={request} take={take} act={act} busy={busy} onAccepted={p => (p.kind === 'catalog_entry' ? loadCatalog() : null)} open />}
      <div className="brain-tabs">
        <div role="tablist" aria-label={b.t('tabsLabel')} className="brain-tablist" onKeyDown={onTabKey}>
          {TABS.map(id => <button key={id} ref={el => { tabRefs.current[id] = el; }} type="button" role="tab" id={`brain-tab-${id}`} aria-controls={`brain-panel-${id}`} aria-selected={part === id} tabIndex={part === id ? 0 : -1}
            className="brain-tab" onClick={() => select(id)}>{id === 'bzns' ? <BznsWord /> : b.t('tabCatalog')}</button>)}
        </div>
        <div role="tabpanel" id={`brain-panel-${part}`} aria-labelledby={`brain-tab-${part}`} className="brain-panel" tabIndex={0}>
          {part === 'catalog' ? <CatalogTab b={b} catalog={catalog} request={request} take={take} act={act} busy={busy} loadCatalog={loadCatalog} />
            : <BznsTab b={b} lang={lang} setup={setup} request={request} take={take} act={act} busy={busy} industry={industry} />}
        </div>
      </div>
      <AddSource b={b} request={request} take={take} act={act} busy={busy} websiteAvailable={!!setup.websiteImportAvailable} onDone={() => loadCatalog()} />
      <BehaviourCard b={b} lang={lang} brain={brain} request={request} take={take} act={act} busy={busy} industry={industry} onIndustry={changeIndustry} />
      {testing && <TestLaylaPanel b={b} request={request} take={take} hasDraft={bznsChanges || catalogChanges} onClose={() => setTesting(false)} onTested={() => setTested(true)} />}
    </div>
  );
}
