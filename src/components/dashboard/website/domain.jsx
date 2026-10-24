import React, { useState } from 'react';
import { domainCandidates, websiteDomain } from '../../../../config/website-brief.js';
import { briefAction } from '../../../lib/dashboard/website-brief';
import { W, ERRORS } from './copy';
import { Text } from './fields';

/**
 * The domain BznsFlow registers and the mailbox on it. Names are looked up live (free, not premium, within
 * the price Ascend covers); if the lookup is down the owner can still give the exact name they want.
 */
export function DomainStep({ form, csrf }) {
  const { fields, set, setMany, error, tr } = form;
  const [query, setQuery] = useState(() => fields.domainChoice || fields.nameEn || '');
  const [results, setResults] = useState(null);
  const [state, setState] = useState('idle');
  const chosen = fields.domainChoice || '';
  const backups = fields.domainAlternates || [];

  const check = async event => {
    event?.preventDefault();
    if (!domainCandidates(query).length) { setResults([]); setState('nolatin'); return; }
    setState('checking');
    try {
      const { results: found } = await briefAction(csrf, 'domain_check', { query });
      setResults(found); setState(found.some(r => r.status === 'unknown') ? 'down' : 'idle');
    } catch (e) { setResults(null); setState(e.reason === 'too_many' ? 'too_many' : 'down'); }
  };
  const choose = domain => setMany({ domainChoice: domain, domainAlternates: backups.filter(d => d !== domain) });
  const backup = domain => set('domainAlternates', [...backups.filter(d => d !== domain), domain].slice(0, 2));
  const typed = String(query).trim().toLowerCase();

  return <>
    <p className="ld-help">{tr(W.domainIntro)}</p>
    <div className={`ld-web-domain${error.field === 'domainChoice' ? ' is-invalid' : ''}`}>
      <label className="ld-field" htmlFor="ld-web-domain-q"><span>{tr(W.domainSearch)}<em className="ld-brief-required"> · {tr(W.required)}</em></span></label>
      <div className="ld-web-domain-row">
        <input id="ld-web-domain-q" dir="ltr" value={query} placeholder="mybusiness" aria-describedby="ld-web-domain-hint"
          onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') check(e); }} />
        <button type="button" className="ld-button" disabled={state === 'checking'} onClick={check}>{state === 'checking' ? tr(W.checking) : tr(W.check)}</button>
      </div>
      <small id="ld-web-domain-hint" className="ld-help">{tr(W.domainHint)}</small>
      {state === 'nolatin' && <p className="ld-inline-error" role="alert">{tr(W.noLatin)}</p>}
      {state === 'too_many' && <p className="ld-inline-error" role="alert">{tr(ERRORS.too_many)}</p>}
      {state === 'down' && <p className="ld-help" role="status">{tr(W.checkDown)}{' '}
        {websiteDomain(typed) && typed !== chosen && <button type="button" className="ld-button" onClick={() => choose(typed)}>{tr(W.useTyped)}: <bdi dir="ltr">{typed}</bdi></button>}</p>}
      {results?.length > 0 && <ul className="ld-web-domain-results" aria-live="polite">
        {results.map(({ domain, status }) => (
          <li key={domain} className={`is-${status}`}>
            <bdi dir="ltr" className="ld-web-domain-name">{domain}</bdi>
            <span className="ld-web-domain-status">{tr(W[status] || W.unknown)}</span>
            {status === 'available' && domain !== chosen && <span className="ld-web-domain-actions">
              <button type="button" className="ld-button ld-primary" onClick={() => choose(domain)}>{tr(W.choose)}</button>
              {chosen && !backups.includes(domain) && backups.length < 2 && <button type="button" className="ld-button" onClick={() => backup(domain)}>{tr(W.backup)}</button>}
            </span>}
          </li>
        ))}
      </ul>}
      {chosen && <p className="ld-web-domain-chosen" role="status"><span>{tr(W.chosen)}</span> <bdi dir="ltr">{chosen}</bdi></p>}
      {backups.length > 0 && <p className="ld-help">{tr(W.backups)}: {backups.map((d, i) => <React.Fragment key={d}>{i > 0 && ', '}<bdi dir="ltr">{d}</bdi>{' '}
        <button type="button" className="ld-link" onClick={() => set('domainAlternates', backups.filter(x => x !== d))} aria-label={`${tr(W.remove)} ${d}`}>{tr(W.remove)}</button></React.Fragment>)}</p>}
    </div>

    <div className={`ld-field ld-web-mailbox${error.field === 'mailboxLocal' ? ' is-invalid' : ''}`}>
      <label htmlFor="ld-web-mailbox"><span>{tr(W.mailbox)}<em className="ld-brief-required"> · {tr(W.required)}</em></span></label>
      <div className="ld-web-mailbox-row" dir="ltr">
        <input id="ld-web-mailbox" value={fields.mailboxLocal || ''} onChange={e => set('mailboxLocal', e.target.value.toLowerCase().replace(/\s+/g, ''))} aria-invalid={error.field === 'mailboxLocal' || undefined} aria-describedby="ld-web-mailbox-hint" />
        <span>@{chosen || 'your-domain.com'}</span>
      </div>
      <small id="ld-web-mailbox-hint" className="ld-help">{tr(W.mailboxHint)}</small>
    </div>
    <Text form={form} k="recoveryEmail" type="email" dir="ltr" required />
  </>;
}
