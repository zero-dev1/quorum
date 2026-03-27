import { createClient, type PolkadotClient, type TypedApi } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";
import { qf } from "@polkadot-api/descriptors";

const QF_RPC_URL = import.meta.env.VITE_QF_RPC_URL || "wss://mainnet.qfnode.net";

let client: PolkadotClient | null = null;
let typedApi: TypedApi<typeof qf> | null = null;

export function getClient(): PolkadotClient {
  if (!client) {
    client = createClient(getWsProvider(QF_RPC_URL));
  }
  return client;
}

export function getTypedApi(): TypedApi<typeof qf> {
  if (!typedApi) {
    typedApi = getClient().getTypedApi(qf);
  }
  return typedApi;
}

export function destroyClient(): void {
  if (client) {
    client.destroy();
    client = null;
    typedApi = null;
  }
}

/** Optional: monitor connection health via finalized blocks */
export function watchConnectionStatus(callback: (connected: boolean) => void) {
  const c = getClient();
  let lastSeen = Date.now();
  const sub = c.finalizedBlock$.subscribe({
    next() {
      lastSeen = Date.now();
      callback(true);
    },
    error() {
      callback(false);
    },
  });
  const interval = setInterval(() => {
    if (Date.now() - lastSeen > 30_000) callback(false);
  }, 10_000);
  return () => { sub.unsubscribe(); clearInterval(interval); };
}
