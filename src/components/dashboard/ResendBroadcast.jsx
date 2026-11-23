import { useEffect, useState } from 'react';
import { dashboard } from '../../lib/dashboard/api';
import { Dialog } from './Dialog';
import { META_PRICING_URL } from './MetaBillingNotice';
import { LoadingDots } from '../ui/LoadingDots';

/**
 * Confirmation before a stopped broadcast is sent again to the people it did not reach.
 * It shows who will get it and who is left out, checked again now; nothing is sent until "Send now".
 */
export function ResendBroadcast({ s, campaign, sendingEnabled, onClose, onSent }) {
  const [preview, setPreview] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  // One id for this dialog, so a double click or a retry after a slow reply sends once.
  const [requestId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let live = true;
    dashboard('campaign_resend', { campaignId: campaign.id }, { timeout: 30000 })
      .then(r => live && setPreview(r.preview))
      .catch(e => live && setError(s.reason(e.reason)));
    return () => {
      live = false;
    };
    // `s` is rebuilt on every render; the check runs once per broadcast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await dashboard(
        'campaign_resend',
        { campaignId: campaign.id, requestId, confirm: true },
        { timeout: 60000 },
      );
      onSent(r.campaign);
    } catch (e) {
      setError(s.reason(e.reason));
      setBusy(false);
    }
  };

  const eligible = preview?.eligible || [];
  const overLimit = !!preview && eligible.length > preview.cap;
  const sending = sendingEnabled && preview?.sendingAvailable !== false;
  return (
    <Dialog s={s} title={s.t('resendTitle')} onClose={busy ? undefined : onClose}>
      <p>{s.t('resendIntro', { name: campaign.name })}</p>
      {campaign.reason === 'payment_method_required' && !campaign.billingCheckedAt && (
        <p className="ld-issue">{s.t('resendPaymentNote')}</p>
      )}
      {!preview && !error && <LoadingDots label={s.t('loading')} compact />}
      {preview && (
        <>
          <p className="ld-num">
            <strong>{s.t('reviewEligible', { count: eligible.length })}</strong>
            {!!preview.excluded.length && <> · {s.t('reviewExcluded', { count: preview.excluded.length })}</>}
          </p>
          {!!preview.excluded.length && (
            <ul className="ld-issues">
              {preview.excluded.map(e => (
                <li key={e.contactId}>
                  <bdi>{e.name || '—'}</bdi> <bdi dir="ltr">{e.number}</bdi> · {s.t(`reason_${e.reason}`)}
                </li>
              ))}
            </ul>
          )}
          {overLimit && (
            <p className="ld-inline-error" role="alert">
              {s.t('resendOverLimit', { cap: preview.cap })}
            </p>
          )}
          {!eligible.length && <p className="ld-help">{s.reason('no_eligible_recipients')}</p>}
          <p className="ld-help ld-fees-short">
            {s.t('metaFeeLine')}{' '}
            <a className="ld-link" href={META_PRICING_URL} target="_blank" rel="noopener noreferrer">
              {s.t('feesPricing')}
            </a>
          </p>
          {!sending && (
            <p className="ld-help" role="status">
              {s.t('sendingOffShort')}
            </p>
          )}
        </>
      )}
      {error && (
        <p className="ld-inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="ld-actions ld-wizard-nav">
        <button type="button" className="ld-button ld-quiet" onClick={onClose} disabled={busy}>
          {s.t('cancel')}
        </button>
        <button
          type="button"
          className="ld-button ld-primary"
          onClick={send}
          disabled={busy || !sending || !eligible.length || overLimit}
        >
          {busy ? s.t('sending') : s.t('sendNow')}
        </button>
      </div>
    </Dialog>
  );
}
