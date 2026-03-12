import { useState, useCallback } from 'react';
import { getContract } from 'viem';
import { publicClient } from '../lib/viemClient';
import { POLL_STORAGE_ADDRESS, POLL_STORAGE_ABI } from '../lib/contracts';

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

const pollStorageContract = POLL_STORAGE_ADDRESS
  ? getContract({
      address: POLL_STORAGE_ADDRESS,
      abi: POLL_STORAGE_ABI,
      client: publicClient,
    })
  : null;

export function usePollStorage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPoll = useCallback(async (pollId: bigint): Promise<Poll | null> => {
    if (!pollStorageContract) return null;

    setIsLoading(true);
    setError(null);

    try {
      const poll = await pollStorageContract.read.getPoll([pollId]);
      return poll;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch poll');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHasVoted = useCallback(async (pollId: bigint, voter: string): Promise<boolean> => {
    // Guard: validate address before any contract call
    if (!isValidAddress(voter)) return false;
    if (!pollStorageContract) return false;

    try {
      return await pollStorageContract.read.getHasVoted([pollId, voter]);
    } catch (err) {
      console.error('Error checking if voted:', err);
      return false;
    }
  }, []);

  const getVoterChoice = useCallback(async (pollId: bigint, voter: string): Promise<bigint | null> => {
    // Guard: validate address before any contract call
    if (!isValidAddress(voter)) return null;
    if (!pollStorageContract) return null;

    try {
      return await pollStorageContract.read.getVoterChoice([pollId, voter]);
    } catch (err) {
      console.error('Error getting voter choice:', err);
      return null;
    }
  }, []);

  const getPollCount = useCallback(async (): Promise<bigint | null> => {
    if (!pollStorageContract) return null;

    try {
      return await pollStorageContract.read.pollCount();
    } catch (err) {
      console.error('Error getting poll count:', err);
      return null;
    }
  }, []);

  const getUserPollsVoted = useCallback(async (user: string): Promise<readonly bigint[]> => {
    // Guard: validate address before any contract call
    if (!isValidAddress(user)) return [];
    if (!pollStorageContract) return [];

    try {
      return await pollStorageContract.read.getUserPollsVoted([user]);
    } catch (err) {
      console.error('Error getting user polls voted:', err);
      return [];
    }
  }, []);

  const getUserPollsCreated = useCallback(async (user: string): Promise<readonly bigint[]> => {
    // Guard: validate address before any contract call
    if (!isValidAddress(user)) return [];
    if (!pollStorageContract) return [];

    try {
      return await pollStorageContract.read.getUserPollsCreated([user]);
    } catch (err) {
      console.error('Error getting user polls created:', err);
      return [];
    }
  }, []);

  return {
    getPoll,
    getHasVoted,
    getVoterChoice,
    getPollCount,
    getUserPollsVoted,
    getUserPollsCreated,
    isLoading,
    error,
  };
}
