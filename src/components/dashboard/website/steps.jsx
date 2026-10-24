import React from 'react';
import { BRIEF_MAX_PHOTOS, BRIEF_PAGES } from '../../../../config/website-brief.js';
import { W, OPTIONS } from './copy';
import { Choice, Text } from './fields';

export function BusinessStep({ form }) {
  return <>
    <Text form={form} k="nameEn" required dir="ltr" />
    <Text form={form} k="nameAr" dir="rtl" />
    <Text form={form} k="about" area />
    <Text form={form} k="services" area />
  </>;
}

export function ContactStep({ form }) {
  return <>
    <Text form={form} k="phone" required type="tel" dir="ltr" />
    <Text form={form} k="email" type="email" dir="ltr" />
    <Text form={form} k="address" />
    <Text form={form} k="mapUrl" type="url" dir="ltr" />
    <Text form={form} k="hours" />
    <div className="ld-web-pair">
      <Text form={form} k="instagram" dir="ltr" />
      <Text form={form} k="facebook" dir="ltr" />
      <Text form={form} k="tiktok" dir="ltr" />
      <Text form={form} k="otherSocial" dir="ltr" />
    </div>
  </>;
}

/** Logo (or a request to design one), photos, colours, style and examples. Files upload as they are picked. */
export function LookStep({ form, files }) {
  const { fields, set, error, tr } = form;
  const { logo, photos, busy, upload, removeLogo, removePhoto } = files;
  const colors = fields.colors || [];
  const references = fields.references?.length ? fields.references : [''];
  return <>
    <div className={`ld-web-logo${error.field === 'logo' ? ' is-invalid' : ''}`}>
      <label className="ld-field"><span>{tr(W.logo)}</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={e => { upload('logo', [...e.target.files].slice(0, 1)); e.target.value = ''; }} />
      </label>
      {logo && <figure className="ld-brief-thumb"><img src={logo.url} alt="" /><button type="button" className="ld-button" onClick={removeLogo}>{tr(W.remove)}</button></figure>}
      <label className="ld-brief-check"><input type="checkbox" checked={!!fields.designLogo} onChange={e => set('designLogo', e.target.checked)} /> {tr(W.designLogo)}</label>
    </div>
    <label className="ld-field"><span>{tr(W.photos)}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={!!busy || photos.length >= BRIEF_MAX_PHOTOS}
        onChange={e => { upload('photo', [...e.target.files].slice(0, BRIEF_MAX_PHOTOS - photos.length)); e.target.value = ''; }} />
    </label>
    {photos.length > 0 && <div className="ld-brief-photos">{photos.map(p => <figure key={p.id} className="ld-brief-thumb"><img src={p.url} alt="" /><button type="button" className="ld-button" onClick={() => removePhoto(p.id)}>{tr(W.remove)}</button></figure>)}</div>}
    {busy === 'upload' && <p role="status">{tr(W.uploading)}</p>}
    <div className={`ld-brief-colors${error.field === 'colors' ? ' is-invalid' : ''}`}><span>{tr(W.colors)}</span>
      {colors.map((c, i) => <span key={i} className="ld-brief-color"><input type="color" value={c} aria-label={`${tr(W.colors)} ${i + 1}`} onChange={e => set('colors', colors.map((x, k) => (k === i ? e.target.value : x)))} /><code dir="ltr">{c}</code>
        <button type="button" className="ld-button" onClick={() => set('colors', colors.filter((_, k) => k !== i))}>{tr(W.remove)}</button></span>)}
      {colors.length < 3 && <button type="button" className="ld-button" onClick={() => set('colors', [...colors, '#1f4f7a'])}>{tr(W.addColor)}</button>}
    </div>
    <Choice form={form} k="style" />
    <Text form={form} k="fontNotes" />
    <div className={`ld-brief-refs${error.field === 'references' ? ' is-invalid' : ''}`}><span>{tr(W.references)}</span>
      {references.map((r, i) => <input key={i} type="url" dir="ltr" value={r} aria-label={`${tr(W.references)} ${i + 1}`} placeholder="https://"
        onChange={e => set('references', references.map((x, k) => (k === i ? e.target.value : x)))} />)}
      {references.length < 3 && references[references.length - 1] && <button type="button" className="ld-button" onClick={() => set('references', [...references, ''])}>{tr(W.addLink)}</button>}
    </div>
  </>;
}

export function SiteStep({ form }) {
  const { fields, set, tr } = form;
  const pages = fields.pages || [];
  return <>
    <fieldset className="ld-brief-choice"><legend>{tr(W.pages)}</legend>
      {BRIEF_PAGES.map(page => <label key={page}><input type="checkbox" checked={pages.includes(page)}
        onChange={() => set('pages', pages.includes(page) ? pages.filter(x => x !== page) : [...pages, page])} /> {tr(OPTIONS.pages[page])}</label>)}
    </fieldset>
    <Choice form={form} k="languages" required />
    <Text form={form} k="notes" area />
  </>;
}

const shown = (tr, key, value) => {
  if (Array.isArray(value)) return value.map(v => (OPTIONS[key]?.[v] ? tr(OPTIONS[key][v]) : v)).join(', ');
  if (value === true) return '✓';
  return OPTIONS[key]?.[value] ? tr(OPTIONS[key][value]) : String(value);
};

/** Every answer, grouped by the step it came from, each group with a way back to change it. */
export function ReviewStep({ form, files, groups, onEdit }) {
  const { fields, tr } = form;
  return groups.map(({ step, keys }, index) => {
    const rows = keys.filter(k => fields[k] !== undefined && fields[k] !== '' && !(Array.isArray(fields[k]) && !fields[k].filter(Boolean).length));
    const extra = step === 'look' ? [files.logo ? tr(W.logoAdded) : fields.designLogo ? tr(W.designLogo) : null,
      files.photos.length ? tr(W.photosAdded).replace('{n}', files.photos.length) : null].filter(Boolean) : [];
    return (
      <section key={step} className="ld-web-review" aria-labelledby={`ld-web-review-${step}`}>
        <div className="ld-web-review-head">
          <h3 id={`ld-web-review-${step}`}>{tr(W.steps[step])}</h3>
          <button type="button" className="ld-button" onClick={() => onEdit(index)} aria-label={`${tr(W.edit)}: ${tr(W.steps[step])}`}>{tr(W.edit)}</button>
        </div>
        <dl>
          {rows.map(k => <div key={k}><dt>{tr(W[k] || [k, k])}</dt><dd dir="auto">{k === 'colors' ? fields[k].map(c => <span key={c} className="ld-web-swatch" style={{ background: c }} title={c} />)
            : k === 'mailboxLocal' ? <bdi dir="ltr">{fields.mailboxLocal}@{fields.domainChoice || '…'}</bdi> : shown(tr, k, fields[k])}</dd></div>)}
          {extra.map(line => <div key={line}><dt /><dd>{line}</dd></div>)}
        </dl>
      </section>
    );
  });
}
