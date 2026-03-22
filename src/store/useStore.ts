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

function inferLeagueFromMatchId(matchId: string): string | null {
  const idx = matchId.indexOf('-');
  if (idx <= 0) return null;
  return matchId.slice(0, idx);
}

/**
 * Parse matchId into its components.
 *
 * FORMAT A (new — has numeric fixtureId):
 *   EPL-538093-TOT-NOT-2026-03-22
 *   → { format:'A', fixtureId:'538093', homeAbbr:'TOT', awayAbbr:'NOT' }
 *
 * FORMAT B (old — no fixtureId):
 *   EPL-BRI-LIV-2026-03-21
 *   SerieA-COM-PIS-2026-03-22
 *   → { format:'B', homeAbbr:'BRI', awayAbbr:'LIV' }
 *
 * FORMAT C (bare fixture id):
 *   EPL-538093
 *   → { format:'C', fixtureId:'538093' }
 */
type ParsedMatchId =
  | { format: 'A'; fixtureId: string; homeAbbr: string; awayAbbr: string }
  | { format: 'B'; homeAbbr: string; awayAbbr: string }
  | { format: 'C'; fixtureId: string }
  | { format: 'unknown' };

function parseMatchId(matchId: string): ParsedMatchId {
  const parts = matchId.split('-');
  // parts[0] = league

  // FORMAT A: league-fixtureId(numeric)-homeAbbr-awayAbbr-YYYY-MM-DD  (7 parts)
  if (parts.length >= 7 && /^\d+$/.test(parts[1])) {
    return { format: 'A', fixtureId: parts[1], homeAbbr: parts[2].toUpperCase(), awayAbbr: parts[3].toUpperCase() };
  }

  // FORMAT B: league-homeAbbr-awayAbbr-YYYY-MM-DD  (6 parts, parts[3] is year)
  if (parts.length >= 6 && /^\d{4}$/.test(parts[3])) {
    return { format: 'B', homeAbbr: parts[1].toUpperCase(), awayAbbr: parts[2].toUpperCase() };
  }

  // FORMAT C: league-fixtureId  (2 parts)
  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    return { format: 'C', fixtureId: parts[1] };
  }

  return { format: 'unknown' };
}

/**
 * Generate every abbreviation variant we might try matching against a team name.
 *
 * The backend uses API-Football's short names to generate abbreviations.
 * We don't know the exact algorithm, so we try multiple strategies:
 *   1. First N chars of full name (uppercased)           NAN → "Nantes"
 *   2. First N chars of each word (initials style)       PSG → "Paris Saint-Germain"
 *   3. First N chars of last word                        LIV → "Liverpool" (also catches short names)
 *   4. Consonants / common nickname patterns             ATA → "Atalanta"
 *
 * Returns true if ANY strategy matches the given abbreviation.
 */
