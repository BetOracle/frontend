import { Link, useLocation } from 'react-router-dom';
import { WalletButton } from '@/components/WalletButton';
import { useState } from 'react';
import { Menu, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { TierBadge } from '@/components/TierBadge';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/PaymentModal';

const tierRank = { null: 0, bronze: 1, silver: 2, gold: 3 };

const NAV_LINKS = [
  { to: '/picks', label: "Today's Picks" },
  { to: '/matches', label: 'All Matches' },
  { to: '/results', label: 'Past Results' },
  { to: '/stats', label: 'Stats' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const location = useLocation();
  const { tier, paidTier, walletConnected } = useStore();

  const activeTier = (tierRank[paidTier as keyof typeof tierRank] > tierRank[tier as keyof typeof tierRank] ? paidTier : tier) || null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
        
        {/* Left: Logo */}
        <Link to="/" className="flex flex-col justify-center shrink-0">
          <div className="flex items-center gap-2 text-xl font-bold text-foreground leading-tight">
            <span className="text-2xl">⚽</span>
            <span className="gradient-text">BetOracle</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest hidden md:block">
            AI Football Intelligence
          </span>
        </Link>

        {/* Center: Desktop Nav */}
        <nav className="hidden lg:flex items-center p-1 bg-black/20 border border-white/10 rounded-full mx-auto">
          {NAV_LINKS.map(link => {
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                  isActive 
                    ? "bg-white/10 text-foreground shadow-sm font-bold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 lg:hidden" />

        {/* Right: Tier, Wallet */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {walletConnected && (
            <>
              {activeTier && <TierBadge tier={activeTier} />}
              {activeTier !== 'gold' && (
                <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)} className="border-primary/50 text-primary hover:bg-primary/10 h-8 font-semibold">
                  <Zap size={14} className="mr-1" /> Upgrade
                </Button>
              )}
            </>
          )}

          <WalletButton />
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-md text-foreground hover:bg-accent focus:outline-none"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-background animate-fade-in px-4 py-4 space-y-4 shadow-xl">
           <nav className="flex flex-col gap-2 mb-4 pb-4 border-b border-white/5">
             {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    location.pathname.startsWith(link.to)
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  {link.label}
                </Link>
             ))}
           </nav>
           
           {walletConnected && activeTier !== 'gold' && (
              <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10" onClick={() => {setPaymentOpen(true); setMobileOpen(false);}}>
                 <Zap size={16} className="mr-2" /> Upgrade Tier
              </Button>
           )}

           <div className="flex flex-col gap-3">
             <WalletButton />
           </div>
        </div>
      )}

      <PaymentModal open={paymentOpen} onOpenChange={setPaymentOpen} />
    </header>
  );
}
