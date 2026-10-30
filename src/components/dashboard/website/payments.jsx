import React from 'react';
import { PAYMENT_DOC_SLOTS, PAYMENT_STAGES } from '../../../../config/website-brief.js';
import { paymobFormUrl } from '../../../lib/dashboard/website-brief';
import { captureWizardEvent } from '../../../lib/posthog';
import { Icon } from '../../ui/Icon';
import { W, DOC_SLOTS, OPTIONS, ERRORS } from './copy';
import { Text } from './fields';

const REQUIRED = PAYMENT_DOC_SLOTS.filter(slot => slot.min > 0);
const size = bytes => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * Online payments through Paymob (Ahmed, 2026-10-31), optional. An owner who wants them downloads Paymob's
 * two forms, gives a personal contact and uploads the documents Paymob asks for, slot by slot. Nothing here
 * quotes fees or dates: Paymob's review sets the pace. Only anonymous funnel events reach PostHog.
 */
export function PaymentsStep({ form, docs }) {
  const { fields, set, error, tr } = form;
  const answer = value => { set('payments', value); captureWizardEvent('website_brief_payments_answer', { answer: value }); };
  const done = REQUIRED.filter(slot => docs.list.some(d => d.kind === slot.kind)).length;
  return <>
    <fieldset className={`ld-web-pay-choice${error.field === 'payments' ? ' is-invalid' : ''}`}>
      <legend>{tr(W.payments)}<em className="ld-brief-required"> · {tr(W.required)}</em></legend>
      {['yes', 'no'].map(value => (
        <label key={value} className={fields.payments === value ? 'is-chosen' : ''}>
          <input type="radio" name="payments" checked={fields.payments === value} onChange={() => answer(value)} />
          <span className="ld-web-pay-choice-title">{tr(OPTIONS.payments[value])}</span>
          <small>{tr(value === 'yes' ? W.payYesHint : W.payNoHint)}</small>
        </label>
      ))}
    </fieldset>
    {fields.payments === 'yes' && <>
      <ol className="ld-web-pay-how">
        {W.payHow.map((line, i) => <li key={i}><span className="ld-num" aria-hidden="true">{i + 1}</span>{tr(line)}</li>)}
      </ol>
      <p className="ld-help">{tr(W.payIntro)}</p>

      <section className="ld-web-pay-part" aria-labelledby="ld-web-pay-forms">
        <h3 id="ld-web-pay-forms">{tr(W.payForms)}</h3>
        <div className="ld-web-pay-forms">
          {[['application', W.formApplication], ['vat', W.formVat]].map(([id, label]) => (
            <a key={id} className="ld-web-pay-form" href={paymobFormUrl(id)} download onClick={() => captureWizardEvent('website_brief_form_downloaded', { form: id })}>
              <Icon name="file" size={22} />
              <span><strong>{tr(label)}</strong><small>{tr(W.formHint)}</small></span>
              <Icon name="download" size={18} />
            </a>
          ))}
        </div>
      </section>

      <section className="ld-web-pay-part" aria-labelledby="ld-web-pay-contact">
        <h3 id="ld-web-pay-contact">{tr(W.payContact)}</h3>
        <p className="ld-help">{tr(W.payContactHint)}</p>
        <div className="ld-web-pair">
          <Text form={form} k="payContactName" required />
          <Text form={form} k="payContactPhone" required type="tel" dir="ltr" />
        </div>
      </section>

      <section className="ld-web-pay-part" aria-labelledby="ld-web-pay-docs">
        <h3 id="ld-web-pay-docs">{tr(W.payDocs)}</h3>
        <p className={`ld-web-pay-progress ld-num${done === REQUIRED.length ? ' is-complete' : ''}`} role="status">
          {done === REQUIRED.length ? <Icon name="check" size={16} /> : null}
          {tr(W.docsProgress).replace('{n}', done).replace('{total}', REQUIRED.length)}
        </p>
        <div className="ld-web-docs">
          {PAYMENT_DOC_SLOTS.map(slot => <DocSlot key={slot.kind} slot={slot} docs={docs} invalid={error.field === slot.kind} reason={error.field === slot.kind ? error.reason : ''} tr={tr} />)}
        </div>
      </section>
    </>}
  </>;
}

