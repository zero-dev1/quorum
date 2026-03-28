// src/lib/motion.ts
// Check if user prefers reduced motion
// Framer Motion automatically respects this for most animations,
// but we use this for our custom counters and manual animations.
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Central animation configuration for QUORUM
// All duration/easing values live here so we can tune globally.

export const MOTION = {
  // Reduced motion check
  respectReducedMotion: true,

  // Page transitions (standard route changes)
  page: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1], // cubic-bezier
    },
  },

  // The cinematic portal transition (Landing → Explore)
  portal: {
    // Phase 1: Landing fades and scales down
    landingExit: {
      opacity: 0,
      scale: 0.97,
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    // Phase 2: Indigo overlay pulses
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 0.18 },
      exit: { opacity: 0 },
      transition: { duration: 0.35, ease: 'easeInOut' },
    },
    // Phase 3: Black void with aphorism
    void: {
      duration: 1.2, // total void time including text display
      textDelay: 0.15, // delay before text appears
      textDuration: 0.8, // how long text is visible
    },
    // Phase 4: Explore page enters
    exploreEnter: {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
    },
  },

  // Stagger children (for lists of cards, options, etc.)
  stagger: {
    container: {
      animate: { transition: { staggerChildren: 0.05 } },
    },
    item: {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
    },
  },

  // Result bars growing
  bar: {
    initial: { width: '0%' },
    // animate width is dynamic, set per-bar
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
    staggerDelay: 0.06, // delay between consecutive bars
  },

  // Modal entrance
  modal: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    content: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
    },
  },

  // Toast slide-in
  toast: {
    initial: { opacity: 0, x: 80 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 80 },
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },

  // Hover lift for cards
  cardHover: {
    y: -2,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },

  // Tab underline (uses layoutId)
  tabUnderline: {
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },

  // Counter animation duration (ms)
  counter: {
    duration: 1200,
  },

  // Scroll-triggered entrance
  scrollReveal: {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
} as const;

// Governance aphorisms for the portal void
export const PORTAL_APHORISMS = [
  'Consensus begins here.',
  'Every voice. Permanent.',
  'Your chain. Your rules.',
  'Democracy, on-chain.',
  'The record is immutable.',
  'Governance without trust.',
] as const;

export function getRandomAphorism(): string {
  return PORTAL_APHORISMS[Math.floor(Math.random() * PORTAL_APHORISMS.length)];
}
