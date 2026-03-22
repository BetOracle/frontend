import type { Abi } from "viem";
import betOraclePrediction from "./abis/betOraclePrediction.json";
import betOracleFactory from "./abis/betOracleFactory.json";
import betOracleAgentWallet from "./abis/betOracleAgentWallet.json";

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
// ABIs (BetOracle — matches deployed verified contracts)
// ============================================================

export const PREDICTION_ABI = betOraclePrediction as Abi;
export const FACTORY_ABI = betOracleFactory as Abi;
export const AGENT_WALLET_ABI = betOracleAgentWallet as Abi;
