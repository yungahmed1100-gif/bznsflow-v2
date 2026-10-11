import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { dashboardSearch } from '../../../lib/dashboard/navigation';
import { useHasib } from '../HasibContext';

/**
 * A six-tab sector's records beside a chat or a customer: loads `operation` for the open
 * conversation or contact (only on that sector's pack, never in the read-only preview) and gives
 * the card a way to open the same record in Work with a Back that returns here.
 * @returns {null | { items: object[], hb: object, go: (extra: object) => void }}
 */
export function useWorkContext({ packId, operation, conversationId, contactId }) {
  const hb = useHasib();
  const [params, setParams] = useSearchParams();
  const enabled = hb?.overview?.pack?.id === packId && !hb.overview.readOnly && !!(conversationId || contactId);
  const state = usePolling(() => hasib(operation, conversationId ? { conversationId } : { contactId }), [conversationId, contactId], { interval: 30000, enabled });
  if (!enabled || !state.data?.items?.length) return null;
  const from = conversationId ? { from: 'chat', chat: conversationId } : { from: 'customers' };
  return { items: state.data.items, hb, go: extra => setParams(dashboardSearch(params, 'work', { ...extra, ...from })) };
}

/** The open follow-ups a context card lists; `tones` colours the bucket where the sector does. */
export function ContextFollowups({ followups, kindLabel, bucketLabel, tones }) {
  if (!followups.length) return null;
  return <ul className="hb-deal-context-followups">{followups.map(f => <li key={`${f.source}:${f.id}`} data-bucket={f.bucket}>
    {kindLabel(f)} · {tones ? <span data-tone={tones[f.bucket]}>{bucketLabel(f.bucket)}</span> : bucketLabel(f.bucket)}</li>)}</ul>;
}

/** "Follow-ups (n)" on a context card, opening Work → Follow-ups filtered to the record. */
export const ContextFollowupsButton = ({ ar, count, onOpen }) => count > 0 ? <button type="button" className="ld-button ld-quiet" onClick={onOpen}>
  {ar ? `المتابعات (${count})` : `Follow-ups (${count})`}</button> : null;
