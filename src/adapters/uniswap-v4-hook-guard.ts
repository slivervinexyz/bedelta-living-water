/**
 * Uniswap V4 PoolManager pre-consensus hook guard — fail-closed allowlist / fee / quote.
 * Does not reopen RESERVED_ABI_V2 bit 4 (Uniswap V3 pruned).
 */
import { evaluateIntentGatePure, type IntentGateResult } from "../core/intent-core";
import { isAddressInAllowlist } from "../sdk/exomesh-agentic-wallet-guard/address-compare";
import {
  CALLDATA_SCRATCH,
  decodeHexCalldata,
  readAddressAt,
  readSelectorU32,
  readUint256At,
} from "../sdk/exomesh-agentic-wallet-guard/calldata-hex";
import {
  isUniswapV4Selector,
  SEL_UNISWAP_V4_UNLOCK,
  type ParsedCalldata,
} from "../sdk/exomesh-agentic-wallet-guard/calldata-types";
import type { RetailGuardConfig, RetailGuardRejectPayload } from "../sdk/exomesh-agentic-wallet-guard/types";
import { formatRetailWarning } from "../sdk/exomesh-agentic-wallet-guard/warnings";

export const V4_CODES = {
  HOOK_NOT_ALLOWLISTED: "V4_HOOK_NOT_ALLOWLISTED",
  HOOK_FEE_EXCEEDED: "V4_HOOK_FEE_EXCEEDED",
  QUOTE_SETTLEMENT_MISMATCH: "V4_QUOTE_SETTLEMENT_MISMATCH",
  UNKNOWN_SELECTOR: "V4_UNKNOWN_SELECTOR",
} as const;

const ZERO_HOOK = "0x0000000000000000000000000000000000000000";
const DYNAMIC_FEE_FLAG = 0x800000;
const DEFAULT_MAX_FEE_BPS = 100;
const DEFAULT_QUOTE_DEV_BPS = 50;
const POOL_KEY_HOOKS_OFF = 4 + 128;
const AMOUNT_SPEC_OFF = 4 + 192;
const MIN_POOLKEY_LEN = AMOUNT_SPEC_OFF + 32;

function fail(code: RetailGuardRejectPayload["code"], message: string, extra?: Record<string, string | number | boolean>): RetailGuardRejectPayload {
  return { code, message, plainTextWarning: formatRetailWarning(code, extra) };
}

function feePipsToBps(feePips: number): number {
  return Math.floor((feePips & ~DYNAMIC_FEE_FLAG) / 100);
}

function absAmount(word: bigint): bigint {
  const hi = 1n << 255n;
  return (word & hi) !== 0n ? (1n << 256n) - word : word;
}

function quoteDriftBps(quoted: bigint, specified: bigint): number {
  if (specified === 0n) return quoted === 0n ? 0 : 10_000;
  const d = quoted > specified ? quoted - specified : specified - quoted;
  return Number((d * 10_000n) / specified);
}

export interface UniswapV4Decoded {
  selectorU32: number;
  hooks: string;
  feePips: number;
  amountSpecifiedAbs: bigint;
  opaqueUnlock: boolean;
}

export function decodeUniswapV4Calldata(data: string | undefined): UniswapV4Decoded | null {
  if (!data?.trim()) return null;
  const byteLen = decodeHexCalldata(data, CALLDATA_SCRATCH);
  const sel = readSelectorU32(CALLDATA_SCRATCH, byteLen);
  if (!isUniswapV4Selector(sel)) return { selectorU32: sel, hooks: ZERO_HOOK, feePips: 0, amountSpecifiedAbs: 0n, opaqueUnlock: false };
  if (sel === SEL_UNISWAP_V4_UNLOCK) {
    return { selectorU32: sel, hooks: ZERO_HOOK, feePips: 0, amountSpecifiedAbs: 0n, opaqueUnlock: true };
  }
  if (byteLen < MIN_POOLKEY_LEN) return null;
  const feePips = Number(readUint256At(CALLDATA_SCRATCH, 4 + 64) & 0xffffffn);
  return {
    selectorU32: sel,
    hooks: readAddressAt(CALLDATA_SCRATCH, POOL_KEY_HOOKS_OFF),
    feePips,
    amountSpecifiedAbs: absAmount(readUint256At(CALLDATA_SCRATCH, AMOUNT_SPEC_OFF)),
    opaqueUnlock: false,
  };
}

