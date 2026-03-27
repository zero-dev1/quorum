import { useState, useEffect, useCallback, useRef } from "react";
import { callContract } from "../utils/contractCall";

const QNS_RESOLVER_ADDRESS = (import.meta.env.VITE_QNS_RESOLVER_ADDRESS || "") as string;

if (!QNS_RESOLVER_ADDRESS) {
  console.warn("[useQNS] VITE_QNS_RESOLVER_ADDRESS not set");
}

const QNS_RESOLVER_ABI = [
  {
    name: "reverseResolve",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_addr", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "addr",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

// Cache
const nameCache = new Map<string, { name: string | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export function clearQNSCache(address: string): void {
  if (!isValidAddress(address)) return;
  nameCache.delete(address.toLowerCase());
}

export function clearAllQNSCache(): void {
  nameCache.clear();
}

export async function reverseResolve(address: string): Promise<string | null> {
  if (!isValidAddress(address)) return null;
  if (!QNS_RESOLVER_ADDRESS) return null;

  const lower = address.toLowerCase();
  const cached = nameCache.get(lower);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.name;

  try {
    const name = await callContract<string>(
      QNS_RESOLVER_ADDRESS,
      QNS_RESOLVER_ABI as unknown as any[],
      "reverseResolve",
      [address]
    );
    const result = name && name.length > 0 ? name : null;
    nameCache.set(lower, { name: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error("[useQNS] reverseResolve error:", err);
    nameCache.set(lower, { name: null, timestamp: Date.now() });
    return null;
  }
}

export async function resolveQFName(name: string): Promise<string | null> {
  if (!QNS_RESOLVER_ADDRESS) return null;
  if (!name.endsWith(".qf")) return null;

  // Compute namehash manually (same as viem/ens namehash)
  const { keccak256, encodePacked } = await import("viem");
  const labels = name.split(".").reverse();
  let node: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000";
  for (const label of labels) {
    const labelBytes = new TextEncoder().encode(label);
    const labelHash = keccak256(labelBytes as unknown as `0x${string}`);
    node = keccak256(encodePacked(["bytes32", "bytes32"], [node, labelHash]));
  }

  try {
    const addr = await callContract<string>(
      QNS_RESOLVER_ADDRESS,
      QNS_RESOLVER_ABI as unknown as any[],
      "addr",
      [node]
    );
    return addr === "0x0000000000000000000000000000000000000000" ? null : addr;
  } catch (err) {
    console.error("[useQNS] resolveQFName error:", err);
    return null;
  }
}

export function isQFName(input: string): boolean {
  return input.endsWith(".qf") && input.length > 3;
}

export function normalizeQFName(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith("0x")) return null;
  if (trimmed.endsWith(".qf")) return trimmed;
  return `${trimmed}.qf`;
}

export function formatAddress(address: string, qfName?: string | null): string {
  if (qfName) return qfName;
  if (!isValidAddress(address)) return "Invalid Address";
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
  const [hasQnsName, setHasQnsName] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  const fetchQNSName = useCallback(async () => {
    if (!isValidAddress(address)) {
      setQnsName(null);
      setHasQnsName(false);
      fetchedRef.current = null;
      return;
    }
    if (fetchedRef.current === address.toLowerCase()) return;

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
      console.error("QNS lookup error:", err);
      setError("Failed to resolve QNS name");
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

  return { qnsName, hasQnsName, isLoading, error, refresh };
}

export default useQNS;
