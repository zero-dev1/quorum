import { useState, useEffect, useCallback, useRef } from 'react';
import { namehash } from 'viem/ens';
import { publicClient } from '../lib/viemClient';

// QNS Resolver address — from .env.development (VITE_QNS_RESOLVER_ADDRESS)
const QNS_RESOLVER_ADDRESS = (import.meta.env.VITE_QNS_RESOLVER_ADDRESS || '') as `0x${string}`;

// Warn if resolver address is not set
if (!QNS_RESOLVER_ADDRESS) {
  console.warn('[useQns] VITE_QNS_RESOLVER_ADDRESS not set — .qf name resolution will not work');
}

// QNS Resolver ABI — based on the real QNSResolver contract
const QNS_RESOLVER_ABI = [
  {
    name: 'reverseResolve',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_addr', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'addr',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// Cache: address → name, with TTL
const nameCache = new Map<string, { name: string | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to validate Ethereum addresses
function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;
  // Check for valid hex characters
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  return hexRegex.test(address);
}

// Clear cache for a specific address (used after name registration)
export function clearQNSCache(address: string): void {
  if (!isValidAddress(address)) return;
  nameCache.delete(address.toLowerCase());
}

// Clear the entire QNS cache
export function clearAllQNSCache(): void {
  nameCache.clear();
}

// Standalone function to reverse resolve an address → .qf name
export async function reverseResolve(address: string): Promise<string | null> {
  if (!isValidAddress(address)) return null;
  if (!QNS_RESOLVER_ADDRESS || !publicClient) return null;
  
  const lower = address.toLowerCase();
  
  // Check cache
  const cached = nameCache.get(lower);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.name;
  }
  
  try {
    const name = await publicClient.readContract({
      address: QNS_RESOLVER_ADDRESS,
      abi: QNS_RESOLVER_ABI,
      functionName: 'reverseResolve',
      args: [address],
    });
    
    const result = name && name.length > 0 ? name : null;
    nameCache.set(lower, { name: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error('[useQns] reverseResolve error:', err);
    nameCache.set(lower, { name: null, timestamp: Date.now() });
    return null;
  }
}

// Resolve .qf name → address
export async function resolveQFName(name: string): Promise<string | null> {
  if (!QNS_RESOLVER_ADDRESS || !publicClient) return null;
  if (!name.endsWith('.qf')) return null;
  
  const node = namehash(name);
  
  try {
    const addr = await publicClient.readContract({
      address: QNS_RESOLVER_ADDRESS,
      abi: QNS_RESOLVER_ABI,
      functionName: 'addr',
      args: [node],
    });
    
    return addr === '0x0000000000000000000000000000000000000000' ? null : addr;
  } catch (err) {
    console.error('[useQns] resolveQFName error:', err);
    return null;
  }
}

// Check if input is a .qf name
export function isQFName(input: string): boolean {
  return input.endsWith('.qf') && input.length > 3;
}

// Normalize QF name input: auto-append .qf if needed
export function normalizeQFName(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith('0x')) return null; // raw address, no resolution needed
  if (trimmed.endsWith('.qf')) return trimmed;   // already has .qf
  return `${trimmed}.qf`;                        // auto-append .qf
}

// Format display: show .qf name if available, otherwise truncated address
export function formatAddress(address: string, qfName?: string | null): string {
  if (qfName) return qfName;
  if (!isValidAddress(address)) return 'Invalid Address';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface UseQNSReturn {
  qnsName: string | null;
  hasQnsName: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useQNS(address: string | null | undefined): UseQNSReturn {
  const [qnsName, setQnsName] = useState<string | null>(null);
  const [hasQnsName, setHasQnsName] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track if we've already fetched for this address
  const fetchedRef = useRef<string | null>(null);

  const fetchQNSName = useCallback(async () => {
    // Guard: only proceed with valid addresses
    if (!isValidAddress(address)) {
      setQnsName(null);
      setHasQnsName(false);
      fetchedRef.current = null;
      return;
    }
    
    // Skip if we already fetched for this address
    if (fetchedRef.current === address.toLowerCase()) {
      return;
    }

    // Check cache first
    const cached = nameCache.get(address.toLowerCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setQnsName(cached.name);
      setHasQnsName(!!cached.name && cached.name.length > 0);
      fetchedRef.current = address.toLowerCase();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const name = await reverseResolve(address);
      setQnsName(name);
      setHasQnsName(!!name && name.length > 0);
      fetchedRef.current = address.toLowerCase();
    } catch (err) {
      console.error('QNS lookup error:', err);
      setError('Failed to resolve QNS name');
      setQnsName(null);
      setHasQnsName(false);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchQNSName();
  }, [fetchQNSName]);

  const refresh = useCallback(async () => {
    if (!isValidAddress(address)) return;
    clearQNSCache(address);
    fetchedRef.current = null;
    await fetchQNSName();
  }, [address, fetchQNSName]);

  return {
    qnsName,
    hasQnsName,
    isLoading,
    error,
    refresh,
  };
}

export default useQNS;
