import {
  SigningChannelLockedError,
  signHyperliquidAction,
  splitHyperliquidSignature,
  generateUniqueNonce,
} from "../auth";
import { checkSoilResistanceWithVine, HL_TESTNET_MIN_DEPTH_USD } from "../../../services/risk-control";
import { HL_EXCHANGE_URL } from "../../../config/constants";
import {
  PreTradeValidationError,
  type ExecutionContext,
  type ExecutionResult,
  type HyperliquidExchangeRequest,
  type PreTradeValidationInput,
} from "../execution-types";
import { assertPreTradeValidation } from "../execution-wire";
import { handleSessionKeySignFailure } from "../session-key-fallback";
import {
  assertSessionKey,
  isOpeningOrderAction,
  resolveSigningGate,
} from "./helpers";
import { postExchangeRequest } from "./post-exchange";

function withExecutionPreTradeContext(
  preTrade: PreTradeValidationInput,
  ctx: ExecutionContext,
): PreTradeValidationInput {
  const isTestnet = preTrade.isTestnet ?? ctx.isTestnet ?? false;
  return {
    ...preTrade,
    isTestnet,
    minDepthUsd:
      preTrade.minDepthUsd ?? (isTestnet ? HL_TESTNET_MIN_DEPTH_USD : undefined),
  };
}

/**
 * Sign and POST a Hyperliquid L1 action to the exchange endpoint.
 * @see assertPreTradeValidation — Pgate + soil pre-flight.
 * @see auth.ts — signHyperliquidAction / session-key gate.
 */
export async function executeSignedAction(
  action: Record<string, unknown>,
  ctx: ExecutionContext,
  options: {
    nonce?: number;
    preTrade?: PreTradeValidationInput;
    skipPreTrade?: boolean;
  } = {},
): Promise<ExecutionResult> {
  const nonce = options.nonce ?? generateUniqueNonce();
  const fetchFn = ctx.fetchFn ?? fetch;
  const exchangeUrl = ctx.exchangeUrl ?? HL_EXCHANGE_URL;

  try {
    assertSessionKey(ctx.sessionKey);

    if (ctx.gate?.soilResistanceTripped || ctx.gate?.signingChannelOpen === false) {
      throw new SigningChannelLockedError(
        "[CIRCUIT_BREAKER] Physical deadlock active — Hotkey signing channel fully terminated",
        "SIGNING_CHANNEL_CLOSED",
      );
    }

    const isOpening = isOpeningOrderAction(action);

    if (!options.skipPreTrade && isOpening) {
      if (!options.preTrade) {
        throw new PreTradeValidationError(
          "Pre-trade validation bypassed — opening order missing preTrade verification input",
          ["MISSING_PRE_TRADE_INPUT"],
        );
      }
      const preTrade = withExecutionPreTradeContext(options.preTrade, ctx);
      assertPreTradeValidation(preTrade);
    }

    const preTradeForGate = options.preTrade
      ? withExecutionPreTradeContext(options.preTrade, ctx)
      : undefined;
    const soilTripped =
      options.skipPreTrade === true
        ? false
        : preTradeForGate
          ? checkSoilResistanceWithVine(preTradeForGate).tripped
          : (ctx.gate?.soilResistanceTripped ?? false);

    const gate = resolveSigningGate(ctx.gate, soilTripped);

    const vaultAddress = ctx.sessionKey?.vaultAddress;
    const signatureHex = await signHyperliquidAction(ctx.signer, action, nonce, {
      isTestnet: ctx.isTestnet,
      vaultAddress,
      gate,
      signatureChainId: ctx.signatureChainId,
    });

    const request: HyperliquidExchangeRequest = {
      action,
      nonce,
      signature: splitHyperliquidSignature(signatureHex),
    };

    if (vaultAddress) {
      request.vaultAddress = vaultAddress;
    }

    if (ctx.dryRun) {
      return {
        request,
        response: { status: "dry_run" },
        dryRun: true,
        sessionKeyAddress: ctx.sessionKey?.agentAddress,
      };
    }

    const response = await postExchangeRequest(request, fetchFn, exchangeUrl);

    return {
      request,
      response,
      dryRun: false,
      sessionKeyAddress: ctx.sessionKey?.agentAddress,
    };
  } catch (err) {
    handleSessionKeySignFailure(err);
    throw err;
  }
}
