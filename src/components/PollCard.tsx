// src/components/PollCard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useResultsReader } from '../hooks/useResultsReader';
import { QNSName } from './QNSName';
import { COLORS, FONTS } from '../lib/constants';
import { MOTION } from '../lib/motion';

interface PollCardProps {
  pollId: bigint;
  creator?: string;
  endTime?: bigint;
  userVote?: { optionIndex: number } | null;
}

export function PollCard({ pollId, creator: initialCreator, endTime: initialEndTime, userVote }: PollCardProps) {
  const { getPollResults } = useResultsReader();
  const [poll, setPoll] = useState<{
    question: string;
    options: readonly string[];
    voteCounts: readonly bigint[];
    totalVotes: bigint;
    percentages: readonly bigint[];
    leadingOptionIndex: bigint;
    isActive: boolean;
  } | null>(null);
  const [creator] = useState<string>(initialCreator || '');
  const [endTime] = useState<bigint>(initialEndTime || 0n);

  useEffect(() => {
    getPollResults(pollId).then((results) => {
      if (results) setPoll(results);
    });
  }, [pollId, getPollResults]);

  const isActive = (() => {
    if (!poll) return false;
    const now = Date.now() / 1000;
    const end = Number(endTime);
    if (end > 0 && now > end) return false;
    return poll.isActive;
  })();

  const timeText = (() => {
    if (!poll) return '';
    const now = Date.now() / 1000;
    const end = Number(endTime);
    if (end === 0) return isActive ? 'Active' : 'Ended';
    const diff = Math.max(0, end - now);
    if (now > end || !poll.isActive) return 'Ended';
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    return `${days}d ${hours}h left`;
  })();

  const leadingPct = poll && poll.totalVotes > 0n
    ? Number(poll.percentages[Number(poll.leadingOptionIndex)]) / 100
    : 0;

  const leadingOption = poll && poll.totalVotes > 0n
    ? poll.options[Number(poll.leadingOptionIndex)]
    : null;

  return (
    <Link to={`/poll/${pollId}`} style={{ textDecoration: 'none', display: 'block' }}>
      <motion.div
        whileHover={MOTION.cardHover}
        style={{
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          padding: '24px',
          paddingLeft: '27px', // 3px accent + 24px padding
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 200ms ease',
        }}
        onHoverStart={(e: any) => {
          // Expand left accent bar via CSS — handled by the accent div below
        }}
      >
        {/* Left accent bar */}
        <motion.div
          initial={{ height: '3px' }}
          whileHover={{ height: '100%' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '3px',
            backgroundColor: isActive ? COLORS.primary : COLORS.textMuted,
          }}
        />

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: isActive ? COLORS.success : COLORS.textMuted,
              // Pulsing dot for active polls
              animation: isActive ? 'activePulse 2s ease-in-out infinite' : 'none',
            }}
          />
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isActive ? COLORS.success : COLORS.textMuted,
            }}
          >
            {isActive ? 'Active' : 'Ended'}
          </span>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: '11px',
              color: COLORS.textMuted,
              marginLeft: 'auto',
            }}
          >
            {timeText}
          </span>
        </div>

        {/* Question */}
        <h3
          style={{
            fontFamily: FONTS.headline,
            fontSize: 'clamp(16px, 1.5vw, 18px)',
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: '0 0 8px 0',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {poll?.question || 'Loading...'}
        </h3>

        {/* Creator + vote count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {creator && creator.startsWith('0x') && creator.length === 42 && (
            <span style={{ fontFamily: FONTS.mono, fontSize: '13px', color: COLORS.textSecondary }}>
              <QNSName address={creator} linkToProfile={false} />
            </span>
          )}
          {poll && (
            <span style={{ fontFamily: FONTS.mono, fontSize: '13px', color: COLORS.textMuted }}>
              {poll.totalVotes.toString()} votes
            </span>
          )}
        </div>

        {/* Leading option bar */}
        {leadingOption && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '13px',
                  color: COLORS.textSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '70%',
                }}
              >
                {leadingOption}
              </span>
              <span style={{ fontFamily: FONTS.mono, fontSize: '13px', color: COLORS.primary }}>
                {leadingPct.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: '3px', backgroundColor: COLORS.border }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(leadingPct, 100)}%` }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ height: '100%', backgroundColor: COLORS.primary }}
              />
            </div>
          </div>
        )}

        {/* User vote indicator */}
        {userVote && poll && (
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: '12px',
              color: COLORS.primary,
              marginTop: '12px',
            }}
          >
            Voted: "{poll.options[userVote.optionIndex]}"
          </div>
        )}
      </motion.div>

      {/* Active pulse keyframes */}
      <style>{`
        @keyframes activePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Link>
  );
}
