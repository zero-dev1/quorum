import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'viem';
import { publicClient } from '../lib/viemClient';

const QFLINK_PODS_STORAGE_ADDRESS = import.meta.env.VITE_QFLINK_PODS_STORAGE_ADDRESS as `0x${string}`;

const QFLINK_PODS_ABI = [
  {
    inputs: [
      { internalType: 'uint64', name: 'podId', type: 'uint64' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'isMember',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint64', name: 'podId', type: 'uint64' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'checkPodAccess',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useQFLink() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPodMember = useCallback(async (
    podId: bigint,
    userAddress: `0x${string}`
  ): Promise<boolean> => {
    if (!QFLINK_PODS_STORAGE_ADDRESS) {
      console.warn('QFLink pods storage address not configured');
      return false;
    }

    if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract({
        address: QFLINK_PODS_STORAGE_ADDRESS,
        abi: QFLINK_PODS_ABI,
        client: publicClient,
      });

      // Cast podId to uint64 as the contract expects
      const podIdUint64 = BigInt.asUintN(64, podId);
      const result = await contract.read.isMember([podIdUint64, userAddress]);
      return result;
    } catch (err: any) {
      console.error('Error checking pod membership:', err);
      setError(err.message || 'Failed to check pod membership');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkPodAccess = useCallback(async (
    podId: bigint,
    userAddress: `0x${string}`
  ): Promise<boolean> => {
    if (!QFLINK_PODS_STORAGE_ADDRESS) {
      console.warn('QFLink pods storage address not configured');
      return false;
    }

    if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract({
        address: QFLINK_PODS_STORAGE_ADDRESS,
        abi: QFLINK_PODS_ABI,
        client: publicClient,
      });

      // Cast podId to uint64 as the contract expects
      const podIdUint64 = BigInt.asUintN(64, podId);
      const result = await contract.read.checkPodAccess([podIdUint64, userAddress]);
      return result;
    } catch (err: any) {
      console.error('Error checking pod access:', err);
      setError(err.message || 'Failed to check pod access');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isPodMember,
    checkPodAccess,
    isLoading,
    error,
    isConfigured: !!QFLINK_PODS_STORAGE_ADDRESS,
  };
}
