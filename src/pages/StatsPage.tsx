import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Cpu, Activity, Trophy, BarChart3 } from 'lucide-react';
import {
  PieChart, Pie, Label, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, CartesianGrid, XAxis, YAxis,
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function StatsPage() {
  const { fetchPredictions, fetchStats, historicalPredictions, stats, isLoading } = useStore();

  useEffect(() => {
    fetchPredictions();
    fetchStats();
  }, [fetchPredictions, fetchStats]);

  // Only truly resolved (win or loss) — excludes pending and NO_VALUE_BET
  const resolvedPredictions = useMemo(() =>
    historicalPredictions
      .filter(p => p.result && (p.result.status === 'win' || p.result.status === 'loss'))
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()),
    [historicalPredictions]
  );

  const localWins = resolvedPredictions.filter(p => p.result?.status === 'win').length;
  const localLosses = resolvedPredictions.filter(p => p.result?.status === 'loss').length;
  const localTotal = localWins + localLosses;
  const localWinRate = localTotal > 0 ? Math.round((localWins / localTotal) * 100) : 0;

  // Last 10 for streak row
  const recentStreak = useMemo(
    () => resolvedPredictions.slice(-10).map(p => p.result?.status === 'win' ? 'W' : 'L'),
    [resolvedPredictions]
  );

  // Win rate per league
  const leagueChartData = useMemo(() => {
    const map: Record<string, { total: number; wins: number }> = {};
    resolvedPredictions.forEach(p => {
      const lg = p.match.league || 'Unknown';
      if (!map[lg]) map[lg] = { total: 0, wins: 0 };
      map[lg].total++;
      if (p.result?.status === 'win') map[lg].wins++;
    });
    return Object.entries(map)
      .map(([league, { total, wins }]) => ({
        league,
        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        wins,
        losses: total - wins,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [resolvedPredictions]);

  // Cumulative edge trajectory (wins only)
  const edgeOverTimeData = useMemo(() => {
    let cumulative = 0;
    return resolvedPredictions.map(p => {
      if (p.result?.status === 'win' && p.prediction.edge) cumulative += p.prediction.edge;
      return {
        date: format(new Date(p.recordedAt), 'MMM dd'),
        edge: Math.round(cumulative * 10) / 10,
      };
    });
  }, [resolvedPredictions]);

  const cumulativeEdge = edgeOverTimeData[edgeOverTimeData.length - 1]?.edge ?? 0;

  const accuracyData = [
    { name: 'Wins', value: localWins, fill: '#35D07F' },
    { name: 'Losses', value: localLosses, fill: '#ef4444' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

        {/* Header */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center justify-center md:justify-start gap-3">
            <BarChart3 size={32} className="text-primary" /> Performance Stats
          </h1>
          <p className="text-muted-foreground text-balance">
            Every prediction is recorded on-chain before kick-off. Nothing is hidden or edited after the fact.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20 glass-card flex flex-col items-center rounded-2xl border-white/10 animate-pulse">
            <Cpu size={40} className="mb-4 opacity-50 text-primary" />
            <p className="text-muted-foreground">Analysing on-chain prediction records...</p>
          </div>
        ) : resolvedPredictions.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl border-white/5">
            <Cpu size={40} className="mx-auto mb-4 opacity-40 text-primary" />
            <p className="text-lg font-medium mb-2 text-foreground">No resolved predictions yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Metrics populate once the first batch of match results are finalised on-chain.
            </p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-card p-6 flex flex-col items-center justify-center border-white/5">
                <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Target size={14} /> Recorded Picks
                </div>
                <div className="text-4xl font-bold text-foreground font-mono">{stats.totalPredictions}</div>
              </Card>

              <Card className="glass-card p-6 col-span-1 md:col-span-2 border-white/5 flex flex-col justify-center">
                <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1 justify-center md:justify-start">
                  <Activity size={14} /> Recent Form (Last 10)
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                  {recentStreak.length > 0 ? recentStreak.map((r, i) => (
                    <div key={i} className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs ring-1',
                      r === 'W'
                        ? 'bg-emerald-400/20 ring-emerald-400/50 text-emerald-400 border border-emerald-400/30'
                        : 'bg-red-500/10 ring-red-500/30 text-red-400 border border-red-500/20'
                    )}>{r}</div>
                  )) : <span className="text-muted-foreground text-sm">Not enough data</span>}
                </div>
              </Card>

              <Card className="glass-card p-6 flex flex-col items-center justify-center border-white/5 relative overflow-hidden group">
                <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1 z-10">
                  <Trophy size={14} /> Edge Gained
                </div>
                <div className="text-3xl font-bold text-emerald-400 font-mono z-10">+{cumulativeEdge}%</div>
                <div className="absolute inset-0 bg-emerald-400/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Accuracy pie */}
              <Card className="glass-card p-6 flex flex-col items-center border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Lifetime Accuracy</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={accuracyData} cx="50%" cy="50%"
                        innerRadius={50} outerRadius={70}
                        startAngle={90} endAngle={-270}
                        dataKey="value" stroke="none"
                      >
                        {accuracyData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        <Label value={`${localWinRate}%`} position="center" fill="#fff"
                          style={{ fontSize: '28px', fontWeight: 'bold' }} />
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#333', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 text-xs font-medium mt-2">
                  <span className="text-emerald-400 flex items-center justify-center gap-1 w-20 py-1 bg-emerald-400/10 rounded border border-emerald-400/20">{localWins}W</span>
                  <span className="text-red-400 flex items-center justify-center gap-1 w-20 py-1 bg-red-500/10 rounded border border-red-500/20">{localLosses}L</span>
                </div>
              </Card>

              {/* Edge trajectory */}
              <Card className="glass-card p-6 col-span-1 md:col-span-2 border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-6">
                  <TrendingUp size={14} /> Edge Trajectory Over Time
                </h3>
                <div className="h-56 w-full pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={edgeOverTimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="edge" stroke="#35D07F" strokeWidth={3} dot={false}
                        activeDot={{ r: 6, fill: '#35D07F', stroke: '#0a0a0f', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* League table */}
            <Card className="glass-card border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 font-bold uppercase text-xs tracking-widest text-muted-foreground">
                Accuracy By League
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/40 text-[10px] uppercase text-muted-foreground tracking-widest border-b border-white/5">
                      <th className="p-5 font-semibold">League</th>
                      <th className="p-5 font-semibold text-center">Analysed</th>
                      <th className="p-5 font-semibold text-center">W — L</th>
                      <th className="p-5 font-semibold text-right">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leagueChartData.map(d => (
                      <tr key={d.league} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-foreground flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">⚽</div>
                          {d.league}
                        </td>
                        <td className="p-4 text-center font-mono text-muted-foreground">{d.total}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 font-mono text-sm font-semibold">
                            <span className="text-emerald-400">{d.wins}</span>
                            <span className="text-muted-foreground opacity-50">—</span>
                            <span className="text-red-400">{d.losses}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <Badge className={cn('text-xs px-2.5 py-1 box-content',
                            d.winRate >= 50
                              ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          )}>
                            {d.winRate}%
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
    </div>
  );
}