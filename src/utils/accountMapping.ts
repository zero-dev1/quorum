import { deriveEVMAddress } from "./wallet";
import { getTypedApi } from "./papiClient";
import { Binary } from "polkadot-api";

const STORAGE_KEY = "quorum_mapped_accounts";

export const METADATA_HASH_ERROR = "METADATA_HASH_ERROR";
export const USER_CANCELLED = "USER_CANCELLED";
export const INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE_FOR_MAPPING";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function isAccountMappedOnChain(ss58Address: string): Promise<boolean> {
  try {
    const api = getTypedApi();
    const evmAddress = deriveEVMAddress(ss58Address);
    const evmBinary = Binary.fromBytes(hexToBytes(evmAddress));
    const result: any = await api.query.Revive.OriginalAccount.getValue(evmBinary);
    if (result === null || result === undefined) return false;
    if (result instanceof Uint8Array) return result.some((b: number) => b !== 0);
    if (typeof result === "string") return result !== "" && !/^0x0+$/.test(result);
    return true;
  } catch {
    return false;
  }
}

function isAccountMappedLocally(ss58Address: string): boolean {
  try {
    const mapped: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return mapped.includes(ss58Address);
  } catch {
    return false;
  }
}

function markAccountMappedLocally(ss58Address: string): void {
  try {
    const mapped: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!mapped.includes(ss58Address)) {
      mapped.push(ss58Address);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
    }
  } catch {}
}

export async function ensureAccountMapped(ss58Address: string): Promise<void> {
  if (isAccountMappedLocally(ss58Address)) return;

  const mappedOnChain = await isAccountMappedOnChain(ss58Address);
  if (mappedOnChain) {
    markAccountMappedLocally(ss58Address);
    return;
  }

  const api = getTypedApi();
  const { getCurrentConnection } = await import("./wallet");
  const connection = getCurrentConnection();
  if (!connection) throw new Error("No wallet connected");

  try {
    const result = await api.tx.Revive.map_account().signAndSubmit(
      connection.signer.polkadotSigner,
      { at: "best" as const }
    );

    if (!result.ok) {
      const error = result.dispatchError;
      if (error) {
        const errorStr =
          typeof error === "object" && "type" in error
            ? String((error as any).type)
            : String(error);
        if (errorStr.includes("AlreadyMapped") || errorStr.includes("AccountAlreadyMapped")) {
          markAccountMappedLocally(ss58Address);
          return;
        }
        throw new Error(errorStr);
      }
    }

    markAccountMappedLocally(ss58Address);
  } catch (err: any) {
    const msg = err?.message ?? "";

    if (msg.includes("AlreadyMapped") || msg.includes("AccountAlreadyMapped")) {
      markAccountMappedLocally(ss58Address);
      return;
    }
    if (msg.includes("Cancelled") || msg.includes("Rejected") || msg.includes("cancelled")) {
      throw new Error(USER_CANCELLED);
    }
    if (msg.includes("CannotLookup")) {
      throw new Error(METADATA_HASH_ERROR);
    }
    if (msg.includes("InsufficientBalance") || msg.includes("Inability to pay") || msg.includes("1010:")) {
      throw new Error(INSUFFICIENT_BALANCE);
    }

    throw err;
  }
}
