import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useResultsReader } from '../hooks/useResultsReader';
import { QNSName } from './QNSName';
import { COLORS, FONTS } from '../lib/constants';

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
  const [creator, setCreator] = useState<string>(initialCreator || '');
  const [endTime, setEndTime] = useState<bigint>(initialEndTime || 0n);

  useEffect(() => {
    const fetchPoll = async () => {
      const results = await getPollResults(pollId);
      if (results) {
        setPoll(results);
      }
    };
    fetchPoll();
  }, [pollId, getPollResults]);

  const getStatus = () => {
    if (!poll) return { text: '', color: COLORS.textSecondary, isActive: false };

    const now = Date.now() / 1000;
    const endTimestamp = Number(endTime);

    if (endTimestamp > 0 && now > endTimestamp) {
      return { text: 'ENDED', color: COLORS.textSecondary, isActive: false };
    } else if (!poll.isActive) {
      return { text: 'ENDED', color: COLORS.textSecondary, isActive: false };
    } else {
      return { text: 'ACTIVE', color: COLORS.success, isActive: true };
    }
  };

  const getTimeText = () => {
    if (!poll) return '';

    const now = Date.now() / 1000;
    const endTimestamp = Number(endTime);

    if (endTimestamp === 0) {
      return poll.isActive ? 'Active' : 'Ended';
    }

    const diff = Math.max(0, endTimestamp - now);
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);

    if (now > endTimestamp || !poll.isActive) {
      return 'Ended';
    } else {
      return `Ends in ${days}d ${hours}h`;
    }
  };

  const formatPercentage = (value: bigint) => {
    const num = Number(value);
    return (num / 100).toFixed(1);
  };

  const status = getStatus();
  const timeText = getTimeText();
  const hasResults = poll && poll.totalVotes > 0n;
  const leadingOption = hasResults && poll.leadingOptionIndex !== undefined
    ? poll.options[Number(poll.leadingOptionIndex)]
    : null;
  const leadingPercentage = hasResults && poll.leadingOptionIndex !== undefined
    ? poll.percentages[Number(poll.leadingOptionIndex)]
    : 0n;

  return (
    <Link
      to={`/poll/${pollId}`}
      style={{
        display: 'block',
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        padding: '24px',
        textDecoration: 'none',
        transition: 'border-color 150ms ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = COLORS.primary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = COLORS.border;
      }}
    >
      {/* Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: status.color,
          }}
        />
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: '12px',
            fontWeight: 400,
            textTransform: 'uppercase',
            color: status.color,
            letterSpacing: '0.05em',
          }}
        >
          {status.text}
        </span>
      </div>

      {/* Question */}
      <h3
        style={{
          fontFamily: FONTS.body,
          fontSize: '18px',
          fontWeight: 600,
          color: COLORS.textPrimary,
          margin: '0 0 12px 0',
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

      {/* Creator - only show if we have a valid creator address */}
      {creator && creator.startsWith('0x') && creator.length === 42 ? (
        <div
          style={{
            marginBottom: '12px',
          }}
        >
          <span style={{ fontFamily: FONTS.mono, fontSize: '13px', color: COLORS.textSecondary }}>
            by <QNSName address={creator} />
          </span>
        </div>
      ) : null}

      {/* Stats */}
      <div
        style={{
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: '13px',
            color: COLORS.textSecondary,
          }}
        >
          {poll ? `${poll.totalVotes.toString()} votes · ${timeText}` : 'Loading...'}
        </span>
      </div>

      {/* Leading Option with Progress Bar */}
      {hasResults && leadingOption && (
        <div>
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
                color: COLORS.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '70%',
              }}
            >
              {leadingOption}
            </span>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: '14px',
                fontWeight: 400,
                color: COLORS.primary,
              }}
            >
              {formatPercentage(leadingPercentage)}%
            </span>
          </div>
          <div
            style={{
              height: '4px',
              backgroundColor: COLORS.border,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(Number(leadingPercentage) / 100, 100)}%`,
                backgroundColor: COLORS.primary,
              }}
            />
          </div>
        </div>
      )}

      {/* User Vote Indicator */}
      {userVote && poll && (
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: '13px',
            color: COLORS.primary,
            marginTop: '12px',
          }}
        >
          You voted: &quot;{poll.options[userVote.optionIndex]}&quot;
        </div>
      )}
    </Link>
  );
}
