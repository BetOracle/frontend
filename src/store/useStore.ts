import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Prediction, Tier, AppStats, PredictionOutcome } from '@/types';
import * as api from '@/services/api';
import type { ApiPrediction } from '@/services/api';

type MatchMeta = {
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  league: string;
};

const matchMetaCache = new Map<string, MatchMeta>();
const predictionTxCache = new Map<string, string>();

export function cacheMatchMeta(matchId: string, meta: MatchMeta) {
  matchMetaCache.set(matchId, meta);
}

export function cachePredictionTx(predictionId: string, txHash: string) {
  if (txHash) predictionTxCache.set(predictionId, txHash);
}

const ALL_SUPPORTED_LEAGUES = ['EPL', 'LaLiga', 'Bundesliga', 'Ligue1', 'SerieA'];

// Days ahead to fetch for the team-name fixture lookup
const FIXTURE_DAYS_AHEAD = 14;

function inferLeagueFromMatchId(matchId: string): string | null {
  const idx = matchId.indexOf('-');
  if (idx <= 0) return null;
  return matchId.slice(0, idx);
}

function extractFixtureId(matchId: string): string | null {
  const parts = matchId.split('-');
  // Format A: league-fixtureId-... where parts[1] is numeric
  if (parts.length >= 2 && /^\d+$/.test(parts[1])) return parts[1];
  return null;
}

/**
 * Extract team names from a prediction using ALL available sources, in priority order:
 *
 * 1. factors.homeTeam / factors.awayTeam  ← API docs confirm these are stored here
 * 2. prediction.homeTeam / prediction.awayTeam  ← top-level fields (newer predictions)
 * 3. matchMetaCache  ← warmed from GET /api/matches fixture list
 * 4. null  ← caller will fall back to abbreviations from matchId
 */
function extractTeamNames(p: ApiPrediction): { homeTeam: string | null; awayTeam: string | null } {
  // Priority 1: factors object (most reliable for stored predictions)
  const factorsHome = p.factors?.homeTeam;
  const factorsAway = p.factors?.awayTeam;
  if (typeof factorsHome === 'string' && typeof factorsAway === 'string' && factorsHome && factorsAway) {
    return { homeTeam: factorsHome, awayTeam: factorsAway };
  }

  // Priority 2: top-level fields (newer predictions from updated backend)
  if (p.homeTeam && p.awayTeam) {
    return { homeTeam: p.homeTeam, awayTeam: p.awayTeam };
  }

  // Priority 3: cache warmed from fixture endpoint
  const cached = matchMetaCache.get(p.matchId);
  if (cached) {
    return { homeTeam: cached.homeTeam, awayTeam: cached.awayTeam };
  }

  return { homeTeam: null, awayTeam: null };
}

/**
 * Fetch ALL pages of predictions for a given resolved state.
 */
async function fetchAllPredictions(resolved: boolean): Promise<ApiPrediction[]> {
  const all: ApiPrediction[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const res = await api.fetchPredictions({ resolved, limit, page });
    all.push(...res.predictions);
    if (all.length >= res.total || res.predictions.length < limit) break;
    page++;
  }

  return all;
}

/**
 * Warm the matchMetaCache from upcoming fixtures.
 * This gives us full team names indexed by {league}-{fixtureId} and
 * also by the full matchId (Format A) so both lookup paths hit.
 *
 * This is a secondary source — factors.homeTeam/awayTeam is primary.
 */
async function warmFixtureCache(predictions: ApiPrediction[]): Promise<void> {
  // Collect leagues present in predictions
  const leagues = new Set<string>();
  for (const p of predictions) {
    const league = inferLeagueFromMatchId(p.matchId);
    if (league) leagues.add(league);
  }
  // Always include all supported leagues so the cache is complete
  ALL_SUPPORTED_LEAGUES.forEach(l => leagues.add(l));

  await Promise.allSettled(
    Array.from(leagues).map(async (league) => {
      try {
        const res = await api.fetchMatches(league, FIXTURE_DAYS_AHEAD);
        res.matches.forEach(m => {
          const kickoffTime = new Date(`${m.date}T${m.time}:00Z`).toISOString();
          const meta: MatchMeta = { homeTeam: m.homeTeam, awayTeam: m.awayTeam, kickoffTime, league };

          // Cache by bare fixture key: EPL-538093
          cacheMatchMeta(`${league}-${m.fixtureId}`, meta);

          // Also try to match against any prediction matchId that starts with this prefix
          // so Format A keys (EPL-538093-TOT-NOT-...) also hit the cache
          for (const p of predictions) {
            if (p.matchId.startsWith(`${league}-${m.fixtureId}-`) && !matchMetaCache.has(p.matchId)) {
              cacheMatchMeta(p.matchId, meta);
            }
          }
        });
      } catch {
        // league not supported or backend down — skip silently
      }
    })
  );
}

