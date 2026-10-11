// Preload for refactor snapshots: the whole process lives at one instant, so the demo seeds and
// every response are identical between two runs of the same code.
const FIXED = Date.UTC(2026, 9, 11, 8, 0, 0); // 12:00 in Muscat
const Real = Date;
class Fixed extends Real { constructor(...a) { super(...(a.length ? a : [FIXED])); } static now() { return FIXED; } }
globalThis.Date = Fixed;
