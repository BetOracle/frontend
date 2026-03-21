import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { PredictionCard } from '@/components/PredictionCard';
import { PredictionDetailModal } from '@/components/PredictionDetailModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Shield, Brain, Gem, ChevronRight, ExternalLink, Cpu } from 'lucide-react';
import { Prediction } from '@/types';
import { AGENT_WALLET_ADDRESS, PREDICTION_CONTRACT_ADDRESS } from '@/config/contracts';
import { CELOSCAN_URL } from '@/data/mockData';

const trustIndicators = [
  {
    icon: <Shield size={32} />,
    title: 'Immutable Proof',
    desc: 'Every prediction recorded on Celo blockchain before kickoff. No editing, no deleting, no hiding.',
  },
  {
    icon: <Brain size={32} />,
    title: 'Multi-Factor Model',
    desc: '6-factor AI model analyzing form, H2H, injuries, league position, rest days, and home advantage.',
  },
  {
    icon: <Gem size={32} />,
    title: 'Autonomous Agent',
    desc: 'Fully autonomous AI agent with on-chain identity, verifiable predictions, and transparent track record.',
  },
];

export default function LandingPage() {
  const { fetchPredictions, fetchStats, historicalPredictions, stats } = useStore();
  const [selectedPred, setSelectedPred] = useState<Prediction | null>(null);

  useEffect(() => {
    fetchPredictions();
    fetchStats();
  }, [fetchPredictions, fetchStats]);

  const recentWins = historicalPredictions
    .filter(p => p.result?.status === 'win')
    .slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        
        {/* Particle background effect */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                scale: Math.random() * 0.5 + 0.5,
              }}
              animate={{
                y: [null, Math.random() * -500],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>

        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-success/10 rounded-full blur-[100px]" />

        <div className="container mx-auto px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Celo Badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Badge className="bg-success/10 text-success border border-success/30 px-3 py-1.5 text-xs font-medium">
                ⚡ Powered by Celo
              </Badge>
              <Badge className="bg-primary/10 text-primary border border-primary/30 px-3 py-1.5 text-xs font-medium">
                <Cpu size={12} className="mr-1" /> AI Agent
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
              AI-Powered Football<br />
              <span className="gradient-text">Predictions on Celo</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Autonomous AI agent making verifiable football predictions on-chain. Transparent, proven, and running on Celo.
            </p>

            {/* Live Stats */}
            <div className="inline-flex flex-wrap justify-center gap-6 px-6 py-4 rounded-2xl bg-card/80 border border-border backdrop-blur-sm mb-8">
              <div>
                <p className="text-3xl md:text-4xl font-bold gradient-text">{stats.winRate}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-3xl md:text-4xl font-bold text-foreground">{stats.totalPredictions}</p>
                <p className="text-xs text-muted-foreground">Verified Predictions</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-3xl md:text-4xl font-bold text-foreground">5</p>
                <p className="text-xs text-muted-foreground">Active Leagues</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button asChild size="lg" className="gradient-primary text-primary-foreground glow-primary px-8">
              <Link to="/dashboard">
                View Today's Picks
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border">
              <Link to="/track-record">Track Record</Link>
            </Button>
          </motion.div>

          {/* On-Chain Links */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <a
              href={`${CELOSCAN_URL}/address/${PREDICTION_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/60 border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Cpu size={12} />
              Prediction Contract
              <ExternalLink size={10} />
            </a>
            <a
              href={`${CELOSCAN_URL}/address/${AGENT_WALLET_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/60 border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Shield size={12} />
              Agent Wallet
              <ExternalLink size={10} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {trustIndicators.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors text-center"
              >
                <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Predictions */}
      {recentWins.length > 0 && (
        <section className="py-16 border-t border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Latest Predictions</h2>
            <p className="text-muted-foreground text-center mb-10">Our most recent verified results</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
              {recentWins.map(pred => (
                <PredictionCard
                  key={pred.id}
                  prediction={pred}
                  onViewDetails={setSelectedPred}
                />
              ))}
            </div>
            <div className="text-center">
              <Link to="/track-record" className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium">
                See Full Track Record <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Explore the most transparent AI prediction agent on Celo. Every prediction is verifiable on-chain.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground glow-primary">
              <Link to="/dashboard">View Today's Picks</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border">
              <Link to="/how-it-works">How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      <PredictionDetailModal
        prediction={selectedPred}
        open={!!selectedPred}
        onClose={() => setSelectedPred(null)}
      />
    </div>
  );
}
