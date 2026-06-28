// Shared motion language for BznsFlow — easings, springs, and reusable variants.
// One source of truth so every section animates with the same feel (DRY).
// Used with `m.*` components from motion/react under LazyMotion (see RootLayout).

// ── Easings ──────────────────────────────────────────────────────────────────
export const easeOutExpo = [0.16, 1, 0.3, 1];
export const easeOutQuint = [0.22, 1, 0.36, 1];

// ── Spring presets ───────────────────────────────────────────────────────────
export const spring = {
  smooth: { type: 'spring', stiffness: 120, damping: 20, mass: 0.6 },
  snappy: { type: 'spring', stiffness: 320, damping: 26, mass: 0.5 },
  soft:   { type: 'spring', stiffness: 90,  damping: 18, mass: 0.8 },
};

// ── Reveal variants ──────────────────────────────────────────────────────────
export const fadeUp = {
  hidden: { opacity: 0, y: 34 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOutExpo } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.6, ease: easeOutExpo } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94, y: 20 },
  show:   { opacity: 1, scale: 1, y: 0, transition: { duration: 0.65, ease: easeOutExpo } },
};

// Headline clip-reveal (wipe up). Pair with overflow:hidden on a wrapper.
export const clipReveal = {
  hidden: { opacity: 0, y: '110%' },
  show:   { opacity: 1, y: '0%', transition: { duration: 0.8, ease: easeOutExpo } },
};

// ── Stagger orchestration ────────────────────────────────────────────────────
export const staggerContainer = (stagger = 0.1, delayChildren = 0.05) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

export const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOutExpo } },
};

// Shared viewport config for whileInView reveals (fire once, slightly early).
export const viewportOnce = { once: true, margin: '0px 0px -12% 0px' };
