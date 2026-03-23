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

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_LEAGUES = ['EPL', 'LaLiga', 'Bundesliga', 'Ligue1', 'SerieA'] as const;
type League = typeof ALL_LEAGUES[number];
type FilterType = 'All' | League;

// Fetch up to 60 days ahead — no artificial cutoff, show all available fixtures
const DAYS_AHEAD = 60;

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 120_000;
const POLL_INITIAL_DELAY_MS = 4_000;

// ── Card-level persistent prediction store (survives page refresh) ───────────

interface CardPrediction {
  outcome: string | null;
  confidence: number | null;
  edge: number | null;
  homeTeam: string;
  awayTeam: string;
  predictionId?: string;
  txHash?: string;
}

const STORAGE_KEY = 'betoracle_card_predictions';

// Load from localStorage on module init.
// JSON serialises Map keys as strings — we must convert back to number on load.
function loadCardPredictions(): Map<number, CardPrediction> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const entries = JSON.parse(raw) as [string | number, CardPrediction][];
    // Ensure keys are numbers so cardPredictionStore.get(fixtureId) always hits
    return new Map(entries.map(([k, v]) => [Number(k), v]));
  } catch {
    return new Map();
  }
}

function saveCardPredictions(store: Map<number, CardPrediction>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...store.entries()]));
  } catch { /* storage full or unavailable — fail silently */ }
}

const cardPredictionStore = loadCardPredictions();

