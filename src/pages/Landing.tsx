// src/pages/Landing.tsx
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useAnimation } from 'framer-motion';
import { PortalTransition, triggerPortal } from '../components/PortalTransition';
import { useResultsReader } from '../hooks/useResultsReader';
import { COLORS, FONTS } from '../lib/constants';
import { MOTION, prefersReducedMotion } from '../lib/motion';

// ── Animated counter (scroll-triggered) ──
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    
    if (prefersReducedMotion()) {
      setCount(value);
      return;
    }
    
    const duration = 800;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, value]);

  if (prefersReducedMotion()) {
    return (
      <span ref={ref} style={{ fontFamily: FONTS.mono, fontSize: 'clamp(28px, 4vw, 40px)', color: COLORS.primary }}>
        {value.toLocaleString()}{suffix}
      </span>
    );
  }

  return (
    <span ref={ref} style={{ fontFamily: FONTS.mono, fontSize: 'clamp(28px, 4vw, 40px)', color: COLORS.primary }}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// ── Word-by-word hero text ──
function HeroHeadline() {
  const words = ['Every', 'Vote.', 'On-Chain.', 'Final.'];

  return (
    <h1
      style={{
        fontFamily: FONTS.headline,
        fontSize: 'clamp(48px, 7vw, 88px)',
        fontWeight: 800,
        color: COLORS.textPrimary,
        margin: 0,
        letterSpacing: '-0.03em',
        lineHeight: 1.05,
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            word === 'Final.'
              ? {
                  delay: 0.15 + i * 0.18,
                  type: 'spring',
                  stiffness: 300,
                  damping: 15,
                }
              : {
                  delay: 0.15 + i * 0.18,
                  duration: 0.5,
                  ease: [0.25, 0.1, 0.25, 1],
                }
          }
          style={{
            display: 'inline-block',
            marginRight: '0.25em',
          }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

// ── Main Landing component ──
export function Landing() {
  const { getActivePollCount } = useResultsReader();
  const [activePolls, setActivePolls] = useState(0);

  useEffect(() => {
    getActivePollCount().then((count) => {
      if (count !== null) setActivePolls(Number(count));
    });
  }, [getActivePollCount]);

  const handleEnter = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerPortal();
  };

  return (
    <PortalTransition>
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh' }}>
        {/* ── Minimal TopBar for Landing ── */}
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 50,
            // No border — clean
          }}
        >
          <span
            style={{
              fontFamily: FONTS.headline,
              fontSize: '18px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            QUORUM
          </span>
          <Link
            to="/about"
            style={{
              fontFamily: FONTS.body,
              fontSize: '14px',
              color: COLORS.textSecondary,
              textDecoration: 'none',
            }}
          >
            About
          </Link>
        </header>

        {/* ── Hero Section ── */}
        <section
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 24px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          <HeroHeadline />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            style={{
              fontFamily: FONTS.body,
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: COLORS.textSecondary,
              maxWidth: '560px',
              margin: '24px 0 40px 0',
              lineHeight: 1.6,
            }}
          >
            Create polls. Cast votes. See results. All on-chain, all permanent.
            Powered by QF Network.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}
          >
            <motion.button
              onClick={handleEnter}
              whileTap={{ scale: 0.97 }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(99, 102, 241, 0.15)',
                  '0 0 40px rgba(99, 102, 241, 0.25)',
                  '0 0 20px rgba(99, 102, 241, 0.15)',
                ],
              }}
              transition={{
                boxShadow: {
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }}
              style={{
                padding: '18px 48px',
                backgroundColor: COLORS.primary,
                border: 'none',
                color: '#FFFFFF',
                fontFamily: FONTS.body,
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                position: 'relative',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = COLORS.primaryHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = COLORS.primary)
              }
            >
              Enter QUORUM
            </motion.button>
            <Link
              to="/about"
              style={{
                padding: '16px 40px',
                backgroundColor: 'transparent',
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textPrimary,
                fontFamily: FONTS.body,
                fontSize: '16px',
                textDecoration: 'none',
                transition: 'border-color 150ms ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = COLORS.primary)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = COLORS.border)
              }
            >
              How It Works
            </Link>
          </motion.div>
        </section>

        {/* ── Stats Ticker ── */}
        <section
          style={{
            borderTop: `1px solid ${COLORS.border}`,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            className="stats-grid-landing"
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
            }}
          >
            {[
              { value: activePolls, label: 'ACTIVE POLLS' },
              { value: 0, label: 'TOTAL VOTES' },
              { value: 0, label: 'UNIQUE VOTERS' },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  padding: '40px 24px',
                  borderRight: i < 2 ? `1px solid ${COLORS.border}` : 'none',
                }}
              >
                <div
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 'clamp(28px, 4vw, 40px)',
                    color: COLORS.primary,
                    marginBottom: '8px',
                  }}
                >
                  <AnimatedCounter value={stat.value} />
                </div>
                <div
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: '11px',
                    color: COLORS.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section style={{ padding: '96px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <motion.h2
              {...MOTION.scrollReveal}
              style={{
                fontFamily: FONTS.headline,
                fontSize: '32px',
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: '0 0 48px 0',
                textAlign: 'center',
              }}
            >
              How It Works
            </motion.h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
              }}
            >
              {[
                {
                  step: '01',
                  title: 'Get Your .qf Name',
                  desc: 'Register a QNS name to create polls and establish your on-chain identity.',
                },
                {
                  step: '02',
                  title: 'Create a Poll',
                  desc: 'Set your question, options, duration, and who can vote. Pay 100 QF.',
                },
                {
                  step: '03',
                  title: 'Vote On-Chain',
                  desc: 'Cast your vote as a permanent transaction. Every vote is recorded forever.',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    delay: i * 0.1,
                    duration: 0.5,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  style={{
                    backgroundColor: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    padding: '32px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Watermark step number */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '16px',
                      fontFamily: FONTS.mono,
                      fontSize: '96px',
                      fontWeight: 400,
                      color: COLORS.border,
                      opacity: 0.4,
                      lineHeight: 1,
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    {item.step}
                  </span>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: '14px',
                      color: COLORS.primary,
                    }}
                  >
                    {item.step}
                  </span>
                  <h3
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: '20px',
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      margin: '16px 0 12px 0',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: '15px',
                      color: COLORS.textSecondary,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Ecosystem ── */}
        <section
          style={{
            padding: '96px 24px',
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <motion.h2
              {...MOTION.scrollReveal}
              style={{
                fontFamily: FONTS.headline,
                fontSize: '36px',
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: '0 0 48px 0',
                textAlign: 'center',
              }}
            >
              One Network. One Identity. One Vote.
            </motion.h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
              }}
            >
              {[
                { name: 'QNS', subtitle: 'Your .qf name is your voter ID', accent: '#00D179' },
                { name: 'QFLink', subtitle: 'Create polls inside pod conversations', accent: '#3B82F6' },
                { name: 'QFPad', subtitle: 'Token communities poll their holders', accent: '#F59E0B' },
              ].map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  whileHover={{
                    borderColor: item.accent,
                    transition: { duration: 0.2 },
                  }}
                  style={{
                    backgroundColor: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'default',
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTS.headline,
                      fontSize: '24px',
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      marginBottom: '8px',
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: '15px',
                      color: COLORS.textSecondary,
                    }}
                  >
                    {item.subtitle}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section
          style={{
            padding: '96px 24px',
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <motion.div
            {...MOTION.scrollReveal}
            style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}
          >
            <h2
              style={{
                fontFamily: FONTS.headline,
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: '0 0 16px 0',
              }}
            >
              Governance belongs on-chain.
            </h2>
            <p
              style={{
                fontFamily: FONTS.body,
                fontSize: '16px',
                color: COLORS.textSecondary,
                margin: '0 0 32px 0',
              }}
            >
              All you need is a wallet and a .qf name.
            </p>
            <motion.button
              onClick={handleEnter}
              whileTap={{ scale: 0.97 }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(99, 102, 241, 0.15)',
                  '0 0 40px rgba(99, 102, 241, 0.25)',
                  '0 0 20px rgba(99, 102, 241, 0.15)',
                ],
              }}
              transition={{
                boxShadow: {
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }}
              style={{
                padding: '18px 48px',
                backgroundColor: COLORS.primary,
                border: 'none',
                color: '#FFFFFF',
                fontFamily: FONTS.body,
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                position: 'relative',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = COLORS.primaryHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = COLORS.primary)
              }
            >
              Enter QUORUM
            </motion.button>
          </motion.div>
        </section>

        {/* ── Footer (inline for landing, since global footer won't show) ── */}
        <footer
          style={{
            borderTop: `1px solid ${COLORS.border}`,
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: '12px',
              color: COLORS.textMuted,
            }}
          >
            © 2026 QUORUM · Built on QF Network
          </span>
        </footer>
      </div>
    </PortalTransition>
  );
}
