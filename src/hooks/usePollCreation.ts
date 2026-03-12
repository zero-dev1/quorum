import { useState, useCallback } from 'react';
import { getContract, decodeEventLog } from 'viem';
import { publicClient, createWalletClientFromWindow } from '../lib/viemClient';
import {
  POLL_CREATION_ADDRESS,
  POLL_CREATION_ABI,
  POLL_STORAGE_ABI,
} from '../lib/contracts';

// Helper to validate Ethereum addresses
function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  return hexRegex.test(address);
}

const pollCreationContract = POLL_CREATION_ADDRESS
  ? getContract({
      address: POLL_CREATION_ADDRESS,
      abi: POLL_CREATION_ABI,
      client: publicClient,
    })
  : null;

export function usePollCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const getCreationFee = useCallback(async (): Promise<bigint | null> => {
    if (!pollCreationContract) return null;

    try {
      return await pollCreationContract.read.creationFee();
    } catch (err) {
      console.error('Error getting creation fee:', err);
      return null;
    }
  }, []);

  const checkIsExempt = useCallback(async (address: string): Promise<boolean> => {
    // Guard: validate address before any contract call
    if (!isValidAddress(address)) {
      return false;
    }
    if (!pollCreationContract) return false;

    try {
      return await pollCreationContract.read.exemptAddresses([address]);
    } catch (err) {
      console.error('Error checking exemption:', err);
      return false;
    }
  }, []);

  const createPoll = useCallback(async (
    question: string,
    description: string,
    options: string[],
    durationDays: number,
    eligibilityType: number,
    eligibilityToken: string,
    eligibilityPodId: bigint,
    fee: bigint = 0n
  ): Promise<{ success: boolean; pollId?: bigint; hash?: string }> => {
    if (!pollCreationContract) {
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
        address: POLL_CREATION_ADDRESS!,
        abi: POLL_CREATION_ABI,
        functionName: 'createPoll',
        args: [
          question,
          description,
          options,
          durationDays,
          eligibilityType,
          isValidAddress(eligibilityToken) ? eligibilityToken : '0x0000000000000000000000000000000000000000',
          eligibilityPodId,
        ],
        account,
        value: fee, // Send native QF as fee
      });

      setTxHash(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let pollId: bigint | undefined;
      if (receipt.logs.length > 0) {
        try {
          const pollCreatedEvent = receipt.logs.map(log => {
            try {
              return decodeEventLog({
                abi: POLL_STORAGE_ABI,
                data: log.data,
                topics: log.topics,
              });
            } catch { return null; }
          }).find(event => event?.eventName === 'PollCreated');
          
          if (pollCreatedEvent && 'args' in pollCreatedEvent && pollCreatedEvent.args && typeof pollCreatedEvent.args === 'object' && 'pollId' in pollCreatedEvent.args) {
            pollId = pollCreatedEvent.args.pollId as bigint;
          }
        } catch (e) {
          console.error('Error decoding event log:', e);
        }
      }

      setIsLoading(false);
      return { success: true, pollId, hash };
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to create poll');
      return { success: false };
    }
  }, []);

  return {
    getCreationFee,
    checkIsExempt,
    createPoll,
    isLoading,
    error,
    txHash,
  };
}
