import { useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { useStore } from '@/store/useStore';

/**
 * Syncs thirdweb wallet state into the Zustand store.
 * Renders nothing — just keeps state in sync.
 */
export function ThirdwebWalletSync() {
  const account = useActiveAccount();
  const { syncWalletState, clearWalletState } = useStore();

  useEffect(() => {
    if (account?.address) {
      syncWalletState({ address: account.address, balance: 0, tier: null });
    } else {
      clearWalletState();
    }
  }, [account?.address, syncWalletState, clearWalletState]);

  return null;
}
