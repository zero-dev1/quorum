import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { QF_NETWORK } from './constants';

export const publicClient = createPublicClient({
  chain: QF_NETWORK,
  transport: http(import.meta.env.VITE_ETH_RPC_URL || 'https://archive.mainnet.qfnode.net/eth'),
});

export const createWalletClientFromWindow = () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  
  return createWalletClient({
    chain: QF_NETWORK,
    transport: custom(window.ethereum),
  });
};

export const switchToQFNetwork = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2a' }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x2a',
            chainName: 'QF Network',
            nativeCurrency: {
              name: 'QF',
              symbol: 'QF',
              decimals: 18,
            },
            rpcUrls: ['https://archive.mainnet.qfnode.net/eth'],
            blockExplorerUrls: ['https://explorer.qfnode.net'],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
};

declare global {
  interface Window {
    ethereum?: any;
  }
}
