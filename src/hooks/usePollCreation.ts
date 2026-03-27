import { useState, useCallback } from "react";
import { callContract, writeContract, type TxResult } from "../utils/contractCall";
import { useWalletStore } from "../stores/walletStore";
import {
  POLL_CREATION_ADDRESS,
  POLL_CREATION_ABI,
} from "../lib/contracts";

function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

const ABI = POLL_CREATION_ABI as unknown as any[];
const ADDR = POLL_CREATION_ADDRESS;

export function usePollCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const getCreationFee = useCallback(async (): Promise<bigint | null> => {
    if (!ADDR) return null;
    try {
      return await callContract<bigint>(ADDR, ABI, "creationFee", []);
    } catch {
      return null;
    }
  }, []);

  const checkIsExempt = useCallback(async (address: string): Promise<boolean> => {
    if (!isValidAddress(address) || !ADDR) return false;
    try {
      return await callContract<boolean>(ADDR, ABI, "exemptAddresses", [address]);
    } catch {
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
    if (!ADDR) {
      setError("Contract not initialized");
      return { success: false };
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const { ss58Address } = useWalletStore.getState();
      if (!ss58Address) {
        setError("Wallet not connected");
        setIsLoading(false);
        return { success: false };
      }

      const token = isValidAddress(eligibilityToken)
        ? eligibilityToken
        : "0x0000000000000000000000000000000000000000";

      const result: TxResult = await writeContract(
        ADDR,
        ABI,
        "createPoll",
        [question, description, options, durationDays, eligibilityType, token, eligibilityPodId],
        ss58Address,
        fee
      );

      setTxHash(result.txHash);

      // Wait for confirmation in background
      result.confirmation.then((conf) => {
        if (!conf.confirmed) {
          console.warn("createPoll tx not confirmed:", conf.error);
        }
      });

      setIsLoading(false);
      // Note: pollId extraction from events is not available via PAPI broadcast pattern.
      // The page should poll for the new poll after success.
      return { success: true, hash: result.txHash };
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Failed to create poll");
      return { success: false };
    }
  }, []);

  return { getCreationFee, checkIsExempt, createPoll, isLoading, error, txHash };
}
