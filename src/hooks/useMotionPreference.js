import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
const subscribe = listener => {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const snapshot = () => window.matchMedia(QUERY).matches;
// Prerendered and hydrating pages count as reduced, so nothing moves before the real answer is known.
const serverSnapshot = () => true;

/** Whether the visitor asked for reduced motion (true while prerendering and hydrating). */
export function useMotionPreference() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
