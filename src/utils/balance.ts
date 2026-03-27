// src/utils/balance.ts
import { getTypedApi } from "./papiClient";

/**
 * Fetch native QF balance for a Substrate SS58 address.
 * Returns the free balance as a bigint, or null on error.
 */
export async function getNativeBalance(ss58Address: string): Promise<bigint | null> {
  try {
    const api = getTypedApi();
    const accountInfo = await api.query.System.Account.getValue(ss58Address);
    return accountInfo.data.free;
  } catch (err) {
    console.error("[balance] Failed to fetch native balance:", err);
    return null;
  }
}

/**
 * Format a balance bigint (18 decimals) to a human-readable string.
 * e.g. 1_500_000_000_000_000_000n → "1.50"
 */
export function formatQFBalance(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const fractional = (wei % 10n ** 18n) / 10n ** 16n; // 2 decimal places
  return `${whole.toLocaleString()}.${fractional.toString().padStart(2, "0")}`;
}
