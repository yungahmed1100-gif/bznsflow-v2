import React from 'react';
import { Icon } from './Icon';

export function Footer({ t, lang, CALENDAR_URL, WHATSAPP_URL, onSmoothScroll }) {
  return (
    <>
      <footer className="footer" id="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#hero" className="nav-brand footer-nav-brand" onClick={(e) => onSmoothScroll(e, '#hero')}>
                <span className="brand-name">BznsFlow</span>
                <span className="brand-tagline">{t.nav_tagline}</span>
              </a>
              <p className="footer-desc">{t.footer_desc}</p>
              <div className="footer-social">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="WhatsApp">
                  <Icon name="whatsapp" size={18} />
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">{t.footer_nav_heading}</h4>
              <ul className="footer-links">
                <li><a href="#two-track" onClick={(e) => onSmoothScroll(e, '#two-track')}>{t.footer_nav_2}</a></li>
                <li><a href="#ai-team" onClick={(e) => onSmoothScroll(e, '#ai-team')}>{t.team_label}</a></li>
                <li><a href="#tiers" onClick={(e) => onSmoothScroll(e, '#tiers')}>{t.tiers_label}</a></li>
                <li><a href="#how-it-works" onClick={(e) => onSmoothScroll(e, '#how-it-works')}>{t.footer_nav_3}</a></li>
                <li><a href="#about" onClick={(e) => onSmoothScroll(e, '#about')}>{t.footer_nav_5}</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">{t.footer_services_heading}</h4>
              <ul className="footer-links">
                <li><a href="#two-track" onClick={(e) => onSmoothScroll(e, '#two-track')}>{t.footer_svc_1}</a></li>
                <li><a href="#two-track" onClick={(e) => onSmoothScroll(e, '#two-track')}>{t.footer_svc_2}</a></li>
                <li><a href="#two-track" onClick={(e) => onSmoothScroll(e, '#two-track')}>{t.footer_svc_3}</a></li>
                <li><a href="#benefits" onClick={(e) => onSmoothScroll(e, '#benefits')}>{t.footer_svc_4}</a></li>
                <li><a href="#benefits" onClick={(e) => onSmoothScroll(e, '#benefits')}>{t.footer_svc_5}</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">{t.footer_contact_heading}</h4>
              <ul className="footer-contact">
                <li>
                  <Icon name="location" size={15} />
                  <span>{t.about_location}</span>
                </li>
                <li>
                  <Icon name="whatsapp" size={15} />
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">+20 103 675 5930</a>
                </li>
                <li>
                  <Icon name="mail" size={15} />
                  <a href="mailto:ahmed@bznsflowai.com">ahmed@bznsflowai.com</a>
                </li>
                <li>
                  <Icon name="calendar" size={15} />
                  <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">{t.footer_book}</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copy">{t.footer_copy}</p>
            <p className="footer-founder">{t.footer_founder}</p>
          </div>
        </div>
      </footer>

      <div className="whatsapp-float" id="whatsappFloat" style={{ opacity: 1, transform: 'translateY(0)' }}>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
          <div className="whatsapp-tooltip">{t.wa_tooltip}</div>
          <div className="whatsapp-icon">
            <Icon name="whatsapp" size={28} />
          </div>
        </a>
      </div>
    </>
  );
}
