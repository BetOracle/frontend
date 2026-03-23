import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Prediction, PredictionOutcome } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ChevronDown, ChevronUp, AlertCircle, Ban, Zap } from 'lucide-react';
import { CELOSCAN_URL } from '@/config/contracts';
import { useStore } from '@/store/useStore';
import { getFactorText } from '@/utils/formatters';

interface PredictionCardProps {
  prediction: Prediction;
  onViewDetails?: (p: Prediction) => void;
  compact?: boolean;
}

const outcomeLabel: Record<PredictionOutcome, string> = {
  home_win: 'HOME WIN',
  draw: 'DRAW',
  away_win: 'AWAY WIN',
};

// Returns a friendly team name or outcome string
const getTeamForOutcome = (pred: PredictionOutcome | undefined, home: string, away: string) => {
  if (pred === 'home_win') return home;
  if (pred === 'away_win') return away;
  return 'a Draw';
}

// Hardcoded Team ID Map for top clubs based on prompt
const TEAM_IDS: Record<string, number> = {
  'Brighton': 397, 'Liverpool': 64, 'Arsenal': 57, 'Chelsea': 61,
  'Man City': 65, 'Man Utd': 66, 'Tottenham': 73, 'Bayern': 5,
  'Real Madrid': 86, 'Barcelona': 81, 'Juventus': 109, 'PSG': 524,
  'Dortmund': 4, 'Milan': 98, 'Inter': 108
};

function TeamAvatar({ name }: { name: string }) {
  const teamId = TEAM_IDS[name];
  
  if (teamId) {
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 flex items-center justify-center border border-white/10 p-1 shrink-0">
        <img src={`https://crests.football-data.org/${teamId}.png`} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }

  // Fallback Initials
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  
  return (
    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-background border border-white/10 text-foreground bg-primary/20 shrink-0">
      {initials}
    </div>
  );
}

