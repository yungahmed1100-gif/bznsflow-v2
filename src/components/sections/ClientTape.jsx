import React from 'react';

// Social proof as a continuous rail. The logos are pre-processed transparent
// PNGs in public/clients — backgrounds keyed off and verified against the cream
// ground, except the two that are genuinely tiles (see TILE_LOGOS).
//
// The track is rendered twice: the first copy is what a screen reader gets, the
// second is `aria-hidden` and exists only so the loop has something to scroll
// into. Animating a single copy would show a gap on every cycle.

// `scale` is optical, not mathematical. Sizing eight logos to one box makes a
// dense wordmark (BizBay) shout and an airy or pale mark (Wild Muscat) vanish,
// because equal pixels are not equal presence. These were tuned by eye against
// the cream ground; adjust by looking, not by measuring.
const CLIENTS = [
  { slug: 'bizbay',       name: 'BizBay',            scale: 0.72 },
  { slug: 'mawa',         name: 'Mawa Real Estate',  scale: 1.12 },
  { slug: 'mekka-hijama', name: 'Mekka Hijama',      scale: 1.10 },
  { slug: 'readingjeel',  name: 'Reading Jeel',      scale: 1.10 },
  { slug: 'royalfish',    name: 'Royal Fish',        scale: 1.10 },
  { slug: 'madrasaty',    name: 'Madrasaty',         scale: 0.92 },
  { slug: 'wildmuscat',   name: 'Wild Muscat',       scale: 1.00 },
  { slug: 'fivegates',    name: 'Five Gates',        scale: 0.88 },
];

// Five Gates is white-on-red and Madrasaty is an app icon — neither can be keyed
// without losing the mark, so they render as tiles and get a matching radius so
// the pair reads as deliberate rather than as one rounded and one hard-edged.
const TILE_LOGOS = new Set(['fivegates', 'madrasaty']);

function Track({ hidden = false }) {
  return (
    <ul className="client-tape-track" aria-hidden={hidden || undefined}>
      {CLIENTS.map(({ slug, name, scale }) => (
        <li key={slug} className="client-tape-item" style={{ '--logo-scale': scale }}>
          <img
            src={`/clients/${slug}.png`}
            alt={hidden ? '' : name}
            className={TILE_LOGOS.has(slug) ? 'is-tile' : undefined}
            /* Not lazy: the duplicate track sits outside the viewport by design
               and would never load, leaving a visible gap on every loop. The
               whole set is 33KB. */
            loading="eager"
            decoding="async"
            width={120}
            height={120}
          />
        </li>
      ))}
    </ul>
  );
}

export function ClientTape({ t }) {
  return (
    <section className="client-tape" aria-label={t.clients_label}>
      <div className="container">
        <p className="client-tape-label">{t.clients_label}</p>
      </div>
      <div className="client-tape-rail">
        <Track />
        <Track hidden />
      </div>
    </section>
  );
}
