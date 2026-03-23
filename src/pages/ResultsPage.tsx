import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/card';
import { CheckCircle, Cpu } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PredictionDetailModal } from '@/components/PredictionDetailModal';
import { Prediction } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function outcomeLabel(outcome: string | undefined | null): string {
  switch (outcome) {
    case 'home_win': return 'Home Win';
    case 'away_win': return 'Away Win';
    case 'draw': return 'Draw';
    // Raw backend strings (actualOutcome is stored as HOME_WIN etc.)
    case 'HOME_WIN': return 'Home Win';
    case 'AWAY_WIN': return 'Away Win';
    case 'DRAW': return 'Draw';
    default: return outcome ?? '—';
  }
}

function formatEdge(edge: number | undefined | null): string {
  if (edge == null || edge === 0) return '—';
  return `+${edge.toFixed(1)}%`;
}

// ── Component ─────────────────────────────────────────────────────────────────

// Dark scrollbar for WebKit (Chrome/Safari/Edge)
const scrollbarStyle = `
  .results-scroll::-webkit-scrollbar { width: 4px; }
  .results-scroll::-webkit-scrollbar-track { background: transparent; }
  .results-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 999px; }
  .results-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
`;

export default function ResultsPage() {
  const { fetchPredictions, historicalPredictions, isLoading } = useStore();
  const [selectedPred, setSelectedPred] = useState<Prediction | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const resolvedPredictions = useMemo(() =>
    historicalPredictions
      .filter(p => p.result && (p.result.status === 'win' || p.result.status === 'loss'))
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [historicalPredictions]
  );

  const wins = resolvedPredictions.filter(p => p.result?.status === 'win').length;
  const losses = resolvedPredictions.filter(p => p.result?.status === 'loss').length;
  const winRate = resolvedPredictions.length > 0
    ? Math.round((wins / resolvedPredictions.length) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
      <style>{scrollbarStyle}</style>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Past Results</h1>
            <p className="text-muted-foreground text-sm">
              Historical performance of our AI's Smart Picks — every prediction recorded on-chain before kick-off.
            </p>
          </div>
          {resolvedPredictions.length > 0 && (
            <div className="flex items-center gap-4 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold shrink-0">
              <span className="text-emerald-400">{wins} Won</span>
              <span className="text-white/20">|</span>
              <span className="text-red-400">{losses} Lost</span>
              <span className="text-white/20">|</span>
              <span className="text-muted-foreground">{winRate}% Win Rate</span>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="text-center py-20 glass-card flex flex-col items-center rounded-2xl border-white/10 animate-pulse">
            <Cpu size={40} className="mb-4 opacity-50 text-primary" />
            <p className="text-muted-foreground">Loading results and resolving team names...</p>
          </div>

          /* Empty */
        ) : resolvedPredictions.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl border-white/5">
            <CheckCircle size={40} className="mx-auto mb-4 opacity-40 text-primary" />
            <p className="text-lg font-medium mb-2 text-foreground">No resolved predictions yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Matches must be played and verified on-chain before appearing here.
            </p>
          </div>

          /* Table */
        ) : (
          <Card className="glass-card border-white/5 overflow-hidden p-0 max-h-[72vh] overflow-y-auto results-scroll" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">

                <thead className="sticky top-0 z-10">
                  <tr className="bg-black/60 text-[10px] uppercase text-muted-foreground tracking-widest font-bold border-b border-white/5">
                    <th className="p-4 whitespace-nowrap">Date</th>
                    <th className="p-4">Match</th>
                    <th className="p-4 whitespace-nowrap">League</th>
                    <th className="p-4 text-center whitespace-nowrap">Our Pick</th>
                    <th className="p-4 text-center whitespace-nowrap">Actual Outcome</th>
                    <th className="p-4 text-center whitespace-nowrap">Confidence</th>
                    <th className="p-4 text-center whitespace-nowrap">Edge</th>
                    <th className="p-4 text-right whitespace-nowrap">Result</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {resolvedPredictions.map(pred => {
                    const isWin = pred.result?.status === 'win';

                    // actualOutcome is stored as the raw backend string e.g. "HOME_WIN"
                    // score field on result holds it (mapped from p.actualOutcome in useStore)
                    const actualOutcome = pred.result?.score ?? null;

                    return (
                      <tr
                        key={pred.id}
                        onClick={() => setSelectedPred(pred)}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        {/* Date */}
                        <td className="p-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                          {format(new Date(pred.recordedAt), 'MMM dd, HH:mm')}
                        </td>

                        {/* Match */}
                        <td className="p-4">
                          <div className="font-semibold text-foreground whitespace-nowrap">
                            {pred.match.homeTeam}
                            <span className="text-muted-foreground font-normal mx-2">vs</span>
                            {pred.match.awayTeam}
                          </div>
                        </td>

                        {/* League */}
                        <td className="p-4">
                          <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
                            {pred.match.league}
                          </span>
                        </td>

                        {/* Our Pick */}
                        <td className="p-4 text-center">
                          <span className="text-sm font-bold text-foreground">
                            {outcomeLabel(pred.prediction.outcome)}
                          </span>
                        </td>

                        {/* Actual Outcome — what really happened */}
                        <td className="p-4 text-center">
                          <span className={cn(
                            'inline-flex items-center justify-center text-xs font-bold px-2.5 py-1 rounded-full border',
                            isWin
                              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          )}>
                            {outcomeLabel(actualOutcome)}
                          </span>
                        </td>

                        {/* Confidence */}
                        <td className="p-4 text-center font-mono text-xs text-muted-foreground">
                          {pred.prediction.confidence != null ? `${pred.prediction.confidence}%` : '—'}
                        </td>

                        {/* Edge */}
                        <td className="p-4 text-center font-mono text-xs text-primary">
                          {formatEdge(pred.prediction.edge)}
                        </td>

                        {/* Win/Loss badge */}
                        <td className="p-4 text-right">
                          <span className={cn(
                            'inline-flex items-center justify-center font-bold font-mono text-xs px-3 h-7 rounded-md border',
                            isWin
                              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          )}>
                            {isWin ? 'WON' : 'LOST'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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