import { Prediction, PredictionOutcome } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfidenceBar } from './ConfidenceBar';
import { cn } from '@/lib/utils';
import { format, formatDistanceStrict } from 'date-fns';
import { Copy, ExternalLink, Share2, CheckCircle, Clock, Trophy, ShieldCheck, Scale, Cpu } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CELOSCAN_URL } from '@/data/mockData';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface PredictionDetailModalProps {
  prediction: Prediction | null;
  open: boolean;
  onClose: () => void;
}

const outcomeLabel: Record<PredictionOutcome, string> = {
  home_win: 'HOME WIN',
  draw: 'DRAW',
  away_win: 'AWAY WIN',
};

function getOutcomeColor(outcome: PredictionOutcome) {
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
    const text = `⚽ BetOracle Agent: ${match.homeTeam} vs ${match.awayTeam}\n📊 Pick: ${outcomeLabel[pred.outcome]} (${pred.confidence}% conf)\n${isResolved ? `Result: ${result.score} ${isWin ? '✅ WIN' : '❌ LOSS'}` : '⏳ Pending'}\n\nVerified on-chain on Celo`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Prepare radar chart data
  const radarData = modelFactors?.map(f => ({
    subject: f.name.replace('Score', '').replace('Impact', '').trim(),
    score: Math.max(0, (f.score + 1) * 50), // Scale -1..1 to 0..100
  })) || [];

  // Prepare probability data
  const barData = pred.marketOdds && pred.trueProbabilities ? [
    {
      name: 'Home',
      Market: Math.round((1 / pred.marketOdds.home) * 100),
      Model: Math.round(pred.trueProbabilities.home * 100)
    },
    {
      name: 'Draw',
      Market: Math.round((1 / pred.marketOdds.draw) * 100),
      Model: Math.round(pred.trueProbabilities.draw * 100)
    },
    {
      name: 'Away',
      Market: Math.round((1 / pred.marketOdds.away) * 100),
      Model: Math.round(pred.trueProbabilities.away * 100)
    }
  ] : [];

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
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between mb-4 relative">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
                   <Cpu size={14} /> AI Recommendation
                </p>
                <div className="flex items-baseline gap-3">
                  <p className={cn("text-3xl font-bold flex items-center gap-2", getOutcomeColor(pred.outcome))}>
                    <Trophy size={24} />
                    {outcomeLabel[pred.outcome]}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                {isResolved ? (
                  <Badge className={cn(
                    'text-base px-3 py-1 font-bold',
                    isWin ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground',
                  )}>
                    {isWin ? '✓ CORRECT' : '✗ INCORRECT'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-sm">
                     + {pred.edge.toFixed(1)}% Edge
                  </Badge>
                )}
              </div>
            </div>

            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
               <span>Agent Confidence</span>
               <span className="font-mono">{pred.confidence}%</span>
            </div>
            <ConfidenceBar confidence={pred.confidence} />
          </div>

          {/* Probability & Market Comparsion */}
          {barData.length > 0 && pred.marketOdds && (
            <div>
               <h4 className="font-semibold gap-2 flex items-center text-foreground mb-4">
                 <Scale size={18} className="text-primary" /> Probability vs Market Line
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* Bar Chart */}
                 <div className="glass-card p-4 rounded-xl h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                          contentStyle={{backgroundColor: '#0a0a0f', borderColor: '#333', fontSize: '12px'}} 
                        />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '11px'}} />
                        <Bar dataKey="Model" fill="#35D07F" radius={[4,4,0,0]} />
                        <Bar dataKey="Market" fill="#4B5563" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>

                 {/* Comparison Table */}
                 <div className="glass-card rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Outcome</th>
                          <th className="px-4 py-3 font-semibold text-right">Odds</th>
                          <th className="px-4 py-3 font-semibold text-right">Market %</th>
                          <th className="px-4 py-3 font-semibold text-right text-primary">Model %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {barData.map((d) => {
                           const odds = d.name === 'Home' ? pred.marketOdds!.home : d.name === 'Draw' ? pred.marketOdds!.draw : pred.marketOdds!.away;
                           return (
                             <tr key={d.name} className="hover:bg-white/5 transition-colors">
                               <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                               <td className="px-4 py-3 text-right font-mono">{odds.toFixed(2)}</td>
                               <td className="px-4 py-3 text-right font-mono text-muted-foreground">{d.Market}%</td>
                               <td className="px-4 py-3 text-right font-mono text-primary font-bold">{d.Model}%</td>
                             </tr>
                           )
                        })}
                      </tbody>
                    </table>
                    
                    <div className="p-4 border-t border-white/5 bg-primary/5 text-xs text-muted-foreground leading-relaxed">
                       Our AI model calculates the true probability of each outcome. The <span className="text-primary font-semibold text-foreground">Edge</span> is identified when the Model probability is significantly higher than the Market implied probability.
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* Factor Radar Chart & Breakdown */}
          {modelFactors && modelFactors.length > 0 && (
             <div>
                <h4 className="font-semibold gap-2 flex items-center text-foreground mb-4">
                  <BrainIcon size={18} className="text-primary" /> AI Factor Analysis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* Radar Chart */}
                  <div className="glass-card rounded-xl h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{fill: '#888', fontSize: 10}} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="score" stroke="#35D07F" fill="#35D07F" fillOpacity={0.3} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0a0a0f', borderColor: '#333', fontSize: '12px'}} 
                            formatter={(value: number) => [`${value.toFixed(0)}/100`, 'Score']}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* AI Reasoning List */}
                  <div className="space-y-3">
                     {modelFactors.map((factor, i) => (
                       <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5">
                         <div className="flex items-center justify-between mb-1">
                           <span className="text-sm font-semibold text-foreground">
                             {factor.name}
                           </span>
                           <span className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              factor.score >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                           )}>
                              {factor.score > 0 ? 'Advantage' : 'Disadvantage'}
                           </span>
                         </div>
                         <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {factor.reasoning || `${factor.score > 0 ? 'Positive' : 'Negative'} impact computed by the model based on historical datasets and current lineup conditions.`}
                         </p>
                       </div>
                     ))}
                  </div>

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

function BrainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  )
}