function setCardPrediction(fixtureId: number, pred: CardPrediction) {
  cardPredictionStore.set(fixtureId, pred);
  saveCardPredictions(cardPredictionStore);
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function OutcomeBadge({ outcome, homeTeam, awayTeam }: {
  outcome: string | null; homeTeam: string; awayTeam: string;
}) {
  if (!outcome) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
        <Ban size={13} /> No Value Bet
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

function PredictionResult({ pred, homeTeam, awayTeam }: {
  pred: CardPrediction; homeTeam: string; awayTeam: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3"
    >
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

// ── Main component ────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const { fetchPredictions } = useStore();
  const account = useActiveAccount();

  const [filter, setFilter] = useState<FilterType>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Array<api.ApiMatch & { _league: League }>>([]);
  const [analyzingFor, setAnalyzingFor] = useState<Set<number>>(new Set());
  const [predictionVersion, setPredictionVersion] = useState(0);

  const bumpVersion = () => setPredictionVersion(v => v + 1);
  const addAnalyzing = (id: number) => setAnalyzingFor(prev => new Set(prev).add(id));
  const removeAnalyzing = (id: number) => setAnalyzingFor(prev => { const s = new Set(prev); s.delete(id); return s; });

  const filters: FilterType[] = ['All', ...ALL_LEAGUES];

  // ── Fetch matches ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      // Which leagues to fetch
      const leaguesToFetch: League[] =
        filter === 'All' ? [...ALL_LEAGUES] : [filter as League];

      try {
        // Fetch each league with escalating daysAhead windows.
        // Some leagues (e.g. EPL) have gaps of 19+ days between rounds
        // due to international breaks or cup weeks. We try 60 → 90 → default
        // so empty results from a narrow window don't show "no fixtures".
        const fetchLeague = async (league: League) => {
          for (const days of [DAYS_AHEAD, 90, undefined] as const) {
            try {
              const res = await api.fetchMatches(league, days as number | undefined);
              const matches = res.matches ?? [];
              if (matches.length > 0 || days === undefined) {
                return { league, matches, ok: true };
              }
              console.log(`[MatchesPage] ${league} empty at daysAhead=${days}, widening window...`);
            } catch (err: any) {
              console.warn(`[MatchesPage] ${league} error at daysAhead=${days}:`, err?.message);
              if (days === undefined) return { league, matches: [] as api.ApiMatch[], ok: false };
            }
          }
          return { league, matches: [] as api.ApiMatch[], ok: true };
        };

        const responses = await Promise.all(leaguesToFetch.map(fetchLeague));

        if (cancelled) return;

        const allMatches: Array<api.ApiMatch & { _league: League }> = [];

        responses.forEach(({ league, matches: leagueMatches }) => {
          leagueMatches.forEach(m => {
            allMatches.push({ ...m, _league: league });
            cacheMatchMeta(`${league}-${m.fixtureId}`, {
              homeTeam: m.homeTeam,
              awayTeam: m.awayTeam,
              kickoffTime: new Date(`${m.date}T${m.time}:00Z`).toISOString(),
              league,
            });
          });
        });

        if (responses.every(r => !r.ok)) {
          setError('Could not reach the backend. Please try again in a moment.');
        }

        setMatches(allMatches);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load matches');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [filter]);

  const visibleMatches = useMemo(
    () => [...matches].sort((a, b) =>
      new Date(`${a.date}T${a.time}:00Z`).getTime() -
      new Date(`${b.date}T${b.time}:00Z`).getTime()
    ),
    [matches]
  );

  // ── Create prediction ──────────────────────────────────────────────────────
  const handleCreatePrediction = (m: api.ApiMatch & { _league: League }) => {
    const league = m._league;
    if (analyzingFor.has(m.fixtureId) || cardPredictionStore.has(m.fixtureId)) return;

    addAnalyzing(m.fixtureId);

    // Shared helper — called from both the direct response AND the poll,
    // whichever resolves first. `pollCancelled` stops the poll if direct wins.
    let pollCancelled = false;

    const applyResult = (
      prediction: string | null,
      confidence: number | null,
      edge: number | null,
      predictionId?: string,
      txHash?: string,
    ) => {
      if (cardPredictionStore.has(m.fixtureId)) return; // already applied
      pollCancelled = true;

      setCardPrediction(m.fixtureId, {
        outcome: prediction,
        confidence,
        edge,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        predictionId,
        txHash,
      });

      removeAnalyzing(m.fixtureId);
      bumpVersion();
      fetchPredictions();

      const label =
        prediction === 'HOME_WIN' ? `${m.homeTeam} Win` :
          prediction === 'AWAY_WIN' ? `${m.awayTeam} Win` :
            prediction === 'DRAW' ? 'Draw' : 'No Value Bet';

      toast({
        title: '✅ Prediction Ready',
        description: `${m.homeTeam} vs ${m.awayTeam}: ${label}${confidence != null ? ` at ${confidence}% confidence` : ''
          }.`,
      });
    };

    // ── Direct request ─────────────────────────────────────────────────────
    // Some leagues return immediately (cached prediction). Others take 30-60s
    // and Railway drops the connection — the poll fallback catches those.
    api.createPrediction({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      league,
      fixtureId: m.fixtureId,
      date: m.date,
    })
      .then(res => {
        if (!res) return;

        if (res.predictionId && res.blockchain?.txHash) {
          cachePredictionTx(res.predictionId, res.blockchain.txHash);
        }

        if (!res.success && res.code === 'NO_VALUE_BET') {
          pollCancelled = true;
          setCardPrediction(m.fixtureId, {
            outcome: null, confidence: null, edge: null,
            homeTeam: m.homeTeam, awayTeam: m.awayTeam,
          });
          removeAnalyzing(m.fixtureId);
          bumpVersion();
          setTimeout(() => fetchPredictions(), 1000);
          toast({
            title: 'No Value Bet Found',
            description: `No clear mathematical edge for ${m.homeTeam} vs ${m.awayTeam}.`,
          });
          return;
        }

        if (res.success && res.prediction) {
          // Fast cached response — apply immediately, cancel poll
          const confidencePct = res.confidence != null
            ? Math.round(res.confidence <= 1 ? res.confidence * 100 : res.confidence)
            : null;
          const edgeVal = res.edge != null ? Math.round(res.edge * 10) / 10 : null;
          applyResult(res.prediction, confidencePct, edgeVal, res.predictionId, res.blockchain?.txHash ?? undefined);
        }
      })
      .catch((err: any) => {
        const msg = err?.message ?? '';

        // AbortError (28s timeout): Railway dropped the connection but the backend
        // is still running. The poll will catch the result — do nothing here.
        if (msg.includes('took too long')) return;

        // 500 backend errors (e.g. "Error fetching form: No matches returned"):
        // The backend pipeline failed for this team's data. However the backend
        // may still write a partial prediction to the DB, OR the user can retry.
        // Keep the poll running — it will find the result if one gets stored.
        // Just log and let the poll's own timeout handle the failure case.
        console.warn('[MatchesPage] predict error:', msg);
      });

    toast({
      title: '🔍 AI Analysis Running',
      description: `Analyzing ${m.homeTeam} vs ${m.awayTeam}. Result will appear on the card when ready.`,
    });

    // ── Poll fallback ──────────────────────────────────────────────────────
    // Fires 4s after request, checks every 5s. Stops as soon as pollCancelled.
    const matchIdPrefix = `${league}-${m.fixtureId}`;
    const started = Date.now();
    let pollCount = 0;

    const poll = async (): Promise<void> => {
      // Always check first — direct response or error may have resolved this
      if (pollCancelled) return;

      pollCount++;

      // Timeout check — also guards against the case where applyResult ran
      // just before this tick fired (pollCancelled is checked again above)
      if (Date.now() - started > POLL_TIMEOUT_MS) {
        if (!pollCancelled) {
          pollCancelled = true;
          removeAnalyzing(m.fixtureId);
          toast({
            title: 'Analysis Timed Out',
            description: `The engine is still running. Check the picks feed in a moment.`,
            variant: 'destructive',
          });
        }
        return;
      }

      try {
        const res = await api.fetchPredictions({ resolved: false, limit: 100 });
        const found = res.predictions.find(p => p.matchId.startsWith(matchIdPrefix));

        if (found && !pollCancelled) {
          const confidencePct = found.confidence != null
            ? Math.round(found.confidence <= 1 ? found.confidence * 100 : found.confidence)
            : null;
          const edgeVal = found.edge != null ? Math.round(found.edge * 10) / 10 : null;
          applyResult(found.prediction ?? null, confidencePct, edgeVal, found.predictionId);
          return;
        }
      } catch (err) {
        console.warn(`[MatchesPage] Poll #${pollCount} error (retrying):`, err);
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    setTimeout(poll, POLL_INITIAL_DELAY_MS);
  };

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!account?.address) {
    return (
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto text-center space-y-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Analyzed Matches</h1>
            <p className="text-muted-foreground mt-1 text-balance">
              Upcoming fixtures fetched in realtime. Create a prediction for any fixture.
            </p>
          </div>
          <ConnectButton
            client={thirdwebClient} chain={celoChain}
            connectButton={{
              className: 'gradient-primary text-black font-bold h-12 px-8 shadow-lg shadow-primary/20',
              label: 'Connect Wallet',
            }}
          />
        </motion.div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Analyzed Matches</h1>
            <p className="text-muted-foreground mt-1 text-balance">
              All upcoming fixtures from the backend. Predictions persist on each card after analysis.
            </p>
          </div>

          {/* League filter pills */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 overflow-x-auto max-w-full glass-card">
            <div className="pl-3 pr-2 text-muted-foreground shrink-0">
              <ListFilter size={16} />
            </div>
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

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <PredictionSkeleton key={i} />)}
          </div>

          /* Error */
        ) : error && visibleMatches.length === 0 ? (
          <div className="py-24 text-center glass-card rounded-2xl border-white/10 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Could not load fixtures</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-5 text-sm">{error}</p>
            <Button
              onClick={() => setFilter(f => f)}
              className="gradient-primary text-black font-bold"
            >
              Try again
            </Button>
          </div>

          /* No matches */
        ) : visibleMatches.length === 0 ? (
          <div className="py-24 text-center glass-card rounded-2xl border-white/10 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
              <span className="text-3xl">📅</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">No upcoming matches</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              No fixtures currently available for {filter === 'All' ? 'any supported league' : filter}.
            </p>
          </div>

          /* Grid */
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {visibleMatches.map(m => {
                const isAnalyzing = analyzingFor.has(m.fixtureId);
                const cardPred = predictionVersion >= 0 ? cardPredictionStore.get(m.fixtureId) : undefined;
                const hasPrediction = !!cardPred;

                return (
                  <motion.div
                    key={m.fixtureId}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className={`glass-card p-5 rounded-xl border space-y-3 transition-colors duration-300 ${hasPrediction ? 'border-primary/20 bg-primary/[0.03]' : 'border-white/5'
                      }`}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">#{m.fixtureId}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
                          {m._league}
                        </span>
                        <span className="text-xs text-muted-foreground">{m.date} {m.time}</span>
                      </div>
                    </div>

                    {/* Team names — full names from GET /api/matches */}
                    <div className="text-base font-bold text-foreground leading-snug">
                      {m.homeTeam}{' '}
                      <span className="text-muted-foreground font-normal text-sm">vs</span>{' '}
                      {m.awayTeam}
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

                    {/* Persistent result or CTA */}
                    {hasPrediction ? (
                      <PredictionResult
                        pred={cardPred!}
                        homeTeam={m.homeTeam}
                        awayTeam={m.awayTeam}
                      />
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