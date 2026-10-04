import { getStrings } from '../i18n/index.js';
import { HOME_SEO, buildSchemas } from './schemas.js';
import { PRIVACY } from '../content/privacy.js';
import { TERMS } from '../content/terms.js';
import { DATA_DELETION } from '../content/data-deletion.js';

// One route-owned source for static HTML and client navigation metadata.
export function routeSeo(pathname) {
  const lang = /^\/en(?:\/|$)/.test(pathname) ? 'en' : 'ar';
  const path = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const t = getStrings(lang);
  const base = { lang, path };
  if (path === '/') return { ...base, ...HOME_SEO[lang], jsonLd: buildSchemas(t, lang) };
  const legal = { '/privacy': PRIVACY, '/terms': TERMS, '/data-deletion': DATA_DELETION }[path]?.[lang];
  if (legal) return { ...base, title: `${legal.title} — BznsFlow`, description: legal.lead.slice(0, 155) };
  if (path === '/playbook') return { ...base, title: `${t.playbook_title.replace(/<[^>]*>/g, '')} — BznsFlow`, description: t.playbook_solution };
  if (path === '/signin') return { ...base, title: t.auth_seo_title, description: t.auth_seo_desc, noindex: true };
  return { ...base, title: `${path.startsWith('/owner') ? (lang === 'ar' ? 'لوحة الإدارة' : 'Admin dashboard') : 'Layla'} | BznsFlow`, description: 'Private BznsFlow workspace', noindex: true };
}
