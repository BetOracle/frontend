import { Link } from 'react-router-dom';
import { ExternalLink, Cpu, FileCode2 } from 'lucide-react';
import { AGENT_WALLET_ADDRESS, PREDICTION_CONTRACT_ADDRESS } from '@/config/contracts';
import { CELOSCAN_URL } from '@/config/contracts';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background py-12 relative z-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-foreground mb-3">
              <span className="text-xl">⚽</span>
              <span className="gradient-text">BetOracle</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              AI-powered football predictions verified on-chain.
              Transparent, proven, and fully autonomous on Celo.
            </p>
          </div>

          {/* Links */}
          <div className="hidden md:block">
            <h4 className="text-sm font-semibold text-foreground mb-3">App</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/picks" className="hover:text-primary transition-colors">Today's Picks</Link></li>
              <li><Link to="/matches" className="hover:text-primary transition-colors">All Matches</Link></li>
              <li><Link to="/results" className="hover:text-primary transition-colors">Past Results</Link></li>
              <li><Link to="/stats" className="hover:text-primary transition-colors">Stats</Link></li>
              <li><Link to="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
            </ul>
          </div>

          {/* On-Chain */}
          <div className="md:col-span-2 lg:col-span-2">
            <h4 className="text-sm font-semibold text-foreground mb-3">On-Chain Agentscan</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href={`${CELOSCAN_URL}/address/${AGENT_WALLET_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                  className="hover:text-primary transition-colors flex items-center gap-2 group">
                  <Cpu size={14} className="group-hover:text-primary" />
                  <span className="font-mono text-xs">Agent: {AGENT_WALLET_ADDRESS}</span>
                  <ExternalLink size={12} className="opacity-50" />
                </a>
              </li>
              <li>
                <a href={`${CELOSCAN_URL}/address/${PREDICTION_CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                  className="hover:text-primary transition-colors flex items-center gap-2 group">
                  <FileCode2 size={14} className="group-hover:text-primary" />
                  <span className="font-mono text-xs">Contract: {PREDICTION_CONTRACT_ADDRESS}</span>
                  <ExternalLink size={12} className="opacity-50" />
                </a>
              </li>
            </ul>
            <div className="mt-6 p-3 bg-white/5 border border-white/10 rounded-lg max-w-sm">
               <p className="text-xs text-muted-foreground leading-relaxed">
                 <strong className="text-foreground">Disclaimer:</strong> BetOracle is for informational purposes only. Please gamble responsibly.
               </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 BetOracle. All rights reserved.
          </p>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            Built on <img src="https://cryptologos.cc/logos/celo-celo-logo.svg?v=033" alt="Celo" className="w-3.5 h-3.5 mx-0.5" /> <span className="font-bold text-foreground">Celo</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
