import { useCallback, useEffect, useRef, useState } from 'react';
import { callApi } from '../../lib/api-client.js';

// The customer surface setup and the dashboard both save through, so both edit one record.
const ENDPOINT = '/api/layla-meta?surface=customer';

/**
 * BznsBrain's data: the setup record (bzns.md, profile, connections), the review queue and behaviour,
 * and the catalog. `act` runs one change at a time and reloads what it touched.
 */
export function useBrain() {
  const [setup, setSetup] = useState(null), [brain, setBrain] = useState(null), [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(''), [loadError, setLoadError] = useState('');
  const csrf = useRef(''), running = useRef(false);
  const request = useCallback(body => callApi(ENDPOINT, { body, csrf: csrf.current, timeout: 60000 }), []);
  const take = useCallback(next => {
    if (!next) return next;
    if (next.csrfToken) csrf.current = next.csrfToken;
    if (next.brain) setBrain(next.brain);
    if (next.catalog?.entries) setCatalog(next.catalog);
    const { brain: _b, catalog: _c, test: _t, extraction: _e, page: _p, ...rest } = next;
    if (rest.ok && rest.bzns !== undefined) setSetup(rest);
    return next;
  }, []);
  const loadCatalog = useCallback(async () => take(await request({ action: 'catalog_list', all: true, limit: 1000 })), [request, take]);
  const load = useCallback(async () => {
    setLoadError('');
    try {
      take(await callApi(ENDPOINT));
      await Promise.all([request({ action: 'brain_state' }).then(take), loadCatalog()]);
    } catch (e) { setLoadError(e.reason || 'unavailable'); }
  }, [request, take, loadCatalog]);
  useEffect(() => { load(); }, [load]);
  /** One change at a time; `label` names what is busy, so only that button says so. */
  const act = useCallback(async (label, task) => {
    if (running.current) return null;
    running.current = true; setBusy(label); setError('');
    try { return await task(); }
    catch (e) { setError(e.reason || 'unavailable'); return null; }
    finally { running.current = false; setBusy(''); }
  }, []);
  return { setup, brain, catalog, error, setError, busy, loadError, request, take, load, loadCatalog, act };
}
