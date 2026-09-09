import React, { Suspense, lazy } from 'react';
import { RootLayout } from './layouts/RootLayout';
import Home from './pages/Home';

// Lazily loaded, unlike Home. The sign-in page carries its own stylesheet and a
// ~240-entry country list, and a static import puts all of that in the shared
// chunk every home-page visitor downloads — to render a page most of them never
// open. Home stays eager: it IS the landing page, so deferring it would only add
// a round trip to the critical path.
const SignIn = lazy(() => import('./pages/SignIn'));

// `null` rather than a spinner. The prerendered HTML already contains the fully
// rendered page, so this fallback is only ever visible during a client-side
// navigation to /signin — where a flash of spinner is worse than nothing.
const deferred = (node) => <Suspense fallback={null}>{node}</Suspense>;

// Route table consumed by vite-react-ssg (React Router v6 data-router shape).
// Static paths are auto-discovered and prerendered to dist/<path>/index.html.
//
// Arabic is the primary language at '/'; English mirrors under '/en'.
// (The old /ar URL 301-redirects to / via vercel.json.)
export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home lang="ar" /> },
      { path: 'en', element: <Home lang="en" /> },
      // Deliberately absent from PAGES in routes-manifest.js, so the sitemap
      // does not advertise it — it is <Seo noindex> for the same reason.
      { path: 'signin', element: deferred(<SignIn lang="ar" />) },
      { path: 'en/signin', element: deferred(<SignIn lang="en" />) },
    ],
  },
];
