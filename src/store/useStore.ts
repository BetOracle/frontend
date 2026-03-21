import { create } from 'zustand';
import { Prediction, Tier, AppStats, PredictionOutcome } from '@/types';
import { getTierFromBalance, TIER_REQUIREMENTS } from '@/data/mockData';
import * as api from '@/services/api';

// ---------- helpers ----------

function mapOutcome(raw: string): PredictionOutcome {
  switch (raw) {
    case 'HOME_WIN': return 'home_win';
    case 'AWAY_WIN': return 'away_win';
    case 'DRAW': return 'draw';
    default: return 'home_win';
  }
}

function apiToFrontend(p: api.ApiPrediction): Prediction {
  const outcome = mapOutcome(p.prediction);
  const confidence = Math.round(p.confidence <= 1 ? p.confidence * 100 : p.confidence);
  const parts = p.matchId.split('-');
  const league = parts.length > 1 ? parts[0] : 'Unknown';
  const resultStatus = p.resolved ? (p.correct ? 'win' : 'loss') : 'pending';

  return {
    id: p.predictionId,
    match: {
      id: p.matchId,
      homeTeam: '—',
      awayTeam: '—',
      league,
      kickoffTime: new Date(p.timestamp * 1000).toISOString(),
    },
    prediction: {
      outcome,
      confidence,
      edge: 0,
      marketOdds: undefined,
    },
    result: p.resolved
      ? { status: resultStatus as 'win' | 'loss' | 'pending', score: p.actualOutcome || undefined }
      : undefined,
    blockchainTx: undefined,
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

  upcomingPredictions: Prediction[];
  historicalPredictions: Prediction[];
  stats: AppStats;
  agentStatus: AgentStatus | null;

  isLoading: boolean;
  error: string | null;
  selectedPrediction: Prediction | null;

  syncWalletState: (data: { address: string; balance: number; tier: Tier }) => void;
  clearWalletState: () => void;
  setSelectedPrediction: (pred: Prediction | null) => void;
  fetchPredictions: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAgentStatus: () => Promise<void>;
  setTokenBalance: (balance: number) => void;
}

export const useStore = create<AppState>((set) => ({
  walletAddress: null,
  walletConnected: false,
  tokenBalance: 0,
  tier: null,

  upcomingPredictions: [],
  historicalPredictions: [],
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

      const upcoming =
        unresolvedRes.status === 'fulfilled'
          ? unresolvedRes.value.predictions.map(apiToFrontend)
          : [];
      const historical =
        resolvedRes.status === 'fulfilled'
          ? resolvedRes.value.predictions.map(apiToFrontend)
          : [];

      set({ upcomingPredictions: upcoming, historicalPredictions: historical, isLoading: false });
    } catch (err) {
      console.warn('[store] fetchPredictions failed:', err);
      set({ error: 'Failed to fetch predictions from backend', isLoading: false });
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
          avgConfidence: 0,  // Not provided by API yet
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
    const tier = getTierFromBalance(balance);
    set({ tokenBalance: balance, tier });
  },
}));

export { TIER_REQUIREMENTS, getTierFromBalance };
