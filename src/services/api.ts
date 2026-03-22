// ============================================================
// API Service — typed wrappers for the FootyOracle / BetOracle backend
// ============================================================

import type {
  AgentStatusResponse,
  ApiMatch,
  ApiPrediction,
  ApiRootResponse,
  AutoResolveResponse,
  HealthResponse,
  LeagueStatsResponse,
  MatchesResponse,
  MigrateMatchIdsResponse,
  OutcomeCode,
  OverrideResolutionResponse,
  PredictionsResponse,
  PredictResponse,
  PurgePredictionsResponse,
  ResolutionScheduleResponse,
  ResolvePredictionResponse,
  StatsResponse,
} from "./apiTypes";

export type {
  AgentStatusResponse,
  ApiMatch,
  ApiPrediction,
  ApiRootResponse,
  AutoResolveResponse,
  HealthResponse,
  LeagueStatsResponse,
  MatchesResponse,
  MigrateMatchIdsResponse,
  OutcomeCode,
  OverrideResolutionResponse,
  PredictionsResponse,
  PredictResponse,
  PurgePredictionsResponse,
  ResolutionScheduleResponse,
  ResolvePredictionResponse,
  StatsResponse,
} from "./apiTypes";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://web-production-34305.up.railway.app";

const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

// General requests (health, matches, predictions list, stats etc.) — 30s is plenty
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 30_000);

// POST /api/predict: Railway hard-drops connections at ~30s but the backend
// keeps running. We fire-and-forget this request from the UI and poll for the
// result separately, so we just need enough time to catch a fast response.
// 28s gives a 2s buffer before Railway's cutoff.
const PREDICT_TIMEOUT_MS = 28_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const res = await fetch(url, {
    ...init,
    // Callers can supply their own signal (predict endpoints do this).
    // If they do, we use theirs and the local timeout above just gets
    // cleared harmlessly via finally.
    signal: init?.signal ?? controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}`, "x-api-key": API_KEY } : {}),
      ...(init?.headers ?? {}),
    },
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return undefined as T;
}

/** GET /health — boolean convenience */
export async function healthCheck(): Promise<boolean> {
  try {
    const url = `${API_BASE_URL}/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: API_KEY ? { Authorization: `Bearer ${API_KEY}`, "x-api-key": API_KEY } : undefined,
    }).finally(() => clearTimeout(timeout));
    return res.ok;
  } catch {
    return false;
  }
}

/** GET /health — full JSON */
export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

/** GET / */
export async function fetchApiRoot(): Promise<ApiRootResponse> {
  return request<ApiRootResponse>("/");
}

/** GET /api/matches?league=&daysAhead= */
export async function fetchMatches(league: string, daysAhead?: number): Promise<MatchesResponse> {
  const qs = new URLSearchParams({ league });
  if (daysAhead != null) qs.set("daysAhead", String(daysAhead));
  return request<MatchesResponse>(`/api/matches?${qs.toString()}`);
}

/** GET /api/predictions */
export async function fetchPredictions(params?: {
  page?: number;
  limit?: number;
  league?: string;
  resolved?: boolean;
}): Promise<PredictionsResponse> {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.league) qs.set("league", params.league);
  if (params?.resolved !== undefined) qs.set("resolved", String(params.resolved));
  const query = qs.toString();
  return request<PredictionsResponse>(`/api/predictions${query ? `?${query}` : ""}`);
}

/** GET /api/predictions/:predictionId */
export async function fetchSinglePrediction(
  predictionId: string,
): Promise<{ success: boolean; prediction: ApiPrediction }> {
  return request(`/api/predictions/${encodeURIComponent(predictionId)}`);
}

/**
 * POST /api/predict — frontend-triggered.
 *
 * Uses a dedicated 28s abort controller so the global REQUEST_TIMEOUT_MS
 * (used by polling fetches) is not involved here.
 */
