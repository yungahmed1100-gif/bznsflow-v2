import React from 'react';
import { Outlet } from 'react-router-dom';

// Shared shell for every route. vite-react-ssg already wraps the tree in
// HelmetProvider, so this just renders the matched route. Future site-wide
// chrome (skip-link, providers) can live here.
export function RootLayout() {
  return <Outlet />;
}
