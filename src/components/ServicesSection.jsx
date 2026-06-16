import React from 'react';
import { Icon } from './Icon';

const CATEGORY_MARGIN = { marginTop: '64px' };

export function ServicesSection({ t, activeServices, CALENDAR_URL }) {
  const renderGrid = (category, cardClass = '', iconClass = '', tagClass = '') => (
    <div className="services-grid">
      {activeServices.filter(s => s.category === category).map((svc, i) => (
        <div className={`service-card${cardClass} fade-in`} key={i}>
          <div className={`svc-icon-wrap${iconClass}`}>
            <span className="svc-icon">{svc.icon}</span>
          </div>
          <h3 className="svc-name">{svc.name}</h3>
          <p className={`svc-tag${tagClass}`}>{svc.tag}</p>
          <ul className="svc-bullets">
            {svc.bullets.map((b, j) => (
              <li key={j}>
                <Icon name="check" size={16} strokeWidth={2.5} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost svc-btn">{t.services_cta}</a>
        </div>
      ))}
    </div>
  );

  return (
    <section className="section section--dark" id="services">
      <div className="container">
        <div className="section-label fade-in">{t.services_label}</div>
        <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.services_title }}></h2>
        <p className="section-subtitle fade-in">{t.services_sub}</p>

        <div className="services-category fade-in">
          <div className="services-category-header">
            <span className="services-category-badge services-category-badge--foundation">{t.cat_foundation || 'Foundation'}</span>
            <div className="services-category-info">
              <h3 className="services-category-title">{t.services_foundation_label}</h3>
              <p className="services-category-sub">{t.services_foundation_sub}</p>
            </div>
          </div>
        </div>
        {renderGrid('foundation')}

        <div className="services-category fade-in" style={CATEGORY_MARGIN}>
          <div className="services-category-header">
            <span className="services-category-badge services-category-badge--growth">{t.cat_growth || 'Growth'}</span>
            <div className="services-category-info">
              <h3 className="services-category-title">{t.services_growth_label}</h3>
              <p className="services-category-sub">{t.services_growth_sub}</p>
            </div>
          </div>
        </div>
        {renderGrid('growth', ' service-card--growth', ' svc-icon-wrap--growth')}

        <div className="services-category fade-in" style={CATEGORY_MARGIN}>
          <div className="services-category-header">
            <span className="services-category-badge services-category-badge--scale">{t.cat_scale || 'Scale'}</span>
            <div className="services-category-info">
              <h3 className="services-category-title">{t.services_scale_label}</h3>
              <p className="services-category-sub">{t.services_scale_sub}</p>
            </div>
          </div>
        </div>
        {renderGrid('scale', ' service-card--scale', ' svc-icon-wrap--scale', ' svc-tag--scale')}

        <div className="services-bottom-cta fade-in">
          <p className="services-bottom-text">{t.services_bottom_text}</p>
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large">
            <span>{t.services_bottom_btn}</span>
            <Icon name="arrow-right" size={18} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  );
}