/** One document Paymob asks for: what it is, whether it's needed, the files added, and a button to add more. */
function DocSlot({ slot, docs, invalid, reason, tr }) {
  const [label, hint] = DOC_SLOTS[slot.kind];
  const mine = docs.list.filter(d => d.kind === slot.kind);
  const full = mine.length >= slot.max;
  const added = mine.length >= Math.max(1, slot.min);
  const uploading = docs.busy === `upload:${slot.kind}`;
  const id = `ld-web-doc-${slot.kind}`;
  return (
    <div className={`ld-web-doc${invalid ? ' is-invalid' : added ? ' is-added' : ''}`} role="group" aria-labelledby={`${id}-label`}>
      <div className="ld-web-doc-head">
        <span id={`${id}-label`} className="ld-web-doc-label">{tr(label)}</span>
        {added ? <span className="ld-web-doc-tag is-added"><Icon name="check" size={14} />{tr(W.added)}</span>
          : <span className={`ld-web-doc-tag${slot.min ? '' : ' is-optional'}`}>{tr(slot.min ? W.required : W.optional)}</span>}
      </div>
      <small className="ld-help">{tr(hint)}</small>
      {mine.length > 0 && <ul className="ld-web-doc-files">
        {mine.map(d => <li key={d.id}>
          <Icon name="file" size={16} />
          <bdi dir="auto" className="ld-web-doc-name">{d.name || tr(label)}</bdi>
          {d.size ? <span className="ld-web-doc-size ld-num">{size(d.size)}</span> : null}
          <button type="button" className="ld-button ld-web-doc-remove" onClick={() => docs.remove(d.id)} aria-label={`${tr(W.remove)}: ${d.name || tr(label)}`}>{tr(W.remove)}</button>
        </li>)}
      </ul>}
      {invalid && reason && reason !== 'brief_required' && <p className="ld-inline-error" role="alert">{tr(ERRORS[reason] || ERRORS.invalid_file)}</p>}
      {!full && <label className={`ld-button ld-web-doc-add${docs.busy ? ' is-disabled' : ''}`}>
        <Icon name={uploading ? 'upload' : 'plus'} size={16} />
        <span>{uploading ? tr(W.uploading) : tr(mine.length ? W.addAnother : W.addFile)}</span>
        <input className="ld-visually-hidden" type="file" accept="application/pdf,image/jpeg,image/png" multiple={slot.max > 1} disabled={!!docs.busy}
          aria-describedby={`${id}-label`} aria-invalid={invalid || undefined}
          onChange={e => { docs.upload(slot.kind, [...e.target.files].slice(0, slot.max - mine.length)); e.target.value = ''; }} />
      </label>}
    </div>
  );
}

/** What the owner sees of the payments set-up: five stages with their dates, and no due date. */
export function PaymentsTrack({ payments, tr, date }) {
  const at = PAYMENT_STAGES.indexOf(payments.stage);
  return (
    <section className="ld-web-pay-track" aria-labelledby="ld-web-pay-track-title">
      <h3 id="ld-web-pay-track-title">{tr(W.payTrackTitle)}</h3>
      {payments.stage !== 'live' && <p className="ld-help">{tr(W.payTrackNote)}</p>}
      <ol className="ld-web-stages">
        {PAYMENT_STAGES.map((stage, i) => {
          const state = i <= at ? 'is-done' : i === at + 1 ? 'is-current' : '';
          return (
            <li key={stage} className={state} aria-current={state === 'is-current' ? 'step' : undefined}>
              <span className="ld-web-stage-name">{tr(W.payStage[stage])}</span>
              {payments.stageAt?.[stage] && <span className="ld-web-stage-at ld-num">{date(payments.stageAt[stage], false)}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