export function PredictionCard({ prediction, onViewDetails }: PredictionCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const { tier, paidTier } = useStore();
  const activeTier = paidTier || tier || null;
  const isPremium = activeTier === 'bronze' || activeTier === 'silver' || activeTier === 'gold';

  const { match, prediction: pred, result, blockchainTx, modelFactors } = prediction;
  const isResolved = result && result.status !== 'pending';
  const isWin = result?.status === 'win';
  const hasEdge = pred.hasValueBet;
  
  const predictedOutcomeString = getTeamForOutcome(pred.outcome, match.homeTeam, match.awayTeam);
  
  let targetMarketProb = 0;
  let targetModelProb = 0;
  
  if (pred.marketOdds && pred.trueProbabilities && pred.outcome) {
    if (pred.outcome === 'home_win') {
      targetMarketProb = (1 / pred.marketOdds.home) * 100;
      targetModelProb = pred.trueProbabilities.home * 100;
    } else if (pred.outcome === 'draw') {
      targetMarketProb = (1 / pred.marketOdds.draw) * 100;
      targetModelProb = pred.trueProbabilities.draw * 100;
    } else {
      targetMarketProb = (1 / pred.marketOdds.away) * 100;
      targetModelProb = pred.trueProbabilities.away * 100;
    }
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden glass-card transition-all duration-300',
        hasEdge ? 'border-l-4 border-l-success border-t-white/5 border-r-white/5 border-b-white/5 shadow-[0_0_15px_rgba(53,208,127,0.05)]' : 'border-white/5 opacity-80',
        isResolved && isWin && '!border-success/50',
        isResolved && !isWin && '!border-destructive/50',
      )}
      onClick={() => onViewDetails?.(prediction)}
    >
      <div className="p-5 cursor-pointer">
        {/* Header: Date and Badge */}
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="bg-background/40 border-border text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            {match.league}
          </Badge>
          
          <div className="flex gap-2 items-center">
             {hasEdge ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs px-2 py-0.5 gap-1 shadow-[0_0_5px_rgba(53,208,127,0.5)] glow font-bold tracking-wide">
                  <Zap size={12} className="mr-0.5 fill-success text-success" /> OUR PICK
                </Badge>
             ) : (
                <Badge variant="outline" className="bg-white/5 text-muted-foreground border-white/10 text-xs px-2 py-0.5 gap-1">
                  <Ban size={12} className="mr-1" /> No Pick
                </Badge>
             )}
          </div>
        </div>

        {/* Teams Area */}
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-4">
             <div className="flex -space-x-3">
                <TeamAvatar name={match.homeTeam} />
                <TeamAvatar name={match.awayTeam} />
             </div>
             <div className="flex flex-col">
                <span className="font-bold text-foreground leading-tight text-sm sm:text-base">
                  {match.homeTeam}
                </span>
                <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-widest my-0.5">vs</span>
                <span className="font-bold text-foreground leading-tight text-sm sm:text-base">
                  {match.awayTeam}
                </span>
             </div>
           </div>
           {result?.score && (
              <div className="text-center font-mono font-bold text-xl px-3 py-1 bg-white/5 rounded-md border border-white/10 shadow-inner">
                {result.score}
              </div>
           )}
        </div>

        {/* Plain Language Prediction Main */}
        {hasEdge ? (
          <div className="space-y-4 mb-4">
            <h3 className="text-xl font-bold text-foreground">
              Our Prediction: {pred.outcome ? outcomeLabel[pred.outcome] : 'N/A'}
            </h3>
            
            {isPremium ? (
              <div className="space-y-2 text-sm text-foreground/90 p-3 rounded-lg bg-white/5 border border-white/5">
                <p className="flex items-center gap-2">
                   <span className="text-success text-lg">•</span> We're <strong>{pred.confidence}%</strong> confident in this pick
                </p>
                <p className="flex items-center gap-2">
                   <span className="text-success text-lg">•</span> We see <strong>+{pred.edge.toFixed(1)}%</strong> more chance than the bookmakers
                </p>
                <div className="pt-2 mt-2 border-t border-white/10 text-xs text-muted-foreground space-y-1">
                   <p>Bookmakers think {predictedOutcomeString} win: <strong>{targetMarketProb.toFixed(0)}%</strong></p>
                   <p>We think {predictedOutcomeString} win: <strong>{targetModelProb.toFixed(0)}%</strong></p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Confidence and exact advantage hidden.</p>
                <p className="text-xs text-muted-foreground">Unlock <strong className="text-primary">Bronze Tier</strong> to view exact probabilities and our mathematical advantage.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 text-center rounded bg-black/20 border border-white/5 py-4 px-4">
             <p className="text-sm font-semibold text-foreground mb-1">The bookmakers have this one fairly priced.</p>
             <p className="text-xs text-muted-foreground text-balance">
                No clear advantage found. Pass on this match.
             </p>
          </div>
        )}

        {/* Render Probability Strip for PASS cards */}
        {!hasEdge && pred.marketOdds && pred.trueProbabilities && isPremium && (
          <div className="mt-5 pt-4 border-t border-white/5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">What the numbers say:</p>
            <div className="grid grid-cols-4 gap-2 text-xs mb-1">
               <div className="col-span-1 text-muted-foreground font-semibold">Outcome</div>
               <div className="col-span-1 text-center text-muted-foreground font-semibold">Our Model</div>
               <div className="col-span-1 text-center text-muted-foreground font-semibold">Bookies</div>
               <div className="col-span-1 text-right text-muted-foreground font-semibold">Diff</div>
             </div>
             {[ 
               { label: 'Home', m: pred.marketOdds.home, t: pred.trueProbabilities.home },
               { label: 'Draw', m: pred.marketOdds.draw, t: pred.trueProbabilities.draw },
               { label: 'Away', m: pred.marketOdds.away, t: pred.trueProbabilities.away }
             ].map(row => {
               const marketProb = (1 / row.m) * 100;
               const modelProb = row.t * 100;
               const gap = modelProb - marketProb;

               return (
                 <div key={row.label} className="grid grid-cols-4 gap-2 text-xs py-1.5 border-b border-white/5 last:border-0">
                   <div className="col-span-1 text-foreground font-medium">{row.label}</div>
                   <div className="col-span-1 text-center font-mono">{modelProb.toFixed(0)}%</div>
                   <div className="col-span-1 text-center font-mono text-muted-foreground">{marketProb.toFixed(0)}%</div>
                   <div className={cn("col-span-1 text-right font-mono", gap > 0 ? "text-success" : "text-muted-foreground")}>
                     {gap > 0 ? '+' : ''}{gap.toFixed(0)}%
                   </div>
                 </div>
               );
             })}
          </div>
        )}

        {/* Expandable Human-Readable Factors Breakdown */}
        {modelFactors && modelFactors.length > 0 && isPremium && hasEdge && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <button 
              className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            >
              <span className="flex items-center gap-2"><AlertCircle size={14} /> Why we're looking at this match</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {expanded && (
              <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                <ul className="text-sm text-foreground/90 space-y-2 list-none p-0 m-0">
                  {modelFactors.map((factor, idx) => (
                    <li key={idx} className="flex gap-2">
                       <span className="text-primary mt-0.5">•</span>
                       <span className="leading-snug">{getFactorText(factor.name, factor.score)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Blockchain TX */}
        {blockchainTx && (
          <div className="mt-4 pt-3 border-t border-white/5 text-right">
             <a 
               href={`${CELOSCAN_URL}/tx/${blockchainTx}`}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-success transition-colors"
               onClick={(e) => e.stopPropagation()}
             >
               <ShieldCheck size={12} className="text-success" /> Verified on Celo
             </a>
          </div>
        )}

      </div>
    </Card>
  );
}
