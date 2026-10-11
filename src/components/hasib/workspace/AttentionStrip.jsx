import React from 'react';

/**
 * The strip above Work: what needs someone now, each item opening the filtered view that holds it.
 * @param {{ items: Array<[string, number, string, string, object]>, onGo: Function, ar: boolean }} props [id, count, text, tone, go]
 */
export function AttentionStrip({ ar, items, onGo }) {
  const shown = items.filter(([, n]) => n > 0);
  return <section className="hb-attention" aria-label={ar ? 'يحتاج انتباهك' : 'Needs attention'}>
    {shown.length ? shown.map(([id, n, text, tone, go]) => <button key={id} type="button" className="hb-attention-item" data-tone={tone} data-item={id} onClick={() => onGo('work', go)}>
      <b className="ld-num">{n}</b><span>{text}</span></button>)
      : <p className="hb-attention-clear">{ar ? 'لا شيء يحتاج انتباهك الآن.' : 'Nothing needs attention right now.'}</p>}
  </section>;
}
