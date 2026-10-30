import React from 'react';
import { PAYMENT_DOC_SLOTS, PAYMENT_STAGES } from '../../../../config/website-brief.js';
import { paymobFormUrl } from '../../../lib/dashboard/website-brief';
import { W, DOC_SLOTS } from './copy';
import { Choice, Text } from './fields';

/**
 * Online payments through Paymob (Ahmed, 2026-10-31), optional. An owner who wants them downloads Paymob's
 * two forms, gives a personal contact and uploads the documents Paymob asks for, slot by slot. Nothing here
 * quotes fees or dates: Paymob's review sets the pace.
 */
export function PaymentsStep({ form, docs }) {
  const { fields, error, tr } = form;
  return <>
    <Choice form={form} k="payments" required />
    {fields.payments === 'yes' && <>
      <p className="ld-help">{tr(W.payIntro)}</p>
      <section className="ld-web-pay-part" aria-labelledby="ld-web-pay-forms">
        <h3 id="ld-web-pay-forms">{tr(W.payForms)}</h3>
        <p className="ld-web-pay-forms">
          <a className="ld-button" href={paymobFormUrl('application')} download>{tr(W.formApplication)}</a>
          <a className="ld-button" href={paymobFormUrl('vat')} download>{tr(W.formVat)}</a>
        </p>
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
        {PAYMENT_DOC_SLOTS.map(slot => <DocSlot key={slot.kind} slot={slot} docs={docs} invalid={error.field === slot.kind} tr={tr} />)}
        {docs.busy === 'upload' && <p role="status">{tr(W.uploading)}</p>}
      </section>
    </>}
  </>;
}

function DocSlot({ slot, docs, invalid, tr }) {
  const [label, hint] = DOC_SLOTS[slot.kind];
  const mine = docs.list.filter(d => d.kind === slot.kind);
  const full = mine.length >= slot.max;
  return (
    <div className={`ld-web-doc${invalid ? ' is-invalid' : ''}`}>
      <label className="ld-field">
        <span>{tr(label)}<em className="ld-brief-required"> · {tr(slot.min ? W.required : W.optional)}</em></span>
        <small className="ld-help">{tr(hint)}</small>
        <input type="file" accept="application/pdf,image/jpeg,image/png" multiple={slot.max > 1} disabled={!!docs.busy || full} aria-invalid={invalid || undefined}
          onChange={e => { docs.upload(slot.kind, [...e.target.files].slice(0, slot.max - mine.length)); e.target.value = ''; }} />
      </label>
      {mine.length > 0 && <ul className="ld-web-doc-files">
        {mine.map(d => <li key={d.id}><bdi dir="auto">{d.name || tr(label)}</bdi>
          <button type="button" className="ld-button" onClick={() => docs.remove(d.id)} aria-label={`${tr(W.remove)}: ${d.name || tr(label)}`}>{tr(W.remove)}</button></li>)}
      </ul>}
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
