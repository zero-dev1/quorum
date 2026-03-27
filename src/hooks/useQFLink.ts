import { useState, useCallback } from "react";
import { callContract } from "../utils/contractCall";

const QFLINK_PODS_STORAGE_ADDRESS = import.meta.env.VITE_QFLINK_PODS_STORAGE_ADDRESS as string;

const QFLINK_PODS_ABI = [
  {
    inputs: [
      { internalType: "uint64", name: "podId", type: "uint64" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "isMember",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "podId", type: "uint64" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "checkPodAccess",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ABI = QFLINK_PODS_ABI as unknown as any[];

export function useQFLink() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPodMember = useCallback(async (
    podId: bigint,
    userAddress: `0x${string}` 
  ): Promise<boolean> => {
    if (!QFLINK_PODS_STORAGE_ADDRESS || !userAddress || userAddress === "0x0000000000000000000000000000000000000000") {
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const podIdUint64 = BigInt.asUintN(64, podId);
      return await callContract<boolean>(QFLINK_PODS_STORAGE_ADDRESS, ABI, "isMember", [podIdUint64, userAddress]);
    } catch (err: any) {
      setError(err.message || "Failed to check pod membership");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkPodAccess = useCallback(async (
    podId: bigint,
    userAddress: `0x${string}` 
  ): Promise<boolean> => {
    if (!QFLINK_PODS_STORAGE_ADDRESS || !userAddress || userAddress === "0x0000000000000000000000000000000000000000") {
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const podIdUint64 = BigInt.asUintN(64, podId);
      return await callContract<boolean>(QFLINK_PODS_STORAGE_ADDRESS, ABI, "checkPodAccess", [podIdUint64, userAddress]);
    } catch (err: any) {
      setError(err.message || "Failed to check pod access");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isPodMember, checkPodAccess, isLoading, error, isConfigured: !!QFLINK_PODS_STORAGE_ADDRESS };
}