export async function createPrediction(data: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  fixtureId?: number;
  date?: string;
  marketOdds?: { home: number; draw: number; away: number };
}): Promise<PredictResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREDICT_TIMEOUT_MS);
  try {
    return await request<PredictResponse>("/api/predict", {
      method: "POST",
      body: JSON.stringify(data),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        "The prediction engine took too long to respond (>28s). " +
        "The AI analysis may still be running — check the picks feed in a moment."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST /api/predict — agent / precomputed.
 * Same 28s abort treatment as createPrediction.
 */
export async function createPrecomputedPrediction(data: {
  matchId: string;
  prediction: OutcomeCode;
  confidence: number;
  factors?: Record<string, unknown>;
  timestamp?: number;
  league?: string;
  edge?: number;
  marketOdds?: { home: number; draw: number; away: number };
  trueProbabilities?: { home: number; draw: number; away: number };
  homeTeam?: string;
  awayTeam?: string;
  date?: string;
}): Promise<PredictResponse> {
  const payload = {
    ...data,
    factors: data.factors ?? {},
    timestamp: data.timestamp ?? Math.floor(Date.now() / 1000),
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREDICT_TIMEOUT_MS);
  try {
    return await request<PredictResponse>("/api/predict", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        "The prediction engine took too long to respond (>28s). " +
        "The AI analysis may still be running — check the picks feed in a moment."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** POST /api/resolve/auto */
export async function autoResolve(options?: {
  max?: number;
  timeBudgetSeconds?: number;
  force?: boolean;
}): Promise<AutoResolveResponse> {
  const body: Record<string, number | boolean> = {};
  if (options?.max != null) body.max = options.max;
  if (options?.timeBudgetSeconds != null) body.timeBudgetSeconds = options.timeBudgetSeconds;
  if (options?.force === true) body.force = true;
  return request<AutoResolveResponse>("/api/resolve/auto", {
    method: "POST",
    body: JSON.stringify(Object.keys(body).length ? body : { max: 10 }),
  });
}

/** GET /api/stats */
export async function fetchStats(): Promise<StatsResponse> {
  return request<StatsResponse>("/api/stats");
}

/** GET /api/stats/league/:league */
export async function fetchLeagueStats(league: string): Promise<LeagueStatsResponse> {
  return request<LeagueStatsResponse>(`/api/stats/league/${encodeURIComponent(league)}`);
}

/** POST /api/resolve */
export async function resolvePrediction(data: {
  matchId: string;
  actualOutcome: OutcomeCode;
}): Promise<ResolvePredictionResponse> {
  return request<ResolvePredictionResponse>("/api/resolve", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** GET /api/agent/status */
export async function fetchAgentStatus(): Promise<AgentStatusResponse> {
  return request<AgentStatusResponse>("/api/agent/status");
}

/** GET /api/resolve/schedule */
export async function fetchResolutionSchedule(days?: number): Promise<ResolutionScheduleResponse> {
  const qs = days != null ? `?days=${encodeURIComponent(String(days))}` : "";
  return request<ResolutionScheduleResponse>(`/api/resolve/schedule${qs}`);
}

/** POST /api/resolve/override */
export async function overrideResolution(data: {
  matchId: string;
  actualOutcome: OutcomeCode;
  force?: boolean;
}): Promise<OverrideResolutionResponse> {
  return request<OverrideResolutionResponse>("/api/resolve/override", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** POST /api/admin/purge-predictions */
export async function purgePredictions(body?: {
  dryRun?: boolean;
  deleteUnresolved?: boolean;
  deleteTest?: boolean;
  sample?: number;
}): Promise<PurgePredictionsResponse> {
  return request<PurgePredictionsResponse>("/api/admin/purge-predictions", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

/** POST /api/admin/migrate-match-ids */
export async function migrateMatchIds(body?: {
  dryRun?: boolean;
  daysAhead?: number;
  max?: number;
}): Promise<MigrateMatchIdsResponse> {
  return request<MigrateMatchIdsResponse>("/api/admin/migrate-match-ids", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}