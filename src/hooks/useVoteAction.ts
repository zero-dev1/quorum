import { useState, useCallback } from "react";
import { writeContract, type TxResult } from "../utils/contractCall";
import { useWalletStore } from "../stores/walletStore";
import { VOTE_ACTION_ADDRESS, VOTE_ACTION_ABI } from "../lib/contracts";

const ABI = VOTE_ACTION_ABI as unknown as any[];
const ADDR = VOTE_ACTION_ADDRESS;

export function useVoteAction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const castVote = useCallback(async (
    pollId: bigint,
    optionIndex: number
  ): Promise<{ success: boolean; hash?: string }> => {
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

      const result: TxResult = await writeContract(
        ADDR,
        ABI,
        "vote",
        [pollId, BigInt(optionIndex)],
        ss58Address,
        0n
      );

      setTxHash(result.txHash);

      result.confirmation.then((conf) => {
        if (!conf.confirmed) console.warn("vote tx not confirmed:", conf.error);
      });

      setIsLoading(false);
      return { success: true, hash: result.txHash };
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Failed to cast vote");
      return { success: false };
    }
  }, []);

  return { castVote, isLoading, error, txHash };
}
