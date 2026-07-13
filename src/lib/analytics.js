// Plausible-style event tracking; no-op during SSG and when the script is absent.
export const trackEvent = (name, props) => {
  if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
    window.plausible(name, props ? { props } : undefined);
  }
};
