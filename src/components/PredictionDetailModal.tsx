import { Prediction, PredictionOutcome } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, formatDistanceStrict } from 'date-fns';
import { Copy, ExternalLink, Share2, CheckCircle, Clock, ShieldCheck, Cpu } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CELOSCAN_URL } from '@/config/contracts';
import { getFactorText } from '@/utils/formatters';

interface PredictionDetailModalProps {
  prediction: Prediction | null;
  open: boolean;
  onClose: () => void;
}

const outcomeLabel: Record<PredictionOutcome, string> = {
  home_win: 'Home Win',
  draw: 'Draw',
  away_win: 'Away Win',
};

function getOutcomeColor(outcome: PredictionOutcome | undefined) {
  switch (outcome) {
    case 'home_win': return 'text-success';
    case 'away_win': return 'text-info';
    case 'draw': return 'text-warning';
    default: return 'text-primary';
  }
}

export function PredictionDetailModal({ prediction, open, onClose }: PredictionDetailModalProps) {
  if (!prediction) return null;

  const { match, prediction: pred, result, blockchainTx, recordedAt, modelFactors } = prediction;
  const isResolved = result && result.status !== 'pending';
  const isWin = result?.status === 'win';

  const timeBefore = recordedAt
    ? formatDistanceStrict(new Date(match.kickoffTime), new Date(recordedAt))
    : null;

  const copyTx = () => {
    if (blockchainTx) {
      navigator.clipboard.writeText(blockchainTx);
      toast({ title: 'Copied', description: 'Transaction hash copied to clipboard' });
    }
  };

  const handleShare = () => {
    const text = `⚽ BetOracle Agent: ${match.homeTeam} vs ${match.awayTeam}\n📊 Pick: ${pred.outcome ? outcomeLabel[pred.outcome] : 'N/A'} (${pred.confidence}% sure)\n${isResolved ? `Result: ${result.score} ${isWin ? '✅ WIN' : '❌ LOSS'}` : '⏳ Not Played Yet'}\n\nVerified on Celo`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const hasEdge = pred.hasValueBet;
  
  // Highlight the biggest gap logic
  let maxGap = -Infinity;
  let gapWinnerLabel = '';
  
  const compData = pred.marketOdds && pred.trueProbabilities ? [
    {
      label: 'HOME WIN',
      model: Math.round(pred.trueProbabilities.home * 100),
      market: Math.round((1 / pred.marketOdds.home) * 100)
    },
    {
      label: 'DRAW',
      model: Math.round(pred.trueProbabilities.draw * 100),
      market: Math.round((1 / pred.marketOdds.draw) * 100)
    },
    {
      label: 'AWAY WIN',
      model: Math.round(pred.trueProbabilities.away * 100),
      market: Math.round((1 / pred.marketOdds.away) * 100)
    }
  ] : [];

  compData.forEach(d => {
    const spread = d.model - d.market;
    if (spread > maxGap) {
      maxGap = spread;
      gapWinnerLabel = d.label;
    }
  });

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl bg-background border-l border-border/50 overflow-y-auto p-0">
        
        <div className="p-6 pb-0 sticky top-0 bg-background/95 backdrop-blur-md z-10 border-b border-white/5">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-bold text-foreground">
                {match.homeTeam} <span className="text-muted-foreground font-normal mx-2">vs</span> {match.awayTeam}
              </SheetTitle>
              {isResolved && (
                <div className="text-center font-mono font-bold text-2xl px-4 py-1 bg-white/5 rounded-md border border-white/10 shadow-inner">
                  {result.score}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {format(new Date(match.kickoffTime), 'MMM d, yyyy • HH:mm')}
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-success" />
                Celo Network
              </span>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Main Prediction Highlight */}
          <div className="p-5 rounded-2xl glass-card relative overflow-hidden">
            {hasEdge && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />}
            <div className="flex items-center justify-between mb-4 relative">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
                   <Cpu size={14} /> {hasEdge ? "Our Pick" : "Pass / No Pick"}
                </p>
                <div className="flex items-baseline gap-3">
                  <p className={cn("text-3xl font-bold flex items-center gap-2", hasEdge ? getOutcomeColor(pred.outcome) : 'text-muted-foreground')}>
                    {hasEdge ? `Outcome: ${outcomeLabel[pred.outcome!]}` : 'Fairly Priced'}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                {isResolved ? (
                  <Badge className={cn(
                    'text-base px-3 py-1 font-bold',
                    isWin ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {isWin ? '✓ WON' : '✗ LOST'}
                  </Badge>
                ) : hasEdge ? (
                   <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-sm">
                      +{pred.edge.toFixed(1)}% Our Advantage
                   </Badge>
                ) : (
                   <Badge variant="outline" className="border-white/10 text-muted-foreground bg-white/5 text-sm">
                      No Advantage
                   </Badge>
                )}
              </div>
            </div>

            {hasEdge ? (
              <div className="flex justify-between text-base text-foreground/90 mt-4 border-t border-white/5 pt-4">
                 <span className="font-semibold">How sure we are:</span>
                 <span className="font-bold text-success">{pred.confidence}%</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-4 border-t border-white/5 pt-4">
                The bookmakers have this one fairly priced. No clear advantage found.
              </p>
            )}
          </div>

          {/* Simple Probability Detail Strip */}
          {compData.length > 0 && (
            <div>
               <h4 className="font-semibold gap-2 flex items-center text-foreground mb-4">
                 What the numbers say
               </h4>
               <div className="glass-card rounded-xl overflow-hidden p-6 font-mono text-sm">
                  
                  {/* Header Row */}
                  <div className="grid grid-cols-4 gap-4 pb-3 mb-2 border-b border-white/10 text-muted-foreground font-semibold uppercase tracking-wider text-xs">
                    <div className="col-span-1"></div>
                    <div className="col-span-1 text-center">Home Win</div>
                    <div className="col-span-1 text-center">Draw</div>
                    <div className="col-span-1 text-center">Away Win</div>
                  </div>

                  {/* Our model */}
                  <div className="grid grid-cols-4 gap-4 py-2">
                    <div className="col-span-1 text-muted-foreground">Our Model Prediction</div>
                    {compData.map(d => (
                       <div key={d.label + '_model'} className="col-span-1 text-center text-foreground font-bold">
                         {d.model}%
                       </div>
                    ))}
                  </div>

                  {/* Bookmakers */}
                  <div className="grid grid-cols-4 gap-4 py-2 opacity-70">
                    <div className="col-span-1 text-muted-foreground">Bookmakers</div>
                    {compData.map(d => (
                       <div key={d.label + '_market'} className="col-span-1 text-center">
                         {d.market}%
                       </div>
                    ))}
                  </div>

                  {/* Difference */}
                  <div className="grid grid-cols-4 gap-4 py-3 mt-2 border-t border-white/5">
                    <div className="col-span-1 text-muted-foreground">Difference</div>
                    {compData.map(d => {
                       const spread = d.model - d.market;
                       const isBiggest = d.label === gapWinnerLabel && hasEdge;
                       return (
                         <div key={d.label + '_diff'} className="col-span-1 text-center">
                           <span className={cn(
                             "px-2 py-1 rounded",
                             isBiggest ? "bg-success/20 text-success font-bold" : "text-muted-foreground"
                           )}>
                             {spread > 0 ? '+' : ''}{spread}%
                           </span>
                         </div>
                       )
                    })}
                  </div>

                  {hasEdge && (
                    <div className="mt-4 text-center text-xs text-muted-foreground italic tracking-wide">
                      "The bigger the gap, the stronger our pick"
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* Plain Human Readable Breakdown */}
          {modelFactors && modelFactors.length > 0 && (
             <div>
                <h4 className="font-semibold text-foreground mb-4">
                  Why we're looking at this match:
                </h4>
                <div className="glass-card rounded-xl p-6">
                  <ul className="space-y-4 list-none m-0 p-0 text-foreground/90">
                    {modelFactors.map((factor, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="text-primary mt-1">•</span>
                        <div className="flex-1 text-sm leading-relaxed">
                          {getFactorText(factor.name, factor.score)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
             </div>
          )}

          {/* Blockchain Verification */}
          {blockchainTx && (
            <div className="p-4 rounded-xl glass-card border border-primary/20 bg-primary/5">
              <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle size={16} /> Verified on Celo Blockchain
              </h4>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 text-xs font-mono text-muted-foreground bg-black/40 p-2 rounded truncate border border-white/5">
                  {blockchainTx}
                </code>
                <Button variant="ghost" size="icon" onClick={copyTx} className="shrink-0 h-8 w-8 hover:bg-black/40">
                  <Copy size={14} />
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground mb-4">
                <span>
                  Recorded: {recordedAt ? format(new Date(recordedAt), 'MMM d, HH:mm') : 'N/A'}
                </span>
                {timeBefore && (
                  <span className="text-success bg-success/10 px-2 py-1 rounded">
                    {timeBefore} before kickoff
                  </span>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => window.open(`${CELOSCAN_URL}/tx/${blockchainTx}`, '_blank')}
                >
                  <ExternalLink size={14} className="mr-2" />
                  View on CeloScan
                </Button>
                <Button onClick={handleShare} variant="outline" size="sm" className="flex-1 border-white/10 hover:bg-white/5">
                  <Share2 size={14} className="mr-2" /> Share Pick
                </Button>
              </div>
            </div>
          )}
          
        </div>
      </SheetContent>
    </Sheet>
  );
}
