import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { useQNS } from '../hooks/useQNS';
import { useResultsReader } from '../hooks/useResultsReader';
import { PollCard } from '../components/PollCard';
import { PageTransition } from '../components/PageTransition';
import { SkeletonCard } from '../components/SkeletonCard';
import { useToast } from '../stores/toastStore';
import { COLORS, FONTS } from '../lib/constants';
import { MOTION } from '../lib/motion';

// Helper to validate Ethereum addresses
function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  return hexRegex.test(address);
}

interface PollSummary {
  id: bigint;
  question: string;
  creator: string;
  totalVotes: bigint;
  endTime: bigint;
  isActive: boolean;
}

export function Explore() {
  const { isConnected, address } = useWallet();
  const { hasQnsName } = useQNS(address);
  const { getPollList, getUserVotes } = useResultsReader();
  const { toast } = useToast();
  const [polls, setPolls] = useState<readonly PollSummary[]>([]);
  const [userVotes, setUserVotes] = useState<Map<string, number>>(new Map());
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'ended' | 'my'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'votes' | 'ending'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0n);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadPolls = useCallback(async (reset = false) => {
    setIsLoading(true);
    const newOffset = reset ? 0n : offset;
    const fetched = await getPollList(newOffset, 20n);
    
    if (reset) {
      setPolls(fetched);
    } else {
      setPolls(prev => [...prev, ...fetched]);
    }
    
    setHasMore(fetched.length === 20);
    setOffset(newOffset + BigInt(fetched.length));
    setIsLoading(false);
  }, [getPollList, offset]);

  useEffect(() => {
    loadPolls(true);
  }, []);

  useEffect(() => {
    const fetchUserVotes = async () => {
      if (!isValidAddress(address)) {
        setUserVotes(new Map());
        return;
      }
      const votes = await getUserVotes(address, 0n, 100n);
      const voteMap = new Map<string, number>();
      votes.forEach(v => {
        voteMap.set(v.pollId.toString(), Number(v.optionIndex));
      });
      setUserVotes(voteMap);
    };
    fetchUserVotes();
  }, [address, getUserVotes]);

  const filteredPolls = polls.filter(poll => {
    const matchesSearch = poll.question.toLowerCase().includes(searchQuery.toLowerCase());
    const now = Date.now() / 1000;
    
    switch (activeTab) {
      case 'active':
        return matchesSearch && poll.isActive;
      case 'ended':
        return matchesSearch && !poll.isActive;
      case 'my':
        return matchesSearch && userVotes.has(poll.id.toString());
      default:
        return matchesSearch;
    }
  });

  const sortedPolls = [...filteredPolls].sort((a, b) => {
    switch (sortBy) {
      case 'votes':
        return Number(b.totalVotes - a.totalVotes);
      case 'ending':
        return Number(a.endTime - b.endTime);
      default:
        return Number(b.id - a.id);
    }
  });

  const getEmptyStateMessage = () => {
    switch (activeTab) {
      case 'active':
        return 'No active polls at the moment.';
      case 'ended':
        return 'No ended polls yet.';
      case 'my':
        return "You haven't voted on any polls yet.";
      default:
        return searchQuery ? 'No polls match your search.' : 'No polls yet. Be the first to create one!';
    }
  };

  const handleCreateClick = (e: React.MouseEvent) => {
    if (!isConnected) {
      e.preventDefault();
      toast('Connect your wallet to create a poll.', 'error');
      return;
    }
    if (!hasQnsName) {
      e.preventDefault();
      toast(
        <span>
          You need a .qf name to create polls on QUORUM.{" "}
          <a
            href="https://dotqf.xyz"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6366F1', textDecoration: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            Register here →
          </a>
        </span>,
        'error'
      );
      return;
    }
  };

  return (
    <PageTransition>
      <div style={{ padding: '88px 24px 48px', minHeight: '100vh', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {/* Tabs */}
          <div
            className="explore-tabs"
            style={{
              display: 'flex',
              borderBottom: `1px solid ${COLORS.border}`,
              marginBottom: '24px',
              position: 'relative',
            }}
          >
            {[
              { key: 'all', label: 'All Polls' },
              { key: 'active', label: 'Active' },
              { key: 'ended', label: 'Ended' },
              { key: 'my', label: 'My Votes' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontFamily: FONTS.body,
                  fontSize: '15px',
                  color: activeTab === tab.key ? COLORS.textPrimary : COLORS.textSecondary,
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="explore-tab-underline"
                    transition={MOTION.tabUnderline.transition}
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      left: 0,
                      right: 0,
                      height: '2px',
                      backgroundColor: COLORS.primary,
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Filter Row */}
          <div
            className="explore-filters"
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}
          >
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{
                padding: '10px 16px',
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: COLORS.textPrimary,
                cursor: 'pointer',
              }}
            >
              <option value="newest">Newest</option>
              <option value="votes">Most Votes</option>
              <option value="ending">Ending Soon</option>
            </select>

            <input
              type="text"
              placeholder="Search polls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="explore-search"
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '10px 16px',
                backgroundColor: COLORS.background,
                border: `1px solid ${COLORS.border}`,
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: COLORS.textPrimary,
                outline: 'none',
              }}
            />
          </div>

          {/* Poll List */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + sortBy}
              initial="initial"
              animate="animate"
              exit="initial"
              variants={{
                animate: { transition: { staggerChildren: 0.05 } },
                initial: {},
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : sortedPolls.map((poll) => (
                    <motion.div
                      key={poll.id.toString()}
                      variants={MOTION.stagger.item}
                    >
                      <PollCard
                        pollId={poll.id}
                        creator={poll.creator}
                        endTime={poll.endTime}
                        userVote={
                          userVotes.has(poll.id.toString())
                            ? { optionIndex: userVotes.get(poll.id.toString())! }
                            : null
                        }
                      />
                    </motion.div>
                  ))}
            </motion.div>
          </AnimatePresence>

          {/* Empty State */}
          {sortedPolls.length === 0 && !isLoading && (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '15px',
                  color: COLORS.textSecondary,
                  margin: '0 0 16px 0',
                }}
              >
                {getEmptyStateMessage()}
              </p>
              {activeTab === 'my' && (
                <Link
                  to="/explore"
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: '14px',
                    color: COLORS.primary,
                    textDecoration: 'none',
                  }}
                >
                  Browse Active Polls
                </Link>
              )}
            </div>
          )}

          {/* Load More */}
          {hasMore && activeTab === 'all' && (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button
                onClick={() => loadPolls()}
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${COLORS.border}`,
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  color: COLORS.textSecondary,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
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
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>

        {/* Floating Create Button */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
          style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50 }}
        >
          <Link
            to="/create"
            onClick={handleCreateClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 24px',
              minHeight: '48px',
              minWidth: '48px',
              backgroundColor: COLORS.primary,
              color: '#FFF',
              fontFamily: FONTS.body,
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
            }}
          >
            + Create Poll
          </Link>
        </motion.div>

      </div>
    <style>{`
  @media (max-width: 768px) {
    .explore-tabs button {
      padding: 12px 16px !important;
      font-size: 14px !important;
    }
    .explore-search {
      min-width: 0 !important;
    }
  }
  @media (max-width: 480px) {
    .explore-tabs button {
      padding: 10px 12px !important;
      font-size: 13px !important;
    }
  }
`}</style>
    </PageTransition>
  );
}
