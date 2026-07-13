import React from 'react';
import { RootLayout } from './layouts/RootLayout';
import Home from './pages/Home';

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
    ],
  },
];
