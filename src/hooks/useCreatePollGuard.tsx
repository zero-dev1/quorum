import React, { useCallback } from 'react';
import { useWallet } from './useWallet';
import { useQNS } from './useQNS';

interface CreatePollGuardResult {
  canCreate: boolean;
  errorType: 'not_connected' | 'no_qns_name' | null;
}

export function useCreatePollGuard(address: string | null | undefined): CreatePollGuardResult {
  const { isConnected } = useWallet();
  const { hasQnsName } = useQNS(address);

  if (!isConnected) {
    return { canCreate: false, errorType: 'not_connected' };
  }

  if (!hasQnsName) {
    return { canCreate: false, errorType: 'no_qns_name' };
  }

  return { canCreate: true, errorType: null };
}

export function useCreatePollGuardCallback(
  address: string | null | undefined,
  addToast: (message: React.ReactNode, type: 'success' | 'error') => void
) {
  const { isConnected } = useWallet();
  const { hasQnsName } = useQNS(address);

  return useCallback(() => {
    if (!isConnected) {
      addToast('Connect your wallet to create a poll.', 'error');
      return false;
    }

    if (!hasQnsName) {
      addToast(
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
      return false;
    }

    return true;
  }, [isConnected, hasQnsName, addToast]);
}
