// ============================================================
// API Service — typed wrappers for the BetOracle backend
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://web-production-34305.up.railway.app";

// ---------- helpers ----------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ---------- response types ----------

export interface ApiPrediction {
  predictionId: string;
  matchId: string;
  prediction: "HOME_WIN" | "DRAW" | "AWAY_WIN" | null;
  confidence: number;        // 0..1 float
  edge?: number;
  marketOdds?: { home: number; draw: number; away: number };
  trueProbabilities?: { home: number; draw: number; away: number };
  factors?: {
    formScore?: number;
    injuryImpact?: number;
    h2hScore?: number;
    tablePositionScore?: number;
  };
  timestamp: number;
  resolved: boolean;
  actualOutcome: string | null;
  correct: boolean | null;
  resolutionTimestamp: number | null;
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
    accuracy: number;        // 0..1 float or percentage
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

export interface AgentStatusResponse {
  success: boolean;
  service: string;
  blockchain?: {
    enabled: boolean;
    agentWallet: string;
    predictionContract: string;
    chainId: number;
  };
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

// ---------- API functions ----------

export async function healthCheck(): Promise<boolean> {
  try {
    await request<unknown>("/health");
    return true;
  } catch {
    return false;
  }
}

export async function fetchPredictions(params?: {
  page?: number;
  limit?: number;
  league?: string;
  resolved?: boolean;
}): Promise<PredictionsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.league) qs.set("league", params.league);
  if (params?.resolved !== undefined) qs.set("resolved", String(params.resolved));
  const query = qs.toString();
  return request<PredictionsResponse>(`/api/predictions${query ? `?${query}` : ""}`);
}

export async function fetchSinglePrediction(predictionId: string): Promise<{ success: boolean; prediction: ApiPrediction }> {
  return request(`/api/predictions/${encodeURIComponent(predictionId)}`);
}

export async function fetchStats(): Promise<StatsResponse> {
  return request<StatsResponse>("/api/stats");
}

export async function fetchMatches(league: string, daysAhead?: number): Promise<MatchesResponse> {
  const qs = new URLSearchParams({ league });
  if (daysAhead) qs.set("daysAhead", String(daysAhead));
  return request<MatchesResponse>(`/api/matches?${qs.toString()}`);
}

export async function fetchAgentStatus(): Promise<AgentStatusResponse> {
  return request<AgentStatusResponse>("/api/agent/status");
}

export async function createPrediction(data: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  fixtureId: number;
}): Promise<PredictResponse> {
  return request<PredictResponse>("/api/predict", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function autoResolve(max?: number): Promise<unknown> {
  return request("/api/resolve/auto", {
    method: "POST",
    body: JSON.stringify({ max: max ?? 10 }),
  });
}
