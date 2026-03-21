import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { AGENT_WALLET_ADDRESS, PREDICTION_CONTRACT_ADDRESS } from '@/config/contracts';
import { CELOSCAN_URL } from '@/data/mockData';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-foreground mb-3">
              <span className="text-xl">⚽</span>
              <span className="gradient-text">FootyOracle</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              AI-powered football predictions verified on-chain on Celo.
              Transparent, proven, and fully autonomous.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Agent Dashboard</Link></li>
              <li><Link to="/track-record" className="hover:text-foreground transition-colors">Track Record</Link></li>
              <li><Link to="/how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
            </ul>
          </div>

          {/* On-Chain */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">On-Chain</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href={`${CELOSCAN_URL}/address/${AGENT_WALLET_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1">
                  Agent Wallet <ExternalLink size={10} />
                </a>
              </li>
              <li>
                <a href={`${CELOSCAN_URL}/address/${PREDICTION_CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1">
                  Prediction Contract <ExternalLink size={10} />
                </a>
              </li>
              <li>
                <a href="https://www.agentscan.ai" target="_blank" rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1">
                  Agentscan <ExternalLink size={10} />
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Community</h4>
            <div className="flex gap-4">
              <a href="https://discord.gg" target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm">Discord</a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm">Twitter</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm">GitHub</a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 FootyOracle. All rights reserved.
          </p>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            Built on <span className="font-semibold text-success">Celo</span> ⚡
          </span>
        </div>
      </div>
    </footer>
  );
}
