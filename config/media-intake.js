// Media intake: Layla's "need" answer (config/layla-qualification.js media pack) to a production
// type Hasib understands (convex/hasib/mediaDomain.js PRODUCTION_TYPES). Editing alone is not a
// production Hasib can price from a package, so it maps to null and Adiba drafts the offer.
export const NEED_TO_PRODUCTION = Object.freeze({ photography: 'photo', video: 'video', audio: 'podcast', editing: null });

/** The production type for a need, or null when there is none to quote automatically. */
export const productionTypeFor = need => (Object.hasOwn(NEED_TO_PRODUCTION, need) ? NEED_TO_PRODUCTION[need] : null);
