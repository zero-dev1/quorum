import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { useQNS } from '../hooks/useQNS';
import { usePollStorage } from '../hooks/usePollStorage';
import { useResultsReader } from '../hooks/useResultsReader';
import { useQFLink } from '../hooks/useQFLink';
import { VotingCard } from '../components/VotingCard';
import { ResultsCard } from '../components/ResultsCard';
import { EligibilityBadge } from '../components/EligibilityBadge';
import { QNSName } from '../components/QNSName';
import { PageTransition } from '../components/PageTransition';
import { COLORS, FONTS } from '../lib/constants';
import { MOTION } from '../lib/motion';

interface Poll {
  id: bigint;
  creator: `0x${string}`;
  question: string;
  description: string;
  options: readonly string[];
  startTime: bigint;
  endTime: bigint;
  eligibilityType: number;
  eligibilityToken: `0x${string}`;
  eligibilityPodId: bigint;
  isListed: boolean;
  totalVotes: bigint;
}

// Helper to validate Ethereum addresses
function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  return hexRegex.test(address);
}

export function PollDetail() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useWallet();
  const { hasQnsName } = useQNS(address);
  const { getPoll, getHasVoted } = usePollStorage();
  const { getPollResults, getVoterList } = useResultsReader();
  const { isPodMember } = useQFLink();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState('');
  const [voters, setVoters] = useState<readonly `0x${string}`[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const pollId = id ? BigInt(id) : 0n;

  useEffect(() => {
    const fetchPoll = async () => {
      const pollData = await getPoll(pollId);
      if (pollData) {
        setPoll(pollData);
        const now = BigInt(Math.floor(Date.now() / 1000));
        setIsActive(now >= pollData.startTime && now < pollData.endTime);
      }
    };
    fetchPoll();
  }, [pollId, getPoll, refreshTrigger]);

  useEffect(() => {
    const checkVoted = async () => {
      // Guard: only check if address is valid
      if (!isValidAddress(address)) {
        setHasVoted(false);
        return;
      }
      const voted = await getHasVoted(pollId, address);
      setHasVoted(voted);
    };
    checkVoted();
  }, [pollId, address, getHasVoted, refreshTrigger]);

  useEffect(() => {
    const fetchVoters = async () => {
      const list = await getVoterList(pollId, 0n, 20n);
      setVoters(list);
    };
    fetchVoters();
  }, [pollId, getVoterList, refreshTrigger]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!poll) return;

      if (poll.eligibilityType === 0) {
        setIsEligible(true);
        setEligibilityReason('');
      } else if (poll.eligibilityType === 1) {
        setIsEligible(true);
        setEligibilityReason('Requires QF tokens');
      } else if (poll.eligibilityType === 2) {
        setIsEligible(true);
        setEligibilityReason(`Requires holding token`);
      } else if (poll.eligibilityType === 3) {
        // POD_MEMBERS - check if user is a pod member
        if (address && isValidAddress(address)) {
          const isMember = await isPodMember(poll.eligibilityPodId, address);
          setIsEligible(isMember);
          setEligibilityReason(isMember ? '' : 'Requires pod membership');
        } else {
          setIsEligible(false);
          setEligibilityReason('Requires pod membership');
        }
      }
    };

    checkEligibility();
  }, [poll, address, isPodMember]);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const copyPollId = () => {
    navigator.clipboard.writeText(pollId.toString());
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!poll) {
    return (
      <div style={{ padding: '88px 24px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: FONTS.body, color: COLORS.textSecondary }}>
            Loading poll...
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div style={{ padding: '88px 24px 48px', minHeight: '100vh', overflowX: 'hidden' }}>
      <div
        className="poll-detail-grid"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '32px',
        }}
      >
        <div style={{ maxWidth: '800px' }}>
          {/* Poll Header */}
          <h1
            style={{
              fontFamily: FONTS.headline,
              fontSize: '28px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: '0 0 24px 0',
              lineHeight: 1.3,
            }}
          >
            {poll.question}
          </h1>

          {/* Metadata */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: '13px',
                  color: COLORS.textSecondary,
                }}
              >
                Created by
              </span>
              <QNSName address={poll.creator} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: '13px',
                  color: COLORS.textSecondary,
                }}
              >
                Poll ID:
              </span>
              <button
                onClick={copyPollId}
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: '13px',
                  color: COLORS.primary,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {copiedId ? 'Copied!' : `${pollId.toString().slice(0, 10)}...`}
              </button>
            </div>

            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: '13px',
                color: COLORS.textSecondary,
              }}
            >
              Started: {formatDate(poll.startTime)}
            </span>

            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: '13px',
                color: COLORS.textSecondary,
              }}
            >
              {isActive ? 'Ends' : 'Ended'}: {formatDate(poll.endTime)}
            </span>
          </div>

          {/* Eligibility Badge */}
          <div style={{ marginBottom: '24px' }}>
            <EligibilityBadge
              eligibilityType={poll.eligibilityType}
              eligibilityToken={poll.eligibilityToken}
              eligibilityPodId={poll.eligibilityPodId}
            />
          </div>

          {/* Description */}
          {poll.description && (
            <div
              style={{
                borderTop: '1px solid #292524',
                borderBottom: '1px solid #292524',
                padding: '16px 0',
                marginBottom: '24px',
              }}
            >
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '15px',
                  fontWeight: 400,
                  color: '#FAFAF9',
                  margin: 0,
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: isDescriptionExpanded ? 'unset' : 6,
                  WebkitBoxOrient: 'vertical',
                  overflow: isDescriptionExpanded ? 'visible' : 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {poll.description}
              </p>
              {poll.description.split('\n').length > 6 || poll.description.length > 300 ? (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  style={{
                    marginTop: '8px',
                    padding: '0',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontFamily: FONTS.body,
                    fontSize: '13px',
                    color: COLORS.primary,
                    cursor: 'pointer',
                  }}
                >
                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                </button>
              ) : null}
            </div>
          )}

          {/* Voter Activity */}
          <div
            style={{
              borderTop: `1px solid ${COLORS.border}`,
              paddingTop: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: 0,
                }}
              >
                Votes
              </h3>
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: '14px',
                  color: COLORS.primary,
                }}
              >
                {poll.totalVotes.toString()}
              </span>
            </div>

            {voters.length > 0 ? (
              <motion.div
                initial="initial"
                animate="animate"
                variants={{
                  animate: { transition: { staggerChildren: 0.05 } },
                  initial: {},
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
              >
                {voters.map((voter, index) => (
                  <motion.div
                    key={voter}
                    variants={MOTION.stagger.item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <QNSName address={voter} />
                    <span
                      style={{
                        fontFamily: FONTS.body,
                        fontSize: '13px',
                        color: COLORS.textSecondary,
                      }}
                    >
                      Voted
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  color: COLORS.textSecondary,
                }}
              >
                No votes yet. Be the first!
              </p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div>
          <AnimatePresence mode="wait">
            {/* State 1: Not connected */}
            {isActive && !hasVoted && !isConnected && (
              <motion.div
                key="connect-prompt"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <p
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: '16px',
                    fontWeight: 400,
                    color: COLORS.textSecondary,
                  }}
                >
                  Connect your wallet to vote.
                </p>
              </motion.div>
            )}

            {/* State 2: Connected but no QNS name */}
            {isActive && !hasVoted && isConnected && !hasQnsName && (
              <motion.div
                key="qns-prompt"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <p
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: '16px',
                    fontWeight: 400,
                    color: COLORS.textSecondary,
                  }}
                >
                  You need a .qf name to vote on QUORUM.{' '}
                  <a
                    href="https://dotqf.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: COLORS.primary, textDecoration: 'none' }}
                  >
                    Register here →
                  </a>
                </p>
              </motion.div>
            )}

            {/* State 3: Can vote — show VotingCard */}
            {isActive && !hasVoted && isConnected && hasQnsName && (
              <motion.div
                key="voting"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <VotingCard
                  pollId={pollId}
                  options={[...poll.options]}
                  question={poll.question}
                  isEligible={isEligible}
                  eligibilityReason={eligibilityReason}
                  onVoteSuccess={() => {
                    setHasVoted(true);
                    setRefreshTrigger((prev) => prev + 1);
                  }}
                />
                <button
                  onClick={() => setShowResults(!showResults)}
                  style={{
                    marginTop: '16px',
                    padding: '0',
                    minHeight: '44px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontFamily: FONTS.body,
                    fontSize: '14px',
                    color: COLORS.primary,
                    cursor: 'pointer',
                  }}
                >
                  {showResults ? 'Hide results' : 'Peek at results'}
                </button>
              </motion.div>
            )}

            {/* State 4: Has voted OR poll ended — show ResultsCard */}
            {(hasVoted || !isActive) && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <ResultsCard pollId={pollId} isActive={isActive} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Peek at results (only while voting is available) */}
          <AnimatePresence>
            {showResults && !hasVoted && isActive && (
              <motion.div
                key="peek-results"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden', marginTop: '16px' }}
              >
                <ResultsCard pollId={pollId} isActive={isActive} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .poll-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .poll-detail-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .poll-detail-grid > div {
            min-width: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      </div>
    </PageTransition>
  );
}
