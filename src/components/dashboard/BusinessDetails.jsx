import React, { useCallback, useEffect, useRef, useState } from 'react';
import { callApi } from '../../lib/api-client.js';
import { explain as explainReason } from '../../lib/onboarding/explanations.js';
import { BznsEditor } from '../business/BznsEditor.jsx';
import { AddInformation } from '../business/AddInformation.jsx';
import { CatalogManager } from '../business/CatalogManager.jsx';
import '../../styles/layla-onboarding.css';

// The same customer surface onboarding saves through, so both edit one record.
const endpoint = '/api/layla-meta?surface=customer';

/**
 * Dashboard → Business: edit the facts Layla answers from, any time. Saving is
 * the owner's confirmation; Layla uses the new answers straight away, and live
 * replies stay on. `section`: 'all', 'details' (Settings when Stock exists), or
 * 'services' (Stock → Services, or Catalyst's Settings → Services & prices when `catalyst`).
 * Catalyst's Settings is also the one place its sector changes (`catalyst`).
 */
export function BusinessDetails({ s, section = 'all', onSaved, catalyst = false }) {
  const { lang, ar } = s;
  const tr = (en, arabic) => ar ? arabic : en;
  const explain = reason => explainReason(reason, lang);
  const [setup, setSetup] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const running = useRef(false);
  const csrf = setup?.csrfToken || '';
  const request = useCallback(body => callApi(endpoint, { body, csrf, timeout: 60000 }), [csrf]);
  async function act(task) {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try { await task(); } catch (e) { setError(explain(e.message)); } finally { running.current = false; setBusy(false); }
  }
  useEffect(() => {
    let live = true;
    callApi(endpoint).then(r => { if (live) setSetup(r); }).catch(e => { if (live) setError(explainReason(e.message || 'restore_failed', lang)); });
    return () => { live = false; };
  }, [lang]);

  if (!setup) return <p className="ld-state" role={error ? 'alert' : 'status'}>{error || s.t('loading')}</p>;
  return (
    <div className="layla-customer layla-embedded" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
      <div className="layla-workspace">
        {section === 'services' ? <>
          <h1>{catalyst ? s.t('view_settings_services') : tr('Services', 'الخدمات')}</h1>
          <p className="layla-stage-intro">{catalyst ? tr('What Layla offers and its prices. Add them one by one, or upload your price list.', 'ما تعرضه ليلى وأسعاره. أضفها واحدة تلو الأخرى، أو ارفع قائمة أسعارك.') : tr('The services and prices Layla offers. Your products come from Stock.', 'الخدمات والأسعار التي تعرضها ليلى. أما منتجاتك فتأتي من المخزون.')}</p>
        </> : <>
          <h1>{tr('Your business', 'نشاطك التجاري')}</h1>
          <p className="layla-stage-intro">{tr('What Layla tells your customers. Change anything here and she answers with it from the next message.', 'ما تخبر به ليلى عملاءك. غيّر أي شيء هنا وستجيب به من الرسالة التالية.')}</p>
        </>}
        {error && <p className="layla-error" role="alert">{error}</p>}
        {section !== 'services' && <BznsEditor lang={lang} data={setup} request={request} onState={next => { setSetup(next); onSaved?.(); }} disabled={busy} sectorControl={catalyst} />}
        {/* Older accounts keep their published Q&A until bzns.md replaces it. */}
        {setup.profile && section !== 'services' && !setup.bzns?.publishedRevision && <AddInformation lang={lang} request={request} />}
        {setup.profile && section !== 'details' && <section {...(section === 'all' ? { 'aria-labelledby': 'business-catalog-heading' } : { 'aria-label': tr('Services', 'الخدمات') })}>
          {section === 'all' && <h2 id="business-catalog-heading">{tr('Services, prices and imports', 'الخدمات والأسعار والاستيراد')}</h2>}
          <CatalogManager lang={lang} request={request} act={act} busy={busy} onError={setError} explain={explain}
            websiteImportAvailable={setup.websiteImportAvailable} savedToAccount={setup.savedToAccount} />
        </section>}
      </div>
    </div>
  );
}
