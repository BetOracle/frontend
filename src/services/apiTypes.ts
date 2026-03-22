// Shared request/response types for FootyOracle HTTP API

export type OutcomeCode = "HOME_WIN" | "DRAW" | "AWAY_WIN";

export interface ApiPrediction {
  predictionId: string;
  matchId: string;
  prediction: OutcomeCode | null;
  confidence: number;
  edge?: number;
  marketOdds?: { home: number; draw: number; away: number };
  trueProbabilities?: { home: number; draw: number; away: number };
  factors?: Record<string, unknown>;
  timestamp: number;
  resolved: boolean;
  actualOutcome: string | null;
  correct: boolean | null;
  resolutionTimestamp: number | null;
  homeTeam?: string;
  awayTeam?: string;
}

export interface PredictionsResponse {
  success: boolean;
  page: number;
  limit: number;
  count: number;
  total: number;
  predictions: ApiPrediction[];
}

export interface StatsResponse {
  success: boolean;
  stats: {
    totalPredictions: number;
    resolved: number;
    pending: number;
    correct: number;
    incorrect: number;
    accuracy: number;
  };
}

export interface ApiMatch {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
}

export interface MatchesResponse {
  success: boolean;
  league: string;
  matches: ApiMatch[];
}

/** GET /api/agent/status — matches backend/app.py get_agent_status */
export interface AgentStatusResponse {
  success: boolean;
  agent?: string;
  version?: string;
  stats?: {
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
  error?: string;
}

/** GET /health — FootyOracle backend */
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  blockchain: {
    enabled?: boolean;
    connected?: boolean;
    chain_id?: number | null;
    account?: string | null;
    agent_wallet?: string;
    prediction_contract?: string;
    agent_id?: string;
  };
}

/** GET /api/stats/league/:league */
export interface LeagueStatsResponse {
  success: boolean;
  league: string;
  stats: {
    totalPredictions: number;
    resolved: number;
    pending: number;
    correct: number;
    incorrect: number;
    accuracy: number;
  };
}

/** POST /api/admin/purge-predictions */
export interface PurgePredictionsResponse {
  success: boolean;
  dryRun: boolean;
  deleteUnresolved?: boolean;
  deleteTest?: boolean;
  wouldDelete?: number;
  deleted?: number;
  sample?: ApiPrediction[];
}

/** POST /api/admin/migrate-match-ids */
export interface MigrateMatchIdsResponse {
  success: boolean;
  dryRun: boolean;
  daysAhead: number;
  max: number;
  foundLegacy: number;
  updated: Array<{
    predictionId: string;
    from: string;
    to: string;
    dryRun: boolean;
  }>;
  skipped: Array<{ predictionId: string; matchId: string; reason: string }>;
  errors: Array<{ predictionId: string | null; matchId: string | null; error: string }>;
}

/** GET /api/resolve/schedule */
export interface ResolutionScheduleResponse {
  success: boolean;
  schedule: Record<string, string[]>;
  has_matches_today: boolean;
  today: string;
  days_ahead: number;
}

/** POST /api/resolve/override */
export interface OverrideResolutionResponse {
  success: boolean;
  message?: string;
  matchId: string;
  predictionId?: string;
  actualOutcome: string;
  predictedOutcome?: string;
  correct: boolean;
  overridden?: boolean;
}

export interface PredictResponse {
  success: boolean;
  predictionId?: string;
  matchId?: string;
  league?: string;
  prediction?: string;
  confidence?: number;
  edge?: number;
  marketOdds?: { home: number; draw: number; away: number };
  trueProbabilities?: { home: number; draw: number; away: number };
  factors?: Record<string, number>;
  timestamp?: number;
  blockchain?: {
    submitted: boolean;
    txHash: string | null;
    onChainId: string | null;
    error: string | null;
  };
  code?: string;
  message?: string;
}

export interface AutoResolveResponse {
  success: boolean;
  message?: string;
  resolved: number;
  processed: number;
  remaining: number;
  results: unknown[];
  errors: unknown[];
  cost_saved?: boolean;
}

export interface ResolvePredictionResponse {
  success: boolean;
  matchId: string;
  predictionId?: string;
  actualOutcome: string;
  predictedOutcome?: string;
  correct: boolean;
}

/** GET / may return a map of routes; shape varies by deployment */
export type ApiRootResponse = Record<string, unknown>;
