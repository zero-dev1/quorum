import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useQNS } from '../hooks/useQNS';
import { useResultsReader } from '../hooks/useResultsReader';
import { PollCard } from '../components/PollCard';
import { ToastContainer, ToastHandle } from '../components/Toast';
import { COLORS, FONTS } from '../lib/constants';

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
  const [polls, setPolls] = useState<readonly PollSummary[]>([]);
  const [userVotes, setUserVotes] = useState<Map<string, number>>(new Map());
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'ended' | 'my'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'votes' | 'ending'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0n);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const toastRef = useRef<ToastHandle>(null);

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
      toastRef.current?.addToast('Connect your wallet to create a poll.', 'error');
      return;
    }
    if (!hasQnsName) {
      e.preventDefault();
      toastRef.current?.addToast(
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
    <div style={{ padding: '88px 24px 48px', minHeight: '100vh', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Tabs */}
        <div
          className="explore-tabs"
          style={{
            display: 'flex',
            borderBottom: `1px solid ${COLORS.border}`,
            marginBottom: '24px',
            overflowX: 'auto',
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
                borderBottom: activeTab === tab.key ? `2px solid ${COLORS.primary}` : 'none',
                fontFamily: FONTS.body,
                fontSize: '15px',
                fontWeight: 400,
                color: activeTab === tab.key ? COLORS.textPrimary : COLORS.textSecondary,
                cursor: 'pointer',
                transition: 'color 150ms ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Row */}
        <div
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sortedPolls.map((poll) => (
            <PollCard
              key={poll.id.toString()}
              pollId={poll.id}
              creator={poll.creator}
              endTime={poll.endTime}
              userVote={
                userVotes.has(poll.id.toString())
                  ? { optionIndex: userVotes.get(poll.id.toString())! }
                  : null
              }
            />
          ))}
        </div>

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
      <Link
        to="/create"
        onClick={handleCreateClick}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '16px 24px',
          backgroundColor: COLORS.primary,
          color: COLORS.textPrimary,
          fontFamily: FONTS.body,
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'background-color 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = COLORS.primaryHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = COLORS.primary;
        }}
      >
        Create Poll
      </Link>

      <ToastContainer ref={toastRef} />

      <style>{`
        @media (max-width: 768px) {
          .explore-tabs button {
            padding: 12px 16px !important;
            font-size: 14px !important;
          }
        }
        @media (max-width: 480px) {
          .explore-tabs button {
            padding: 12px !important;
            font-size: 13px !important;
          }
        }
      `}</style>
    </div>
  );
}
