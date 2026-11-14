import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { prepareForPublish, validateBzns } from '../../lib/bzns-doc.js';
import { bznsMessages, serverBznsProblems } from '../../lib/bzns-messages.js';
import { brainTemplate } from '../../../config/bzns-templates.js';
import { Icon } from '../ui/Icon.jsx';
import { brainStrings } from '../../lib/brain/strings.js';
import { useBrain } from './useBrain.js';
import { BznsTab } from './BznsTab.jsx';
import { CatalogTab } from './CatalogTab.jsx';
import { AddSource } from './AddSource.jsx';
import { ReviewCard } from './ReviewCard.jsx';
import { TestLaylaPanel } from './TestLaylaPanel.jsx';
import { BznsWord } from './BznsWord.jsx';
import '../../styles/brain.css';

/**
 * Catalyst setup's first stage (Ahmed, 2026-11-14): only the two things Layla answers from, bzns.md
 * and the Catalog, on one screen, then Publish. Nothing else is asked here: her style, the details
 * she asks customers for and her team rules have working defaults and live in Settings › BznsBrain.
 * Catalyst is the same for every business: no industry step, one general starter.
 */
export function BrainSetup({ lang, onPublished }) {
  const b = useMemo(() => brainStrings(lang), [lang]);
  const { setup, brain, catalog, error, busy, loadError, request, take, load, loadCatalog, act } = useBrain();
  const [testing, setTesting] = useState(false),
    [problems, setProblems] = useState([]),
    [part, setPart] = useState('bzns');
  const started = useRef(false),
    unsaved = useRef(null);
  const hearEdit = useCallback(text => {
    unsaved.current = text;
  }, []);
  const markdown = setup?.bzns?.markdown || '';
  // A new setup starts from the general template; the sign-up industry is only recorded on its sector line.
  useEffect(() => {
    if (!setup || started.current || markdown.trim()) return;
    started.current = true;
    act('template', async () =>
      take(
        await request({
          action: 'bzns_save',
          markdown: brainTemplate(setup.account?.industry, lang, { general: true }),
          version: setup.bzns?.version || 0,
        }),
      ),
    );
  }, [setup, markdown]);
  if (loadError)
    return (
      <div className="ld-state" role="alert">
        <p>{b.reason(loadError)}</p>
        <button type="button" className="ld-button" onClick={load}>
          {b.t('retry')}
        </button>
      </div>
    );
  if (!setup || !brain)
    return (
      <p className="ld-state" role="status">
        {b.t('loading')}
      </p>
    );
  const publish = () =>
    act('publish', async () => {
      // What the owner typed and has not saved is saved first: Publish never ships an older text.
      let document = markdown;
      if (unsaved.current !== null && unsaved.current !== markdown) {
        document = unsaved.current;
        take(await request({ action: 'bzns_save', markdown: document, version: setup.bzns?.version || 0 }));
      }
      // Unreplaced template hints are left out at publish, so only what a customer needs can block.
      const check = validateBzns(prepareForPublish(document).markdown);
      if (!check.ok) {
        setProblems(bznsMessages(check.errors, lang));
        setPart('bzns');
        return;
      }
      let result;
      try {
        result = await request({ action: 'brain_publish' });
      } catch (e) {
        const server = serverBznsProblems(e);
        if (!server) throw e;
        setProblems(bznsMessages(server, lang));
        setPart('bzns');
        return;
      }
      setProblems([]);
      take(result);
      await onPublished?.();
    });
  return (
    <div className="brain brain-setup" dir={b.ar ? 'rtl' : 'ltr'} lang={lang}>
      <header className="brain-setup-head">
        <h3>{b.ar ? 'جهّز ما تجيب منه ليلى' : 'Give Layla what she answers from'}</h3>
        <p className="ld-help">
          {b.ar
            ? 'شيئان فقط: ملف bzns.md عن نشاطك، والكتالوج بخدماتك وأسعارك. ثم انشر.'
            : 'Two things only: bzns.md about your business, and the Catalog with your services and prices. Then publish.'}
        </p>
      </header>
      {(error || problems.length > 0) && (
        <div className="brain-problems" role="alert">
          {problems.length ? (
            <>
              <p>{b.t('beforePublish')}</p>
              <ul>
                {problems.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>{b.reason(error)}</p>
          )}
        </div>
      )}
      <AddSource
        b={b}
        request={request}
        take={take}
        act={act}
        busy={busy}
        websiteAvailable={!!setup.websiteImportAvailable}
        onDone={() => loadCatalog()}
        open
      />
      {brain.total > 0 && (
        <ReviewCard
          b={b}
          lang={lang}
          brain={brain}
          request={request}
          take={take}
          act={act}
          busy={busy}
          onAccepted={p => (p.kind === 'catalog_entry' ? loadCatalog() : null)}
          open
        />
      )}
      <div className="brain-tabs">
        <div role="tablist" aria-label={b.t('tabsLabel')} className="brain-tablist">
          {['bzns', 'catalog'].map(t => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={part === t}
              aria-controls="brain-setup-panel"
              id={`brain-setup-tab-${t}`}
              tabIndex={part === t ? 0 : -1}
              className="brain-tab"
              onClick={() => setPart(t)}
            >
              {t === 'bzns' ? <BznsWord /> : b.t('tabCatalog')}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="brain-setup-panel" aria-labelledby={`brain-setup-tab-${part}`} className="brain-panel">
          {/* Both stay mounted: switching tabs never drops text the owner has not saved. */}
          <div hidden={part !== 'bzns'}>
            <BznsTab
              b={b}
              lang={lang}
              setup={setup}
              request={request}
              take={take}
              act={act}
              busy={busy}
              onEdit={hearEdit}
            />
          </div>
          <div hidden={part !== 'catalog'}>
            <CatalogTab
              b={b}
              catalog={catalog}
              request={request}
              take={take}
              act={act}
              busy={busy}
              loadCatalog={loadCatalog}
            />
          </div>
        </div>
      </div>
      <div className="brain-setup-publish">
        <button type="button" className="ld-button" onClick={() => setTesting(true)}>
          {b.t('testLayla')}
        </button>
        <button type="button" className="ld-button ld-primary" disabled={!!busy} onClick={publish}>
          {busy === 'publish' ? b.t('publishing') : b.t('publish')}
          <Icon name="arrow-right" size={14} className="brain-flip" />
        </button>
      </div>
      {testing && <TestLaylaPanel b={b} request={request} take={take} hasDraft onClose={() => setTesting(false)} />}
    </div>
  );
}