function teamMatchesAbbr(fullName: string, abbr: string): boolean {
  const a = abbr.toUpperCase();
  const len = a.length; // usually 3, sometimes 2-4
  const n = fullName.toUpperCase();

  // Strategy 1: first N chars of full name
  if (n.slice(0, len) === a) return true;

  // Strategy 2: first char of each word (up to len words)
  const words = fullName.replace(/[^a-zA-Z ]/g, ' ').split(/\s+/).filter(Boolean);
  const initials = words.map(w => w[0].toUpperCase()).join('');
  if (initials.startsWith(a) || initials === a) return true;

  // Strategy 3: first N chars of the last word
  const lastName = words[words.length - 1]?.toUpperCase() ?? '';
  if (lastName.slice(0, len) === a) return true;

  // Strategy 4: first N chars of each word concatenated
  const wordConcat = words.map(w => w.toUpperCase()).join('');
  if (wordConcat.slice(0, len) === a) return true;

  // Strategy 5: check if abbr appears as a substring in any single word
  // (catches e.g. "ATA" in "ATAlanta", "HEL" in "HELlas")
  for (const word of words) {
    if (word.toUpperCase().startsWith(a)) return true;
  }

  // Strategy 6: remove common suffixes (FC, CF, SC, AC, AS, SS, SSD, 1., etc)
  //             and retry strategy 1 on the cleaned name
  const cleaned = fullName
    .replace(/\b(FC|CF|SC|AC|AS|SS|SSD|SPA|SAD|1\.|BV|VfL|VfB|TSG|RB|FSV|SV|FK|SK|NK)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (cleaned.slice(0, len) === a) return true;

  const cleanedWords = cleaned.split(/\s+/).filter(Boolean);
  const cleanedInitials = cleanedWords.map(w => w[0]).join('');
  if (cleanedInitials.startsWith(a) || cleanedInitials === a) return true;

  return false;
}

/**
 * Fetch ALL pages of predictions for a given resolved state.
 */
async function fetchAllPredictions(resolved: boolean): Promise<api.ApiPrediction[]> {
  const all: api.ApiPrediction[] = [];
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
 * Build a comprehensive team lookup from all fixture data.
 *
 * Returns:
 *   fixtureIdMap:   fixtureId  → MatchMeta
 *   leagueTeams:    league     → array of { homeTeam, awayTeam, kickoffTime, meta }
 *
 * leagueTeams is used for abbr-based matching (Format B).
 */
async function buildFixtureLookups(): Promise<{
  fixtureIdMap: Map<string, MatchMeta>;
  leagueTeams: Map<string, Array<{ homeTeam: string; awayTeam: string; kickoffTime: string; league: string }>>;
}> {
  const fixtureIdMap = new Map<string, MatchMeta>();
  const leagueTeams = new Map<string, Array<{ homeTeam: string; awayTeam: string; kickoffTime: string; league: string }>>();

  await Promise.allSettled(
    ALL_SUPPORTED_LEAGUES.map(async (league) => {
      try {
        const res = await api.fetchMatches(league, 60);
        const teams: Array<{ homeTeam: string; awayTeam: string; kickoffTime: string; league: string }> = [];

        res.matches.forEach((m) => {
          const kickoffTime = new Date(`${m.date}T${m.time}:00Z`).toISOString();
          const meta: MatchMeta = { homeTeam: m.homeTeam, awayTeam: m.awayTeam, kickoffTime, league };
          fixtureIdMap.set(String(m.fixtureId), meta);
          teams.push({ homeTeam: m.homeTeam, awayTeam: m.awayTeam, kickoffTime, league });
        });

        leagueTeams.set(league, teams);
      } catch {
        leagueTeams.set(league, []);
      }
    })
  );

  return { fixtureIdMap, leagueTeams };
}

/**
 * Try to find a fixture match for a Format B prediction using abbr matching.
 * We try every fixture in the league and check if both team abbrs match.
 */
function findByAbbrPair(
  homeAbbr: string,
  awayAbbr: string,
  league: string,
  leagueTeams: Map<string, Array<{ homeTeam: string; awayTeam: string; kickoffTime: string; league: string }>>
): MatchMeta | null {
  const fixtures = leagueTeams.get(league) ?? [];

  for (const f of fixtures) {
    if (teamMatchesAbbr(f.homeTeam, homeAbbr) && teamMatchesAbbr(f.awayTeam, awayAbbr)) {
      return { homeTeam: f.homeTeam, awayTeam: f.awayTeam, kickoffTime: f.kickoffTime, league };
    }
  }
  return null;
}

/**
 * Enrich predictions with full homeTeam / awayTeam names.
 *
 * Pipeline:
 *   1. Backend already has names → use directly
 *   2. Format A/C → look up by fixtureId in fixture map
 *   3. Format B   → match abbr pair against all fixtures in the league
 *   4. Anything still missing → use the raw abbr (never show date fragments or TBD)
 *
 * Note: fetchSinglePrediction is NOT used — confirmed from console logs that
 * the backend returns { homeTeam: undefined, awayTeam: undefined } for all
 * stored predictions. Team names are only available from the fixtures endpoint.
 */
async function enrichPredictions(
  predictions: api.ApiPrediction[],
  fixtureIdMap: Map<string, MatchMeta>,
  leagueTeams: Map<string, Array<{ homeTeam: string; awayTeam: string; kickoffTime: string; league: string }>>
): Promise<api.ApiPrediction[]> {
  const enriched: api.ApiPrediction[] = [];

  for (const p of predictions) {
    // Stage 1: backend already has names
    if (p.homeTeam && p.awayTeam) {
      enriched.push(p);
      const league = inferLeagueFromMatchId(p.matchId) ?? 'Unknown';
      cacheMatchMeta(p.matchId, {
        homeTeam: p.homeTeam, awayTeam: p.awayTeam,
        kickoffTime: new Date(p.timestamp * 1000).toISOString(), league,
      });
      continue;
    }

    const parsed = parseMatchId(p.matchId);
    const league = inferLeagueFromMatchId(p.matchId) ?? 'Unknown';

    // Stage 2: Format A or C — lookup by fixtureId
    if ((parsed.format === 'A' || parsed.format === 'C')) {
      const meta = fixtureIdMap.get(parsed.fixtureId);
      if (meta) {
        enriched.push({ ...p, homeTeam: meta.homeTeam, awayTeam: meta.awayTeam });
        cacheMatchMeta(p.matchId, meta);
        continue;
      }
    }

    // Stage 3: Format A or B — match by abbr pair across all fixtures in league
    if (parsed.format === 'A' || parsed.format === 'B') {
      const { homeAbbr, awayAbbr } = parsed as { homeAbbr: string; awayAbbr: string };
      const meta = findByAbbrPair(homeAbbr, awayAbbr, league, leagueTeams);
      if (meta) {
        enriched.push({ ...p, homeTeam: meta.homeTeam, awayTeam: meta.awayTeam });
        cacheMatchMeta(p.matchId, meta);
        continue;
      }

      // Stage 4: abbr match failed — use the raw abbreviations (correct and readable,
      // just not full names). NEVER fall back to date fragments like "2026".
      console.warn(`[enrichPredictions] abbr match failed for ${p.matchId} (${homeAbbr} vs ${awayAbbr}) — using abbrs`);
      enriched.push({ ...p, homeTeam: homeAbbr, awayTeam: awayAbbr });
      continue;
    }

    // Stage 4: Format C fixtureId not in upcoming + Format unknown
    // Use whatever we have — raw abbrs if available, otherwise TBD
    enriched.push(p);
  }

  return enriched;
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

function apiToFrontend(p: api.ApiPrediction): Prediction {
  const outcome = mapOutcome(p.prediction);
  const hasValueBet = p.prediction !== null;
  const confidence = Math.round(p.confidence <= 1 ? p.confidence * 100 : p.confidence);
  const league = inferLeagueFromMatchId(p.matchId) ?? 'Unknown';
  const meta = matchMetaCache.get(p.matchId);

  const homeTeam = p.homeTeam ?? meta?.homeTeam ?? 'TBD';
  const awayTeam = p.awayTeam ?? meta?.awayTeam ?? 'TBD';

  const resultStatus = p.resolved ? (p.correct ? 'win' : 'loss') : 'pending';
  const edge = p.edge != null ? Math.round(p.edge * 10) / 10 : 0;

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
          // Fetch all pages + build fixture lookups in parallel
          const [unresolvedRaw, resolvedRaw, lookups] = await Promise.all([
            fetchAllPredictions(false),
            fetchAllPredictions(true),
            buildFixtureLookups(),
          ]);

          const { fixtureIdMap, leagueTeams } = lookups;

          console.log(`[store] fetched ${unresolvedRaw.length} unresolved, ${resolvedRaw.length} resolved`);
          console.log('[store] fixtureIdMap size:', fixtureIdMap.size);
          console.log('[store] sample matchIds:', [...unresolvedRaw, ...resolvedRaw].slice(0, 8).map(p => p.matchId));

          const [enrichedUnresolved, enrichedResolved] = await Promise.all([
            enrichPredictions(unresolvedRaw, fixtureIdMap, leagueTeams),
            enrichPredictions(resolvedRaw, fixtureIdMap, leagueTeams),
          ]);

          const upcoming = enrichedUnresolved.map(apiToFrontend);
          const historical = enrichedResolved.map(apiToFrontend);

          console.log('[store] upcoming team names:', upcoming.slice(0, 8).map(p => `${p.match.homeTeam} vs ${p.match.awayTeam}`));
          console.log('[store] historical team names:', historical.map(p => `${p.match.homeTeam} vs ${p.match.awayTeam}`));

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
          const [unresolvedRaw, resolvedRaw, lookups] = await Promise.all([
            fetchAllPredictions(false),
            fetchAllPredictions(true),
            buildFixtureLookups(),
          ]);

          const { fixtureIdMap, leagueTeams } = lookups;

          const [enrichedUnresolved, enrichedResolved] = await Promise.all([
            enrichPredictions(unresolvedRaw, fixtureIdMap, leagueTeams),
            enrichPredictions(resolvedRaw, fixtureIdMap, leagueTeams),
          ]);

          const upcoming = enrichedUnresolved.map(apiToFrontend);
          const historical = enrichedResolved.map(apiToFrontend);

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
            console.warn('[store] fetchStats failed completely');
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