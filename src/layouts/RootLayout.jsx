import React, { useEffect } from 'react';
import { documentScripts } from '../document-scripts';
import { Outlet, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { followPage } from '../lib/posthog';
import { MotionConfig } from 'motion/react';
import { useMotionPreference } from '../hooks/useMotionPreference';

// Shared shell for every route. Scroll reveals use the native IntersectionObserver
// primitive in src/lib/reveal.js, initialized per-page.
export function RootLayout() {
  const { pathname } = useLocation();
  const reduced = useMotionPreference();
  const privateOwnerPage = /^\/(?:en\/)?(?:owner|layla|catalyst|reviewer|mcp)(?:\/|$)/.test(pathname);
  useEffect(() => { followPage(pathname); }, [pathname]);
  useEffect(() => {
    if (privateOwnerPage) return;
    // Schedule marketing only after hydration; the injected loader waits for idle time.
    for (const source of documentScripts.slice(1)) {
      const script = document.createElement('script');
      script.textContent = source;
      document.head.appendChild(script);
      script.remove();
    }
  }, [privateOwnerPage]);
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <Outlet />
      {!privateOwnerPage && <SpeedInsights />}
    </MotionConfig>
  );
}
