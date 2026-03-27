import { encodeFunctionData, decodeFunctionResult } from "viem";
import { Binary } from "polkadot-api";
import { getTypedApi } from "./papiClient";
import { getCurrentConnection } from "./wallet";
import { ensureAccountMapped } from "./accountMapping";

export interface TxResult {
  txHash: string;
  confirmation: Promise<{ confirmed: boolean; error?: string }>;
}

// A known SS58 address for read-only calls (any valid address works —
// reads don't need to be "from" the caller). Use the deployer or any funded account.
const READ_ORIGIN_SS58 =
  import.meta.env.VITE_READ_ORIGIN_SS58 || "5FbmtGERRp4MhuwojmA2XGWghZ7XSNBLCUKQCrTVRz8bVGrU";

// ─── Read path ───────────────────────────────────────────────────────

export async function callContract<T = any>(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[] = []
): Promise<T> {
  const data = encodeFunctionData({ abi, functionName, args });
  const typedApi = getTypedApi();

  const callResult = await typedApi.apis.ReviveApi.call(
    READ_ORIGIN_SS58,
    Binary.fromHex(contractAddress as `0x${string}`),
    0n,
    undefined,
    undefined,
    Binary.fromHex(data as `0x${string}`)
  );

  // Extract return bytes from the nested result structure
  const inner = callResult.result;
  let returnBytes: Uint8Array | string | null = null;

  if (inner && typeof inner === "object" && "success" in inner) {
    if (inner.success && (inner as any).value?.data) {
      const d = (inner as any).value.data;
      if (d instanceof Uint8Array) returnBytes = d;
      else if (typeof d?.asBytes === "function") returnBytes = d.asBytes();
      else if (typeof d?.asHex === "function") returnBytes = d.asHex();
      else returnBytes = d;
    } else if (!inner.success) {
      throw new Error(`Contract call reverted: ${functionName}`);
    }
  }

  if (!returnBytes && inner && typeof inner === "object") {
    if ("Ok" in inner && (inner as any).Ok?.data) {
      returnBytes = (inner as any).Ok.data;
    } else if ("Err" in inner) {
      throw new Error(`Contract error: ${functionName}: ${JSON.stringify((inner as any).Err)}`);
    }
  }

  if (!returnBytes && (callResult as any)?.data) {
    returnBytes = (callResult as any).data;
  }

  if (!returnBytes) {
    throw new Error(`No return data from ${functionName}`);
  }

  // Convert to hex
  let hex: `0x${string}`;
  if (returnBytes instanceof Uint8Array) {
    hex = Binary.fromBytes(returnBytes).asHex() as `0x${string}`;
  } else if (typeof returnBytes === "string") {
    hex = (returnBytes.startsWith("0x") ? returnBytes : "0x" + returnBytes) as `0x${string}`;
  } else if (typeof (returnBytes as any)?.asHex === "function") {
    hex = (returnBytes as any).asHex() as `0x${string}`;
  } else if (typeof (returnBytes as any)?.toHex === "function") {
    hex = (returnBytes as any).toHex() as `0x${string}`;
  } else {
    throw new Error(`Cannot convert return data for ${functionName}`);
  }

  return decodeFunctionResult({ abi, functionName, data: hex }) as T;
}

// ─── Write path ──────────────────────────────────────────────────────
//
// Same pattern as QNS: resolve on "broadcasted", track confirmation
// separately. QF Network's RPC doesn't reliably emit best-block events,
// so PAPI's Observable may not fire txBestBlocksState. But every signed
// and broadcast tx does land on-chain.

