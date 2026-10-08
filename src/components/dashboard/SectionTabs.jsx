import React from 'react';

// A view can be worded for its section (Settings → "Services & prices"), else its shared name.
const label = (s, tab, v) => { const own = s.t(`view_${tab}_${v}`); return own === `view_${tab}_${v}` ? s.t(`view_${v}`) : own; };

/** The few views inside one dashboard section, as links so each has its own URL. */
export function SectionTabs({ s, tab, views, view, onSelect }) {
  if (!views || views.length < 2) return null;
  return (
    <nav className="ld-section-tabs" aria-label={s.t('sectionViews')}>
      {views.map(v => (
        <a key={v} href={`?tab=${tab}&view=${v}`} aria-current={v === view ? 'page' : undefined} onClick={e => { e.preventDefault(); onSelect(tab, { view: v }); }}>{label(s, tab, v)}</a>
      ))}
    </nav>
  );
}
