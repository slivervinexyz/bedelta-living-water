import { HL_INFO_URL } from "../../src/config/constants";
import {
  buildClearinghouseStateRequest,
  parseHlPerpsMarginSnapshot,
  type HlClearinghouseState,
} from "../../src/adapters/hl/wallet/marginChecker";

export function resolveUnifiedAvailableUsd(input: {
  accountValueUsd: number;
  withdrawableUsd: number;
  spotUsdcUsd: number;
}): number {
  const { accountValueUsd, withdrawableUsd, spotUsdcUsd } = input;
  if (
    spotUsdcUsd > 0 &&
    accountValueUsd > 0 &&
    Math.abs(accountValueUsd - spotUsdcUsd) < 1
  ) {
    return Math.max(accountValueUsd, spotUsdcUsd, withdrawableUsd);
  }
  if (spotUsdcUsd > 0 && accountValueUsd <= 0) {
    return Math.max(spotUsdcUsd, withdrawableUsd);
  }
  return Math.max(accountValueUsd + spotUsdcUsd, withdrawableUsd);
}

export async function postHlInfoDirect(
  body: Record<string, unknown>,
  timeoutMs = 8_000,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(HL_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok || res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("HL info direct fetch failed");
}

export async function fetchUnifiedAccount(user: string): Promise<{
  accountValueUsd: number;
  withdrawableUsd: number;
  spotUsdcUsd: number;
  unifiedAvailableUsd: number;
  apiOk: boolean;
}> {
  const res = await postHlInfoDirect(buildClearinghouseStateRequest(user));
  let perps = { accountValueUsd: 0, withdrawableUsd: 0, apiOk: false };
  if (res.ok) {
    const data = (await res.json()) as HlClearinghouseState;
    perps = parseHlPerpsMarginSnapshot(data);
  }

  let spotUsdcUsd = 0;
  try {
    const spotRes = await postHlInfoDirect({
      type: "spotClearinghouseState",
      user,
    });
    if (spotRes.ok) {
      const spot = (await spotRes.json()) as {
        balances?: Array<{ coin?: string; total?: string }>;
      };
      for (const bal of spot.balances ?? []) {
        const coin = (bal.coin ?? "").toUpperCase();
        if (coin === "USDC" || coin === "USDT") {
          spotUsdcUsd += parseFloat(bal.total ?? "0") || 0;
        }
      }
    }
  } catch {
    /* optional */
  }

  const unifiedAvailableUsd = resolveUnifiedAvailableUsd({
    accountValueUsd: perps.accountValueUsd,
    withdrawableUsd: perps.withdrawableUsd,
    spotUsdcUsd,
  });

  return {
    ...perps,
    spotUsdcUsd,
    unifiedAvailableUsd,
    apiOk: perps.apiOk || spotUsdcUsd > 0,
  };
}
