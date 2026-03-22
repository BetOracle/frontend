// ============================================================
// Blockchain Service — read-only contract calls via viem
// ============================================================

import {
  PREDICTION_CONTRACT_ADDRESS,
  AGENT_WALLET_ADDRESS,
  PREDICTION_ABI,
  AGENT_WALLET_ABI,
} from "@/config/contracts";
import { celo } from "viem/chains";
import { createPublicClient, http } from "viem";

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
}) as any;

// --- public read helpers ---

export async function getOnChainTotalPredictions(): Promise<number> {
  try {
    const result = await publicClient.readContract({
      address: PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
      abi: PREDICTION_ABI,
      functionName: 'totalPredictions',
      args: [],
    });
    return Number(result);
  } catch (err) {
    console.warn("[blockchain] totalPredictions failed:", err);
    return 0;
  }
}

export async function getOnChainCorrectPredictions(): Promise<number> {
  try {
    const result = await publicClient.readContract({
      address: PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
      abi: PREDICTION_ABI,
      functionName: 'correctPredictions',
      args: [],
    });
    return Number(result);
  } catch (err) {
    console.warn("[blockchain] correctPredictions failed:", err);
    return 0;
  }
}

export async function getOnChainAccuracy(): Promise<number> {
  try {
    const result = await publicClient.readContract({
      address: PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
      abi: PREDICTION_ABI,
      functionName: 'getAgentAccuracy',
      args: [],
    });
    return Number(result);
  } catch (err) {
    console.warn("[blockchain] getAgentAccuracy failed:", err);
    return 0;
  }
}

export async function getOnChainTotalStaked(): Promise<bigint> {
  try {
    const result = await publicClient.readContract({
      address: PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
      abi: PREDICTION_ABI,
      functionName: 'totalStaked',
      args: [],
    });
    return result as bigint;
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
    const result = await publicClient.readContract({
      address: AGENT_WALLET_ADDRESS as `0x${string}`,
      abi: AGENT_WALLET_ABI,
      functionName: 'getProfile',
      args: [],
    });
    return {
      agentId: (result as any).agentId as string,
      name: (result as any).name,
      metadataURI: (result as any).metadataURI,
      createdAt: Number((result as any).createdAt),
      active: (result as any).active,
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
    const result = await publicClient.readContract({
      address: AGENT_WALLET_ADDRESS as `0x${string}`,
      abi: AGENT_WALLET_ABI,
      functionName: 'getReputation',
      args: [],
    });
    return {
      totalPredictions: Number((result as any).totalPredictions),
      correctPredictions: Number((result as any).correctPredictions),
      totalStaked: BigInt((result as any).totalStaked),
      reputationScore: Number((result as any).reputationScore),
      lastUpdated: Number((result as any).lastUpdated),
    };
  } catch (err) {
    console.warn("[blockchain] getReputation failed:", err);
    return null;
  }
}
