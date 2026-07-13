// BznsFlow i18n loader.
//
// Two languages only: Arabic (primary, served at '/') and English (at '/en').
// Both ship in the main bundle — they are prerendered routes.

import en from './en.js';
import ar from './ar.js';

export const ALL_LANGS = ['ar', 'en'];

const store = { en, ar };

// Returns strings synchronously. Falls back to Arabic (the primary language).
export function getStrings(lang) {
  return store[lang] || store.ar;
}
