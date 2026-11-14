// Only the newest request may update the screen.
//
// A view that reloads when its mode changes can have two requests in flight; the
// older one may answer last. Until 14 Nov 2026 the automotive and construction
// dashboards applied whichever answered last, so a slow team list replaced the
// workshop settings and crashed the page.

/**
 * A counter of requests. `begin()` starts one and returns `isLatest()`, which stays
 * true until another request begins or `cancelAll()` runs (on unmount).
 * @returns {{ begin: () => () => boolean, cancelAll: () => void }}
 */
export function createLatestRequest() {
  let latest = 0;
  return {
    begin() {
      const id = ++latest;
      return () => id === latest;
    },
    cancelAll() {
      latest++;
    },
  };
}
