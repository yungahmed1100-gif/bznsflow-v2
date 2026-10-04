import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Shared shell for every route. Scroll reveals use the native IntersectionObserver
// primitive in src/lib/reveal.js, initialized per-page.
export function RootLayout() {
  const privateOwnerPage = /^\/(?:en\/)?(?:owner|layla|reviewer)(?:\/|$)/.test(useLocation().pathname);
  return (
    <>
      <Outlet />
      {!privateOwnerPage && <SpeedInsights />}
    </>
  );
}
