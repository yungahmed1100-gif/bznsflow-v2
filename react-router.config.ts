import type { Config } from '@react-router/dev/config';
import { prerenderPaths } from './src/lib/route-table.js';

export default {
  appDirectory: 'src',
  buildDirectory: 'build',
  ssr: false,
  // Every page, Arabic and English: Vercel serves no SPA fallback, so anything not prerendered is a 404.
  prerender: prerenderPaths(),
} satisfies Config;
