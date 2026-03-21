// ============================================================
// Blockchain Service — read-only contract calls via thirdweb
// ============================================================

import { getContract, readContract } from "thirdweb";
import { thirdwebClient, celoChain } from "@/config/thirdweb";
import {
  PREDICTION_CONTRACT_ADDRESS,
  AGENT_WALLET_ADDRESS,
  PREDICTION_ABI,
  AGENT_WALLET_ABI,
} from "@/config/contracts";

// --- contracts ---

const predictionContract = getContract({
  client: thirdwebClient,
  chain: celoChain,
  address: PREDICTION_CONTRACT_ADDRESS,
});

const agentWalletContract = getContract({
  client: thirdwebClient,
  chain: celoChain,
  address: AGENT_WALLET_ADDRESS,
});

// --- public read helpers ---

export async function getOnChainTotalPredictions(): Promise<number> {
  try {
    const result = await readContract({
      contract: predictionContract,
      method: "function totalPredictions() view returns (uint256)",
      params: [],
    });
    return Number(result);
  } catch (err) {
    console.warn("[blockchain] totalPredictions failed:", err);
    return 0;
  }
}

export async function getOnChainCorrectPredictions(): Promise<number> {
  try {
    const result = await readContract({
      contract: predictionContract,
      method: "function correctPredictions() view returns (uint256)",
      params: [],
    });
    return Number(result);
  } catch (err) {
    console.warn("[blockchain] correctPredictions failed:", err);
    return 0;
  }
}

export async function getOnChainAccuracy(): Promise<number> {
  try {
    const result = await readContract({
      contract: predictionContract,
      method: "function getAgentAccuracy() view returns (uint256)",
      params: [],
    });
    return Number(result);
  } catch (err) {
    console.warn("[blockchain] getAgentAccuracy failed:", err);
    return 0;
  }
}

export async function getOnChainTotalStaked(): Promise<bigint> {
  try {
    const result = await readContract({
      contract: predictionContract,
      method: "function totalStaked() view returns (uint256)",
      params: [],
    });
    return result;
  } catch (err) {
    console.warn("[blockchain] totalStaked failed:", err);
    return 0n;
  }
}

export interface AgentProfile {
  agentId: string;
  name: string;
  metadataURI: string;
  createdAt: number;
  active: boolean;
}

export async function getAgentProfile(): Promise<AgentProfile | null> {
  try {
    const result = await readContract({
      contract: agentWalletContract,
      method: "function getProfile() view returns ((bytes32 agentId, string name, string metadataURI, uint256 createdAt, bool active))",
      params: [],
    });
    return {
      agentId: result.agentId as string,
      name: result.name,
      metadataURI: result.metadataURI,
      createdAt: Number(result.createdAt),
      active: result.active,
    };
  } catch (err) {
    console.warn("[blockchain] getProfile failed:", err);
    return null;
  }
}

export interface AgentReputation {
  totalPredictions: number;
  correctPredictions: number;
  totalStaked: bigint;
  reputationScore: number;
  lastUpdated: number;
}

export async function getAgentReputation(): Promise<AgentReputation | null> {
  try {
    const result = await readContract({
      contract: agentWalletContract,
      method: "function getReputation() view returns ((uint256 totalPredictions, uint256 correctPredictions, uint256 totalStaked, uint256 reputationScore, uint256 lastUpdated))",
      params: [],
    });
    return {
      totalPredictions: Number(result.totalPredictions),
      correctPredictions: Number(result.correctPredictions),
      totalStaked: result.totalStaked,
      reputationScore: Number(result.reputationScore),
      lastUpdated: Number(result.lastUpdated),
    };
  } catch (err) {
    console.warn("[blockchain] getReputation failed:", err);
    return null;
  }
}
