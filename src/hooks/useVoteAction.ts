import { useState, useCallback } from 'react';
import { getContract } from 'viem';
import { publicClient, createWalletClientFromWindow } from '../lib/viemClient';
import { VOTE_ACTION_ADDRESS, VOTE_ACTION_ABI } from '../lib/contracts';

// Helper to validate Ethereum addresses
function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  return hexRegex.test(address);
}

const voteActionContract = VOTE_ACTION_ADDRESS
  ? getContract({
      address: VOTE_ACTION_ADDRESS,
      abi: VOTE_ACTION_ABI,
      client: publicClient,
    })
  : null;

export function useVoteAction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const castVote = useCallback(async (
    pollId: bigint,
    optionIndex: number
  ): Promise<{ success: boolean; hash?: string }> => {
    if (!voteActionContract) {
      setError('Contract not initialized');
      return { success: false };
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const walletClient = createWalletClientFromWindow();
      const [account] = await walletClient.requestAddresses();

      // Guard: validate account address
      if (!isValidAddress(account)) {
        setError('Invalid wallet address');
        setIsLoading(false);
        return { success: false };
      }

      const hash = await walletClient.writeContract({
        address: VOTE_ACTION_ADDRESS!,
        abi: VOTE_ACTION_ABI,
        functionName: 'vote',
        args: [pollId, BigInt(optionIndex)],
        account,
      });

      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });

      setIsLoading(false);
      return { success: true, hash };
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to cast vote');
      return { success: false };
    }
  }, []);

  return {
    castVote,
    isLoading,
    error,
    txHash,
  };
}
