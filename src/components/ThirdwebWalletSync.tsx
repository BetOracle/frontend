import { useEffect } from 'react';
import { useActiveAccount, useDisconnect, useActiveWallet } from 'thirdweb/react';
import { useStore } from '@/store/useStore';
import { getTierFromBalance } from '@/data/mockData';

/**
 * Syncs thirdweb wallet state into the Zustand store.
 * Renders nothing — just keeps state in sync.
 */
export function ThirdwebWalletSync() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { syncWalletState, clearWalletState } = useStore();

  useEffect(() => {
    if (account?.address) {
      // When connected, sync the address into our store.
      // In production you'd call a contract to get the real $ORACLE balance.
      // For now we use a mock balance to demonstrate tier logic.
      const mockBalance = 5_000_000; // Bronze tier by default
      const tier = getTierFromBalance(mockBalance);

      syncWalletState({
        address: account.address,
        balance: mockBalance,
        tier,
      });
    } else {
      clearWalletState();
    }
  }, [account?.address, syncWalletState, clearWalletState]);

  return null;
}
