import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { dashboardSearch } from '../../lib/dashboard/navigation';
import { viewLabel } from '../../lib/dashboard/strings';
import { inPlace } from '../../lib/plain-click';

/**
 * The few views inside one dashboard section, as links so each has its own URL.
 * Each link keeps the page's own parameters (dashboardSearch) and opens in a new
 * tab on Cmd/Ctrl-click like any link; a plain click switches the view in place.
 */
export function SectionTabs({ s, tab, views, view, onSelect }) {
  const [params] = useSearchParams();
  if (!views || views.length < 2) return null;
  return (
    <nav className="ld-section-tabs" aria-label={s.t('sectionViews')}>
      {views.map(v => (
        <a
          key={v}
          href={`?${dashboardSearch(params, tab, { view: v })}`}
          aria-current={v === view ? 'page' : undefined}
          onClick={inPlace(() => onSelect(tab, { view: v }))}
        >
          {viewLabel(s, tab, v)}
        </a>
      ))}
    </nav>
  );
}
