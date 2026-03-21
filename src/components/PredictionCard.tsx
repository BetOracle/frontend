import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Prediction, PredictionOutcome } from '@/types';
import { ConfidenceBar } from './ConfidenceBar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ExternalLink, ShieldCheck, Trophy, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

function getOutcomeColor(outcome: PredictionOutcome) {
  switch (outcome) {
    case 'home_win': return 'bg-success text-success-foreground';
    case 'away_win': return 'bg-info text-info-foreground';
    case 'draw': return 'bg-warning text-warning-foreground';
    default: return 'bg-primary text-primary-foreground';
  }
}

// Fallback avatar helper
function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function TeamAvatar({ name, fallbackColor }: { name: string, fallbackColor: string }) {
  // Try to use a crest URL if we map the name, otherwise fallback to initials
  // Since we don't have id mapping, we only use the fallback
  return (
    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-background border border-white/10 text-white", fallbackColor)}>
      {getInitials(name)}
    </div>
  );
}

function getFactorLabel(name: string, score: number): string {
  if (name.toLowerCase().includes('form')) {
    if (score > 0.3) return "Strong recent form advantage";
    if (score >= 0) return "Slight form advantage";
    return "Opponent in better form";
  }
  if (name.toLowerCase().includes('h2h')) {
    if (score > 0.5) return "Dominates this fixture historically";
    if (score > 0) return "Slight historical edge";
    return "Poor historical record";
  }
  if (name.toLowerCase().includes('position')) {
    if (score > 0.5) return "Significant league position advantage";
    if (score < -0.5) return "Playing against a higher-ranked side";
    return "Closely matched in table";
  }
  if (name.toLowerCase().includes('injury')) {
    if (score > 0.1) return "Opponent has injury concerns";
    if (score < -0.1) return "Injury concerns for this team";
    return "No major injury disparities";
  }
  return score > 0 ? "Positive factor" : "Negative factor";
}

export function PredictionCard({ prediction, onViewDetails }: PredictionCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const { match, prediction: pred, result, blockchainTx, modelFactors } = prediction;
  const isResolved = result && result.status !== 'pending';
  const isWin = result?.status === 'win';

  const pieData = pred.trueProbabilities ? [
    { name: 'Home', value: pred.trueProbabilities.home * 100 },
    { name: 'Draw', value: pred.trueProbabilities.draw * 100 },
    { name: 'Away', value: pred.trueProbabilities.away * 100 },
  ] : [
    { name: pred.outcome, value: pred.confidence },
    { name: 'Other', value: 100 - pred.confidence }
  ];
  
  const COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden glass-card transition-all duration-300',
        'hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1',
        isResolved && isWin && 'border-success/50',
        isResolved && !isWin && 'border-destructive/50',
      )}
      onClick={() => onViewDetails?.(prediction)}
    >
      <div className="p-5 cursor-pointer">
        {/* Header: Date and Badge */}
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="bg-background/40 border-border text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            {match.league} <Clock size={10} className="ml-1" />
            {format(new Date(match.kickoffTime), 'MMM d, HH:mm')}
          </Badge>
          
          <div className="flex gap-2 items-center">
             {blockchainTx && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] gap-1 px-1.5 py-0">
                  <ShieldCheck size={10} />
                  On Celo
                </Badge>
              )}
             {isResolved ? (
                <Badge className={cn(
                  'text-[10px] font-bold px-2 py-0',
                  isWin
                    ? 'bg-success text-success-foreground'
                    : 'bg-destructive text-destructive-foreground',
                )}>
                  {isWin ? 'CORRECT ✓' : 'INCORRECT ✗'}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 py-0 border-border">
                  PENDING
                </Badge>
              )}
          </div>
        </div>

        {/* Teams Area */}
        <div className="flex items-center justify-between mb-5">
           <div className="flex items-center gap-3">
             <div className="flex -space-x-3">
                <TeamAvatar name={match.homeTeam} fallbackColor="bg-blue-600" />
                <TeamAvatar name={match.awayTeam} fallbackColor="bg-red-600" />
             </div>
             <div className="flex flex-col">
                <span className="font-semibold text-foreground leading-tight text-sm sm:text-base">
                  {match.homeTeam}
                </span>
                <span className="text-muted-foreground text-xs font-medium">vs</span>
                <span className="font-semibold text-foreground leading-tight text-sm sm:text-base">
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

        {/* Prediction Main */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Agent Pick</p>
            <Badge className={cn('text-xs font-bold px-2 py-1', getOutcomeColor(pred.outcome))}>
              {outcomeLabel[pred.outcome]}
            </Badge>
          </div>
          <div className="text-right">
            {pred.edge > 8 && (
              <span className="text-success text-sm font-bold flex items-center justify-end gap-1 mb-1">
                <Trophy size={14} /> +{pred.edge.toFixed(1)}% Edge
              </span>
            )}
            <p className="text-xs text-muted-foreground">Confidence: {pred.confidence}%</p>
          </div>
        </div>

        {/* Confidence Bar */}
        <ConfidenceBar confidence={pred.confidence} />

        {/* Odds & Model Chart */}
        <div className="mt-5 pt-4 border-t border-white/5 flex gap-4">
           {pred.marketOdds && (
             <div className="flex-1">
               <p className="text-xs text-muted-foreground mb-2 text-center uppercase tracking-wider font-semibold">Market Odds</p>
               <div className="grid grid-cols-3 gap-1 text-center">
                 <div className="bg-black/30 rounded py-1 border border-white/5">
                   <div className="text-[9px] text-muted-foreground mb-0.5">1</div>
                   <div className="font-mono text-xs text-foreground font-medium">{pred.marketOdds.home.toFixed(2)}</div>
                 </div>
                 <div className="bg-black/30 rounded py-1 border border-white/5">
                   <div className="text-[9px] text-muted-foreground mb-0.5">X</div>
                   <div className="font-mono text-xs text-foreground font-medium">{pred.marketOdds.draw.toFixed(2)}</div>
                 </div>
                 <div className="bg-black/30 rounded py-1 border border-white/5">
                   <div className="text-[9px] text-muted-foreground mb-0.5">2</div>
                   <div className="font-mono text-xs text-foreground font-medium">{pred.marketOdds.away.toFixed(2)}</div>
                 </div>
               </div>
             </div>
           )}
           
           {pred.trueProbabilities && (
             <div className="w-20 flex flex-col items-center justify-center relative">
                <p className="text-[9px] text-muted-foreground absolute -top-5 w-full text-center uppercase tracking-wider font-semibold whitespace-nowrap">Our Model</p>
                <div className="w-16 h-16 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={15}
                        outerRadius={24}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #333', fontSize: '10px', padding: '4px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>
           )}
        </div>

        {/* Expandable Breakdown */}
        {modelFactors && modelFactors.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <button 
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            >
              <span>Factor Breakdown</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {expanded && (
              <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                {modelFactors.map((factor, idx) => {
                  // Normalize -1 to +1 to 0-100%
                  const percent = (factor.score + 1) / 2 * 100;
                  const factorText = factor.reasoning || getFactorLabel(factor.name, factor.score);
                  return (
                    <div key={idx} className="bg-black/20 p-2 rounded border border-white/5">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="font-medium text-foreground">{factor.name}</span>
                        <span className="text-muted-foreground">{factorText}</span>
                      </div>
                      <div className="h-1 bg-secondary/20 rounded-full overflow-hidden flex">
                        <div 
                           className={cn("h-full", factor.score >= 0 ? "bg-success" : "bg-destructive")} 
                           style={{ width: `${Math.max(5, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
