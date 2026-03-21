export type Tier = 'bronze' | 'silver' | 'gold' | null;

export type PredictionOutcome = 'home_win' | 'draw' | 'away_win';

export type ResultStatus = 'win' | 'loss' | 'pending';

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  leagueIcon?: string;
  kickoffTime: string;
  venue?: string;
}

export interface PredictionData {
  outcome: PredictionOutcome;
  confidence: number;
  edge: number;
  marketOdds?: {
    home: number;
    draw: number;
    away: number;
  };
}

export interface ModelFactor {
  name: string;
  weight: number;
  score: number;
  reasoning: string;
}

export interface Result {
  status: ResultStatus;
  score?: string;
  homeGoals?: number;
  awayGoals?: number;
}

export interface Prediction {
  id: string;
  match: Match;
  prediction: PredictionData;
  result?: Result;
  blockchainTx?: string;
  recordedAt?: string;
  modelFactors?: ModelFactor[];
  isEarlyAccess?: boolean;
}

export interface LeagueStat {
  league: string;
  winRate: number;
  total: number;
  wins: number;
}

export interface AppStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  avgConfidence: number;
}

export interface WalletState {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  tokenBalance: number;
  tier: Tier;
}

export interface NotificationPreferences {
  email: boolean;
  emailAddress: string;
  discord: boolean;
  browserPush: boolean;
  sms: boolean;
}

export interface LeaguePreferences {
  premierLeague: boolean;
  laLiga: boolean;
  serieA: boolean;
  bundesliga: boolean;
  ligue1: boolean;
}

export interface DisplayPreferences {
  confidenceDisplay: 'percentage' | 'bar' | 'stars';
  oddsFormat: 'decimal' | 'fractional' | 'american';
}
