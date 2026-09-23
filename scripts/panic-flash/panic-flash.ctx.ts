import { Wallet } from "ethers";
import { HL_EXCHANGE_URL } from "../../src/config/constants";
import type { ExecutionContext } from "../../src/adapters/hl/execution-types";
import { SESSION_KEY_AUTO_EXPIRE_MS } from "../../src/services/risk/session-audit";

export function buildPanicCtx(
  sessionPk: string,
  userAddress: string,
): ExecutionContext {
  const wallet = new Wallet(sessionPk);
  const directFetch: typeof fetch = async (_url, init) =>
    fetch(HL_EXCHANGE_URL, init);
  return {
    signer: {
      signTypedData: (domain, types, message) =>
        wallet.signTypedData(domain, types as never, message),
    },
    sessionKey: {
      agentAddress: wallet.address.toLowerCase(),
      expiresAt: Date.now() + SESSION_KEY_AUTO_EXPIRE_MS,
      masterWalletAddress: userAddress.toLowerCase(),
    },
    gate: { signingChannelOpen: true, soilResistanceTripped: false },
    isTestnet: false,
    dryRun: false,
    exchangeUrl: "https://api.hyperliquid.xyz/exchange#direct",
    fetchFn: directFetch,
  };
}

export const LIVE = process.argv.includes("--live");