export function evaluateUniswapV4HookGate(
  to: string | undefined,
  data: string | undefined,
  config: RetailGuardConfig,
  parsed?: ParsedCalldata | null,
): RetailGuardRejectPayload | null {
  const toNorm = to?.trim().toLowerCase() ?? "";
  const isPm = isAddressInAllowlist(toNorm, config.v4PoolManagers);
  const sel = parsed && "selectorU32" in parsed ? parsed.selectorU32 : 0;
  const decoded = decodeUniswapV4Calldata(data);
  const v4Sel = decoded ? isUniswapV4Selector(decoded.selectorU32) : isUniswapV4Selector(sel);
  if (!isPm && !v4Sel) return null;
  if (isPm && decoded && !isUniswapV4Selector(decoded.selectorU32)) {
    return fail(V4_CODES.UNKNOWN_SELECTOR, `V4_UNKNOWN_SELECTOR:sel=${decoded.selectorU32}`, {
      selector: `0x${decoded.selectorU32.toString(16).padStart(8, "0")}`,
    });
  }
  if (!decoded) return fail(V4_CODES.UNKNOWN_SELECTOR, "V4_UNKNOWN_SELECTOR:undecodable", { selector: "undecodable" });
  if (decoded.opaqueUnlock) {
    return fail(V4_CODES.UNKNOWN_SELECTOR, "V4_UNKNOWN_SELECTOR:unlock_opaque", { selector: "unlock" });
  }
  if (!v4Sel) return null;
  if (decoded.hooks !== ZERO_HOOK && !isAddressInAllowlist(decoded.hooks, config.v4AllowedHooks)) {
    return fail(V4_CODES.HOOK_NOT_ALLOWLISTED, `V4_HOOK_NOT_ALLOWLISTED:hook=${decoded.hooks}`, { hook: decoded.hooks });
  }
  const maxFee = config.v4MaxHookFeeBps ?? DEFAULT_MAX_FEE_BPS;
  const dynamic = (decoded.feePips & DYNAMIC_FEE_FLAG) !== 0;
  const feeBps = dynamic ? (config.v4QuotedHookFeeBps ?? maxFee + 1) : feePipsToBps(decoded.feePips);
  if (feeBps > maxFee) {
    return fail(V4_CODES.HOOK_FEE_EXCEEDED, `V4_HOOK_FEE_EXCEEDED:fee=${feeBps}>max=${maxFee}`, { feeBps, maxBps: maxFee });
  }
  const quoted = config.v4QuotedAmountWei;
  if (quoted !== undefined && decoded.amountSpecifiedAbs > 0n) {
    const maxDev = config.v4MaxQuoteDeviationBps ?? DEFAULT_QUOTE_DEV_BPS;
    const drift = quoteDriftBps(quoted, decoded.amountSpecifiedAbs);
    if (drift > maxDev) {
      return fail(V4_CODES.QUOTE_SETTLEMENT_MISMATCH, `V4_QUOTE_SETTLEMENT_MISMATCH:drift=${drift}>max=${maxDev}`, {
        driftBps: drift,
      });
    }
  }
  return null;
}

export function evaluateIntentGateWithV4Hook(
  to: string | undefined,
  data: string | undefined,
  config: RetailGuardConfig,
  memoryBuffer: BigInt64Array,
  allowedVenuesMask: bigint,
  targetVenueBit: bigint,
  parsed?: ParsedCalldata | null,
): { v4Reject: RetailGuardRejectPayload | null; gate: IntentGateResult | null } {
  const v4Reject = evaluateUniswapV4HookGate(to, data, config, parsed);
  if (v4Reject) return { v4Reject, gate: null };
  return { v4Reject: null, gate: evaluateIntentGatePure(memoryBuffer, allowedVenuesMask, targetVenueBit) };
}
