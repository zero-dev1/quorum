import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useQNS } from '../hooks/useQNS';
import { useResultsReader } from '../hooks/useResultsReader';
import { usePollStorage } from '../hooks/usePollStorage';
import { PollCard } from '../components/PollCard';
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

export function Profile() {
  const { 'name.qf': nameParam } = useParams<{ 'name.qf': string }>();
  const [searchParams] = useSearchParams();
  const { address: connectedAddress } = useWallet();
  const { qnsName: connectedQnsName } = useQNS(connectedAddress);
  const { getUserVotes, getUserVoteCount, getUserCreatedCount } = useResultsReader();
  const { getUserPollsVoted, getUserPollsCreated } = usePollStorage();
  const [activeTab, setActiveTab] = useState<'votes' | 'created'>(
    (searchParams.get('tab') as 'votes' | 'created') || 'votes'
  );
  const [votedPolls, setVotedPolls] = useState<readonly bigint[]>([]);
  const [createdPolls, setCreatedPolls] = useState<readonly bigint[]>([]);
  const [userVotes, setUserVotes] = useState<Map<string, number>>(new Map());
  const [voteCount, setVoteCount] = useState<bigint>(0n);
  const [createdCount, setCreatedCount] = useState<bigint>(0n);
  const [copied, setCopied] = useState(false);
  const [profileAddress, setProfileAddress] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const displayName = nameParam || connectedQnsName;

  useEffect(() => {
    const determineProfile = async () => {
      // Guard: only proceed with valid connected address
      if (!isValidAddress(connectedAddress)) {
        setProfileAddress(null);
        setIsOwnProfile(false);
        return;
      }

      if (nameParam) {
        setProfileAddress(connectedAddress);
        setIsOwnProfile(nameParam === connectedQnsName);
      } else {
        setProfileAddress(connectedAddress);
        setIsOwnProfile(true);
      }
    };
    determineProfile();
  }, [nameParam, connectedAddress, connectedQnsName]);

  useEffect(() => {
    const fetchUserData = async () => {
      // Guard: only fetch when profile address is valid
      if (!isValidAddress(profileAddress)) {
        setVotedPolls([]);
        setCreatedPolls([]);
        setVoteCount(0n);
        setCreatedCount(0n);
        return;
      }

      const [voted, created, votes] = await Promise.all([
        getUserPollsVoted(profileAddress),
        getUserPollsCreated(profileAddress),
        getUserVotes(profileAddress, 0n, 100n),
      ]);

      setVotedPolls(voted);
      setCreatedPolls(created);

      const voteMap = new Map<string, number>();
      votes.forEach(v => {
        voteMap.set(v.pollId.toString(), Number(v.optionIndex));
      });
      setUserVotes(voteMap);

      const [vCount, cCount] = await Promise.all([
        getUserVoteCount(profileAddress),
        getUserCreatedCount(profileAddress),
      ]);

      if (vCount !== null) setVoteCount(vCount);
      if (cCount !== null) setCreatedCount(cCount);
    };
    fetchUserData();
  }, [profileAddress, getUserPollsVoted, getUserPollsCreated, getUserVotes, getUserVoteCount, getUserCreatedCount]);

  const copyAddress = () => {
    if (isValidAddress(profileAddress)) {
      navigator.clipboard.writeText(profileAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!isValidAddress(addr)) return 'Invalid Address';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  if (!displayName) {
    return (
      <div style={{ padding: '88px 24px', minHeight: '100vh', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
          <h1
            style={{
              fontFamily: FONTS.headline,
              fontSize: '24px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: '0 0 16px 0',
            }}
          >
            Profile Not Found
          </h1>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: '15px',
              color: COLORS.textSecondary,
            }}
          >
            This user does not have a .qf name or the profile does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '88px 24px 48px', minHeight: '100vh', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontFamily: FONTS.headline,
              fontSize: '24px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: '0 0 8px 0',
            }}
          >
            {displayName}
          </h1>
          {isValidAddress(profileAddress) && (
            <button
              onClick={copyAddress}
              style={{
                fontFamily: FONTS.mono,
                fontSize: '13px',
                color: COLORS.textSecondary,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {copied ? 'Copied!' : truncateAddress(profileAddress)}
            </button>
          )}
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            marginBottom: '32px',
            padding: '16px 0',
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: '20px',
                color: COLORS.primary,
              }}
            >
              {voteCount.toString()}
            </span>
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: COLORS.textSecondary,
                marginLeft: '8px',
              }}
            >
              Votes
            </span>
          </div>
          <div>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: '20px',
                color: COLORS.primary,
              }}
            >
              {createdCount.toString()}
            </span>
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: COLORS.textSecondary,
                marginLeft: '8px',
              }}
            >
              Polls Created
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="profile-tabs"
          style={{
            display: 'flex',
            borderBottom: `1px solid ${COLORS.border}`,
            marginBottom: '24px',
          }}
        >
          <button
            onClick={() => setActiveTab('votes')}
            style={{
              padding: '16px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'votes' ? `2px solid ${COLORS.primary}` : 'none',
              fontFamily: FONTS.body,
              fontSize: '15px',
              fontWeight: 400,
              color: activeTab === 'votes' ? COLORS.textPrimary : COLORS.textSecondary,
              cursor: 'pointer',
            }}
          >
            My Votes
          </button>
          <button
            onClick={() => setActiveTab('created')}
            style={{
              padding: '16px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'created' ? `2px solid ${COLORS.primary}` : 'none',
              fontFamily: FONTS.body,
              fontSize: '15px',
              fontWeight: 400,
              color: activeTab === 'created' ? COLORS.textPrimary : COLORS.textSecondary,
              cursor: 'pointer',
            }}
          >
            My Polls
          </button>
        </div>

        {/* Poll List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'votes' ? (
            votedPolls.length > 0 ? (
              votedPolls.map((pollId) => (
                <PollCard
                  key={pollId.toString()}
                  pollId={pollId}
                  userVote={
                    userVotes.has(pollId.toString())
                      ? { optionIndex: userVotes.get(pollId.toString())! }
                      : null
                  }
                />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <p
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: '15px',
                    color: COLORS.textSecondary,
                    margin: '0 0 16px 0',
                  }}
                >
                  You haven&apos;t voted on any polls yet.
                </p>
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
              </div>
            )
          ) : createdPolls.length > 0 ? (
            createdPolls.map((pollId) => (
              <PollCard key={pollId.toString()} pollId={pollId} />
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '15px',
                  color: COLORS.textSecondary,
                  margin: '0 0 16px 0',
                }}
              >
                You haven&apos;t created any polls yet.
              </p>
              <Link
                to="/create"
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  color: COLORS.primary,
                  textDecoration: 'none',
                }}
              >
                Create Your First Poll
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .profile-tabs button {
            padding: 12px 16px !important;
            font-size: 14px !important;
          }
        }
        @media (max-width: 480px) {
          .profile-tabs button {
            padding: 12px !important;
            font-size: 13px !important;
          }
        }
      `}</style>
    </div>
  );
}
