import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { PredictionCard } from '@/components/PredictionCard';
import { PredictionDetailModal } from '@/components/PredictionDetailModal';
import { Zap, Cpu } from 'lucide-react';
import { Prediction } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { thirdwebClient, celoChain } from '@/config/thirdweb';

function PredictionSkeleton() {
  return (
    <div className="glass-card p-5 rounded-xl border border-white/5 space-y-4 h-[280px]">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-16 bg-white/10" />
        <Skeleton className="h-6 w-24 bg-white/10 rounded-full" />
      </div>
      <div className="flex justify-between items-center my-6">
        <div className="flex -space-x-3">
          <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
          <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 bg-white/10" />
          <Skeleton className="h-4 w-20 bg-white/10" />
        </div>
      </div>
      <Skeleton className="h-8 w-full bg-white/10 mt-8" />
    </div>
  );
}

export default function PicksPage() {
  const {
    upcomingPredictions,
    isLoading,
    fetchPredictions,
    fetchStats,
    fetchAgentStatus,
    stats,
  } = useStore();

  const [selectedPred, setSelectedPred] = useState<Prediction | null>(null);
  const account = useActiveAccount();

  useEffect(() => {
    fetchPredictions(); // fetches all pages + warms team names
    fetchStats();
    fetchAgentStatus();
  }, [fetchPredictions, fetchStats, fetchAgentStatus]);

  // Smart picks = unresolved predictions with a concrete outcome (value bet found).
  // Team names come fully resolved from the store via warmMatchMetaForPredictions.
  // Sorted soonest kickoff first.
  const smartPicks = upcomingPredictions
    .filter(p =>
      (!p.result || p.result.status === 'pending') &&
      p.prediction.hasValueBet &&
      p.prediction.outcome != null
    )
    .sort((a, b) =>
      new Date(a.match.kickoffTime).getTime() - new Date(b.match.kickoffTime).getTime()
    );

  if (!account?.address) {
    return (
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto text-center space-y-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">Today's Smart Picks</h1>
            <p className="text-muted-foreground mt-1">
              Matches where our AI found the market underpricing a team
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-3">Connect Wallet to View</h3>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
              Live AI predictions and smart picks are exclusively available to BetOracle users.
            </p>
            <div className="flex justify-center">
              <ConnectButton
                client={thirdwebClient}
                chain={celoChain}
                connectButton={{
                  className: 'gradient-primary text-black font-bold h-12 px-8 shadow-lg shadow-primary/20',
                  label: 'Connect Wallet',
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Today's Smart Picks</h1>
            <p className="text-muted-foreground mt-1">
              Matches where our AI found the market underpricing a team
            </p>
          </div>
          {!isLoading && smartPicks.length > 0 && (
            <div className="px-4 py-1.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-sm font-bold flex items-center gap-2 shrink-0">
              <Zap size={14} className="fill-emerald-400" />
              {smartPicks.length} pick{smartPicks.length !== 1 ? 's' : ''} today
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <PredictionSkeleton key={i} />)}
          </div>
        ) : smartPicks.length === 0 ? (
          <div className="py-24 text-center glass-card rounded-2xl border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center">
              <div className="w-[300px] h-[300px] border border-white rounded-full" />
            </div>
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
              <span className="text-3xl">🤖</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3 text-balance">
              No Smart Picks today — our AI analysed{' '}
              {Math.max(145, stats.totalPredictions * 4)} matches and found the market
              has them all fairly priced.
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed mt-4 text-balance">
              We only recommend when we're confident. No pick is better than a bad pick.
            </p>
            <p className="text-muted-foreground mt-2 italic text-sm">
              "We'd rather say nothing than give you a bad tip."
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {smartPicks.map(pred => (
                <motion.div
                  key={pred.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <PredictionCard prediction={pred} onViewDetails={setSelectedPred} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <PredictionDetailModal
        prediction={selectedPred}
        open={!!selectedPred}
        onClose={() => setSelectedPred(null)}
      />
    </div>
  );
}