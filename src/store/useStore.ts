import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Prediction, Tier, AppStats, PredictionOutcome } from '@/types';
import * as api from '@/services/api';

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

function inferLeagueFromMatchId(matchId: string): string | null {
  const idx = matchId.indexOf('-');
  if (idx <= 0) return null;
  return matchId.slice(0, idx);
}

async function warmMatchMetaForPredictions(predictions: api.ApiPrediction[]) {
  const leagues = new Set<string>();
  for (const p of predictions) {
    const league = inferLeagueFromMatchId(p.matchId);
    if (league) leagues.add(league);

  }

  await Promise.allSettled(
    Array.from(leagues).map(async (league) => {
      const res = await api.fetchMatches(league);
      res.matches.forEach((m) => {
        const matchId = `${league}-${m.fixtureId}`;
        const kickoffTime = new Date(`${m.date}T${m.time}:00Z`).toISOString();
        cacheMatchMeta(matchId, {
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          kickoffTime,
          league,
        });
      });
    })
  );
}

// ---------- helpers ----------

function mapOutcome(raw: string | null): PredictionOutcome | undefined {
  if (!raw) return undefined;
  switch (raw) {
    case 'HOME_WIN': return 'home_win';
    case 'AWAY_WIN': return 'away_win';
    case 'DRAW': return 'draw';
    default: return undefined;
  }
}

function apiToFrontend(p: api.ApiPrediction): Prediction {
  const outcome = mapOutcome(p.prediction);
  const hasValueBet = p.prediction !== null;
  const confidence = Math.round(p.confidence <= 1 ? p.confidence * 100 : p.confidence);
  const parts = p.matchId.split('-');
  const league = parts.length > 1 ? parts[0] : 'Unknown';

  const meta = matchMetaCache.get(p.matchId);

  let homeTeam = '—';
  let awayTeam = '—';
  if (parts.length >= 3) {
    homeTeam = parts[1];
    awayTeam = parts[2];
  } else if (parts.length === 2) {
    homeTeam = meta?.homeTeam ?? 'TBD';
    awayTeam = meta?.awayTeam ?? 'TBD';
  }

  const resultStatus = p.resolved ? (p.correct ? 'win' : 'loss') : 'pending';

  return {
    id: p.predictionId,
    match: {
      id: p.matchId,
      homeTeam,
      awayTeam,
      league: meta?.league ?? league,
      kickoffTime: meta?.kickoffTime ?? new Date(p.timestamp * 1000).toISOString(),
    },
    prediction: {
      hasValueBet,
      outcome,
      confidence,
      edge: p.edge ? Math.round(p.edge * 10) / 10 : 0,
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
        ...(p.factors.formScore != null ? [{ name: 'Form Score', weight: 25, score: p.factors.formScore, reasoning: '' }] : []),
        ...(p.factors.injuryImpact != null ? [{ name: 'Injury Impact', weight: 25, score: p.factors.injuryImpact, reasoning: '' }] : []),
        ...(p.factors.h2hScore != null ? [{ name: 'H2H Score', weight: 25, score: p.factors.h2hScore, reasoning: '' }] : []),
        ...(p.factors.tablePositionScore != null ? [{ name: 'Table Position', weight: 25, score: p.factors.tablePositionScore, reasoning: '' }] : []),
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

// ---------- state ----------

interface AgentStatus {
  online: boolean;
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
  paidTier: Tier; // Manual upgrade tier stored locally

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
          const [unresolvedRes, resolvedRes] = await Promise.allSettled([
            api.fetchPredictions({ resolved: false, limit: 50 }),
            api.fetchPredictions({ resolved: true, limit: 50 }),
          ]);

          const unresolvedRaw = unresolvedRes.status === 'fulfilled' ? unresolvedRes.value.predictions : [];
          const resolvedRaw = resolvedRes.status === 'fulfilled' ? resolvedRes.value.predictions : [];
          await warmMatchMetaForPredictions([...unresolvedRaw, ...resolvedRaw]);

          const upcoming = (unresolvedRes.status === 'fulfilled' ? unresolvedRaw : [])
            .map(apiToFrontend)
            .filter(p => p.match.homeTeam !== 'TBD' && p.match.awayTeam !== 'TBD');

          const historical = (resolvedRes.status === 'fulfilled' ? resolvedRaw : [])
            .map(apiToFrontend)
            .filter(p => p.match.homeTeam !== 'TBD' && p.match.awayTeam !== 'TBD');


          set({
            upcomingPredictions: upcoming,
            historicalPredictions: historical,
            isLoading: false,
            lastUpdated: new Date(),
            hasNewPicks: false,
            stagedUpcoming: [],
            stagedHistorical: []
          });
        } catch (err) {
          console.warn('[store] fetchPredictions failed:', err);
          set({ error: 'Failed to fetch predictions from backend', isLoading: false });
        }
      },

      checkNewPicksBackground: async () => {
        try {
          const [unresolvedRes, resolvedRes] = await Promise.allSettled([
            api.fetchPredictions({ resolved: false, limit: 50 }),
            api.fetchPredictions({ resolved: true, limit: 50 }),
          ]);

          if (unresolvedRes.status === 'fulfilled' && resolvedRes.status === 'fulfilled') {
            await warmMatchMetaForPredictions([...unresolvedRes.value.predictions, ...resolvedRes.value.predictions]);

            const upcoming = unresolvedRes.value.predictions.map(apiToFrontend).filter(p => p.match.homeTeam !== 'TBD' && p.match.awayTeam !== 'TBD');
            const historical = resolvedRes.value.predictions.map(apiToFrontend).filter(p => p.match.homeTeam !== 'TBD' && p.match.awayTeam !== 'TBD');


            // Check if there's any diff in IDs between current arrays and fetched arrays
            const currentUpcomingIds = new Set(get().upcomingPredictions.map(p => p.id));
            const currentHistoricalIds = new Set(get().historicalPredictions.map(p => p.id));

            let hasChanges = false;
            if (upcoming.length !== currentUpcomingIds.size || historical.length !== currentHistoricalIds.size) {
              hasChanges = true;
            } else {
              for (const p of upcoming) if (!currentUpcomingIds.has(p.id)) hasChanges = true;
              for (const p of historical) if (!currentHistoricalIds.has(p.id)) hasChanges = true;
            }

            if (hasChanges) {
              set({
                stagedUpcoming: upcoming,
                stagedHistorical: historical,
                hasNewPicks: true
              });
            } else {
              // Even if no new picks, we successfully checked
              set({ lastUpdated: new Date() });
            }
          }
        } catch (err) {
          console.warn('[store] silent fetch background failed:', err);
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
            lastUpdated: new Date()
          });
        }
      },

      fetchStats: async () => {
        set({ isLoading: true });
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
          console.warn('[store] fetchStats failed');
          set({ stats: emptyStats, isLoading: false });
        }
      },

      fetchAgentStatus: async () => {
        try {
          const res = await api.fetchAgentStatus();
          set({ agentStatus: { online: res.success, blockchain: res.blockchain } });
        } catch {
          set({ agentStatus: { online: false } });
        }
      },

      setTokenBalance: (balance) => {
        set({ tokenBalance: balance });
      },

      unlockTier: (tier) => {
        set({ paidTier: tier });
      },
    }),
    {
      name: 'betoracle-storage',
      partialize: (state) => ({ paidTier: state.paidTier }),
    }
  )
);
