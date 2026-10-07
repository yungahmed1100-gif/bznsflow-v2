// One reading of the owner's channels for every surface that shows whether Layla
// is replying: the header switch, Settings → Channels and the sector dashboards.

const WHATSAPP_LIVE = ['connected', 'paused'];
const INSTAGRAM_GONE = ['disconnected', 'revoked'];
// Reasons the owner chose (or has not chosen yet). Anything else means a fix is needed.
export const OWNER_REASONS = Object.freeze(['', 'owner_paused', 'not_activated']);
// Messaging switched off for the whole platform is not a fault in the owner's channel:
// the switch says so, and the connection still reads healthy.
const NOT_A_FAULT = [...OWNER_REASONS, 'messaging_unavailable'];

export const CHANNEL_NAMES = { whatsapp: ['WhatsApp', 'واتساب'], instagram: ['Instagram', 'إنستغرام'] };
export const channelName = (id, ar) => CHANNEL_NAMES[id][ar ? 1 : 0];

/**
 * @param {object} overview the dashboard overview payload
 * @returns {{id:'whatsapp'|'instagram', identity:string, status:string, connected:boolean, healthy:boolean, active:boolean, available:boolean, reason:string}[]}
 */
export function channelsFrom(overview) {
  const list = [];
  const whatsapp = overview?.integration;
  if (whatsapp) {
    const connected = WHATSAPP_LIVE.includes(whatsapp.status);
    const checks = whatsapp.checks;
    list.push(channel('whatsapp', whatsapp.sender, whatsapp.status, connected,
      connected && !!(checks?.routing && checks?.registered && checks?.path), overview.messaging));
  }
  const instagram = overview?.instagram;
  if (instagram && !INSTAGRAM_GONE.includes(instagram.status)) {
    const connected = instagram.status === 'connected';
    list.push(channel('instagram', instagram.username, instagram.status, connected, connected, overview.instagramMessaging));
  }
  return list;
}

function channel(id, identity, status, connected, healthy, messaging) {
  const active = connected && !!messaging?.active;
  const reason = active ? '' : (messaging?.reason || 'not_activated');
  return { id, identity: identity || '', status: status || '', connected, active, available: messaging?.available !== false,
    healthy: healthy && NOT_A_FAULT.includes(reason), reason };
}

/** 'none' (nothing connected) | 'on' (every connected channel replies) | 'off' | 'mixed'. */
export function masterState(channels) {
  const connected = channels.filter(c => c.connected);
  if (!connected.length) return 'none';
  const replying = connected.filter(c => c.active).length;
  return replying === connected.length ? 'on' : replying === 0 ? 'off' : 'mixed';
}

/** The channel the owner should look at first, or null when every channel is fine. */
export function needsAttention(channels) {
  return channels.find(c => !c.healthy) || null;
}

export const channelBody = id => (id === 'instagram' ? { channel: 'instagram' } : {});

/**
 * Turns Layla on or off on every connected channel at once.
 * @returns {Promise<{id:string, reason:string}[]>} the channels that refused, empty when all succeeded
 */
export async function setAll(on, channels, messaging) {
  const targets = channels.filter(c => c.connected);
  const results = await Promise.allSettled(targets.map(c => messaging(on ? 'activate' : 'pause', channelBody(c.id))));
  return results.flatMap((r, i) => {
    if (r.status === 'rejected') return [{ id: targets[i].id, reason: r.reason?.reason || 'unknown' }];
    // An activate can succeed as a request yet leave the channel off (for example, facts not saved).
    if (on && r.value && r.value.active === false) return [{ id: targets[i].id, reason: r.value.reason || 'activation_not_ready' }];
    return [];
  });
}
