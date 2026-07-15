import React from 'react';
import { Outlet } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';

// Shared shell for every route. vite-react-ssg already wraps the tree in
// HelmetProvider. Scroll reveals are handled by the native IntersectionObserver
// primitive in src/lib/reveal.js, initialized per-page.
export function RootLayout() {
  return (
    <>
      <Outlet />
      <SpeedInsights />
      <Analytics />
    </>
  );
}
