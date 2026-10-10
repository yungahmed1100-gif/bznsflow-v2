import React from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { DealDetail } from './DealDetail.jsx';

/**
 * One deal's full record, read by its id: the deal itself, every viewing, offer and draft of it
 * (by index, not the agency's newest page) and its follow-ups. Works from any link: board, chat, Insights.
 */
export function DealRecord({ dealId, ar, h, s, timezone, manager, busy, termsDays, version, backLabel, act, openForm, onGo, onClose, onFollowups }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const state = usePolling(async () => {
    const [deal, viewings, offers, drafts, followups] = await Promise.all([
      hasib('opportunities', { opportunityId: dealId }), hasib('viewings', { opportunityId: dealId }), hasib('offers', { opportunityId: dealId }),
      hasib('drafts', { opportunityId: dealId }), hasib('real_estate_followups', { opportunityId: dealId }),
    ]);
    return { deal: deal.items[0], viewings: viewings.items, offers: offers.items, drafts: drafts.items, followups: followups.items };
  }, [dealId, version], { interval: 30000 });
  if (state.loading && !state.data) return <p className="ld-state" role="status">{s.t('loading')}</p>;
  if (state.error && !state.data) return <div className="ld-state" role="alert"><p>{h.reason(state.error.reason) || s.reason(state.error.reason)}</p>
    <button type="button" className="ld-button" onClick={onClose}>{backLabel || tr('Back to all deals', 'العودة إلى كل الصفقات')}</button></div>;
  const d = state.data;
  // Each change reloads this record as well as the list it came from.
  const actHere = (operation, body, after, question) => act(operation, body, () => { state.refresh({ quiet: true }); after?.(); }, question);
  return <DealDetail deal={d.deal} ar={ar} h={h} s={s} timezone={timezone} manager={manager} busy={busy} termsDays={termsDays}
    viewings={d.viewings} offers={d.offers} drafts={d.drafts} followups={d.followups} backLabel={backLabel}
    act={actHere} openForm={openForm} onGo={onGo} onClose={onClose} onFollowups={onFollowups} />;
}
