import { PilotError } from './config.js';

// Compatibility boundary for retired pilot modules. Customer setup is handled
// by review-api and Convex; no legacy database can be contacted.
export function customerStore() {
  const retired = async () => { throw new PilotError('legacy_storage_retired', 410); };
  return Object.fromEntries(['view','profile','rpc','fail','integration','update','claimRegistration','pause','binding','inbox','cleanup'].map(name => [name, retired]));
}
