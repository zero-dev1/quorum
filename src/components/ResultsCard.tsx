import { useEffect, useState, useRef } from 'react';
import { useResultsReader } from '../hooks/useResultsReader';
import { COLORS, FONTS } from '../lib/constants';
import { RESULTS_READER_ADDRESS } from '../lib/contracts';

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

  const formatPercentage = (value: bigint) => {
    const num = Number(value);
    return (num / 100).toFixed(2);
  };

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
          const percentage = Number(results.percentages[index]) / 100;
          const isLeading = index === Number(results.leadingOptionIndex);
          const fillPercentage = animated ? percentage : 0;

          return (
            <div key={index}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: '14px',
                    fontWeight: 400,
                    color: COLORS.textPrimary,
                  }}
                >
                  {option}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: '14px',
                      color: COLORS.primary,
                    }}
                  >
                    {formatPercentage(results.percentages[index])}%
                  </span>
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

              <div
                style={{
                  height: '8px',
                  backgroundColor: COLORS.border,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${fillPercentage}%`,
                    backgroundColor: isLeading ? COLORS.primary : 'rgba(99, 102, 241, 0.4)',
                    transition: 'width 500ms ease-out',
                  }}
                />
              </div>
            </div>
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