// ---------- mapping ----------

function mapOutcome(raw: string | null): PredictionOutcome | undefined {
  if (!raw) return undefined;
  switch (raw) {
    case 'HOME_WIN': return 'home_win';
    case 'AWAY_WIN': return 'away_win';
    case 'DRAW': return 'draw';
    default: return undefined;
  }
}

function apiToFrontend(p: ApiPrediction): Prediction {
  const outcome = mapOutcome(p.prediction);
  const hasValueBet = p.prediction !== null;
  const confidence = Math.round(p.confidence <= 1 ? p.confidence * 100 : p.confidence);
  const league = inferLeagueFromMatchId(p.matchId) ?? 'Unknown';
  const edge = p.edge != null ? Math.round(p.edge * 10) / 10 : 0;

  // Resolve team names using all available sources
  const { homeTeam: resolvedHome, awayTeam: resolvedAway } = extractTeamNames(p);

  // Last resort: parse abbreviations from matchId (avoids "TBD" and date fragments)
  const parts = p.matchId.split('-');
  const homeAbbr = parts.length >= 3 && !/^\d+$/.test(parts[1]) ? parts[1] // Format B: league-HOME-AWAY-date
    : parts.length >= 4 && /^\d+$/.test(parts[1]) ? parts[2] // Format A: league-fixtureId-HOME-AWAY-date
      : null;
  const awayAbbr = parts.length >= 3 && !/^\d+$/.test(parts[1]) ? parts[2]
    : parts.length >= 4 && /^\d+$/.test(parts[1]) ? parts[3]
      : null;

  const homeTeam = resolvedHome ?? homeAbbr ?? 'TBD';
  const awayTeam = resolvedAway ?? awayAbbr ?? 'TBD';

  const meta = matchMetaCache.get(p.matchId);
  const resultStatus = p.resolved ? (p.correct ? 'win' : 'loss') : 'pending';

  // Kickoff time: prefer factors.time combined with factors.date, then cache, then timestamp
  const factorsDate = p.factors?.date as string | undefined;
  const factorsTime = p.factors?.time as string | undefined;
  const kickoffTime = factorsDate && factorsTime
    ? new Date(`${factorsDate}T${factorsTime}:00Z`).toISOString()
    : meta?.kickoffTime ?? new Date(p.timestamp * 1000).toISOString();

  return {
    id: p.predictionId,
    match: {
      id: p.matchId,
      homeTeam,
      awayTeam,
      league: meta?.league ?? league,
      kickoffTime,
    },
    prediction: {
      hasValueBet,
      outcome,
      confidence,
      edge,
      marketOdds: p.marketOdds,
      trueProbabilities: p.trueProbabilities,
    },
    result: p.resolved
      ? { status: resultStatus as 'win' | 'loss' | 'pending', score: p.actualOutcome || undefined }
      : undefined,
    blockchainTx: predictionTxCache.get(p.predictionId),
    recordedAt: new Date(p.timestamp * 1000).toISOString(),
    modelFactors: p.factors
      ? [
        ...(p.factors.formScore != null ? [{ name: 'Form Score', weight: 25, score: Number(p.factors.formScore), reasoning: '' }] : []),
        ...(p.factors.injuryImpact != null ? [{ name: 'Injury Impact', weight: 25, score: Number(p.factors.injuryImpact), reasoning: '' }] : []),
        ...(p.factors.h2hScore != null ? [{ name: 'H2H Score', weight: 25, score: Number(p.factors.h2hScore), reasoning: '' }] : []),
        ...(p.factors.tablePositionScore != null ? [{ name: 'Table Position', weight: 25, score: Number(p.factors.tablePositionScore), reasoning: '' }] : []),
      ]
      : undefined,
  };
}

