import React, { useEffect } from 'react';
import { documentScripts } from '../document-scripts';
import { Outlet, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Shared shell for every route. Scroll reveals use the native IntersectionObserver
// primitive in src/lib/reveal.js, initialized per-page.
export function RootLayout() {
  const privateOwnerPage = /^\/(?:en\/)?(?:owner|layla|reviewer)(?:\/|$)/.test(useLocation().pathname);
  useEffect(() => {
    if (privateOwnerPage) return;
    // Marketing code inserts script nodes; run it only after React hydrates.
    for (const source of documentScripts.slice(1)) {
      const script = document.createElement('script');
      script.textContent = source;
      document.head.appendChild(script);
      script.remove();
    }
  }, [privateOwnerPage]);
  return (
    <>
      <Outlet />
      {!privateOwnerPage && <SpeedInsights />}
    </>
  );
}
