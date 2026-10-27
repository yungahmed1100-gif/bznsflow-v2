import React, { useEffect, useState } from 'react';
import { loadBrief } from '../../lib/dashboard/website-brief';

// Until an Ascend owner sends their first website brief, every tab says so and links to the Website tab.
// Not shown to team members, who cannot send one.
export function WebsiteReminder({ s, account, onGo }) {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    // Ascend's free website; Apex holds everything Ascend has (2026-10-27).
    if (!['ascend', 'apex'].includes(account?.accessPlan)) return undefined;
    let live = true;
    loadBrief().then(({ brief }) => live && setPending(!brief.version)).catch(() => live && setPending(false));
    return () => { live = false; };
  }, [account?.accessPlan]);
  if (!pending) return null;
  return (
    <section className="ld-reminder ld-website-reminder" aria-labelledby="ld-website-reminder">
      <h2 id="ld-website-reminder">{s.ar ? 'موقعك المجاني بانتظار تفاصيلك' : 'Your free website is waiting for your details'}</h2>
      <p>{s.ar ? 'أرسل لنا بيانات نشاطك وشعارك وألوانك لنبدأ ببناء موقعك.' : 'Send us your business details, logo and colours so we can start building your website.'}</p>
      <a href="?tab=website" onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); onGo('website'); }}>
        {s.ar ? 'أرسل تفاصيل الموقع' : 'Send website details'}
      </a>
    </section>
  );
}
