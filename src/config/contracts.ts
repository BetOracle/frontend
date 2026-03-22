// ============================================================
// Deployed Contract Addresses (Celo Mainnet — chain 42220)
// ============================================================

export const DEPLOYER_ADDRESS = "0x3E7dfBF99f10402E860Df4e7420217EF56e94cc1";
export const FACTORY_ADDRESS = "0x430e1Bd7a0927f731E144C42feDFB12e23465cE9";
export const CELO_CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
export const AGENT_WALLET_ADDRESS = "0x8929c7C546aF792E044326ff492439F02fD13373";
export const PREDICTION_CONTRACT_ADDRESS = "0xd5049F6550aefC772ABDa57013fB01aB718054Ef";
export const AGENT_ID = "0x565fae5389dd06d09b03a5a1464cf02e94dd3f4e612eaf7b83a04fee42f582a5";

export const CELOSCAN_URL = "https://celoscan.io";
export const CHAIN_ID = 42220;

// ============================================================
// ABIs
// ============================================================

export const PREDICTION_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "oldWallet", type: "address" }, { indexed: true, internalType: "address", name: "newWallet", type: "address" }], name: "AgentWalletUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "bytes32", name: "predictionId", type: "bytes32" }, { indexed: true, internalType: "bytes32", name: "matchId", type: "bytes32" }, { indexed: false, internalType: "uint8", name: "outcome", type: "uint8" }, { indexed: false, internalType: "bool", name: "correct", type: "bool" }, { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }], name: "PredictionResolved", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "bytes32", name: "predictionId", type: "bytes32" }, { indexed: true, internalType: "bytes32", name: "matchId", type: "bytes32" }, { indexed: true, internalType: "address", name: "agent", type: "address" }, { indexed: false, internalType: "string", name: "homeTeam", type: "string" }, { indexed: false, internalType: "string", name: "awayTeam", type: "string" }, { indexed: false, internalType: "uint8", name: "prediction", type: "uint8" }, { indexed: false, internalType: "uint256", name: "confidence", type: "uint256" }, { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }], name: "PredictionSubmitted", type: "event" },
  { inputs: [], name: "agentWallet", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "correctPredictions", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "string", name: "_league", type: "string" }, { internalType: "string", name: "_homeTeam", type: "string" }, { internalType: "string", name: "_awayTeam", type: "string" }, { internalType: "uint256", name: "_date", type: "uint256" }], name: "generateMatchId", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "pure", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "_matchId", type: "bytes32" }, { internalType: "uint256", name: "_timestamp", type: "uint256" }], name: "generatePredictionId", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "pure", type: "function" },
  { inputs: [], name: "getAgentAccuracy", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "_predictionId", type: "bytes32" }], name: "getPrediction", outputs: [{ components: [{ internalType: "bytes32", name: "predictionId", type: "bytes32" }, { internalType: "bytes32", name: "matchId", type: "bytes32" }, { internalType: "address", name: "agent", type: "address" }, { internalType: "string", name: "homeTeam", type: "string" }, { internalType: "string", name: "awayTeam", type: "string" }, { internalType: "string", name: "league", type: "string" }, { internalType: "uint8", name: "prediction", type: "uint8" }, { internalType: "uint256", name: "confidence", type: "uint256" }, { internalType: "uint256", name: "timestamp", type: "uint256" }, { internalType: "uint256", name: "matchDate", type: "uint256" }, { internalType: "bool", name: "resolved", type: "bool" }, { internalType: "uint8", name: "outcome", type: "uint8" }, { internalType: "uint256", name: "stakeAmount", type: "uint256" }], internalType: "struct BetOraclePrediction.Prediction", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_offset", type: "uint256" }, { internalType: "uint256", name: "_limit", type: "uint256" }], name: "getPredictions", outputs: [{ components: [{ internalType: "bytes32", name: "predictionId", type: "bytes32" }, { internalType: "bytes32", name: "matchId", type: "bytes32" }, { internalType: "address", name: "agent", type: "address" }, { internalType: "string", name: "homeTeam", type: "string" }, { internalType: "string", name: "awayTeam", type: "string" }, { internalType: "string", name: "league", type: "string" }, { internalType: "uint8", name: "prediction", type: "uint8" }, { internalType: "uint256", name: "confidence", type: "uint256" }, { internalType: "uint256", name: "timestamp", type: "uint256" }, { internalType: "uint256", name: "matchDate", type: "uint256" }, { internalType: "bool", name: "resolved", type: "bool" }, { internalType: "uint8", name: "outcome", type: "uint8" }, { internalType: "uint256", name: "stakeAmount", type: "uint256" }], internalType: "struct BetOraclePrediction.Prediction[]", name: "", type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "_predictionId", type: "bytes32" }], name: "isPredictionCorrect", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "predictionIds", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "resolvedPredictions", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalPredictions", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalStaked", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const AGENT_WALLET_ABI = [
  { inputs: [{ internalType: "bytes32", name: "_agentId", type: "bytes32" }, { internalType: "string", name: "_name", type: "string" }, { internalType: "string", name: "_metadataURI", type: "string" }, { internalType: "address", name: "_owner", type: "address" }], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "getProfile", outputs: [{ components: [{ internalType: "bytes32", name: "agentId", type: "bytes32" }, { internalType: "string", name: "name", type: "string" }, { internalType: "string", name: "metadataURI", type: "string" }, { internalType: "uint256", name: "createdAt", type: "uint256" }, { internalType: "bool", name: "active", type: "bool" }], internalType: "struct BetOracleAgentWallet.AgentProfile", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getReputation", outputs: [{ components: [{ internalType: "uint256", name: "totalPredictions", type: "uint256" }, { internalType: "uint256", name: "correctPredictions", type: "uint256" }, { internalType: "uint256", name: "totalStaked", type: "uint256" }, { internalType: "uint256", name: "reputationScore", type: "uint256" }, { internalType: "uint256", name: "lastUpdated", type: "uint256" }], internalType: "struct BetOracleAgentWallet.Reputation", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "predictionContract", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "reputation", outputs: [{ internalType: "uint256", name: "totalPredictions", type: "uint256" }, { internalType: "uint256", name: "correctPredictions", type: "uint256" }, { internalType: "uint256", name: "totalStaked", type: "uint256" }, { internalType: "uint256", name: "reputationScore", type: "uint256" }, { internalType: "uint256", name: "lastUpdated", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "profile", outputs: [{ internalType: "bytes32", name: "agentId", type: "bytes32" }, { internalType: "string", name: "name", type: "string" }, { internalType: "string", name: "metadataURI", type: "string" }, { internalType: "uint256", name: "createdAt", type: "uint256" }, { internalType: "bool", name: "active", type: "bool" }], stateMutability: "view", type: "function" },
] as const;

export const FACTORY_ABI = [
  { inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], name: "agentById", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getAllAgentWallets", outputs: [{ internalType: "address[]", name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getAllPredictionContracts", outputs: [{ internalType: "address[]", name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getDeploymentCount", outputs: [{ internalType: "uint256", name: "agents", type: "uint256" }, { internalType: "uint256", name: "predictions", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;
