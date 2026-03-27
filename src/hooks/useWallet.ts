import { useState, useEffect } from "react";
import { useWalletStore } from "../stores/walletStore";
import { getNativeBalance, formatQFBalance } from "../utils/balance";

/**
 * Drop-in replacement for the old MetaMask useWallet hook.
 * Pages that import useWallet() get the same shape back,
 * but it's now backed by the Zustand store + Substrate wallets.
 */
export function useWallet() {
  const store = useWalletStore();
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!store.ss58Address || !store.accountMapped) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      const raw = await getNativeBalance(store.ss58Address!);
      if (!cancelled && raw !== null) {
        setBalance(formatQFBalance(raw));
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 15_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [store.ss58Address, store.accountMapped]);

  return {
    address: store.address,
    chainId: store.address ? 3426 : null,
    isConnected: !!store.address && store.accountMapped,
    isConnecting: store.connecting,
    error: store.walletError,
    isCorrectNetwork: true, // Always true — PAPI connects to the right chain
    qnsName: store.qnsName,
    displayName: store.displayName,
    ss58Address: store.ss58Address,
    balance,
    connect: store.connect,
    disconnect: store.disconnect,
    switchNetwork: async () => {}, // No-op — not applicable for Substrate wallets
  };
}
