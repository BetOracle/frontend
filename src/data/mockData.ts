// ============================================================
// Constants and utilities — no mock prediction data
// ============================================================

import { Tier } from '@/types';

export const ORACLE_CONTRACT_ADDRESS = '0xd5049F6550aefC772ABDa57013fB01aB718054Ef';
export const CELOSCAN_URL = 'https://celoscan.io';

export const TIER_REQUIREMENTS = {
  bronze: 1_000_000,
  silver: 10_000_000,
  gold: 100_000_000,
};

export function getTierFromBalance(balance: number): Tier {
  if (balance >= TIER_REQUIREMENTS.gold) return 'gold';
  if (balance >= TIER_REQUIREMENTS.silver) return 'silver';
  if (balance >= TIER_REQUIREMENTS.bronze) return 'bronze';
  return null;
}
