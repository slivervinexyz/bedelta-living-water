import { HL_EXCHANGE_URL } from "../../../config/constants";
import {
  HyperliquidExecutionError,
  type HyperliquidExchangeRequest,
  type HyperliquidExchangeResponse,
} from "../execution-types";
import { fetchWithRpcFailover } from "../rpc-failover";
import { parseResponseBody } from "./helpers";

export async function postExchangeRequest(
  request: HyperliquidExchangeRequest,
  fetchFn: typeof fetch = fetch,
  exchangeUrl: string = HL_EXCHANGE_URL,
): Promise<HyperliquidExchangeResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (request.vaultAddress) {
    headers["X-HL-Vault-Address"] = request.vaultAddress;
  }

  const init: RequestInit = {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  };

  const res =
    exchangeUrl === HL_EXCHANGE_URL
      ? await fetchWithRpcFailover("exchange", init, { fetchFn })
      : await fetchFn(exchangeUrl, init);

  const body = await parseResponseBody(res);

  if (res.status === 429) {
    throw new HyperliquidExecutionError(
      "Hyperliquid exchange rate limit exceeded",
      "RATE_LIMIT",
      429,
      body,
    );
  }

  if (!res.ok) {
    throw new HyperliquidExecutionError(
      `Hyperliquid exchange HTTP ${res.status}`,
      "HTTP_ERROR",
      res.status,
      body,
    );
  }

  const parsed = body as HyperliquidExchangeResponse;
  if (parsed.status && parsed.status !== "ok") {
    throw new HyperliquidExecutionError(
      "Hyperliquid execution rejected",
      "EXECUTION_REJECT",
      res.status,
      body,
    );
  }

  return parsed;
}
