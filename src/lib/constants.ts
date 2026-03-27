// Contract addresses from environment
export const QNS_CONTRACT_ADDRESS = import.meta.env.VITE_QNS_REGISTRY_ADDRESS as `0x${string}`;
export const QNS_REGISTRY_ADDRESS = import.meta.env.VITE_QNS_REGISTRY_ADDRESS as `0x${string}`;

export const QF_CHAIN_ID = 3426;
export const QF_RPC_URL = import.meta.env.VITE_QF_RPC_URL || "wss://mainnet.qfnode.net";

export const COLORS = {
  background: '#0C0A09',
  surface: '#1C1917',
  border: '#292524',
  primary: '#6366F1',
  primaryHover: '#818CF8',
  textPrimary: '#FAFAF9',
  textSecondary: '#A8A29E',
  textMuted: '#57534E',
  textMono: '#E7E5E4',
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
} as const;

export const FONTS = {
  headline: 'Syne, sans-serif',
  body: 'Geist, sans-serif',
  mono: 'Geist Mono, monospace',
} as const;

export const CREATION_FEE = 100n * 10n ** 18n;

export const QNS_CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_addr', type: 'address' }],
    name: 'nameOf',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: '_name', type: 'string' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_addr', type: 'address' }],
    name: 'hasName',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
