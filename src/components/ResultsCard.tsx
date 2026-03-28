import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useResultsReader } from '../hooks/useResultsReader';
import { COLORS, FONTS } from '../lib/constants';
import { RESULTS_READER_ADDRESS } from '../lib/contracts';
import { MOTION, prefersReducedMotion } from '../lib/motion';

interface ResultsCardProps {
  pollId: bigint;
  isActive: boolean;
}

export function ResultsCard({ pollId, isActive }: ResultsCardProps) {
  const { getPollResults } = useResultsReader();
  const [results, setResults] = useState<{
    question: string;
    options: readonly string[];
    voteCounts: readonly bigint[];
    totalVotes: bigint;
    percentages: readonly bigint[];
    leadingOptionIndex: bigint;
    isActive: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [animated, setAnimated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchResults = async () => {
      const data = await getPollResults(pollId);
      if (data) {
        setResults(data);
      }
    };
    fetchResults();
  }, [pollId, getPollResults]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleShare = () => {
    const url = `${window.location.origin}/poll/${pollId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // CountUpValue component for animated percentages
function CountUpValue({ target, delay = 0, suffix = '' }: { target: number; delay?: number; suffix?: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    const timeout = setTimeout(() => {
      const duration = 600;
      const start = performance.now();
      function tick(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [target, delay]);

  if (prefersReducedMotion()) {
    return (
      <span style={{ fontFamily: FONTS.mono, fontSize: '14px', color: COLORS.primary }}>
        {target.toFixed(1)}{suffix}
      </span>
    );
  }

  return (
    <span style={{ fontFamily: FONTS.mono, fontSize: '14px', color: COLORS.primary }}>
      {value.toFixed(1)}{suffix}
    </span>
  );
}

  if (!results) {
    return (
      <div
        ref={cardRef}
        style={{
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          padding: '24px',
        }}
      >
        <p style={{ fontFamily: FONTS.body, color: COLORS.textSecondary }}>
          Loading results...
        </p>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      style={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        padding: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h3
          style={{
            fontFamily: FONTS.body,
            fontSize: '18px',
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: 0,
          }}
        >
          Results
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: FONTS.body,
              fontSize: '14px',
              color: COLORS.textSecondary,
            }}
          >
            {isActive ? 'Live' : 'Final'}
          </span>
          <div
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: isActive ? COLORS.success : COLORS.textSecondary,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {results.options.map((option, index) => {
          const pct = Number(results.percentages[index]) / 100;
          const isLeading = index === Number(results.leadingOptionIndex) && results.totalVotes > 0n;
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontFamily: FONTS.body, fontSize: '14px', color: COLORS.textPrimary }}>
                  {option}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CountUpValue target={pct} delay={index * 0.06} suffix="%" />
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: '14px',
                      color: COLORS.textSecondary,
                    }}
                  >
                    {results.voteCounts[index].toString()} votes
                  </span>
                </div>
              </div>
              <div style={{ height: '6px', backgroundColor: COLORS.border, position: 'relative', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{
                    duration: 0.6,
                    delay: index * MOTION.bar.staggerDelay,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    backgroundColor: isLeading ? COLORS.primary : 'rgba(99, 102, 241, 0.25)',
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: '13px',
            color: COLORS.textSecondary,
          }}
        >
          Total: {results.totalVotes.toString()} votes
        </span>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={handleShare}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textSecondary,
              fontFamily: FONTS.body,
              fontSize: '13px',
              fontWeight: 400,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.primary;
              e.currentTarget.style.color = COLORS.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = COLORS.border;
              e.currentTarget.style.color = COLORS.textSecondary;
            }}
          >
            {copied ? 'Copied!' : 'Share Poll'}
          </button>

          <a
            href={`https://explorer.qfnode.net/address/${RESULTS_READER_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: FONTS.mono,
              fontSize: '12px',
              color: COLORS.primary,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Verify On-Chain &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
