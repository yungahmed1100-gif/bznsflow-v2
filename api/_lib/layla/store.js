import { PilotError } from './config.js';
import { assertBinding } from './domain.js';

// Retired pilot callers must inject their own test store. Live state uses the
// authenticated Convex clients; there is no legacy database fallback.
export function createStore() {
  const retired = async () => { throw new PilotError('legacy_storage_retired', 410); };
  return { read: retired, cas: retired };
}
// The callback must be synchronous and side-effect free: conflicts rerun it.
export async function transact(store, c, change) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { revision, state } = await store.read(c);
    assertBinding(state, c);
    const result = change(state);
    if (result && typeof result.then === 'function') throw new PilotError('async_transaction_forbidden', 500);
    if (await store.cas(c, revision, state)) return result;
  }
  throw new PilotError('storage_contention', 503);
}
