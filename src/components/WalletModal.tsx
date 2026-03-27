// src/components/WalletModal.tsx
import { useWalletStore } from "../stores/walletStore";
import { getAvailableWallets } from "../utils/wallet";
import { COLORS, FONTS } from "../lib/constants";

export function WalletModal() {
  const { showWalletModal, connecting, walletError, connectWallet, setShowWalletModal, clearWalletError } = useWalletStore();

  if (!showWalletModal) return null;

  const available = getAvailableWallets();
  const hasTalisman = available.includes("talisman");
  const hasSubWallet = available.includes("subwallet-js");

  const handleSelect = (type: "talisman" | "subwallet") => {
    clearWalletError();
    connectWallet(type);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={() => { if (!connecting) setShowWalletModal(false); }}
    >
      <div
        style={{
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          padding: "32px",
          maxWidth: "400px",
          width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontFamily: FONTS.headline,
            fontSize: "20px",
            fontWeight: 700,
            color: COLORS.textPrimary,
            margin: "0 0 8px 0",
          }}
        >
          Connect Wallet
        </h2>
        <p
          style={{
            fontFamily: FONTS.body,
            fontSize: "14px",
            color: COLORS.textSecondary,
            margin: "0 0 24px 0",
          }}
        >
          Choose a Substrate wallet to continue.
        </p>

        {walletError && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "rgba(239,68,68,0.1)",
              border: `1px solid ${COLORS.error}`,
              fontFamily: FONTS.body,
              fontSize: "13px",
              color: COLORS.error,
              marginBottom: "16px",
              lineHeight: 1.5,
            }}
          >
            {walletError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Talisman */}
          <button
            onClick={() => handleSelect("talisman")}
            disabled={connecting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "16px",
              backgroundColor: COLORS.background,
              border: `1px solid ${COLORS.border}`,
              cursor: connecting ? "not-allowed" : "pointer",
              opacity: connecting ? 0.6 : 1,
              transition: "border-color 150ms ease",
            }}
            onMouseEnter={(e) => { if (!connecting) e.currentTarget.style.borderColor = COLORS.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
          >
            <div style={{
              width: "32px", height: "32px", backgroundColor: "#FD4848",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#FFF",
            }}>
              T
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontFamily: FONTS.body, fontSize: "15px", fontWeight: 600, color: COLORS.textPrimary }}>
                Talisman
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: hasTalisman ? COLORS.success : COLORS.textMuted }}>
                {hasTalisman ? "Detected" : "Not installed"}
              </div>
            </div>
          </button>

          {/* SubWallet */}
          <button
            onClick={() => handleSelect("subwallet")}
            disabled={connecting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "16px",
              backgroundColor: COLORS.background,
              border: `1px solid ${COLORS.border}`,
              cursor: connecting ? "not-allowed" : "pointer",
              opacity: connecting ? 0.6 : 1,
              transition: "border-color 150ms ease",
            }}
            onMouseEnter={(e) => { if (!connecting) e.currentTarget.style.borderColor = COLORS.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
          >
            <div style={{
              width: "32px", height: "32px", backgroundColor: "#004BFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#FFF",
            }}>
              S
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontFamily: FONTS.body, fontSize: "15px", fontWeight: 600, color: COLORS.textPrimary }}>
                SubWallet
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: hasSubWallet ? COLORS.success : COLORS.textMuted }}>
                {hasSubWallet ? "Detected" : "Not installed"}
              </div>
            </div>
          </button>
        </div>

        {connecting && (
          <p style={{
            fontFamily: FONTS.mono, fontSize: "13px", color: COLORS.textSecondary,
            margin: "16px 0 0 0", textAlign: "center",
          }}>
            Connecting...
          </p>
        )}

        {!hasTalisman && !hasSubWallet && (
          <p style={{
            fontFamily: FONTS.body, fontSize: "13px", color: COLORS.textSecondary,
            margin: "16px 0 0 0", textAlign: "center", lineHeight: 1.5,
          }}>
            No wallet detected. Install{" "}
            <a href="https://talisman.xyz" target="_blank" rel="noopener noreferrer"
              style={{ color: COLORS.primary, textDecoration: "none" }}>Talisman</a>
            {" "}or{" "}
            <a href="https://subwallet.app" target="_blank" rel="noopener noreferrer"
              style={{ color: COLORS.primary, textDecoration: "none" }}>SubWallet</a>.
          </p>
        )}
      </div>
    </div>
  );
}
