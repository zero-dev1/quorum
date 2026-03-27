import { useWalletStore } from "../stores/walletStore";

/**
 * Drop-in replacement for the old MetaMask useWallet hook.
 * Pages that import useWallet() get the same shape back,
 * but it's now backed by the Zustand store + Substrate wallets.
 */
export function useWallet() {
  const store = useWalletStore();

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
    connect: store.connect,
    disconnect: store.disconnect,
    switchNetwork: async () => {}, // No-op — not applicable for Substrate wallets
  };
}
