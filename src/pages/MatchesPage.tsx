import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { ListFilter, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { thirdwebClient, celoChain } from '@/config/thirdweb';

import * as api from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { cacheMatchMeta, cachePredictionTx } from '@/store/useStore';

type FilterType = 'All' | 'EPL' | 'LaLiga' | 'Bundesliga' | 'Ligue1';

function PredictionSkeleton() {
  return (
    <div className="glass-card p-5 rounded-xl border border-white/5 space-y-4 h-[280px]">
      <div className="flex justify-between items-center">
         <Skeleton className="h-4 w-16 bg-white/10" />
         <Skeleton className="h-4 w-16 bg-white/10 rounded" />
      </div>
      <Skeleton className="h-8 w-full bg-white/10 mt-8" />
    </div>
  );
}

export default function MatchesPage() {
  const { fetchPredictions } = useStore();
  const [filter, setFilter] = useState<FilterType>('All');
  const account = useActiveAccount();

  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [matches, setMatches] = useState<api.ApiMatch[]>([]);
  const [creatingFor, setCreatingFor] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      setMatchesLoading(true);
      setMatchesError(null);
      try {
        const league = filter === 'All' ? 'EPL' : filter;
        const res = await api.fetchMatches(league);
        setMatches(res.matches);

        res.matches.forEach((m) => {
          const matchId = `${league}-${m.fixtureId}`;
          const kickoffTime = new Date(`${m.date}T${m.time}:00Z`).toISOString();
          cacheMatchMeta(matchId, {
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            kickoffTime,
            league,
          });
        });
      } catch (e: any) {
        setMatchesError(e?.message || 'Failed to fetch matches');
        setMatches([]);
      } finally {
        setMatchesLoading(false);
      }
    };
    run();
  }, [filter]);

  const filters: FilterType[] = ['All', 'EPL', 'LaLiga', 'Bundesliga', 'Ligue1'];

  const visibleMatches = useMemo(() => {
    return matches.slice().sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.time}:00Z`).getTime();
      const bTime = new Date(`${b.date}T${b.time}:00Z`).getTime();
      return aTime - bTime;
    });
  }, [matches]);

  const handleCreatePrediction = async (m: api.ApiMatch) => {
    if (filter === 'All') {
      toast({ title: 'Select a league', description: 'Choose a league filter before creating a prediction.' });
      return;
    }
    try {
      setCreatingFor(m.fixtureId);
      const res = await api.createPrediction({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: filter,
        fixtureId: m.fixtureId,
      });
      if (!res.success) {
        toast({ title: 'Prediction not created', description: res.code || res.message || 'Backend rejected request' });
        return;
      }

      if (res.predictionId && res.blockchain?.txHash) {
        cachePredictionTx(res.predictionId, res.blockchain.txHash);
      }

      toast({ title: 'Prediction created', description: res.matchId || res.predictionId || 'Success' });
      await fetchPredictions();
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Failed to create prediction' });
    } finally {
      setCreatingFor(null);
    }
  };

  if (!account?.address) {
    return (
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto text-center"
        >
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Analyzed Matches</h1>
              <p className="text-muted-foreground mt-1 text-balance">
                Upcoming fixtures fetched in realtime from the backend. Create a prediction for any fixture.
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <ConnectButton 
              client={thirdwebClient} 
              chain={celoChain}
              connectButton={{
                className: "gradient-primary text-black font-bold h-12 px-8 shadow-lg shadow-primary/20",
                label: "Connect Wallet"
              }}
            />

          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
           <div>
             <h1 className="text-3xl font-bold text-foreground">All Analyzed Matches</h1>
             <p className="text-muted-foreground mt-1 text-balance">
              Upcoming fixtures fetched in realtime from the backend. Create a prediction for any fixture.
             </p>
           </div>
           
           <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 overflow-x-auto max-w-full glass-card">
              <div className="pl-3 pr-2 text-muted-foreground"><ListFilter size={16} /></div>
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                    filter === f ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_10px_rgba(53,208,127,0.3)]' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                  }`}
                >
                  {f}
                </button>
              ))}
           </div>
        </div>

        {matchesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <PredictionSkeleton key={i} />)}
          </div>
        ) : matchesError ? (
          <div className="py-24 text-center glass-card rounded-2xl border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
            <h3 className="text-2xl font-bold text-foreground mb-3 text-balance">Failed to load matches</h3>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">{matchesError}</p>
          </div>
        ) : visibleMatches.length === 0 ? (
           <div className="py-24 text-center glass-card rounded-2xl border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                <span className="text-3xl">🔍</span>
             </div>
             <h3 className="text-2xl font-bold text-foreground mb-3 text-balance">
                No matches found
             </h3>
             <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                There are no current matches matching your filter.
             </p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {visibleMatches.map((m) => (
                <motion.div
                  key={m.fixtureId}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="glass-card p-5 rounded-xl border border-white/5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-mono">#{m.fixtureId}</div>
                    <div className="text-xs text-muted-foreground">{m.date} {m.time}</div>
                  </div>
                  <div className="text-lg font-bold text-foreground">{m.homeTeam} vs {m.awayTeam}</div>
                  <Button
                    className="w-full gradient-primary text-black font-bold"
                    onClick={() => handleCreatePrediction(m)}
                    disabled={creatingFor === m.fixtureId || filter === 'All'}
                  >
                    {creatingFor === m.fixtureId ? 'Creating...' : 'Create Prediction'}
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
