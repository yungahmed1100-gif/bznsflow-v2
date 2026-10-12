import React from 'react';
import { LegalPage } from '../components/ui/LegalPage';
import { BUSINESS_PAGES, BUSINESS_PAGES_UPDATED_ISO } from '../content/business-pages';

export default function BusinessInfo({ lang = 'ar', page }) {
  const locale = lang === 'ar' ? 'ar' : 'en';
  return <LegalPage lang={locale} path={`/${page}`} doc={BUSINESS_PAGES[page][locale]} updatedIso={BUSINESS_PAGES_UPDATED_ISO} />;
}
