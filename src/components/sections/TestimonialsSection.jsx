import React from 'react';
import { Reveal } from '../motion/Reveal';
import { StaggerGroup, StaggerItem } from '../motion/Stagger';

export function TestimonialsSection({ t, lang }) {
  return (
    <section className="section" id="testimonials">
      <div className="container">
        <Reveal className="section-label">{t.testimonials_label}</Reveal>
        <Reveal as="h2" className="section-title" dangerouslySetInnerHTML={{ __html: t.testimonials_title }} />
        <Reveal as="p" className="section-subtitle">{t.testimonials_sub}</Reveal>

        <StaggerGroup className="testimonials-grid" stagger={0.12}>
          {[
            { quote: t.tst1_quote, name: t.tst1_name, title: t.tst1_title, location: t.tst1_location, initial: 'MH' },
            { quote: t.tst2_quote, name: t.tst2_name, title: t.tst2_title, location: t.tst2_location, initial: 'MD' },
            { quote: t.tst3_quote, name: t.tst3_name, title: t.tst3_title, location: t.tst3_location, initial: '★' },
          ].map((tst, i) => (
            <StaggerItem as="figure" className="testimonial-card" key={i}>
              <svg className="testimonial-mark" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7.17 6A5.18 5.18 0 0 0 2 11.17V18h6v-6.83H5.5A2.67 2.67 0 0 1 8.17 8.5V6zm9 0A5.18 5.18 0 0 0 11 11.17V18h6v-6.83h-2.5a2.67 2.67 0 0 1 2.67-2.67V6z"/>
              </svg>
              <blockquote className="testimonial-quote">{tst.quote}</blockquote>
              <figcaption className="testimonial-meta">
                <div className="testimonial-avatar" aria-hidden="true">{tst.initial}</div>
                <div>
                  <div className="testimonial-name">{tst.name}</div>
                  <div className="testimonial-title">{tst.title}</div>
                  <div className="testimonial-location">{tst.location}</div>
                </div>
              </figcaption>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
