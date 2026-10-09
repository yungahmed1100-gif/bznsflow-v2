import React, { useEffect, useState } from 'react';
import { dashboard } from '../../lib/dashboard/api';
import { IMPORT_PAGE } from '../../lib/dashboard/import';
import { defaultRules, rowFromContact, rowMissing, MAX_BROADCAST } from '../../lib/dashboard/broadcast';
import { RecipientsStep, consentReady, consentRecord } from './RecipientsStep';
import { SendStep } from './SendStep';
import { TemplateBody } from './TemplateBody';

const STEPS = ['template', 'recipients', 'send'];
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Three steps: template → numbers (typed, uploaded or saved, each with its own variable
 * values) → send. `single` pre-fills one chat contact; `tab` opens step 2 on a given tab.
 */
export function CampaignWizard({ s, overview, templates: given, single, tab = 'manual', onDone, onTimezone }) {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState(given || null);
  const [templateId, setTemplateId] = useState('');
  const [rules, setRules] = useState([]);
  const [rows, setRows] = useState(() => single ? [rowFromContact(single)] : []);
  const [headers, setHeaders] = useState([]);
  const [consent, setConsent] = useState({ how: '', other: '', date: today(), attested: false });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [created, setCreated] = useState(null);
  useEffect(() => { if (!templates) dashboard('templates').then(r => setTemplates(r.templates)).catch(e => setError(s.reason(e.reason))); }, []);
  const template = templates?.find(t => t.id === templateId);
  const current = STEPS[step];

  const chooseTemplate = id => {
    const t = templates.find(x => x.id === id);
    setTemplateId(id);
    setRules(defaultRules(t, headers, rows.map(r => r.cells || [])));
  };
  const unsaved = rows.filter(r => !r.contactId);
  const incomplete = rows.filter(r => rowMissing(r, rules).length).length;
  const canContinue = current === 'template' ? !!template?.sendable
    : rows.length > 0 && rows.length <= MAX_BROADCAST && !incomplete && (!unsaved.length || consentReady(consent));

  // New numbers become contacts with the owner's consent record before anything is previewed.
  const saveNumbers = async () => {
    setBusy(true); setError('');
    // One consent record per save; numbers added after going back get their own.
    const importId = crypto.randomUUID();
    try {
      const ids = new Map();
      for (let i = 0; i < unsaved.length; i += IMPORT_PAGE) {
        const page = unsaved.slice(i, i + IMPORT_PAGE).map(({ waId, countryIso, name }) => ({ waId, ...(countryIso ? { countryIso } : {}), ...(name ? { name } : {}) }));
        const origin = unsaved.slice(i, i + IMPORT_PAGE).some(r => r.origin === 'import') ? 'import' : 'manual';
        const r = await dashboard('import_contacts', { requestId: importId, origin, requireConsent: true, rows: page, consent: consentRecord(consent, template, s) }, { timeout: 60000 });
        for (const c of r.contacts) ids.set(c.number, c.id);
      }
      setRows(list => list.map(r => r.contactId ? r : { ...r, contactId: ids.get(r.waId) }).filter(r => r.contactId));
      setStep(2);
    } catch (e) { setError(s.reason(e.reason)); }
    finally { setBusy(false); }
  };
  const next = () => current === 'recipients' && unsaved.length ? saveNumbers() : setStep(step + 1);

  if (created) return <div className="ld-wizard"><p role="status">{s.t('broadcastCreated')}</p><button type="button" className="ld-button ld-primary" onClick={onDone}>{s.t('close')}</button></div>;

  return (
    <div className="ld-wizard">
      <ol className="ld-steps">{STEPS.map((id, i) => <li key={id} aria-current={i === step ? 'step' : undefined}><span className="ld-num">{i + 1}</span>{s.t(`step_${id}`)}</li>)}</ol>
      {!templates ? <p role="status">{s.t('loading')}</p> : (
        <div className="ld-step">
          {current === 'template' && (
            <fieldset className="ld-fieldset"><legend>{s.t('chooseTemplate')}</legend>
              {!templates.length && <p>{s.t('noTemplates')}</p>}
              {templates.map(t => (
                <label key={t.id} className={`ld-choice ${t.sendable ? '' : 'is-disabled'}`}>
                  <input type="radio" name="template" value={t.id} disabled={!t.sendable} checked={templateId === t.id} onChange={() => chooseTemplate(t.id)} />
                  <span><strong dir="ltr">{t.name}</strong> <span className="ld-chip">{t.language}</span>{!t.sendable && <span className="ld-chip is-muted">{s.t(`unsupported_${t.unsupportedReason}`)}</span>}<TemplateBody template={t} /></span>
                </label>
              ))}
            </fieldset>
          )}
          {current === 'recipients' && template && (
            <RecipientsStep s={s} overview={overview} template={template} single={single} initialTab={tab}
              rows={rows} setRows={setRows} rules={rules} setRules={setRules} headers={headers} setHeaders={setHeaders}
              consent={consent} setConsent={setConsent} needsConsent={unsaved.length > 0} incomplete={incomplete} />
          )}
          {current === 'send' && template && (
            <SendStep s={s} overview={overview} template={template} rules={rules} rows={rows} single={single}
              onTimezone={onTimezone} onCreated={setCreated} onBack={() => setStep(1)} />
          )}
        </div>
      )}
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      {current !== 'send' && (
        <div className="ld-actions ld-wizard-nav">
          {step > 0 && <button type="button" className="ld-button ld-quiet" onClick={() => setStep(step - 1)}>{s.t('previous')}</button>}
          <button type="button" className="ld-button ld-primary" disabled={!canContinue || busy} onClick={next}>{busy ? s.t('savingNumbers') : s.t('next')}</button>
        </div>
      )}
    </div>
  );
}
