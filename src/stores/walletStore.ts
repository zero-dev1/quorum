import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ensureAccountMapped,
  METADATA_HASH_ERROR,
  USER_CANCELLED,
  INSUFFICIENT_BALANCE,
} from "../utils/accountMapping";
import {
  connectSubstrateWallet,
  disconnectWallet,
  type WalletConnection,
} from "../utils/wallet";
import { callContract } from "../utils/contractCall";

// QNS Resolver for reverse-resolving .qf names
const QNS_RESOLVER = import.meta.env.VITE_QNS_RESOLVER_ADDRESS as string;
const QNS_RESOLVER_ABI = [
  {
    name: "reverseResolve",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_addr", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function resolveQnsName(evmAddress: string): Promise<string | null> {
  if (!QNS_RESOLVER) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const name = await callContract<string>(
        QNS_RESOLVER,
        QNS_RESOLVER_ABI as unknown as any[],
        "reverseResolve",
        [evmAddress]
      );
      if (name && name.length > 0) return name;
      return null;
    } catch {}
    if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

interface WalletState {
  address: `0x${string}` | null;       // EVM address (H160)
  ss58Address: string | null;           // Substrate SS58
  qnsName: string | null;              // resolved .qf name
  displayName: string | null;           // qnsName || truncated address
  connecting: boolean;
  walletConnection: WalletConnection | null;
  walletName: string | null;            // 'talisman' | 'subwallet'
  accountMapped: boolean;
  showWalletModal: boolean;
  walletError: string | null;
  _rehydrating: boolean;

  connect: () => void;
  connectWallet: (walletType: "talisman" | "subwallet") => Promise<void>;
  disconnect: () => void;
  refreshName: () => Promise<void>;
  setShowWalletModal: (show: boolean) => void;
  clearWalletError: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      ss58Address: null,
      qnsName: null,
      displayName: null,
      connecting: false,
      walletConnection: null,
      walletName: null,
      accountMapped: false,
      showWalletModal: false,
      walletError: null,
      _rehydrating: false,

      connect: () => {
        set({ showWalletModal: true, walletError: null });
      },

      connectWallet: async (walletType) => {
        const isRehydrating = get()._rehydrating;
        const setError = (error: string) => {
          if (!isRehydrating) set({ walletError: error });
        };

        set({ connecting: true, walletError: null });

        try {
          const walletId = walletType === "talisman" ? "talisman" : "subwallet-js";
          const connection = await Promise.race([
            connectSubstrateWallet(walletId),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Wallet connection timed out (10s).")), 10_000)
            ),
          ]);

          set({ walletConnection: connection });

          const evmAddr = connection.evmAddress as `0x${string}`;
          const ss58Addr = connection.address;

          set({
            address: evmAddr,
            ss58Address: ss58Addr,
            displayName: truncateAddress(ss58Addr),
            walletName: walletType,
          });

          // Resolve QNS name in background
          resolveQnsName(evmAddr).then((name) => {
            if (name) set({ qnsName: name, displayName: name });
          });

          // Map account
          try {
            await ensureAccountMapped(ss58Addr);
            set({ accountMapped: true, showWalletModal: false });
          } catch (mapErr: any) {
            const msg = mapErr?.message ?? "";

            if (msg === METADATA_HASH_ERROR || msg.includes("METADATA_HASH_ERROR")) {
              setError(
                "QF Network requires CheckMetadataHash to be disabled. " +
                "In Talisman: Settings → Networks & Tokens → Manage Networks → QF Network → " +
                "uncheck \"Verify transaction with metadata hash\". Then reconnect."
              );
              set({ accountMapped: false });
              return;
            }

            if (msg === USER_CANCELLED || msg.includes("USER_CANCELLED")) {
              set({ accountMapped: false, showWalletModal: false });
              return;
            }

            if (msg === INSUFFICIENT_BALANCE || msg.includes("INSUFFICIENT_BALANCE")) {
              set({ accountMapped: false, showWalletModal: false });
              setError("Your wallet needs QF tokens to complete account setup.");
              return;
            }

            disconnectWallet();
            setError("Account setup failed — please try again.");
            set({
              accountMapped: false,
              address: null,
              ss58Address: null,
              qnsName: null,
              displayName: null,
              walletConnection: null,
              walletName: null,
            });
          }
        } catch (error: any) {
          const msg = error.message || "";
          if (msg.includes("No accounts found")) {
            setError("No accounts found. Create an account in your wallet extension.");
          } else if (msg.includes("extension") || msg.includes("not installed")) {
            setError("Install Talisman or SubWallet to use QUORUM.");
          } else if (msg.includes("timed out")) {
            setError(msg);
          } else {
            setError(msg || "Failed to connect wallet");
          }
          disconnectWallet();
          set({
            address: null, ss58Address: null, qnsName: null, displayName: null,
            walletConnection: null, walletName: null, accountMapped: false,
          });
        } finally {
          set({ connecting: false });
        }
      },

      disconnect: () => {
        disconnectWallet();
        set({
          address: null, ss58Address: null, qnsName: null, displayName: null,
          walletConnection: null, walletName: null, accountMapped: false,
          showWalletModal: false, walletError: null,
        });
      },

      refreshName: async () => {
        const { address } = get();
        if (!address) return;
        try {
          const name = await resolveQnsName(address);
          if (name) set({ qnsName: name, displayName: name });
        } catch {}
      },

      setShowWalletModal: (show) => set({ showWalletModal: show, walletError: null }),
      clearWalletError: () => set({ walletError: null }),
    }),
    {
      name: "quorum-wallet-storage",
      version: 1,
      partialize: (state) => ({
        address: state.address,
        ss58Address: state.ss58Address,
        qnsName: state.qnsName,
        displayName: state.displayName,
        walletName: state.walletName,
        accountMapped: state.accountMapped,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.address && state?.walletName) {
            useWalletStore.setState({ _rehydrating: true });
            const walletType = state.walletName as "talisman" | "subwallet";
            state
              .connectWallet(walletType)
              .then(() => useWalletStore.setState({ _rehydrating: false }))
              .catch(() => {
                useWalletStore.setState({ _rehydrating: false });
                state.disconnect();
              });
          }
        };
      },
    }
  )
);
