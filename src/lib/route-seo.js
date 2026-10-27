import { BUSINESS_PAGES, BUSINESS_PAGES_UPDATED_ISO } from '../content/business-pages.js';
import { getStrings } from '../i18n/index.js';
import { HOME_SEO, buildSchemas, buildBusinessPageSchema } from './schemas.js';
import { PRIVACY } from '../content/privacy.js';
import { REFUND } from '../content/refund.js';
import { TERMS } from '../content/terms.js';
import { DATA_DELETION } from '../content/data-deletion.js';

// One route-owned source for static HTML and client navigation metadata.
export function routeSeo(pathname) {
  const lang = /^\/en(?:\/|$)/.test(pathname) ? 'en' : 'ar';
  const path = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const t = getStrings(lang);
  const base = { lang, path };
  if (path === '/') return { ...base, ...HOME_SEO[lang], jsonLd: buildSchemas(t, lang) };
  const info = BUSINESS_PAGES[path.slice(1)]?.[lang];
  if (info) return { ...base, title: `${info.title} — BznsFlow`, description: info.description, jsonLd: buildBusinessPageSchema(info, path, lang, BUSINESS_PAGES_UPDATED_ISO) };
  const legal = { '/refund': REFUND, '/privacy': PRIVACY, '/terms': TERMS, '/data-deletion': DATA_DELETION }[path]?.[lang];
  if (legal) return { ...base, title: `${legal.title} — BznsFlow`, description: legal.lead.slice(0, 155) };
  if (path === '/audit') return { ...base, title: lang === 'ar' ? 'احجز التدقيق المجاني لنشاطك — BznsFlow' : 'Book your free business audit — BznsFlow',
    description: lang === 'ar' ? 'اختر موعدًا لمدة 30 دقيقة مع أحمد لمراجعة نشاطك وما يحدث لاستفسارات عملائك. مجانًا ودون التزام.' : 'Pick a 30-minute time with Ahmed to review your business and what happens to your customer inquiries. Free, no commitment.' };
  if (path === '/apex') return { ...base, title: lang === 'ar' ? 'اطلب أبيكس — حلول مخصّصة للشركات — BznsFlow' : 'Request Apex — custom enterprise solutions — BznsFlow',
    description: lang === 'ar' ? 'وكلاء نبنيهم للمهام التي تحدّدها شركتك: الربط مع Odoo وأنظمة ERP، وتوزيع العمل بين الفروع، ووكلاء لمهام مخصّصة، والصوت وقنوات أخرى. سعر مخصّص بعد دراسة الاحتياج.'
      : 'Agents built for the functions your company names: ERP and Odoo connection, branches and teams routing, custom agent workflows, voice and other channels. Custom quote after scoping.' };
  if (path === '/playbook') return { ...base, title: `${t.playbook_title.replace(/<[^>]*>/g, '')} — BznsFlow`, description: t.playbook_solution };
  if (path === '/mcp') return { ...base, title: `${lang === 'ar' ? 'اتصالات الذكاء الاصطناعي' : 'AI Connections'} | BznsFlow`, description: 'Connect your AI assistant to your BznsFlow account', noindex: true };
  if (path === '/signin') return { ...base, title: t.auth_seo_title, description: t.auth_seo_desc, noindex: true };
  return { ...base, title: `${path.startsWith('/owner') ? (lang === 'ar' ? 'لوحة الإدارة' : 'Admin dashboard') : 'Layla'} | BznsFlow`, description: 'Private BznsFlow workspace', noindex: true };
}
