// src/components/PortalTransition.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MOTION, getRandomAphorism } from '../lib/motion';
import { COLORS, FONTS } from '../lib/constants';

type Phase = 'idle' | 'fading' | 'void' | 'entering' | 'done';

interface PortalTransitionProps {
  children: React.ReactNode; // The Landing page content
}

export function PortalTransition({ children }: PortalTransitionProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [aphorism] = useState(getRandomAphorism);
  const navigate = useNavigate();

  const trigger = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('fading');
  }, [phase]);

  useEffect(() => {
    if (phase === 'fading') {
      const timer = setTimeout(() => setPhase('void'), 500);
      return () => clearTimeout(timer);
    }
    if (phase === 'void') {
      const timer = setTimeout(() => {
        setPhase('done');
        navigate('/explore');
      }, MOTION.portal.void.duration * 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, navigate]);

  // Expose trigger via a custom event so buttons can call it
  useEffect(() => {
    const handler = () => trigger();
    window.addEventListener('quorum:enter', handler);
    return () => window.removeEventListener('quorum:enter', handler);
  }, [trigger]);

  return (
    <>
      {/* Landing content — fades/scales out */}
      <motion.div
        animate={
          phase === 'fading' || phase === 'void' || phase === 'done'
            ? MOTION.portal.landingExit
            : { opacity: 1, scale: 1 }
        }
        transition={MOTION.portal.landingExit.transition}
      >
        {children}
      </motion.div>

      {/* Indigo bleed overlay */}
      <AnimatePresence>
        {(phase === 'fading' || phase === 'void') && (
          <motion.div
            key="indigo-overlay"
            initial={MOTION.portal.overlay.initial}
            animate={MOTION.portal.overlay.animate}
            exit={MOTION.portal.overlay.exit}
            transition={MOTION.portal.overlay.transition}
            style={{
              position: 'fixed',
              inset: 0,
              background: `radial-gradient(ellipse at center, ${COLORS.primary}, transparent 70%)`,
              zIndex: 9998,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Black void with aphorism */}
      <AnimatePresence>
        {phase === 'void' && (
          <motion.div
            key="void"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: COLORS.background,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                delay: MOTION.portal.void.textDelay,
                duration: 0.4,
              }}
              style={{
                fontFamily: FONTS.headline,
                fontSize: 'clamp(20px, 3vw, 32px)',
                fontWeight: 700,
                color: COLORS.textPrimary,
                letterSpacing: '-0.01em',
                textAlign: 'center',
                padding: '0 24px',
              }}
            >
              {aphorism}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper to trigger the portal from any button
export function triggerPortal() {
  window.dispatchEvent(new CustomEvent('quorum:enter'));
}
