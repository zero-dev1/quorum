import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useQNS } from '../hooks/useQNS';
import { COLORS, FONTS } from '../lib/constants';
import { useToast } from '../stores/toastStore';

export function TopBar() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { address, isConnected } = useWallet();
  const { hasQnsName } = useQNS(address);

  const navLinks = [
    { path: '/explore', label: 'Explore' },
    { path: '/create', label: 'Create', requiresQns: true },
    { path: '/about', label: 'About' },
  ];

  const isActive = (path: string) => location.pathname === path;

  
  const handleNavClick = (e: React.MouseEvent, link: typeof navLinks[0]) => {
    if (link.requiresQns) {
      if (!isConnected) {
        e.preventDefault();
        toast('Connect your wallet to create a poll.', 'error');
        return;
      }
      if (!hasQnsName) {
        e.preventDefault();
        toast(
          <span>
            You need a .qf name to create polls on QUORUM.{" "}
            <a
              href="https://dotqf.xyz"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#6366F1', textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              Register here →
            </a>
          </span>,
          'error'
        );
        return;
      }
    }
    navigate(link.path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '64px',
          backgroundColor: COLORS.background,
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            fontFamily: FONTS.headline,
            fontSize: '20px',
            fontWeight: 700,
            color: COLORS.textPrimary,
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        >
          QUORUM
        </Link>

        {/* Desktop Navigation - Centered */}
        <nav
          className="desktop-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={(e) => handleNavClick(e, link)}
              style={{
                fontFamily: FONTS.body,
                fontSize: '15px',
                fontWeight: 400,
                color: isActive(link.path) ? COLORS.textPrimary : COLORS.textSecondary,
                textDecoration: 'none',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = COLORS.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isActive(link.path)
                  ? COLORS.textPrimary
                  : COLORS.textSecondary;
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Wallet / Mobile Hamburger Container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          {/* Desktop Wallet Button */}
          <div className="desktop-wallet">
            <WalletDisplay />
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              minHeight: '44px',
              minWidth: '44px',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.textPrimary}
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <MobileMenu 
          onClose={() => setMobileMenuOpen(false)} 
          navLinks={navLinks} 
          isActive={isActive}
          onNavClick={handleNavClick}
        />
      )}

      
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-wallet {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}

// Mobile Menu Component
interface MobileMenuProps {
  onClose: () => void;
  navLinks: { path: string; label: string; requiresQns?: boolean }[];
  isActive: (path: string) => boolean;
  onNavClick: (e: React.MouseEvent, link: { path: string; label: string; requiresQns?: boolean }) => void;
}

function MobileMenu({ onClose, navLinks, isActive, onNavClick }: MobileMenuProps) {
  const { address, isConnected, disconnect, qnsName, balance } = useWallet();
  const { hasQnsName } = useQNS(address);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.background,
        zIndex: 99,
        display: 'flex',
        flexDirection: 'column',
        padding: '88px 24px 32px',
      }}
    >
      {/* User info at top */}
      {isConnected && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '16px 0',
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          {/* QNS Name with connection indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: COLORS.primary,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: '16px',
                color: COLORS.primary,
              }}
            >
              {hasQnsName ? qnsName : address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
            </span>
          </div>

          {/* Balance */}
          {balance && (
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: '14px',
                color: COLORS.textSecondary,
                marginLeft: '16px',
              }}
            >
              {balance} QF
            </span>
          )}



          {/* My Votes and My Polls links */}
          {hasQnsName && (
            <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <Link
                to={`/u/${qnsName}`}
                onClick={onClose}
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '16px',
                  fontWeight: 400,
                  color: COLORS.textSecondary,
                  textDecoration: 'none',
                }}
              >
                My Votes
              </Link>
              <Link
                to={`/u/${qnsName}?tab=created`}
                onClick={onClose}
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '16px',
                  fontWeight: 400,
                  color: COLORS.textSecondary,
                  textDecoration: 'none',
                }}
              >
                My Polls
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Nav Links */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          flex: 1,
          paddingTop: '24px',
        }}
      >
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            onClick={(e) => {
              onNavClick(e, link);
              if (!link.requiresQns) {
                onClose();
              }
            }}
            style={{
              fontFamily: FONTS.headline,
              fontSize: '24px',
              fontWeight: 600,
              color: isActive(link.path) ? COLORS.primary : COLORS.textPrimary,
              textDecoration: 'none',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, marginTop: '24px', marginBottom: '16px' }} />

      {/* Disconnect Button at bottom */}
      {isConnected && (
        <button
          onClick={() => {
            disconnect();
            onClose();
          }}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.error}`,
            fontFamily: FONTS.body,
            fontSize: '16px',
            fontWeight: 400,
            color: COLORS.error,
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.error;
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = COLORS.error;
          }}
        >
          Disconnect
        </button>
      )}
    </div>
  );
}

// Desktop Wallet Display Component with Balance
function WalletDisplay() {
  const { address, isConnected, isConnecting, isCorrectNetwork, connect, disconnect, switchNetwork, qnsName, balance } = useWallet();
  const { hasQnsName } = useQNS(address);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

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
    <div style={{ position: 'relative' }}>
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
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: '14px',
            color: COLORS.primary,
          }}
        >
          {hasQnsName ? qnsName : truncateAddress(address!)}
        </span>
        {balance && (
          <>
            <span style={{ color: COLORS.textMuted }}>·</span>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: '14px',
                color: COLORS.textSecondary,
              }}
            >
              {balance} QF
            </span>
          </>
        )}
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
              <span>{copiedAddress ? 'Copied!' : `${address.slice(0, 10)}...${address.slice(-8)}`}</span>
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
