import React from 'react';

/** Arabic or English, for an email or the website form. */
export function LangSwitch({ s, lang, onChange }) {
  return (
    <div className="ld-segmented" role="tablist" aria-label={s.t('rasil_lang')}>
      {['ar', 'en'].map(id => <button key={id} type="button" role="tab" aria-selected={lang === id} onClick={() => onChange(id)}>{s.t(`rasil_lang_${id}`)}</button>)}
    </div>
  );
}
