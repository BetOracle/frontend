import { Link, useLocation } from 'react-router-dom';
import { WalletButton } from '@/components/WalletButton';
import { useState } from 'react';
import { Menu, X, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_WALLET_ADDRESS } from '@/config/contracts';
import { CELOSCAN_URL } from '@/data/mockData';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/track-record', label: 'Track Record' },
  { to: '/how-it-works', label: 'How It Works' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
          <span className="text-2xl">⚽</span>
          <span className="gradient-text">BetOracle</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                location.pathname === link.to
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Wallet & Agent Info */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href={`${CELOSCAN_URL}/address/${AGENT_WALLET_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary hover:bg-primary/20 transition-colors"
          >
            <Cpu size={14} />
            <span className="hidden lg:inline">Agent Wallet:</span> 
            {AGENT_WALLET_ADDRESS.slice(0, 6)}...{AGENT_WALLET_ADDRESS.slice(-4)}
          </a>
          <WalletButton />
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-md text-foreground hover:bg-accent"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded-md text-sm font-medium transition-colors',
                  location.pathname === link.to
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-3">
              <a
                href={`${CELOSCAN_URL}/address/${AGENT_WALLET_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary/10 text-sm font-mono text-primary"
              >
                <Cpu size={16} />
                Agent: {AGENT_WALLET_ADDRESS.slice(0, 6)}...{AGENT_WALLET_ADDRESS.slice(-4)}
              </a>
              <WalletButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
