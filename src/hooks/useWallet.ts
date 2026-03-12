import { useState, useEffect, useCallback } from 'react';
import { getAddress } from 'viem';
import { switchToQFNetwork, createWalletClientFromWindow } from '../lib/viemClient';
import { QF_NETWORK } from '../lib/constants';

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (accounts.length > 0) {
        setState({
          address: getAddress(accounts[0]),
          chainId: parseInt(chainId, 16),
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setState({
            address: null,
            chainId: null,
            isConnected: false,
            isConnecting: false,
            error: null,
          });
        } else {
          setState(prev => ({
            ...prev,
            address: getAddress(accounts[0]),
            isConnected: true,
          }));
        }
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        setState(prev => ({
          ...prev,
          chainId: parseInt(chainId, 16),
        }));
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [checkConnection]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setState(prev => ({
        ...prev,
        error: 'MetaMask not installed',
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);

      if (currentChainId !== QF_NETWORK.id) {
        await switchToQFNetwork();
      }

      setState({
        address: getAddress(accounts[0]),
        chainId: QF_NETWORK.id,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: err.message || 'Failed to connect',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  const switchNetwork = useCallback(async () => {
    try {
      await switchToQFNetwork();
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to switch network',
      }));
    }
  }, []);

  const isCorrectNetwork = state.chainId === QF_NETWORK.id;

  return {
    ...state,
    isCorrectNetwork,
    connect,
    disconnect,
    switchNetwork,
  };
}
