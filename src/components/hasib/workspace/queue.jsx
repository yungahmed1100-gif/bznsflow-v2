import React, { useState } from 'react';

const SNOOZE = [['1h', 3600000, 'One hour', 'ساعة'], ['tomorrow', 86400000, 'Tomorrow', 'غداً'], ['week', 7 * 86400000, 'Next week', 'الأسبوع القادم']];

/** The Follow-ups filter row: one radio per bucket with its count and tone. */
export function QueueFilters({ ar, filters, counts, filter, tones, name, labelOf, onFilter }) {
  return <div className="ld-segmented hb-followup-filters" role="radiogroup" aria-label={ar ? 'عرض المتابعات' : 'Show follow-ups'}>
    {filters.map(f => <label key={f} data-tone={tones[f]}><input type="radio" name={name} checked={filter === f} onChange={() => onFilter(f)} />
      <span>{labelOf(f)} <b className="ld-num">{counts?.[f] ?? 0}</b></span></label>)}
  </div>;
}

/** "Snooze" that opens three choices; the task's version keeps a stale screen from snoozing twice. */
export function SnoozeControl({ ar, busy, onSnooze }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="ld-button ld-quiet" onClick={() => setOpen(true)}>{ar ? 'تأجيل' : 'Snooze'}</button>;
  return <span className="hb-snooze" role="group" aria-label={ar ? 'تأجيل حتى' : 'Snooze until'}>{SNOOZE.map(([id, ms, en, arabic]) => <button key={id} type="button" className="ld-button ld-quiet" disabled={busy}
    onClick={() => { setOpen(false); onSnooze(Date.now() + ms); }}>{ar ? arabic : en}</button>)}</span>;
}
