import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Database, Wallet, Zap, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { thirdwebClient, celoChain } from '@/config/thirdweb';

const navItems = [
  { to: '/picks', label: 'Picks', icon: Zap },
  { to: '/matches', label: 'Matches', icon: Database },
  { to: '/results', label: 'Results', icon: CheckCircle },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
];

export function BottomNav() {
  const location = useLocation();
  const account = useActiveAccount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-background/95 backdrop-blur-xl pb-safe">
      <div className="flex items-center justify-between px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-1 py-2 rounded-xl transition-all',
                isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-white/5',
              )}
            >
              <Icon size={20} className={isActive ? "drop-shadow-[0_0_8px_rgba(53,208,127,0.5)]" : ""} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}

        <div className="flex flex-col items-center justify-center flex-1">
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full",
              account?.address ? "text-success" : "text-muted-foreground"
            )}
          >
            <Wallet size={20} />
            <span className="text-[10px] font-medium tracking-wide">{account?.address ? "Wallet" : "Connect"}</span>
            <ConnectButton 
              client={thirdwebClient} 
              chain={celoChain}
              connectButton={{
                className: "opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