export async function writeContract(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[],
  _signer: any,
  value: bigint = 0n,
  verifyOnChain?: () => Promise<boolean>
): Promise<TxResult> {
  let connection = getCurrentConnection();
  if (!connection) {
    // Attempt silent reconnect from persisted state
    try {
      const { useWalletStore } = await import("../stores/walletStore");
      const { walletName } = useWalletStore.getState();
      if (walletName) {
        const { connectSubstrateWallet } = await import("./wallet");
        const walletId = walletName === "talisman" ? "talisman" : "subwallet-js";
        await connectSubstrateWallet(walletId);
        connection = getCurrentConnection();
      }
    } catch {}
    if (!connection) {
      throw new Error("Wallet not connected. Please reconnect.");
    }
  }

  try {
    await ensureAccountMapped(connection.address);
  } catch (mapErr: any) {
    const msg = mapErr?.message ?? "";
    if (msg.includes("CannotLookup") || msg.includes("METADATA_HASH_ERROR")) {
      throw new Error(
        "CheckMetadataHash error: disable this in Talisman → Settings → Networks & Tokens → QF Network → uncheck metadata hash verification. Then reconnect."
      );
    }
    throw new Error("Account mapping failed. Please reconnect your wallet.");
  }

  const data = encodeFunctionData({ abi, functionName, args });
  const typedApi = getTypedApi();

  // Dry-run for gas estimation
  let gasLimit = { ref_time: 100_000_000_000n, proof_size: 5_000_000n };
  let storageDeposit = 0n;

  try {
    const dryRun = await typedApi.apis.ReviveApi.call(
      connection.address,
      Binary.fromHex(contractAddress as `0x${string}`),
      value,
      undefined,
      undefined,
      Binary.fromHex(data as `0x${string}`)
    );
    const d = dryRun as any;
    if (d.gas_required) {
      gasLimit = {
        ref_time: (d.gas_required.ref_time * 150n) / 100n,
        proof_size: (d.gas_required.proof_size * 150n) / 100n,
      };
    }
    if (d.storage_deposit?.value) storageDeposit = d.storage_deposit.value;
  } catch {}

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      try {
        const retryDryRun = await typedApi.apis.ReviveApi.call(
          connection.address,
          Binary.fromHex(contractAddress as `0x${string}`),
          value,
          undefined,
          undefined,
          Binary.fromHex(data as `0x${string}`)
        );
        const rd = retryDryRun as any;
        if (rd.gas_required) {
          gasLimit = {
            ref_time: rd.gas_required.ref_time * 2n,
            proof_size: rd.gas_required.proof_size * 2n,
          };
        }
        if (rd.storage_deposit?.value) storageDeposit = rd.storage_deposit.value;
      } catch {}
    }

    const tx = typedApi.tx.Revive.call({
      dest: Binary.fromHex(contractAddress as `0x${string}`),
      value,
      gas_limit: gasLimit,
      storage_deposit_limit: storageDeposit,
      data: Binary.fromHex(data as `0x${string}`),
    });

    try {
      const result = await new Promise<TxResult>((resolveResult, rejectResult) => {
        let broadcastReceived = false;
        let confirmationResolve: (v: { confirmed: boolean; error?: string }) => void;
        const confirmationPromise = new Promise<{ confirmed: boolean; error?: string }>(
          (res) => { confirmationResolve = res; }
        );

        const signingTimeout = setTimeout(() => {
          if (!broadcastReceived) rejectResult(new Error("Transaction signing timed out."));
        }, 30_000);

        let confirmationTimeout: ReturnType<typeof setTimeout> | null = null;
        let confirmationResolved = false;

        const resolveConfirmation = (v: { confirmed: boolean; error?: string }) => {
          if (confirmationResolved) return;
          confirmationResolved = true;
          confirmationResolve(v);
          setTimeout(() => { try { subscription.unsubscribe(); } catch {} }, 100);
        };

        const subscription = tx
          .signSubmitAndWatch(connection!.signer.polkadotSigner, { at: "best" as const })
          .subscribe({
            next(ev: any) {
              if (ev.type === "broadcasted") {
                broadcastReceived = true;
                clearTimeout(signingTimeout);
                resolveResult({ txHash: ev.txHash, confirmation: confirmationPromise });

                confirmationTimeout = setTimeout(async () => {
                  if (verifyOnChain) {
                    try {
                      const ok = await verifyOnChain();
                      resolveConfirmation({ confirmed: ok, error: ok ? undefined : "not_confirmed" });
                    } catch {
                      resolveConfirmation({ confirmed: false, error: "verification_failed" });
                    }
                  } else {
                    resolveConfirmation({ confirmed: false, error: "not_confirmed" });
                  }
                }, 30_000);
                return;
              }

              if (ev.type === "txBestBlocksState" && ev.found) {
                if (confirmationTimeout) clearTimeout(confirmationTimeout);
                resolveConfirmation({
                  confirmed: !!ev.ok,
                  error: ev.ok ? undefined : (ev.dispatchError?.type ?? "Transaction reverted"),
                });
                return;
              }

              if (ev.type === "finalized") {
                if (confirmationTimeout) clearTimeout(confirmationTimeout);
                resolveConfirmation({
                  confirmed: !!ev.ok,
                  error: ev.ok ? undefined : (ev.dispatchError?.type ?? "Transaction reverted"),
                });
                return;
              }
            },
            error(err: any) {
              if (!broadcastReceived) {
                clearTimeout(signingTimeout);
                try { subscription.unsubscribe(); } catch {}
                rejectResult(err);
              } else {
                if (confirmationTimeout) clearTimeout(confirmationTimeout);
                resolveConfirmation({ confirmed: false, error: err?.message || "Subscription error" });
              }
            },
          });
      });

      return result;
    } catch (err: any) {
      const msg = err?.message ?? "";

      if (msg.includes("Cancelled") || msg.includes("Rejected") || msg.includes("cancelled")) {
        throw new Error("Transaction rejected by user");
      }
      if (msg.includes("CannotLookup")) {
        throw new Error(
          "CheckMetadataHash error: disable in Talisman → Settings → Networks & Tokens."
        );
      }

      const isRetriable = msg.includes("BadProof") || msg.includes("OutOfGas") || msg.includes("reverted");
      if (isRetriable && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      throw new Error(`Transaction failed: ${msg}`);
    }
  }

  throw new Error("Transaction failed after retry");
}
