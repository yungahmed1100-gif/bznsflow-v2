import React from 'react';
import { RootLayout } from './layouts/RootLayout';
import Home from './pages/Home';

// Route table consumed by vite-react-ssg (React Router v6 data-router shape).
// Static paths are auto-discovered and prerendered to dist/<path>/index.html.
//
// Phase 1: English at '/', Arabic at '/ar' — same Home component, locale by prop.
// Phase 2 adds /pricing, /real-estate-lead-automation, /speed-to-lead, /blog, …
// each with an '/ar' mirror.
export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home lang="en" /> },
      { path: 'ar', element: <Home lang="ar" /> },
    ],
  },
];