const emptyStats: AppStats = {
  totalPredictions: 0,
  correctPredictions: 0,
  winRate: 0,
  avgConfidence: 0,
};

// ---------- interfaces ----------

interface AgentStatus {
  online: boolean;
  error?: string;
  agentName?: string;
  version?: string;
  dashboardStats?: {
    totalPredictions: number;
    resolved: number;
    pending: number;
    correct: number;
    incorrect: number;
    accuracy: number;
  };
  leagueBreakdown?: Array<{
    league: string;
    total: number;
    resolved: number;
    correct: number;
    accuracy: number;
  }>;
  lastPrediction?: ApiPrediction | null;
  recentPredictions?: ApiPrediction[];
  blockchain?: {
    enabled: boolean;
    agentWallet: string;
    predictionContract: string;
    chainId: number;
  };
}

interface AppState {
  walletAddress: string | null;
  walletConnected: boolean;
  tokenBalance: number;
  tier: Tier;
  paidTier: Tier;

  upcomingPredictions: Prediction[];
  historicalPredictions: Prediction[];
  stagedUpcoming: Prediction[];
  stagedHistorical: Prediction[];
  hasNewPicks: boolean;
  lastUpdated: Date | null;

  stats: AppStats;
  agentStatus: AgentStatus | null;

  isLoading: boolean;
  error: string | null;
  selectedPrediction: Prediction | null;

  syncWalletState: (data: { address: string; balance: number; tier: Tier }) => void;
  clearWalletState: () => void;
  setSelectedPrediction: (pred: Prediction | null) => void;
  fetchPredictions: () => Promise<void>;
  checkNewPicksBackground: () => Promise<void>;
  applyNewPicks: () => void;
  fetchStats: () => Promise<void>;
  fetchAgentStatus: () => Promise<void>;
  setTokenBalance: (balance: number) => void;
  unlockTier: (tier: Tier) => void;
}

