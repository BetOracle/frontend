import { ConnectButton } from 'thirdweb/react';
import { thirdwebClient, celoChain } from '@/config/thirdweb';
import { createWallet, inAppWallet } from 'thirdweb/wallets';

const wallets = [
  inAppWallet({
    auth: {
      options: ["email", "google", "apple", "facebook", "phone"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("walletConnect"),
];

export function WalletButton() {
  return (
    <ConnectButton
      client={thirdwebClient}
      wallets={wallets}
      chain={celoChain}
      connectButton={{
        label: "Connect Wallet",
        className: "!rounded-lg !font-medium",
      }}
      theme="dark"
      connectModal={{
        title: "Connect to FootyOracle",
        titleIcon: "⚽",
        size: "compact",
      }}
    />
  );
}
