import { useState, useCallback } from "react";
import { callContract } from "../utils/contractCall";
import { POLL_STORAGE_ADDRESS, POLL_STORAGE_ABI } from "../lib/contracts";

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

function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

const ABI = POLL_STORAGE_ABI as unknown as any[];
const ADDR = POLL_STORAGE_ADDRESS;

export function usePollStorage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPoll = useCallback(async (pollId: bigint): Promise<Poll | null> => {
    if (!ADDR) return null;
    setIsLoading(true);
    setError(null);
    try {
      const raw = await callContract<any>(ADDR, ABI, "getPoll", [pollId]);
      // viem decodes tuples as arrays or objects depending on ABI
      // Normalize to our Poll interface
      if (Array.isArray(raw)) {
        return {
          id: BigInt(raw[0]),
          creator: raw[1] as `0x${string}`,
          question: raw[2] as string,
          description: raw[3] as string,
          options: raw[4] as readonly string[],
          startTime: BigInt(raw[5]),
          endTime: BigInt(raw[6]),
          eligibilityType: Number(raw[7]),
          eligibilityToken: raw[8] as `0x${string}`,
          eligibilityPodId: BigInt(raw[9]),
          isListed: Boolean(raw[10]),
          totalVotes: BigInt(raw[11]),
        };
      }
      // If viem returned named properties, it might already match
      return raw as Poll;
    } catch (err: any) {
      setError(err.message || "Failed to fetch poll");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHasVoted = useCallback(async (pollId: bigint, voter: string): Promise<boolean> => {
    if (!isValidAddress(voter) || !ADDR) return false;
    try {
      return await callContract<boolean>(ADDR, ABI, "getHasVoted", [pollId, voter]);
    } catch {
      return false;
    }
  }, []);

  const getVoterChoice = useCallback(async (pollId: bigint, voter: string): Promise<bigint | null> => {
    if (!isValidAddress(voter) || !ADDR) return null;
    try {
      return await callContract<bigint>(ADDR, ABI, "getVoterChoice", [pollId, voter]);
    } catch {
      return null;
    }
  }, []);

  const getPollCount = useCallback(async (): Promise<bigint | null> => {
    if (!ADDR) return null;
    try {
      return await callContract<bigint>(ADDR, ABI, "pollCount", []);
    } catch {
      return null;
    }
  }, []);

  const getUserPollsVoted = useCallback(async (user: string): Promise<readonly bigint[]> => {
    if (!isValidAddress(user) || !ADDR) return [];
    try {
      return await callContract<readonly bigint[]>(ADDR, ABI, "getUserPollsVoted", [user]);
    } catch {
      return [];
    }
  }, []);

  const getUserPollsCreated = useCallback(async (user: string): Promise<readonly bigint[]> => {
    if (!isValidAddress(user) || !ADDR) return [];
    try {
      return await callContract<readonly bigint[]>(ADDR, ABI, "getUserPollsCreated", [user]);
    } catch {
      return [];
    }
  }, []);

  return { getPoll, getHasVoted, getVoterChoice, getPollCount, getUserPollsVoted, getUserPollsCreated, isLoading, error };
}
