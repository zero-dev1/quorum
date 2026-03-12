import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQNS } from '../hooks/useQNS';
import { COLORS, FONTS } from '../lib/constants';

interface QNSNameProps {
  address: string;
  showTooltip?: boolean;
  linkToProfile?: boolean;
}

// Helper to validate Ethereum addresses
function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  return hexRegex.test(address);
}

export function QNSName({ address, showTooltip = true, linkToProfile = true }: QNSNameProps) {
  // Guard: validate address before passing to useQNS
  const validAddress = isValidAddress(address) ? address : null;
  const { qnsName, hasQnsName } = useQNS(validAddress);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const truncateAddress = (addr: string) => {
    if (!isValidAddress(addr)) return 'Invalid Address';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // If address is invalid, just show truncated error
  if (!isValidAddress(address)) {
    return (
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: '14px',
          color: COLORS.error,
        }}
      >
        Invalid Address
      </span>
    );
  }

  const content = (
    <span
      style={{
        fontFamily: FONTS.mono,
        fontSize: '14px',
        color: hasQnsName ? COLORS.primary : COLORS.textSecondary,
        cursor: showTooltip ? 'help' : 'default',
        position: 'relative',
      }}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      {hasQnsName ? qnsName : truncateAddress(address)}

      {showTooltip && tooltipVisible && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            padding: '8px 12px',
            fontSize: '12px',
            color: COLORS.textMono,
            whiteSpace: 'nowrap',
            zIndex: 100,
          }}
        >
          {address}
        </span>
      )}
    </span>
  );

  if (linkToProfile && hasQnsName) {
    return (
      <Link
        to={`/u/${qnsName}`}
        style={{ textDecoration: 'none' }}
      >
        {content}
      </Link>
    );
  }

  return content;
}
