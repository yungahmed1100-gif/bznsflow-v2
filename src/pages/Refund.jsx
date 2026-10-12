import React from 'react';
import { LegalPage } from '../components/ui/LegalPage';
import { REFUND, REFUND_UPDATED_ISO } from '../content/refund';

export default function Refund({ lang = 'ar' }) {
  return <LegalPage lang={lang} path="/refund" doc={REFUND[lang === 'ar' ? 'ar' : 'en']} updatedIso={REFUND_UPDATED_ISO} />;
}
