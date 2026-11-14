import { useCallback, useEffect, useState } from 'react';
import { useLatestRequest } from './useLatestRequest.js';

/**
 * The data behind one view of a dashboard that reuses a component across views.
 *
 * Two rules the automotive and construction dashboards broke until 14 Nov 2026:
 * only the newest answer is applied, and data loaded for another view is never
 * shown (`data` is null until this view's answer arrives, so the caller's
 * loading state covers the switch).
 *
 * @param {string} view the view the data belongs to
 * @param {() => Promise<any>} fetchView loads it; memoise with useCallback
 * @param {string} fallback reason to show when a failure carries none
 * @returns {{ data: any, error: string, setError: (reason: string) => void, load: () => Promise<void> }}
 */
export function useViewData(view, fetchView, fallback) {
  const begin = useLatestRequest();
  const [loaded, setLoaded] = useState(null),
    [error, setError] = useState('');
  const load = useCallback(async () => {
    const isLatest = begin();
    setError('');
    try {
      const value = await fetchView();
      if (isLatest()) setLoaded({ view, value });
    } catch (e) {
      if (isLatest()) setError(e?.reason || fallback);
    }
  }, [begin, view, fetchView, fallback]);
  useEffect(() => {
    load();
  }, [load]);
  return { data: loaded?.view === view ? loaded.value : null, error, setError, load };
}
