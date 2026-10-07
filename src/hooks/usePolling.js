import { useCallback, useEffect, useRef, useState } from 'react';

export const POLL_INTERVAL_MS = 5000;

/**
 * The refresh behind usePolling, kept free of React so it can be tested directly.
 * One load runs at a time per generation. A refresh asked for while a load is running
 * (say, right after the owner flips a switch) must not be satisfied by that load, which
 * may have left before the change: the running load is followed by one more.
 */
export function createRefresher({ load, current, generation, onLoading, onData, onError }) {
  let inFlight = null, running = null, again = false;
  return ({ quiet = false } = {}) => {
    const gen = generation();
    if (inFlight === gen) { again = true; return running; }
    inFlight = gen;
    if (!quiet) onLoading();
    running = (async () => {
      try {
        do {
          again = false;
          const data = await load();
          if (current(gen)) onData(data);
        } while (again && current(gen));
      } catch (error) {
        if (current(gen)) onError(error);
      } finally { if (inFlight === gen) inFlight = null; }
    })();
    return running;
  };
}

/**
 * A live resource. Today it polls every five seconds while the tab is visible;
 * components depend only on { data, error, loading, refresh }, so a Convex
 * subscription can replace the polling without changing them.
 */
export function usePolling(load, deps = [], { interval = POLL_INTERVAL_MS, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  // Each change of `deps` starts a new generation. A response from an older generation
  // (a filter the owner has already changed) is dropped instead of shown under the new one.
  const generation = useRef(0), active = useRef(true), loader = useRef(load);
  loader.current = load;
  const refresher = useRef(null);
  if (!refresher.current) refresher.current = createRefresher({
    load: () => loader.current(),
    current: gen => active.current && gen === generation.current,
    generation: () => generation.current,
    onLoading: () => setState(s => ({ ...s, loading: true })),
    onData: data => setState({ data, error: null, loading: false }),
    onError: error => setState(s => ({ ...s, error, loading: false })),
  });
  const refresh = useCallback(options => refresher.current(options), []);
  useEffect(() => {
    active.current = true;
    generation.current += 1;
    if (!enabled) return () => { active.current = false; };
    setState(s => ({ ...s, data: null, loading: true }));
    refresh();
    const timer = interval ? setInterval(() => { if (document.visibilityState === 'visible') refresh({ quiet: true }); }, interval) : null;
    const onVisible = () => { if (document.visibilityState === 'visible') refresh({ quiet: true }); };
    // Back/forward cache: a page restored after leaving for another site (e.g.
    // Instagram's login) shows its old data until refreshed.
    const onShow = (event) => { if (event.persisted) refresh({ quiet: true }); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onShow);
    return () => { active.current = false; if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('pageshow', onShow); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, interval, ...deps]);
  return { ...state, refresh, setData: data => setState(s => ({ ...s, data })) };
}

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}
