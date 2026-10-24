import React from 'react';
import { W, OPTIONS } from './copy';

/**
 * The form controls every step shares. `form` is { fields, set, error, tr, prefilled }: a field the
 * owner has not touched since it came from BznsBrain says so, until they change it.
 */
export function Text({ form, k, area, required, type = 'text', dir, label }) {
  const { fields, set, error, tr, prefilled } = form;
  const Tag = area ? 'textarea' : 'input';
  const invalid = error.field === k;
  return (
    <label className={`ld-field${invalid ? ' is-invalid' : ''}`}>
      <span>{label || tr(W[k])}{required && <em className="ld-brief-required"> · {tr(W.required)}</em>}</span>
      <Tag {...(area ? { rows: 4 } : { type })} dir={dir || 'auto'} value={fields[k] || ''} onChange={e => set(k, e.target.value)} aria-invalid={invalid || undefined} />
      {prefilled.includes(k) && <small className="ld-web-from-brain">{tr(W.fromBrain)}</small>}
    </label>
  );
}

export function Choice({ form, k, required }) {
  const { fields, set, error, tr } = form;
  return (
    <fieldset className={`ld-brief-choice${error.field === k ? ' is-invalid' : ''}`}>
      <legend>{tr(W[k])}{required && <em className="ld-brief-required"> · {tr(W.required)}</em>}</legend>
      {Object.entries(OPTIONS[k]).map(([value, label]) => (
        <label key={value}><input type="radio" name={k} checked={fields[k] === value} onChange={() => set(k, value)} /> {tr(label)}</label>
      ))}
    </fieldset>
  );
}
