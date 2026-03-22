import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { ListFilter, TrendingUp, Minus, TrendingDown, Ban } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { thirdwebClient, celoChain } from '@/config/thirdweb';

import * as api from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { cacheMatchMeta, cachePredictionTx } from '@/store/useStore';

// Must exactly match the league strings the backend uses in matchIds
type FilterType = 'All' | 'EPL' | 'LaLiga' | 'Bundesliga' | 'Ligue1' | 'SerieA';

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 120_000;
const POLL_INITIAL_DELAY_MS = 4_000;

// ── Persistent card-level prediction store ───────────────────────────────────
interface CardPrediction {
  outcome: string | null;
  confidence: number | null;
  edge: number | null;
  homeTeam: string;
  awayTeam: string;
  predictionId?: string;
  txHash?: string;
}

// Module-level map — survives filter changes, cleared on page unmount
const cardPredictionStore = new Map<number, CardPrediction>();

function PredictionSkeleton() {
  return (
    <div className="glass-card p-5 rounded-xl border border-white/5 space-y-4 h-[200px]">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-16 bg-white/10" />
        <Skeleton className="h-4 w-24 bg-white/10 rounded" />
      </div>
      <Skeleton className="h-6 w-3/4 bg-white/10 mt-2" />
      <Skeleton className="h-10 w-full bg-white/10 mt-4" />
    </div>
  );
}

// ── Outcome badge ─────────────────────────────────────────────────────────────
function OutcomeBadge({ outcome, homeTeam, awayTeam }: {
  outcome: string | null;
  homeTeam: string;
  awayTeam: string;
}) {
  if (!outcome) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
        <Ban size={13} />
        No Value Bet
      </div>
    );
  }

  const cfg = {
    HOME_WIN: { label: `${homeTeam} Win`, icon: <TrendingUp size={13} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
    DRAW: { label: 'Draw', icon: <Minus size={13} />, color: 'text-amber-400', bg: 'bg-amber-400/10   border-amber-400/20' },
    AWAY_WIN: { label: `${awayTeam} Win`, icon: <TrendingDown size={13} />, color: 'text-sky-400', bg: 'bg-sky-400/10     border-sky-400/20' },
  }[outcome] ?? { label: outcome, icon: null, color: 'text-muted-foreground', bg: 'bg-white/5 border-white/10' };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}{cfg.label}
    </div>
  );
}

