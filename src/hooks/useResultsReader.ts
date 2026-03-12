import { useState, useCallback } from 'react';
import { getContract } from 'viem';
import { publicClient } from '../lib/viemClient';
import { RESULTS_READER_ADDRESS, RESULTS_READER_ABI } from '../lib/contracts';

interface PollResults {
  question: string;
  description: string;
  options: readonly string[];
  voteCounts: readonly bigint[];
  totalVotes: bigint;
  percentages: readonly bigint[];
  leadingOptionIndex: bigint;
  isActive: boolean;
}

interface PollSummary {
  id: bigint;
  question: string;
  creator: string;
  totalVotes: bigint;
  endTime: bigint;
  isActive: boolean;
}

interface UserVote {
  pollId: bigint;
  optionIndex: bigint;
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

const resultsReaderContract = RESULTS_READER_ADDRESS
  ? getContract({
      address: RESULTS_READER_ADDRESS,
      abi: RESULTS_READER_ABI,
      client: publicClient,
    })
  : null;

export function useResultsReader() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPollResults = useCallback(async (pollId: bigint): Promise<PollResults | null> => {
    if (!resultsReaderContract) return null;

    setIsLoading(true);
    setError(null);

    try {
      const results = await resultsReaderContract.read.getPollResults([pollId]);
      return results;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch poll results');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPollList = useCallback(async (
    offset: bigint = 0n,
    limit: bigint = 20n
  ): Promise<readonly PollSummary[]> => {
    if (!resultsReaderContract) return [];

    setIsLoading(true);
    setError(null);

    try {
      const polls = await resultsReaderContract.read.getPollList([offset, limit]);
      return polls;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch poll list');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getActivePollCount = useCallback(async (): Promise<bigint | null> => {
    if (!resultsReaderContract) return null;

    try {
      return await resultsReaderContract.read.getActivePollCount();
    } catch (err) {
      console.error('Error getting active poll count:', err);
      return null;
    }
  }, []);

  const getUserVotes = useCallback(async (
    user: string,
    offset: bigint = 0n,
    limit: bigint = 20n
  ): Promise<readonly UserVote[]> => {
    // Guard: validate address before any contract call
    if (!isValidAddress(user)) return [];
    if (!resultsReaderContract) return [];

    try {
      return await resultsReaderContract.read.getUserVotes([
        user,
        offset,
        limit,
      ]);
    } catch (err) {
      console.error('Error getting user votes:', err);
      return [];
    }
  }, []);

  const getUserVoteCount = useCallback(async (user: string): Promise<bigint | null> => {
    // Guard: validate address before any contract call
    if (!isValidAddress(user)) return null;
    if (!resultsReaderContract) return null;

    try {
      return await resultsReaderContract.read.getUserVoteCount([user]);
    } catch (err) {
      console.error('Error getting user vote count:', err);
      return null;
    }
  }, []);

  const getUserCreatedCount = useCallback(async (user: string): Promise<bigint | null> => {
    // Guard: validate address before any contract call
    if (!isValidAddress(user)) return null;
    if (!resultsReaderContract) return null;

    try {
      return await resultsReaderContract.read.getUserCreatedCount([user]);
    } catch (err) {
      console.error('Error getting user created count:', err);
      return null;
    }
  }, []);

  const getVoterList = useCallback(async (
    pollId: bigint,
    offset: bigint = 0n,
    limit: bigint = 20n
  ): Promise<readonly `0x${string}`[]> => {
    if (!resultsReaderContract) return [];

    try {
      return await resultsReaderContract.read.getVoterList([pollId, offset, limit]);
    } catch (err) {
      console.error('Error getting voter list:', err);
      return [];
    }
  }, []);

  const getVoterCount = useCallback(async (pollId: bigint): Promise<bigint | null> => {
    if (!resultsReaderContract) return null;

    try {
      return await resultsReaderContract.read.getVoterCount([pollId]);
    } catch (err) {
      console.error('Error getting voter count:', err);
      return null;
    }
  }, []);

  return {
    getPollResults,
    getPollList,
    getActivePollCount,
    getUserVotes,
    getUserVoteCount,
    getUserCreatedCount,
    getVoterList,
    getVoterCount,
    isLoading,
    error,
  };
}
