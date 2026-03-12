/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_NETWORK: string;
  readonly VITE_ETH_RPC_URL: string;
  readonly VITE_WALLET_RPC_URL: string;
  readonly VITE_POLL_STORAGE_ADDRESS: string;
  readonly VITE_POLL_CREATION_ADDRESS: string;
  readonly VITE_VOTE_ACTION_ADDRESS: string;
  readonly VITE_RESULTS_READER_ADDRESS: string;
  readonly VITE_QNS_REGISTRY_ADDRESS: string;
  readonly VITE_QNS_REGISTRAR_ADDRESS: string;
  readonly VITE_QNS_RESOLVER_ADDRESS: string;
  readonly VITE_QFLINK_PODS_STORAGE_ADDRESS: string;
  readonly VITE_QFLINK_PODS_READER_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
