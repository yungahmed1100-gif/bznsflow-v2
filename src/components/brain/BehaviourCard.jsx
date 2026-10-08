import React, { useEffect, useState } from 'react';
import { TONES } from '../../../config/layla-tones.js';
import { BUSINESS_INDUSTRIES } from '../../lib/industries.js';

const pick = ({ tone, askName, ask, appointmentPreferences, handoffNote }) => ({ tone, askName, ask: [...(ask || [])], appointmentPreferences, handoffNote: handoffNote || '' });

/**
 * Layla's behaviour: validated settings, live as soon as they are saved. Until the owner saves, they
 * are read from the old bzns.md, so nobody re-enters anything.
 */
export function BehaviourCard({ b, lang, brain, request, take, act, busy, industry, onIndustry, open = false }) {
  const current = brain?.behaviour;
  const [form, setForm] = useState(current ? pick(current) : null), [note, setNote] = useState('');
  useEffect(() => { if (current) setForm(pick(current)); }, [current?.version, current?.legacy]);
  if (!form) return null;
  const askable = (brain.askable || []).filter(f => !f.appointment);
  const booking = (brain.askable || []).some(f => f.appointment);
  const toggle = key => setForm(f => ({ ...f, ask: f.ask.includes(key) ? f.ask.filter(k => k !== key) : [...f.ask, key] }));
  const toneName = TONES.find(t => t.id === form.tone)?.[b.ar ? 'ar' : 'en'];
  const save = () => act('behaviour', async () => {
    take(await request({ action: 'brain_behaviour', behaviour: form, version: current.legacy ? 0 : current.version }));
    setNote(b.t('behaviourSaved'));
  });
  return (
    <details className="brain-card brain-behaviour" open={open || undefined}>
      <summary><span className="brain-card-title">{b.t('behaviourTitle')}</span><span className="ld-help">{toneName}</span></summary>
      {current.legacy && <p className="ld-help">{b.t('behaviourLegacy')}</p>}
      {onIndustry && <label>{b.t('industry')}<select value={industry || ''} disabled={!!busy} onChange={e => onIndustry(e.target.value)}>
        {!BUSINESS_INDUSTRIES.some(r => r.id === industry) && <option value="">{lang === 'ar' ? 'اختر مجالك' : 'Choose your industry'}</option>}
        {BUSINESS_INDUSTRIES.map(r => <option key={r.id} value={r.id}>{b.ar ? r.ar : r.en}</option>)}
      </select></label>}
      <fieldset className="brain-tones"><legend>{b.t('tone')}</legend>
        {TONES.map(t => <label key={t.id} className="brain-tone" data-selected={form.tone === t.id}>
          <input type="radio" name="brain-tone" value={t.id} checked={form.tone === t.id} onChange={() => setForm(f => ({ ...f, tone: t.id }))} />
          <span className="brain-tone-name">{b.ar ? t.ar : t.en}</span><span className="ld-help">{b.ar ? t.descAr : t.descEn}</span>
        </label>)}
      </fieldset>
      <fieldset><legend>{b.t('askDetails')}</legend>
        <label className="brain-check"><input type="checkbox" checked={form.askName} onChange={e => setForm(f => ({ ...f, askName: e.target.checked }))} />{b.t('askName')}</label>
        {askable.map(f => <label key={f.key} className="brain-check"><input type="checkbox" checked={form.ask.includes(f.key)} onChange={() => toggle(f.key)} />{b.ar ? f.ar : f.en}</label>)}
        {booking && <label className="brain-check"><input type="checkbox" checked={form.appointmentPreferences} onChange={e => setForm(f => ({ ...f, appointmentPreferences: e.target.checked }))} />{b.t('appointmentPreferences')}</label>}
      </fieldset>
      <label>{b.t('handoffNote')}<textarea dir="auto" rows={3} maxLength={600} value={form.handoffNote} onChange={e => setForm(f => ({ ...f, handoffNote: e.target.value }))} aria-describedby="brain-handoff-hint" /></label>
      <p id="brain-handoff-hint" className="ld-help">{b.t('handoffHint')}</p>
      {note && <p role="status" className="brain-note">{note}</p>}
      <div className="brain-actions"><button type="button" className="ld-button ld-primary" disabled={!!busy} onClick={save}>{busy === 'behaviour' ? b.t('saving') : b.t('saveBehaviour')}</button></div>
    </details>
  );
}
