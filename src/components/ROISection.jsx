import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';

const _usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtUSD = (n) => _usdFmt.format(n);

export function ROISection({ t, CALENDAR_URL, trackEvent }) {
  const [roiInquiries, setRoiInquiries] = useState(100);
  const [roiDeal,      setRoiDeal]      = useState(1500);
  const [roiClose,     setRoiClose]     = useState(25);
  const [roiMissed,    setRoiMissed]    = useState(35);
  const roiMonthly = useMemo(
    () => Math.round(roiInquiries * roiDeal * (roiClose / 100) * (roiMissed / 100)),
    [roiInquiries, roiDeal, roiClose, roiMissed],
  );

  return (
    <section className="section" id="roi">
      <div className="container">
        <div className="section-label fade-in">{t.roi_label}</div>
        <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.roi_title }}></h2>
        <p className="section-subtitle fade-in">{t.roi_sub}</p>

        <div className="roi-card fade-in">
          <div className="roi-inputs">
            <label className="roi-input">
              <span className="roi-input-label">
                {t.roi_input_inquiries}
                <strong className="roi-input-value">{roiInquiries}</strong>
              </span>
              <input
                type="range" min="10" max="500" step="5"
                value={roiInquiries}
                onChange={(e) => setRoiInquiries(Number(e.target.value))}
                aria-label={t.roi_input_inquiries}
              />
            </label>

            <label className="roi-input">
              <span className="roi-input-label">
                {t.roi_input_deal}
                <strong className="roi-input-value">{fmtUSD(roiDeal)}</strong>
              </span>
              <input
                type="range" min="100" max="20000" step="100"
                value={roiDeal}
                onChange={(e) => setRoiDeal(Number(e.target.value))}
                aria-label={t.roi_input_deal}
              />
            </label>

            <label className="roi-input">
              <span className="roi-input-label">
                {t.roi_input_close}
                <strong className="roi-input-value">{roiClose}%</strong>
              </span>
              <input
                type="range" min="5" max="80" step="1"
                value={roiClose}
                onChange={(e) => setRoiClose(Number(e.target.value))}
                aria-label={t.roi_input_close}
              />
            </label>

            <label className="roi-input">
              <span className="roi-input-label">
                {t.roi_input_missed}
                <strong className="roi-input-value">{roiMissed}%</strong>
              </span>
              <input
                type="range" min="10" max="70" step="1"
                value={roiMissed}
                onChange={(e) => setRoiMissed(Number(e.target.value))}
                aria-label={t.roi_input_missed}
              />
            </label>
          </div>

          <div className="roi-output">
            <span className="roi-output-label">{t.roi_output_label}</span>
            <span className="roi-output-amount">{fmtUSD(roiMonthly)}</span>
            <span className="roi-output-annual">
              {t.roi_output_annual} <strong>{fmtUSD(roiMonthly * 12)}</strong>
            </span>
            <p className="roi-assumption">{t.roi_assumption}</p>
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-large"
              onClick={() => trackEvent('ROICTAClick', { lossUSD: roiMonthly })}
            >
              <span>{t.roi_cta}</span>
              <Icon name="arrow-right" size={18} strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
