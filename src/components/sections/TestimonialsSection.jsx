import React from 'react';
import { TESTIMONIALS } from '../../data/testimonials';

// Approved client quotes, verbatim and always named. On the Arabic page a quote approved only in
// English (Royal Fish) is shown in English, marked as such, never translated.
export function TestimonialsSection({ t, lang = 'ar' }) {
  const [lead, ...rest] = TESTIMONIALS;
  const Quote = ({ item, featured = false }) => {
    const own = lang === 'ar' ? item.ar : item.en;
    const text = own || item.en;
    const quoteLang = own ? lang : 'en';
    return (
      <figure className={`client-quote${featured ? ' client-quote--lead' : ''}`} data-reveal>
        <blockquote lang={quoteLang} dir={quoteLang === 'ar' ? 'rtl' : 'ltr'}><p>{text}</p></blockquote>
        <figcaption>
          <span className="client-quote-name">{item.business[lang] || item.business.en}</span>
          {item.place && <span className="client-quote-place">{item.place[lang] || item.place.en}</span>}
          {item.source && <span className="client-quote-source">{t.clients_source}: {item.source[lang] || item.source.en}</span>}
        </figcaption>
      </figure>
    );
  };
  return (
    <section className="section" id="clients">
      <div className="container">
        <h2 className="section-title" data-reveal dangerouslySetInnerHTML={{ __html: t.clients_title }} />
        <p className="section-subtitle" data-reveal>{t.clients_sub}</p>
        <Quote item={lead} featured />
        <div className="client-quotes">
          {rest.map(item => <Quote key={item.key} item={item} />)}
        </div>
      </div>
    </section>
  );
}
