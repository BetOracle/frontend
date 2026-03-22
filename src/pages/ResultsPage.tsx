import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Cpu } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PredictionDetailModal } from '@/components/PredictionDetailModal';
import { Prediction } from '@/types';

export default function ResultsPage() {
  const { fetchPredictions, historicalPredictions, isLoading } = useStore();
  const [selectedPred, setSelectedPred] = useState<Prediction | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const resolvedPredictions = useMemo(() => {
    return historicalPredictions
      .filter(p => p.result && p.result.status !== 'pending')
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }, [historicalPredictions]);

  const { wins, losses } = useMemo(() => {
    let w = 0, l = 0;
    resolvedPredictions.forEach(p => {
      if (p.result?.status === 'win') w++;
      else l++;
    });
    return { wins: w, losses: l };
  }, [resolvedPredictions]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        
        <div className="mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
             <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center md:justify-start gap-3">
               Past Results
             </h1>
             <p className="text-muted-foreground">Historical performance of our recommended Smart Picks.</p>
           </div>
           {resolvedPredictions.length > 0 && (
             <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex gap-4 text-sm font-semibold">
               <span className="text-success">Won {wins}</span>
               <span className="text-destructive">Lost {losses}</span>
             </div>
           )}
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground animate-pulse glass-card flex flex-col items-center rounded-2xl border-white/10">
            <Cpu size={40} className="mx-auto mb-4 opacity-50 text-primary" />
            <p>Loading past results...</p>
          </div>
        ) : resolvedPredictions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground glass-card rounded-2xl border-white/5">
            <CheckCircle size={40} className="mx-auto mb-4 opacity-40 text-primary" />
            <p className="text-lg font-medium mb-2 text-foreground">No resolved predictions yet</p>
            <p className="text-sm max-w-sm mx-auto">Matches must be played and verified on the blockchain before appearing here.</p>
          </div>
        ) : (
          <Card className="glass-card border-white/5 overflow-hidden p-0 max-h-[700px] overflow-y-auto no-scrollbar">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm">
                 <thead>
                   <tr className="bg-black/40 text-[10px] uppercase text-muted-foreground tracking-widest font-bold border-b border-white/5 sticky top-0 z-10 hidden sm:table-row">
                     <th className="p-4">Date</th>
                     <th className="p-4">Match</th>
                     <th className="p-4 text-center">Our Pick</th>
                     <th className="p-4 text-center">Advantage</th>
                     <th className="p-4 text-right">Result</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 bg-background/20">
                   {resolvedPredictions.map((pred) => (
                     <tr key={pred.id} className="hover:bg-white/5 transition-colors cursor-pointer group flex flex-col sm:table-row py-3 sm:py-0" onClick={() => setSelectedPred(pred)}>
                       <td className="px-4 pb-1 sm:py-4 text-muted-foreground font-mono text-xs sm:text-sm">{format(new Date(pred.recordedAt || ''), 'MMM dd, HH:mm')}</td>
                       <td className="px-4 py-1 sm:py-4">
                         <div className="font-semibold text-foreground">{pred.match.homeTeam} vs {pred.match.awayTeam}</div>
                         <div className="text-[10px] text-muted-foreground uppercase">{pred.match.league}</div>
                       </td>
                       <td className="px-4 py-1 sm:py-4 sm:text-center text-xs sm:text-sm">
                         Pick: <strong>{pred.prediction.outcome === 'home_win' ? 'Home' : pred.prediction.outcome === 'away_win' ? 'Away' : 'Draw'}</strong>
                       </td>
                       <td className="px-4 py-1 sm:py-4 sm:text-center font-mono text-primary text-xs sm:text-sm">
                         +{pred.prediction.edge.toFixed(1)}%
                       </td>
                       <td className="px-4 pt-2 sm:py-4 sm:text-right">
                         <div className={cn("inline-flex items-center justify-center font-bold font-mono text-xs px-3 h-8 rounded-md border", 
                           pred.result?.status === 'win' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/20'
                         )}>
                           {pred.result?.status === 'win' ? 'WON' : 'LOST'}
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </Card>
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
