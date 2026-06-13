// BznsFlow i18n loader.
//
// English + Arabic ship in the main bundle (the two primary first-paint
// languages). Dutch / German / Spanish are lazy-loaded on demand so their
// strings never weigh down the initial download.

import en from './en.js';
import ar from './ar.js';

// Synchronously available languages (bundled).
export const EAGER_LANGS = ['en', 'ar'];

// All languages the UI offers.
export const ALL_LANGS = ['en', 'ar', 'nl', 'es', 'de'];

// Live store the app reads from. Eager langs are present immediately; lazy langs
// are filled in once their chunk resolves.
const store = { en, ar };

// Lazy importers — each pulls a separate chunk.
const lazyLoaders = {
  nl: () => import('./nl.js').then(m => m.default),
  es: () => import('./es.js').then(m => m.default),
  de: () => import('./de.js').then(m => m.default),
};

// Returns strings synchronously if loaded, else null. Falls back to English.
export function getStrings(lang) {
  return store[lang] || store.en;
}

export function isLoaded(lang) {
  return Boolean(store[lang]);
}

// Loads a lazy language and caches it. Resolves with the strings.
export async function loadLang(lang) {
  if (store[lang]) return store[lang];
  const loader = lazyLoaders[lang];
  if (!loader) return store.en;
  const strings = await loader();
  store[lang] = strings;
  return strings;
}
