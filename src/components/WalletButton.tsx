import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useQNS } from '../hooks/useQNS';
import { COLORS, FONTS } from '../lib/constants';

export function WalletButton() {
  const { address, isConnected, isConnecting, isCorrectNetwork, connect, disconnect, switchNetwork } = useWallet();
  const { qnsName, hasQnsName } = useQNS(address);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        style={{
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: `1px solid ${COLORS.primary}`,
          color: COLORS.primary,
          fontFamily: FONTS.body,
          fontSize: '14px',
          fontWeight: 500,
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          transition: 'all 150ms ease',
          opacity: isConnecting ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isConnecting) {
            e.currentTarget.style.backgroundColor = COLORS.primary;
            e.currentTarget.style.color = COLORS.textPrimary;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = COLORS.primary;
        }}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button
        onClick={switchNetwork}
        style={{
          padding: '8px 16px',
          backgroundColor: COLORS.warning,
          border: 'none',
          color: COLORS.background,
          fontFamily: FONTS.body,
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Switch Network
      </button>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: COLORS.primary,
          }}
        />
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: '14px',
            color: hasQnsName ? COLORS.primary : COLORS.textSecondary,
          }}
        >
          {hasQnsName ? qnsName : truncateAddress(address!)}
        </span>
      </button>

      {dropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            padding: '8px 0',
            minWidth: '200px',
            zIndex: 101,
          }}
        >
          {/* Copyable Address */}
          {address && (
            <button
              onClick={copyAddress}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: FONTS.mono,
                fontSize: '12px',
                color: COLORS.textSecondary,
                textAlign: 'left',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>{copiedAddress ? 'Copied!' : address}</span>
              {!copiedAddress && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.textSecondary} strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          )}

          {hasQnsName && (
            <Link
              to={`/u/${qnsName}`}
              onClick={() => setDropdownOpen(false)}
              style={{
                display: 'block',
                padding: '10px 16px',
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: COLORS.textPrimary,
                textDecoration: 'none',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              My Votes
            </Link>
          )}
          {hasQnsName && (
            <Link
              to={`/u/${qnsName}?tab=created`}
              onClick={() => setDropdownOpen(false)}
              style={{
                display: 'block',
                padding: '10px 16px',
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: COLORS.textPrimary,
                textDecoration: 'none',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              My Polls
            </Link>
          )}
          <button
            onClick={() => {
              disconnect();
              setDropdownOpen(false);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 16px',
              fontFamily: FONTS.body,
              fontSize: '14px',
              color: COLORS.error,
              textAlign: 'left',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.background;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
