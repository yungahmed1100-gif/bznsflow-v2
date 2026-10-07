import React, { useEffect, useRef } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { DashboardError, messaging, messagingState } from '../../lib/dashboard/api';
import { channelBody, channelName } from '../../lib/dashboard/channels';
import { LaylaSwitch } from './LaylaSwitch';

const OWNER_REASONS = ['', 'owner_paused', 'not_activated'];

/**
 * Layla's switch for one channel. The dashboard passes the state it already
 * holds; the setup page lets the switch read its own.
 *
 * `autoOn` is set only when the channel was connected moments ago on this page:
 * Layla then switches on once. The server keeps any choice the owner already made.
 */
export function ChannelSwitch({ s, channel = 'whatsapp', state: given, autoOn = false, onChanged, onActive }) {
  const own = usePolling(() => messagingState(channel), [channel], { interval: 30000, enabled: !given });
  const state = given || own.data;
  const refresh = async () => {
    if (!given) await own.refresh({ quiet: true });
    await onChanged?.();
  };
  const tried = useRef(false);
  useEffect(() => { if (state) onActive?.(!!state.active); }, [state?.active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!autoOn || tried.current || !state || state.active || state.reason !== 'not_activated') return;
    tried.current = true;
    // A refusal (for example, business details not saved yet) shows on the switch after the refresh.
    messaging('activate', { ...channelBody(channel), auto: true }).catch(() => {}).finally(refresh);
  }, [autoOn, state?.active, state?.reason]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(next) {
    const result = await messaging(next ? 'activate' : 'pause', channelBody(channel));
    if (next && result?.active === false) {
      await refresh();
      throw new DashboardError(result.reason || 'activation_not_ready');
    }
    await refresh();
  }
  const name = channelName(channel, s.ar);
  const reason = state?.active ? '' : state?.reason || '';
  return <LaylaSwitch s={s} on={!!state?.active} disabled={!state || state.available === false}
    label={state?.active ? s.t('activeOn', { channel: name }) : s.t('pausedOn', { channel: name })}
    problem={state?.available === false ? s.reason('messaging_unavailable') : OWNER_REASONS.includes(reason) ? '' : s.reason(reason)}
    onToggle={toggle} />;
}
