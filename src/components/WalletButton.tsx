import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { useStore } from "@/store/useStore";
import { thirdwebClient, celoChain } from "@/config/thirdweb";

export function WalletButton() {
  const account = useActiveAccount();
  const { tokenBalance } = useStore();

  return (
    <div className="flex items-center gap-3">
      {account?.address && tokenBalance > 0 && (
        <div className="hidden lg:flex flex-col items-end mr-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Balance</span>
          <span className="text-xs font-mono font-bold text-success">
             💵 {tokenBalance.toLocaleString()} $ORACLE
          </span>
        </div>
      )}
      <ConnectButton 
        client={thirdwebClient} 
        chain={celoChain}
        connectButton={{
          className: "gradient-primary text-black font-bold h-9 px-4 rounded-lg shadow-lg shadow-primary/20",
          label: "Connect Wallet",
        }}
        detailsButton={{
          className: "bg-black/20 border border-white/10 rounded-lg h-9 px-3 hover:bg-black/40 transition-colors",
        }}
      />
    </div>
  );
}
