import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BRAIN_SECTIONS, BZNS_MAX_CHARS, validateBzns } from '../../lib/bzns-doc.js';
import { bznsMessages } from '../../lib/bzns-messages.js';
import { brainTemplate } from '../../../config/bzns-templates.js';
import { BUSINESS_INDUSTRIES } from '../../lib/industries.js';

// What every bzns.md needs. Tone and handoff rules are behaviour settings now, and FAQs are gone.
const CHECKLIST = ['about', 'offer', 'location', 'contact'];
/** How many of the essential sections have text: the count on the bzns.md tab and above its checklist. */
export function bznsProgress(markdown) {
  const filled = new Set(validateBzns(markdown || '').parsed.sections.filter(s => String(s.body || '').trim()).map(s => s.key));
  return { done: CHECKLIST.filter(k => filled.has(k)).length, total: CHECKLIST.length };
}

/**
 * bzns.md: the business's own words. Saving a draft never changes Layla's answers; Publish (in the
 * BznsBrain header) does, after the same checks the server repeats.
 */
export function BznsTab({ b, lang, setup, request, take, act, busy, industry }) {
  const saved = setup?.bzns?.markdown ?? '';
  const [text, setText] = useState(saved), [notice, setNotice] = useState('');
  const lastSaved = useRef(saved);
  // Adopt the server's text when it changes (a load, an accepted suggestion) unless the owner has unsaved edits.
  useEffect(() => { setText(current => (current === lastSaved.current ? saved : current)); lastSaved.current = saved; }, [saved]);
  const check = useMemo(() => validateBzns(text), [text]);
  const dirty = text !== saved;
  const sectors = new Set(check.parsed.sections.filter(s => String(s.body || '').trim()).map(s => s.key));
  const industryName = (BUSINESS_INDUSTRIES.find(row => row.id === industry) || {})[lang === 'ar' ? 'ar' : 'en'] || (lang === 'ar' ? 'نشاطك' : 'your business');
  const save = () => act('bzns', async () => {
    take(await request({ action: 'bzns_save', markdown: text, version: setup?.bzns?.version || 0 }));
    setNotice(b.t('draftSaved'));
  });
  const n = v => v.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en');
  const done = CHECKLIST.filter(key => sectors.has(key)).length;
  if (!text.trim()) return (
    <div className="brain-empty">
      <p>{b.t('bznsEmpty')}</p>
      <button type="button" className="ld-button ld-primary" disabled={!!busy} onClick={() => { setNotice(''); setText(brainTemplate(industry, lang)); }}>{b.t('bznsStart', { industry: industryName })}</button>
    </div>
  );
  return (
    <div className="brain-bzns">
      <div className="brain-bzns-grid">
        <label className="brain-bzns-field">
          <span className="ld-visually-hidden">{b.t('bznsField')}</span>
          <textarea value={text} dir="auto" rows={20} spellCheck onChange={e => { setText(e.target.value); setNotice(''); }} disabled={!!busy} aria-describedby="brain-bzns-count" />
        </label>
        <aside className="brain-checklist" aria-label={b.t('sections')}>
          <div className="brain-checklist-head"><h4>{b.t('sections')}</h4><span aria-hidden="true">{n(done)}/{n(CHECKLIST.length)}</span></div>
          <div className="brain-meter" aria-hidden="true"><span style={{ inlineSize: `${(done / CHECKLIST.length) * 100}%` }} /></div>
          <ul>{CHECKLIST.map(key => <li key={key} data-done={sectors.has(key)}><span aria-hidden="true">{sectors.has(key) ? '✓' : '○'}</span> {BRAIN_SECTIONS[key][lang === 'ar' ? 'ar' : 'en']}<span className="ld-visually-hidden"> — {b.t(sectors.has(key) ? 'added' : 'missing')}</span></li>)}</ul>
        </aside>
      </div>
      {check.errors.length > 0 && <div className="brain-problems" aria-live="polite"><p>{b.t('beforePublish')}</p><ul>{bznsMessages(check.errors, lang).map((line, i) => <li key={i}>{line}</li>)}</ul></div>}
      {notice && <p role="status" className="brain-note">{notice}</p>}
      <div className="brain-bzns-foot">
        <span id="brain-bzns-count" className={text.length > BZNS_MAX_CHARS ? 'brain-count is-over' : 'brain-count'}>{`${n(text.length)} / ${n(BZNS_MAX_CHARS)}`}</span>
        <button type="button" className="ld-button" disabled={!dirty || !!busy || text.length > BZNS_MAX_CHARS} onClick={save}>{busy === 'bzns' ? b.t('saving') : b.t('saveDraft')}</button>
      </div>
    </div>
  );
}