// ---------- store ----------

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      walletConnected: false,
      tokenBalance: 0,
      tier: null,
      paidTier: null,

      upcomingPredictions: [],
      historicalPredictions: [],
      stagedUpcoming: [],
      stagedHistorical: [],
      hasNewPicks: false,
      lastUpdated: null,

      stats: emptyStats,
      agentStatus: null,

      isLoading: false,
      error: null,
      selectedPrediction: null,

      syncWalletState: ({ address, balance, tier }) =>
        set({ walletAddress: address, walletConnected: true, tokenBalance: balance, tier }),

      clearWalletState: () =>
        set({ walletAddress: null, walletConnected: false, tokenBalance: 0, tier: null }),

      setSelectedPrediction: (pred) => set({ selectedPrediction: pred }),

      fetchPredictions: async () => {
        set({ isLoading: true, error: null });
        try {
          const [unresolvedRaw, resolvedRaw] = await Promise.all([
            fetchAllPredictions(false),
            fetchAllPredictions(true),
          ]);

          const allRaw = [...unresolvedRaw, ...resolvedRaw];

          // Warm fixture cache in parallel with mapping
          // Most team names will come from factors — cache is a backup
          await warmFixtureCache(allRaw);

          const upcoming = unresolvedRaw.map(apiToFrontend);
          const historical = resolvedRaw.map(apiToFrontend);

          set({
            upcomingPredictions: upcoming,
            historicalPredictions: historical,
            isLoading: false,
            lastUpdated: new Date(),
            hasNewPicks: false,
            stagedUpcoming: [],
            stagedHistorical: [],
          });
        } catch (err) {
          console.warn('[store] fetchPredictions failed:', err);
          set({ error: 'Failed to fetch predictions from backend', isLoading: false });
        }
      },

      checkNewPicksBackground: async () => {
        try {
          const [unresolvedRaw, resolvedRaw] = await Promise.all([
            fetchAllPredictions(false),
            fetchAllPredictions(true),
          ]);

          await warmFixtureCache([...unresolvedRaw, ...resolvedRaw]);

          const upcoming = unresolvedRaw.map(apiToFrontend);
          const historical = resolvedRaw.map(apiToFrontend);

          const currentUpcomingIds = new Set(get().upcomingPredictions.map(p => p.id));
          const currentHistoricalIds = new Set(get().historicalPredictions.map(p => p.id));

          let hasChanges =
            upcoming.length !== currentUpcomingIds.size ||
            historical.length !== currentHistoricalIds.size;

          if (!hasChanges) {
            for (const p of upcoming) { if (!currentUpcomingIds.has(p.id)) { hasChanges = true; break; } }
          }
          if (!hasChanges) {
            for (const p of historical) { if (!currentHistoricalIds.has(p.id)) { hasChanges = true; break; } }
          }

          if (hasChanges) {
            set({ stagedUpcoming: upcoming, stagedHistorical: historical, hasNewPicks: true });
          } else {
            set({ lastUpdated: new Date() });
          }
        } catch (err) {
          console.warn('[store] background fetch failed:', err);
        }
      },

      applyNewPicks: () => {
        const { stagedUpcoming, stagedHistorical } = get();
        if (stagedUpcoming.length > 0 || stagedHistorical.length > 0) {
          set({
            upcomingPredictions: stagedUpcoming,
            historicalPredictions: stagedHistorical,
            hasNewPicks: false,
            stagedUpcoming: [],
            stagedHistorical: [],
            lastUpdated: new Date(),
          });
        }
      },

      fetchStats: async () => {
        set({ isLoading: true });
        try {
          const [statsRes, resolvedRaw] = await Promise.all([
            api.fetchStats(),
            fetchAllPredictions(true),
          ]);

          const correct = resolvedRaw.filter(p => p.correct === true).length;
          const resolved = resolvedRaw.length;
          const winRate = resolved > 0 ? Math.round((correct / resolved) * 100) : 0;

          set({
            stats: {
              totalPredictions: statsRes?.stats?.totalPredictions ?? resolved,
              correctPredictions: correct,
              winRate,
              avgConfidence: 0,
            },
            isLoading: false,
          });
        } catch {
          try {
            const res = await api.fetchStats();
            const s = res.stats;
            const accuracy = s.accuracy <= 1 ? Math.round(s.accuracy * 100) : Math.round(s.accuracy);
            set({
              stats: {
                totalPredictions: s.totalPredictions,
                correctPredictions: s.correct,
                winRate: accuracy,
                avgConfidence: 0,
              },
              isLoading: false,
            });
          } catch {
            set({ stats: emptyStats, isLoading: false });
          }
        }
      },

      fetchAgentStatus: async () => {
        const [statusOutcome, healthOutcome] = await Promise.allSettled([
          api.fetchAgentStatus(),
          api.fetchHealth(),
        ]);

        const health = healthOutcome.status === 'fulfilled' ? healthOutcome.value : null;
        const blockchain =
          health?.blockchain &&
            (health.blockchain.agent_wallet != null ||
              health.blockchain.prediction_contract != null ||
              health.blockchain.chain_id != null)
            ? {
              enabled: Boolean(health.blockchain.enabled),
              agentWallet: String(health.blockchain.agent_wallet ?? ''),
              predictionContract: String(health.blockchain.prediction_contract ?? ''),
              chainId: Number(health.blockchain.chain_id ?? 0),
            }
            : undefined;

        if (statusOutcome.status !== 'fulfilled') {
          set({ agentStatus: { online: false, blockchain } });
          return;
        }

        const res = statusOutcome.value;
        if (!res.success) {
          set({ agentStatus: { online: false, error: res.error, blockchain } });
          return;
        }

        set({
          agentStatus: {
            online: true,
            agentName: res.agent,
            version: res.version,
            dashboardStats: res.stats,
            leagueBreakdown: res.leagueBreakdown,
            lastPrediction: res.lastPrediction,
            recentPredictions: res.recentPredictions,
            blockchain,
          },
        });
      },

      setTokenBalance: (balance) => set({ tokenBalance: balance }),
      unlockTier: (tier) => set({ paidTier: tier }),
    }),
    {
      name: 'betoracle-storage',
      partialize: (state) => ({ paidTier: state.paidTier }),
    }
  )
);