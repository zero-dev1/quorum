import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useResultsReader } from '../hooks/useResultsReader';
import { PollCard } from '../components/PollCard';
import { COLORS, FONTS } from '../lib/constants';

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(value * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, value]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

function FadeInSection({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
      }}
    >
      {children}
    </div>
  );
}

interface PollPreview {
  id: bigint;
  creator: string;
  endTime: bigint;
}

export function Landing() {
  const { getActivePollCount, getPollList } = useResultsReader();
  const [activePolls, setActivePolls] = useState<bigint>(0n);
  const [previewPolls, setPreviewPolls] = useState<PollPreview[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const count = await getActivePollCount();
      if (count !== null) setActivePolls(count);

      const polls = await getPollList(0n, 3n);
      setPreviewPolls(polls.map((p) => ({ id: p.id, creator: p.creator, endTime: p.endTime })));
    };
    fetchStats();
  }, [getActivePollCount, getPollList]);

  return (
    <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Hero Section */}
      <section
        style={{
          padding: '120px 24px 80px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1
            style={{
              fontFamily: FONTS.headline,
              fontSize: 'clamp(48px, 6vw, 72px)',
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: '0 0 24px 0',
              letterSpacing: '-0.02em',
              textAlign: 'left',
            }}
          >
            Every Vote.<br />On-Chain. Final.
          </h1>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: '20px',
              fontWeight: 400,
              color: COLORS.textSecondary,
              margin: '0 0 40px 0',
              maxWidth: '560px',
              textAlign: 'left',
              lineHeight: 1.6,
            }}
          >
            Create polls. Cast votes. See results. All on-chain, all permanent. Powered by QF Network&apos;s 100ms blocks and negligible fees.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start' }}>
            <Link
              to="/explore"
              style={{
                padding: '16px 32px',
                backgroundColor: COLORS.primary,
                color: '#FFFFFF',
                fontFamily: FONTS.body,
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 150ms ease',
                borderRadius: '0px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primary;
              }}
            >
              Launch App
            </Link>
            <Link
              to="/about"
              style={{
                padding: '16px 32px',
                backgroundColor: 'transparent',
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textPrimary,
                fontFamily: FONTS.body,
                fontSize: '16px',
                fontWeight: 400,
                textDecoration: 'none',
                transition: 'border-color 150ms ease',
                borderRadius: '0px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = COLORS.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.border;
              }}
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Ticker */}
      <section style={{ padding: '0', borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}` }}>
        <div
          className="stats-grid"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
          }}
        >
          {[
            { value: Number(activePolls), label: 'ACTIVE POLLS' },
            { value: 0, label: 'TOTAL VOTES CAST' },
            { value: 0, label: 'UNIQUE VOTERS' },
            { value: 0, label: 'POLLS CREATED' },
          ].map((stat, index) => (
            <div
              key={index}
              style={{
                textAlign: 'center',
                padding: '32px 24px',
                borderRight: index < 3 ? `1px solid ${COLORS.border}` : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: '36px',
                  fontWeight: 400,
                  color: COLORS.primary,
                  marginBottom: '8px',
                }}
              >
                <AnimatedCounter value={stat.value} />
              </div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: '12px',
                  fontWeight: 400,
                  color: COLORS.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '96px 24px' }}>
        <FadeInSection>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2
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
            </h2>
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
                  description: 'Register a QNS name to create polls and establish your on-chain identity.',
                },
                {
                  step: '02',
                  title: 'Create a Poll',
                  description: 'Set your question, options, duration, and who can vote. Pay 100 QF.',
                },
                {
                  step: '03',
                  title: 'Vote On-Chain',
                  description: 'Cast your vote as a permanent transaction. Every vote is recorded forever.',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    padding: '32px',
                  }}
                >
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
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Features */}
      <section style={{ padding: '96px 24px', borderTop: `1px solid ${COLORS.border}` }}>
        <FadeInSection>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2
              style={{
                fontFamily: FONTS.headline,
                fontSize: '32px',
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: '0 0 48px 0',
                textAlign: 'center',
              }}
            >
              Features
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '32px',
              }}
            >
              {[
                {
                  title: 'Permanent Records',
                  description: 'Every vote is a transaction on QF Network. Results are immutable and transparent.',
                },
                {
                  title: 'Identity Integration',
                  description: 'Use your .qf name from QNS. Vote and create polls with human-readable identity.',
                },
                {
                  title: 'Flexible Eligibility',
                  description: 'Open voting, token-gated, or pod-member only. Control who can participate.',
                },
                {
                  title: 'Zero Voting Fees',
                  description: 'Voting costs only gas (negligible on QF Network). Maximum participation.',
                },
              ].map((feature, index) => (
                <div key={index} style={{ padding: '24px', display: 'flex', gap: '16px' }}>
                  <div
                    style={{
                      width: '4px',
                      backgroundColor: COLORS.primary,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <h3
                      style={{
                        fontFamily: FONTS.body,
                        fontSize: '18px',
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        margin: '0 0 12px 0',
                      }}
                    >
                      {feature.title}
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
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Active Polls Preview */}
      <section style={{ padding: '96px 24px', borderTop: `1px solid ${COLORS.border}` }}>
        <FadeInSection>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
              }}
            >
              <h2
                style={{
                  fontFamily: FONTS.headline,
                  fontSize: '32px',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: 0,
                }}
              >
                Active Polls
              </h2>
              <Link
                to="/explore"
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  color: COLORS.primary,
                  textDecoration: 'none',
                }}
              >
                View All &rarr;
              </Link>
            </div>
            <div
              className="polls-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '24px',
              }}
            >
              {previewPolls.length > 0 ? (
                previewPolls.map((poll) => (
                  <PollCard
                    key={poll.id.toString()}
                    pollId={poll.id}
                    creator={poll.creator}
                    endTime={poll.endTime}
                  />
                ))
              ) : (
                <p
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: '15px',
                    color: COLORS.textSecondary,
                    textAlign: 'center',
                    padding: '48px 0',
                    gridColumn: '1 / -1',
                  }}
                >
                  No active polls yet. Be the first to create one!
                </p>
              )}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Ecosystem */}
      <section style={{ padding: '96px 24px', borderTop: `1px solid ${COLORS.border}` }}>
        <FadeInSection>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2
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
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
              }}
            >
              {[
                { name: 'QNS', subtitle: 'Your .qf name is your voter ID' },
                { name: 'QFLink', subtitle: 'Create polls inside pod conversations' },
                { name: 'QFPad', subtitle: 'Token communities poll their holders' },
              ].map((item) => (
                <div
                  key={item.name}
                  style={{
                    backgroundColor: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    padding: '24px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTS.headline,
                      fontSize: '24px',
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      margin: '0 0 8px 0',
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: '15px',
                      fontWeight: 400,
                      color: COLORS.textSecondary,
                    }}
                  >
                    {item.subtitle}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* CTA */}
      <section style={{ padding: '96px 24px', borderTop: `1px solid ${COLORS.border}` }}>
        <FadeInSection>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2
              style={{
                fontFamily: FONTS.headline,
                fontSize: '40px',
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: '0 0 16px 0',
              }}
            >
              Your Chain. Your Voice.
            </h2>
            <p
              style={{
                fontFamily: FONTS.body,
                fontSize: '16px',
                fontWeight: 400,
                color: COLORS.textSecondary,
                margin: '0 0 32px 0',
              }}
            >
              QUORUM is free to use. All you need is a wallet and a .qf name.
            </p>
            <Link
              to="/explore"
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                backgroundColor: COLORS.primary,
                color: '#FFFFFF',
                fontFamily: FONTS.body,
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 150ms ease',
                borderRadius: '0px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primary;
              }}
            >
              Launch App
            </Link>
          </div>
        </FadeInSection>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .polls-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
