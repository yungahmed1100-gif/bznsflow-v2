import React from 'react';
import { messaging, setupPath, DashboardError } from '../../lib/dashboard/api';
import { channelName, channelsFrom, masterState, needsAttention, setAll } from '../../lib/dashboard/channels';
import { formatPhone } from '../../lib/dashboard/phone';
import { formatDateTime } from '../../lib/dashboard/format';
import { LaylaSwitch } from './LaylaSwitch';

/** Layla's master switch and one health signal for every connected channel, always visible. */
export function DashboardHeader({ s, data, onChange }) {
  const channels = channelsFrom(data);
  const state = masterState(channels);
  const attention = needsAttention(channels);
  const connected = channels.filter(c => c.connected);
  const names = list => list.map(c => channelName(c.id, s.ar)).join(' · ');
  const replying = connected.filter(c => c.active), resting = connected.filter(c => !c.active);
  const detail = state === 'mixed' ? s.t('mixedDetail', { on: names(replying), off: names(resting) }) : names(connected);
  const whatsapp = channels.find(c => c.id === 'whatsapp');
  const checkedAt = data.integration?.checkedAt;
  async function toggle(on) {
    const failed = await setAll(on, channels, messaging);
    await onChange();
    if (failed.length) throw new DashboardError(failed[0].reason);
  }
  return (
    <div className="ld-header">
      <div className="ld-identity">
        <strong>{data.business.name}</strong>
        {whatsapp && <bdi dir="ltr">{formatPhone(whatsapp.identity)}</bdi>}
      </div>
      {state === 'none' && !channels.length
        ? <a className="ld-button" href={setupPath(s.lang)}>{s.t('connectChannel')}</a>
        : <>
          {data.workspaceRole === 'employee' || state === 'none'
            ? <p className={`ld-layla ${state === 'on' || state === 'mixed' ? 'is-on' : ''}`} role="status">{state === 'on' || state === 'mixed' ? s.t('active') : s.t('paused')}<small>{detail}</small></p>
            : <LaylaSwitch s={s} on={state === 'on' || state === 'mixed'} detail={detail} onToggle={toggle} />}
          {React.createElement(data.workspaceRole === 'employee' ? 'p' : 'a', {
            className: `ld-health ${attention ? 'is-warn' : 'is-ok'}`,
            ...(data.workspaceRole === 'employee' ? {} : { href: '?tab=settings&view=channels' }),
            title: checkedAt ? s.t('checkedAt', { time: formatDateTime(checkedAt, s.lang, data.timezone) }) : undefined,
          }, <span aria-hidden="true" className="ld-dot" />, attention ? s.t('channelAttention', { channel: channelName(attention.id, s.ar) }) : s.t('connectionOk'))}
        </>}
    </div>
  );
}
