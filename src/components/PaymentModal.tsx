import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { Tier } from '@/types';
import { Loader2, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { useActiveAccount } from 'thirdweb/react';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
  const { unlockTier, paidTier } = useStore();
  const account = useActiveAccount();
  const isConnected = !!account;
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);
  const [successTier, setSuccessTier] = useState<Tier | null>(null);

  const handlePay = (tier: Tier) => {
    if (!account?.address) return;
    setLoadingTier(tier);
    // Simulate smart contract payment process (x402 / cUSD spend)
    setTimeout(() => {
      setLoadingTier(null);
      setSuccessTier(tier);
      unlockTier(tier);
      setTimeout(() => {
        onOpenChange(false);
        setSuccessTier(null);
      }, 2000);
    }, 2500);
  };

  const tiers = [
    {
      name: 'bronze' as Tier,
      price: '1',
      desc: 'See all VALUE BET predictions with full match factors and standard market odds.',
    },
    {
      name: 'silver' as Tier,
      price: '5',
      desc: 'Adds 30-min early access, AI reasoning text, and full Edge percentage data.',
    },
    {
      name: 'gold' as Tier,
      price: '15',
      desc: 'All 5 leagues unlocked. Full API access key via dashboard and priority alerts.',
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-background border-white/10 glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Zap className="text-primary" /> Upgrade Access
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            Unlock premium features using cUSD micropayments on the Celo network. Fast, cheap, and secure.
          </DialogDescription>
        </DialogHeader>

        {!account?.address ? (
          <div className="py-8 text-center bg-black/20 rounded-xl border border-white/5">
            <ShieldCheck size={40} className="mx-auto text-muted-foreground opacity-50 mb-3" />
            <p className="text-lg font-medium text-foreground">Wallet Not Connected</p>
            <p className="text-sm text-muted-foreground">Please connect your Celo wallet to upgrade.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((t) => {
              const isLoading = loadingTier === t.name;
              const isSuccess = successTier === t.name;
              const isCurrent = paidTier === t.name;
              
              return (
                <div key={t.name} className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${isCurrent ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-primary/50'}`}>
                  <div>
                    <h3 className="text-lg font-bold text-foreground tracking-wide">{t.name}</h3>
                    <div className="text-2xl font-black font-mono text-success my-2 flex items-center gap-1">
                      {t.price} <span className="text-sm font-medium text-muted-foreground uppercase">cUSD</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{t.desc}</p>
                  </div>
                  
                  <Button 
                    onClick={() => handlePay(t.name)}
                    disabled={isLoading || isSuccess || isCurrent}
                    variant={isCurrent ? "outline" : "default"}
                    className={`w-full ${!isCurrent && 'gradient-primary text-black font-semibold'}`}
                  >
                    {isCurrent ? (
                      'Current Tier'
                    ) : isSuccess ? (
                      <><CheckCircle2 size={16} className="mr-2" /> Unlocked</>
                    ) : isLoading ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Approving...</>
                    ) : (
                      'Pay ' + t.price + ' cUSD'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
