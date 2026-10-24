import React, { useRef, useState } from 'react';
import { BRIEF_MAX_PHOTOS, normalizeBrief, websiteDomain } from '../../../../config/website-brief.js';
import { briefAction, uploadBriefFile } from '../../../lib/dashboard/website-brief';
import { W, ERRORS } from './copy';
import { BusinessStep, ContactStep, LookStep, SiteStep, ReviewStep } from './steps';
import { DomainStep } from './domain';

const LOCAL_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

// Each step's answers (for the review) and what it cannot be left without.
const STEPS = [
  { step: 'business', keys: ['nameEn', 'nameAr', 'about', 'services'], missing: (f) => (!f.nameEn?.trim() && !f.nameAr?.trim() ? 'nameEn' : '') },
  { step: 'contact', keys: ['phone', 'email', 'address', 'mapUrl', 'hours', 'instagram', 'facebook', 'tiktok', 'otherSocial'], missing: f => (!f.phone?.trim() ? 'phone' : '') },
  { step: 'look', keys: ['colors', 'style', 'fontNotes', 'references'], missing: (f, files) => (!files.logo && !f.designLogo ? 'logo' : '') },
  { step: 'site', keys: ['pages', 'languages', 'notes'], missing: f => (!f.languages ? 'languages' : '') },
  { step: 'domain', keys: ['domainChoice', 'domainAlternates', 'mailboxLocal', 'recoveryEmail'],
    missing: f => (!websiteDomain(f.domainChoice || '') ? 'domainChoice' : !LOCAL_RE.test(f.mailboxLocal || '') ? 'mailboxLocal' : !EMAIL_RE.test(f.recoveryEmail || '') ? 'recoveryEmail' : '') },
  { step: 'review', keys: [], missing: () => '' },
];

/**
 * The website brief, one step at a time. Next saves the answers so far as a draft, so the owner can
 * leave and come back on any device; the last step sends everything to BznsFlow and starts the tracker.
 */
export function WebsiteWizard({ s, brief, csrf, onSent }) {
  const tr = pair => pair[s.ar ? 1 : 0];
  const [fields, setFields] = useState(brief.fields || {});
  const [prefilled, setPrefilled] = useState(brief.prefilled || []);
  const [logo, setLogo] = useState(brief.logo);
  const [photos, setPhotos] = useState(brief.photos || []);
  const [step, setStep] = useState(() => Math.min(brief.draft?.step ?? 0, STEPS.length - 1));
  const [busy, setBusy] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState({ reason: '', field: '' });
  const heading = useRef(null);

  // Editing a field ends its "from BznsBrain" note and the error it was flagged with.
  const touch = keys => {
    setPrefilled(p => p.filter(k => !keys.includes(k)));
    setError(e => (keys.includes(e.field) || (e.field === 'logo' && keys.includes('designLogo')) ? { reason: '', field: '' } : e));
  };
  const set = (key, value) => { setFields(f => ({ ...f, [key]: value })); touch([key]); setSaved(false); };
  const setMany = patch => { setFields(f => ({ ...f, ...patch })); touch(Object.keys(patch)); setSaved(false); };
  const fail = (reason, field = '') => setError({ reason, field });
  const message = reason => tr(ERRORS[reason] || ['Something went wrong. Please try again.', 'حدث خطأ. حاول مجددًا.']);
  const form = { fields, set, setMany, error, tr, prefilled };

  const upload = async (kind, picked) => {
    setBusy('upload'); fail('');
    try {
      for (const file of picked) {
        const id = await uploadBriefFile(csrf, kind, file);
        const preview = { id, url: window.URL.createObjectURL(file) };
        if (kind === 'logo') { setLogo(preview); touch(['logo']); } else setPhotos(p => [...p, preview].slice(0, BRIEF_MAX_PHOTOS));
      }
    } catch (e) { fail(e.reason); } finally { setBusy(''); }
  };
  const files = { logo, photos, busy, upload, removeLogo: () => setLogo(null), removePhoto: id => setPhotos(all => all.filter(p => p.id !== id)) };

  const go = next => { setStep(next); fail(''); requestAnimationFrame(() => heading.current?.focus()); };
  const save = async next => {
    setBusy('save');
    try { await briefAction(csrf, 'save_draft', { step: next, fields, logoId: logo?.id || null, photoIds: photos.map(p => p.id) }); setSaved(true); return true; }
    catch (e) { fail(e.reason, e.field); return false; } finally { setBusy(''); }
  };
  const forward = async () => {
    const missing = STEPS[step].missing(fields, files);
    if (missing) return fail('brief_required', missing);
    if (await save(step + 1)) go(step + 1);
  };
  const submit = async () => {
    const checked = normalizeBrief(fields);
    if (!checked.ok) {
      const at = STEPS.findIndex(x => x.keys.includes(checked.field));
      if (at >= 0) go(at);
      return fail(checked.reason, checked.field);
    }
    setBusy('send'); fail('');
    try {
      const result = await briefAction(csrf, 'submit', { version: brief.version, fields: checked.value, logoId: logo?.id || null, photoIds: photos.map(p => p.id) });
      onSent({ emailed: true, version: result.version });
    } catch (e) {
      if (e.reason === 'brief_email_failed') onSent({ emailed: false, version: brief.version + 1 });
      else fail(e.reason, e.field);
    } finally { setBusy(''); }
  };

  const current = STEPS[step];
  const body = current.step === 'business' ? <BusinessStep form={form} />
    : current.step === 'contact' ? <ContactStep form={form} />
    : current.step === 'look' ? <LookStep form={form} files={files} />
    : current.step === 'site' ? <SiteStep form={form} />
    : current.step === 'domain' ? <DomainStep form={form} csrf={csrf} />
    : <ReviewStep form={form} files={files} groups={STEPS.slice(0, -1)} onEdit={go} />;

  return (
    <div className="ld-web-wizard">
      <ol className="ld-steps ld-web-steps" aria-label={tr(W.title)}>
        {STEPS.map((x, i) => <li key={x.step} aria-current={i === step ? 'step' : undefined}><span className="ld-num">{i + 1}</span>{tr(W.steps[x.step])}</li>)}
      </ol>
      <form className="ld-brief ld-web-step" noValidate onSubmit={e => { e.preventDefault(); if (current.step === 'review') submit(); else forward(); }} aria-labelledby="ld-web-step-title">
        <p className="ld-web-step-count ld-num">{tr(W.stepOf).replace('{n}', step + 1).replace('{total}', STEPS.length)}</p>
        <h2 id="ld-web-step-title" ref={heading} tabIndex={-1}>{tr(W.steps[current.step])}</h2>
        {body}
        {error.reason && <p className="ld-inline-error" role="alert">{message(error.reason)}</p>}
        {saved && !error.reason && <p className="ld-help" role="status">{tr(W.saved)}</p>}
        <div className="ld-actions ld-wizard-nav">
          {step > 0 && <button type="button" className="ld-button" disabled={!!busy} onClick={() => go(step - 1)}>{tr(W.back)}</button>}
          <button type="submit" className="ld-button ld-primary" disabled={!!busy}>
            {busy === 'save' ? tr(W.saving) : busy === 'send' ? tr(W.sending) : current.step === 'review' ? tr(brief.version ? W.update : W.send) : tr(W.next)}
          </button>
        </div>
      </form>
    </div>
  );
}
