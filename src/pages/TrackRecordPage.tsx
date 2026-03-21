import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { StatsCard } from '@/components/StatsCard';
import { PredictionDetailModal } from '@/components/PredictionDetailModal';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Cpu, Activity, Trophy, BarChart3 } from 'lucide-react';
import { Prediction } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Label,
  LineChart, Line, CartesianGrid
} from 'recharts';
import { format } from 'date-fns';

const chartColors = [
  '#35D07F', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'
];

export default function TrackRecordPage() {
  const { fetchPredictions, fetchStats, historicalPredictions, stats, isLoading } = useStore();
  const [selectedPred, setSelectedPred] = useState<Prediction | null>(null);

  useEffect(() => {
    fetchPredictions();
    fetchStats();
  }, [fetchPredictions, fetchStats]);

  // Derived Stats
  const resolvedPredictions = useMemo(() => {
    return historicalPredictions
      .filter(p => p.result && p.result.status !== 'pending')
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  }, [historicalPredictions]);

  const recentStreak = useMemo(() => {
    return resolvedPredictions.slice(-10).map(p => p.result?.status === 'win' ? 'W' : 'L');
  }, [resolvedPredictions]);

  // League Data
  const leagueChartData = useMemo(() => {
    const map: Record<string, { total: number; wins: number }> = {};
    resolvedPredictions.forEach(p => {
      const lg = p.match.league || 'Unknown';
      if (!map[lg]) map[lg] = { total: 0, wins: 0 };
      map[lg].total++;
      if (p.result?.status === 'win') map[lg].wins++;
    });
    return Object.entries(map).map(([league, { total, wins }]) => ({
      league,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      wins,
      losses: total - wins,
      total,
    })).sort((a, b) => b.total - a.total);
  }, [resolvedPredictions]);

  // Edge captured over time (cumulative sum of edge * if win vs loss)
  // Just accumulating raw edge of wins to show "value captured"
  const edgeOverTimeData = useMemo(() => {
    let cumulative = 0;
    return resolvedPredictions.map(p => {
      const win = p.result?.status === 'win';
      if (win) cumulative += p.prediction.edge;
      return {
        date: format(new Date(p.recordedAt), 'MMM dd'),
        edge: Math.round(cumulative * 10) / 10
      };
    });
  }, [resolvedPredictions]);

  // Accuracy Gauge Data
  const accuracyData = [
    { name: 'Wins', value: stats.correctPredictions, fill: '#35D07F' },
    { name: 'Losses', value: stats.totalPredictions - stats.correctPredictions, fill: '#ef4444' }
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        
        <div className="mb-10 text-center md:text-left">
           <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
             <BarChart3 size={32} className="text-primary" /> System Performance Stats
           </h1>
           <p className="text-muted-foreground">Comprehensive track record and analytics of the BetOracle Agent model.</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse glass-card rounded-2xl">
            <Cpu size={40} className="mx-auto mb-4 opacity-50" />
            <p>Analyzing on-chain prediction records...</p>
          </div>
        ) : resolvedPredictions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground glass-card rounded-2xl border-white/5">
            <Cpu size={40} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-2">No resolved predictions yet</p>
            <p className="text-sm">Metrics will populate once match results are finalized.</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-card p-6 flex flex-col items-center justify-center col-span-1 md:col-span-1 border-white/5">
                 <div className="text-muted-foreground text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                   <Target size={14} /> Total Analyzed
                 </div>
                 <div className="text-4xl font-bold text-foreground font-mono">
                   {stats.totalPredictions}
                 </div>
              </Card>

              <Card className="glass-card p-6 col-span-1 md:col-span-2 border-white/5 flex flex-col justify-center">
                 <div className="text-muted-foreground text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-1">
                   <Activity size={14} /> Recent Form (Last 10)
                 </div>
                 <div className="flex items-center gap-2 overflow-hidden justify-center md:justify-start">
                   {recentStreak.length > 0 ? recentStreak.map((res, idx) => (
                     <div 
                       key={idx} 
                       className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs ${
                         res === 'W' ? 'bg-success text-success-foreground shadow-[0_0_10px_rgba(53,208,127,0.3)]' : 'bg-destructive/80 text-destructive-foreground'
                       }`}
                     >
                       {res}
                     </div>
                   )) : (
                     <span className="text-muted-foreground text-sm">Not enough data</span>
                   )}
                 </div>
              </Card>

              <Card className="glass-card p-6 flex flex-col items-center justify-center border-white/5 relative overflow-hidden">
                 <div className="text-muted-foreground text-sm font-semibold uppercase tracking-wider mb-2 flex flex-col items-center z-10">
                   <div className="flex items-center gap-1"><Trophy size={14}/> Cumulative Edge</div>
                 </div>
                 <div className="text-3xl font-bold text-success font-mono z-10">
                   +{edgeOverTimeData[edgeOverTimeData.length - 1]?.edge || 0}%
                 </div>
                 <div className="absolute inset-0 bg-success/5 blur-xl"></div>
              </Card>
            </div>

            {/* Graphs Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Accuracy Gauge */}
              <Card className="glass-card p-6 border-white/5 col-span-1 flex flex-col items-center">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider w-full mb-4">Overall Accuracy</h3>
                 <div className="h-64 w-full relative">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={accuracyData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         startAngle={90}
                         endAngle={-270}
                         dataKey="value"
                         stroke="none"
                       >
                         {accuracyData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                         <Label
                           value={`${stats.winRate}%`}
                           position="center"
                           fill="#fff"
                           style={{ fontSize: '32px', fontWeight: 'bold' }}
                         />
                       </Pie>
                       <Tooltip
                         contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#333', fontSize: '12px' }}
                         itemStyle={{ color: '#fff' }}
                       />
                     </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute bottom-4 w-full flex justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-success"></span> {stats.correctPredictions} Wins</div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-destructive"></span> {stats.totalPredictions - stats.correctPredictions} Losses</div>
                   </div>
                 </div>
              </Card>

              {/* Edge Over Time Line Chart */}
              <Card className="glass-card p-6 border-white/5 col-span-1 lg:col-span-2">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                   <TrendingUp size={16} /> Cumulative Edge Captured
                 </h3>
                 <div className="h-64 mt-4 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={edgeOverTimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#333', fontSize: '12px' }}
                          labelStyle={{ color: '#888' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="edge" 
                          stroke="#35D07F" 
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, fill: '#35D07F', stroke: '#0a0a0f', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
              </Card>

            </div>

            {/* League Breakdown Table */}
            <Card className="glass-card border-white/5 overflow-hidden">
               <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                 <h3 className="text-lg font-semibold text-foreground">Performance by League</h3>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-white/5 text-xs uppercase text-muted-foreground tracking-wider">
                       <th className="p-4 font-semibold">League Name</th>
                       <th className="p-4 font-semibold text-center">Matches Analyzed</th>
                       <th className="p-4 font-semibold text-center">Wins - Losses</th>
                       <th className="p-4 font-semibold text-right">Win Rate</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {leagueChartData.map((data, index) => (
                       <tr key={data.league} className="hover:bg-white/5 transition-colors">
                         <td className="p-4 font-medium flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                             ⚽
                           </div>
                           {data.league}
                         </td>
                         <td className="p-4 text-center font-mono text-muted-foreground">
                           {data.total}
                         </td>
                         <td className="p-4 text-center">
                           <div className="flex items-center justify-center gap-2 font-mono text-sm">
                             <span className="text-success">{data.wins}</span>
                             <span className="text-muted-foreground">-</span>
                             <span className="text-destructive">{data.losses}</span>
                           </div>
                         </td>
                         <td className="p-4 text-right">
                           <Badge className={cn('text-xs px-2 py-1', data.winRate >= 50 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive')}>
                             {data.winRate}%
                           </Badge>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </Card>

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
