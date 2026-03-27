import { useState, useCallback } from "react";
import { callContract } from "../utils/contractCall";
import { RESULTS_READER_ADDRESS, RESULTS_READER_ABI } from "../lib/contracts";

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

function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

const ABI = RESULTS_READER_ABI as unknown as any[];
const ADDR = RESULTS_READER_ADDRESS;

export function useResultsReader() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPollResults = useCallback(async (pollId: bigint): Promise<PollResults | null> => {
    if (!ADDR) return null;
    setIsLoading(true);
    setError(null);
    try {
      return await callContract<PollResults>(ADDR, ABI, "getPollResults", [pollId]);
    } catch (err: any) {
      setError(err.message || "Failed to fetch poll results");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPollList = useCallback(async (
    offset: bigint = 0n,
    limit: bigint = 20n
  ): Promise<readonly PollSummary[]> => {
    if (!ADDR) return [];
    setIsLoading(true);
    setError(null);
    try {
      return await callContract<readonly PollSummary[]>(ADDR, ABI, "getPollList", [offset, limit]);
    } catch (err: any) {
      setError(err.message || "Failed to fetch poll list");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getActivePollCount = useCallback(async (): Promise<bigint | null> => {
    if (!ADDR) return null;
    try {
      return await callContract<bigint>(ADDR, ABI, "getActivePollCount", []);
    } catch {
      return null;
    }
  }, []);

  const getUserVotes = useCallback(async (
    user: string,
    offset: bigint = 0n,
    limit: bigint = 20n
  ): Promise<readonly UserVote[]> => {
    if (!isValidAddress(user) || !ADDR) return [];
    try {
      return await callContract<readonly UserVote[]>(ADDR, ABI, "getUserVotes", [user, offset, limit]);
    } catch {
      return [];
    }
  }, []);

  const getUserVoteCount = useCallback(async (user: string): Promise<bigint | null> => {
    if (!isValidAddress(user) || !ADDR) return null;
    try {
      return await callContract<bigint>(ADDR, ABI, "getUserVoteCount", [user]);
    } catch {
      return null;
    }
  }, []);

  const getUserCreatedCount = useCallback(async (user: string): Promise<bigint | null> => {
    if (!isValidAddress(user) || !ADDR) return null;
    try {
      return await callContract<bigint>(ADDR, ABI, "getUserCreatedCount", [user]);
    } catch {
      return null;
    }
  }, []);

  const getVoterList = useCallback(async (
    pollId: bigint,
    offset: bigint = 0n,
    limit: bigint = 20n
  ): Promise<readonly `0x${string}`[]> => {
    if (!ADDR) return [];
    try {
      return await callContract<readonly `0x${string}`[]>(ADDR, ABI, "getVoterList", [pollId, offset, limit]);
    } catch {
      return [];
    }
  }, []);

  const getVoterCount = useCallback(async (pollId: bigint): Promise<bigint | null> => {
    if (!ADDR) return null;
    try {
      return await callContract<bigint>(ADDR, ABI, "getVoterCount", [pollId]);
    } catch {
      return null;
    }
  }, []);

  return {
    getPollResults, getPollList, getActivePollCount,
    getUserVotes, getUserVoteCount, getUserCreatedCount,
    getVoterList, getVoterCount, isLoading, error,
  };
}
