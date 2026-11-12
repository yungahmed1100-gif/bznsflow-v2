// The pages are listed once, in src/lib/route-table.js.
import type { RouteConfig } from '@react-router/dev/routes';
import { routeEntries } from './lib/route-table.js';

// The synthetic product draft is served only by the local development server.
export default routeEntries({ development: process.env.NODE_ENV === 'development' }) satisfies RouteConfig;
