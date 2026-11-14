import { useEffect, useState } from 'react';
import { createLatestRequest } from '../lib/latest-request.js';

/**
 * `begin()` for a component's loads: call it when a request starts, and apply the
 * answer only while the returned `isLatest()` is true. Unmounting cancels them all.
 * @returns {() => () => boolean}
 */
export function useLatestRequest() {
  const [latest] = useState(createLatestRequest);
  useEffect(() => () => latest.cancelAll(), [latest]);
  return latest.begin;
}
