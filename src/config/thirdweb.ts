import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";

// ============================================================
// THIRDWEB CLIENT ID (Publishable — safe to store in code)
//
// Replace the placeholder below with your actual Client ID
// Get yours at: https://thirdweb.com/dashboard/settings/api-keys
// ============================================================
const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "YOUR_CLIENT_ID_HERE";

export const thirdwebClient = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
});

// Celo Mainnet chain definition
export const celoChain = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "CeloScan",
      url: "https://celoscan.io",
    },
  ],
});

// Keep backward-compatible export
export const activeChain = celoChain;
