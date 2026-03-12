import { useState, useEffect } from 'react';
import { getContract } from 'viem';
import { publicClient } from '../lib/viemClient';
import { COLORS, FONTS, ERC20_ABI } from '../lib/constants';

interface EligibilityBadgeProps {
  eligibilityType: number;
  eligibilityToken: string;
  eligibilityPodId: bigint;
}

export function EligibilityBadge({
  eligibilityType,
  eligibilityToken,
  eligibilityPodId,
}: EligibilityBadgeProps) {
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (eligibilityType === 2 && eligibilityToken) {
      const fetchTokenSymbol = async () => {
        try {
          const contract = getContract({
            address: eligibilityToken as `0x${string}`,
            abi: ERC20_ABI,
            client: publicClient,
          });
          const symbol = await contract.read.symbol();
          setTokenSymbol(symbol);
        } catch (err) {
          console.error('Error fetching token symbol:', err);
        }
      };
      fetchTokenSymbol();
    }
  }, [eligibilityType, eligibilityToken]);

  const getBadgeContent = () => {
    switch (eligibilityType) {
      case 0:
        return { text: 'Open to All', style: {} };
      case 1:
        return {
          text: 'QF Holders Only',
          style: { borderLeft: `4px solid ${COLORS.primary}` },
        };
      case 2:
        return {
          text: tokenSymbol
            ? `Requires ${tokenSymbol}`
            : `Requires Token ${eligibilityToken.slice(0, 6)}...`,
          style: { borderLeft: `4px solid ${COLORS.primary}` },
        };
      case 3:
        return {
          text: `Pod Members: Pod #${eligibilityPodId.toString()}`,
          style: { borderLeft: `4px solid ${COLORS.primary}` },
        };
      default:
        return { text: 'Unknown', style: {} };
    }
  };

  const { text, style } = getBadgeContent();

  return (
    <span
      style={{
        fontFamily: FONTS.mono,
        fontSize: '13px',
        color: eligibilityType === 0 ? COLORS.textSecondary : COLORS.primary,
        padding: '4px 8px',
        backgroundColor: eligibilityType === 0 ? 'transparent' : 'rgba(99, 102, 241, 0.1)',
        ...style,
      }}
    >
      {text}
    </span>
  );
}