// ── Full prediction result panel inside the card ──────────────────────────────
function PredictionResult({ pred, homeTeam, awayTeam }: {
  pred: CardPrediction;
  homeTeam: string;
  awayTeam: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3"
    >
      {/* Top row: outcome + on-chain link */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <OutcomeBadge outcome={pred.outcome} homeTeam={homeTeam} awayTeam={awayTeam} />
        {pred.txHash && (
          <a
            href={`https://celoscan.io/tx/${pred.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary/60 hover:text-primary underline font-mono"
          >
            on-chain ↗
          </a>
        )}
      </div>

      {/* Confidence bar + edge */}
      {pred.outcome && (
        <div className="flex items-end gap-4">
          {pred.confidence != null && (
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted-foreground">Confidence</span>
                <span className="text-xs font-bold text-foreground">{pred.confidence}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <motion.div
                  className="h-1.5 rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${pred.confidence}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
                />
              </div>
            </div>
          )}
          {pred.edge != null && pred.edge > 0 && (
            <div className="shrink-0 text-right">
              <div className="text-[10px] text-muted-foreground mb-1">Edge</div>
              <div className="text-sm font-bold text-emerald-400">+{pred.edge.toFixed(1)}%</div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function MatchesPage() {
  const { fetchPredictions } = useStore();
  const [filter, setFilter] = useState<FilterType>('All');
  const account = useActiveAccount();

  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Array<api.ApiMatch & { _league: string }>>([]);
  const [analyzingFor, setAnalyzingFor] = useState<Set<number>>(new Set());
  const [predictionVersion, setPredictionVersion] = useState(0);
  const bumpVersion = () => setPredictionVersion(v => v + 1);

  const addAnalyzing = (id: number) => setAnalyzingFor(prev => new Set(prev).add(id));
  const removeAnalyzing = (id: number) => setAnalyzingFor(prev => { const s = new Set(prev); s.delete(id); return s; });

  // All leagues we support — must match backend matchId prefixes exactly
  const ALL_LEAGUES: FilterType[] = ['EPL', 'LaLiga', 'Bundesliga', 'Ligue1', 'SerieA'];
  const filters: FilterType[] = ['All', ...ALL_LEAGUES];

  // ── Fetch fixtures ────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      setMatchesLoading(true);
      setMatchesError(null);
      try {
        // When filter is 'All' fetch every league in parallel.
        // When a specific league is selected, fetch only that one.
        const leaguesToFetch = filter === 'All' ? ALL_LEAGUES : [filter];

        const results = await Promise.all(
          leaguesToFetch.map(league =>
            api.fetchMatches(league)
              .then(res => ({ league, matches: res.matches ?? [] }))
              .catch(() => ({ league, matches: [] as api.ApiMatch[] }))
          )
        );

        const allMatches: Array<api.ApiMatch & { _league: string }> = [];
        results.forEach(({ league, matches }) => {
          matches.forEach(m => {
            allMatches.push({ ...m, _league: league });
            // Pre-warm cache with the stable fixture-id key
            cacheMatchMeta(`${league}-${m.fixtureId}`, {
              homeTeam: m.homeTeam,
              awayTeam: m.awayTeam,
              kickoffTime: new Date(`${m.date}T${m.time}:00Z`).toISOString(),
              league,
            });
          });
        });

        setMatches(allMatches);
      } catch (e: any) {
        setMatchesError(e?.message || 'Failed to fetch matches');
        setMatches([]);
      } finally {
        setMatchesLoading(false);
      }
    };
    run();
  }, [filter]);

  const visibleMatches = useMemo(
    () => [...matches].sort((a, b) =>
      new Date(`${a.date}T${a.time}:00Z`).getTime() - new Date(`${b.date}T${b.time}:00Z`).getTime()
    ),
    [matches]
  );

  // ── Create prediction ─────────────────────────────────────────────────────
  const handleCreatePrediction = (m: api.ApiMatch & { _league: string }) => {
    const league = m._league;
    if (!league || analyzingFor.has(m.fixtureId) || cardPredictionStore.has(m.fixtureId)) return;

    addAnalyzing(m.fixtureId);

    // Fire and forget — Railway drops at ~28s but backend keeps running
    api.createPrediction({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      league,
      fixtureId: m.fixtureId,
      date: m.date,
    })
      .then(res => {
        if (res?.predictionId && res?.blockchain?.txHash) {
          cachePredictionTx(res.predictionId, res.blockchain.txHash);
        }
        // Handle NO_VALUE_BET when backend responds within 28s
        if (res && !res.success && res.code === 'NO_VALUE_BET') {
          removeAnalyzing(m.fixtureId);
          cardPredictionStore.set(m.fixtureId, {
            outcome: null, confidence: null, edge: null,
            homeTeam: m.homeTeam, awayTeam: m.awayTeam,
          });
          bumpVersion();
          setTimeout(() => fetchPredictions(), 1500);
        }
      })
      .catch((err: any) => {
        if (!err?.message?.includes('took too long')) {
          console.warn('[MatchesPage] Unexpected predict error:', err?.message);
        }
      });

    toast({
      title: '🔍 AI Analysis Running',
      description: `Analyzing ${m.homeTeam} vs ${m.awayTeam}. Result will appear on the card when ready.`,
    });

    // ── Poll by prefix match ──────────────────────────────────────────────
    // Backend matchId format: {league}-{fixtureId}-{homeAbbr}-{awayAbbr}-{date}
    // Prefix match covers all variants.
    const matchIdPrefix = `${league}-${m.fixtureId}`;
    const started = Date.now();
    let pollCount = 0;

    const poll = async (): Promise<void> => {
      pollCount++;
      if (Date.now() - started > POLL_TIMEOUT_MS) {
        removeAnalyzing(m.fixtureId);
        toast({
          title: 'Analysis Timed Out',
          description: `Could not get result for ${m.homeTeam} vs ${m.awayTeam}. Try again or check the picks feed.`,
          variant: 'destructive',
        });
        return;
      }

      try {
        const res = await api.fetchPredictions({ resolved: false, limit: 100 });
        const found = res.predictions.find(p => p.matchId.startsWith(matchIdPrefix));

        if (found) {
          const confidencePct = found.confidence != null
            ? Math.round(found.confidence <= 1 ? found.confidence * 100 : found.confidence)
            : null;
          const edgeVal = found.edge != null ? Math.round(found.edge * 10) / 10 : null;

          cardPredictionStore.set(m.fixtureId, {
            outcome: found.prediction ?? null,
            confidence: confidencePct,
            edge: edgeVal,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            predictionId: found.predictionId,
            txHash: found.predictionId ? predictionTxCacheGet(found.predictionId) : undefined,
          });

          removeAnalyzing(m.fixtureId);
          bumpVersion();
          await fetchPredictions();

          const outcomeLabel =
            found.prediction === 'HOME_WIN' ? `${m.homeTeam} Win` :
              found.prediction === 'AWAY_WIN' ? `${m.awayTeam} Win` :
                found.prediction === 'DRAW' ? 'Draw' :
                  'No Value Bet';

          toast({
            title: '✅ Prediction Ready',
            description: `${m.homeTeam} vs ${m.awayTeam}: ${outcomeLabel}${confidencePct != null ? ` at ${confidencePct}% confidence` : ''
              }.`,
          });
          return;
        }
      } catch (err) {
        console.warn(`[MatchesPage] Poll #${pollCount} error (retrying):`, err);
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    setTimeout(poll, POLL_INITIAL_DELAY_MS);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!account?.address) {
    return (
      <div className="container mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Analyzed Matches</h1>
            <p className="text-muted-foreground mt-1 text-balance">
              Upcoming fixtures fetched in realtime. Create a prediction for any fixture.
            </p>
          </div>
          <div className="flex justify-center">
            <ConnectButton
              client={thirdwebClient} chain={celoChain}
              connectButton={{ className: 'gradient-primary text-black font-bold h-12 px-8 shadow-lg shadow-primary/20', label: 'Connect Wallet' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Analyzed Matches</h1>
            <p className="text-muted-foreground mt-1 text-balance">
              Upcoming fixtures fetched in realtime. Predictions persist on each card after analysis.
            </p>
          </div>

          {/* League filter pills */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 overflow-x-auto max-w-full glass-card">
            <div className="pl-3 pr-2 text-muted-foreground"><ListFilter size={16} /></div>
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${filter === f
                    ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_10px_rgba(53,208,127,0.3)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {matchesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <PredictionSkeleton key={i} />)}
          </div>
        ) : matchesError ? (
          <div className="py-24 text-center glass-card rounded-2xl border-white/10 flex flex-col items-center justify-center">
            <h3 className="text-2xl font-bold text-foreground mb-3">Failed to load matches</h3>
            <p className="text-muted-foreground max-w-md mx-auto">{matchesError}</p>
          </div>
        ) : visibleMatches.length === 0 ? (
          <div className="py-24 text-center glass-card rounded-2xl border-white/10 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">No matches found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">No upcoming fixtures for this league right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {visibleMatches.map(m => {
                const isAnalyzing = analyzingFor.has(m.fixtureId);
                // eslint-disable-next-line react-hooks/exhaustive-deps
                const cardPred = cardPredictionStore.get(m.fixtureId);
                const hasPrediction = !!cardPred;

                return (
                  <motion.div
                    key={`${m.fixtureId}-${predictionVersion}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className={`glass-card p-5 rounded-xl border space-y-3 transition-colors ${hasPrediction ? 'border-primary/20 bg-primary/[0.03]' : 'border-white/5'
                      }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">#{m.fixtureId}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">{m._league}</span>
                        <span className="text-xs text-muted-foreground">{m.date} {m.time}</span>
                      </div>
                    </div>

                    {/* Teams */}
                    <div className="text-base font-bold text-foreground leading-snug">
                      {m.homeTeam} <span className="text-muted-foreground font-normal text-sm">vs</span> {m.awayTeam}
                    </div>

                    {/* Analyzing progress bar */}
                    {isAnalyzing && (
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                        />
                      </div>
                    )}

                    {/* Prediction result or CTA */}
                    {hasPrediction ? (
                      <PredictionResult pred={cardPred!} homeTeam={m.homeTeam} awayTeam={m.awayTeam} />
                    ) : (
                      <Button
                        className="w-full gradient-primary text-black font-bold"
                        onClick={() => handleCreatePrediction(m)}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? '🔍 Analyzing...' : 'Create Prediction'}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Helper: read from the module-level predictionTxCache (not exported from useStore)
function predictionTxCacheGet(predictionId: string): string | undefined {
  // We re-export cacheMatchMeta from useStore but not the tx cache getter.
  // The tx hash will be populated by cachePredictionTx when the fire-and-forget
  // response arrives, or can be read from the store's blockchainTx field.
  return undefined;
}