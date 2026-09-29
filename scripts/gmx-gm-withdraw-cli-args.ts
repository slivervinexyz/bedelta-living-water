/** CLI arg/env helpers for execute-gmx-mainnet-gm-withdraw.ts */
import type { Hex } from "viem";
import { resolveMainnetPrivateKey } from "./_shared/mainnet-env";
import { toGmxGmToken18 } from "../src/services/adapters/gmx-v2-order-payload-builder-helpers";
import { validateGmxExecutionGuards } from "./gmx-v2-execution-cli";

export const GMX_GM_WITHDRAW_CHAIN_ID = 42161;
export const GMX_GM_WITHDRAW_DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";
export const GMX_GM_WITHDRAW_DEFAULT_AMOUNT_USD = 100;

const truthy = (v: string | undefined): boolean => {
  const t = (v ?? "").trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
};

export function resolveGmxGmWithdrawRpc(): string {
  return (process.env.ARB_MAINNET_RPC_URL ?? GMX_GM_WITHDRAW_DEFAULT_RPC).trim();
}

export function isGmxGmWithdrawArmed(): boolean {
  return process.env.BROADCAST === "1" && process.env.CONFIRM_GMX_GM_WITHDRAW === "YES";
}

export function isGmxGmWithdrawGasGuardBypassed(): boolean {
  return truthy(process.env.BYPASS_GAS_GUARD);
}

export function isGmxGmWithdrawStaleOracleAllowed(argv: string[]): boolean {
  return argv.includes("--allow-stale-oracle") || truthy(process.env.ALLOW_STALE_ORACLE);
}

export function resolveGmxGmWithdrawPk(): Hex {
  return resolveMainnetPrivateKey();
}

export function readGmxGmWithdrawFlag(argv: string[], name: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = argv.indexOf(name);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

export function parseGmxGmWithdrawAmountUsd(argv: string[]): number {
  const raw =
    readGmxGmWithdrawFlag(argv, "--amount") ??
    process.env.GMX_GM_WITHDRAW_USD ??
    String(GMX_GM_WITHDRAW_DEFAULT_AMOUNT_USD);
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`INVALID_AMOUNT_USD: ${raw}`);
  return amount;
}

function parseGmxGmPrice(argv: string[]): number | undefined {
  const raw = readGmxGmWithdrawFlag(argv, "--gm-price") ?? process.env.GMX_GM_PRICE_USD;
  if (!raw) return undefined;
  const price = Number.parseFloat(raw);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`INVALID_GM_PRICE_USD: ${raw}`);
  return price;
}

export function resolveGmxGmWithdrawTokenAmount(argv: string[], amountUsd: number): bigint {
  const explicit = readGmxGmWithdrawFlag(argv, "--gm-amount");
  if (explicit) {
    const amt = BigInt(explicit);
    if (amt <= 0n) throw new Error("GMX_GM_WITHDRAW_AMOUNT: --gm-amount must be > 0");
    return amt;
  }
  const gmPrice = parseGmxGmPrice(argv);
  if (!gmPrice) {
    throw new Error("GMX_GM_WITHDRAW_AMOUNT: set --gm-amount <wei> or --gm-price <usd> with --amount");
  }
  return BigInt(toGmxGmToken18(amountUsd / gmPrice));
}

export function parseGmxGmWithdrawExecutionFeeWei(argv: string[]): string | undefined {
  return readGmxGmWithdrawFlag(argv, "--execution-fee") ?? process.env.GMX_GM_WITHDRAW_EXECUTION_FEE;
}

export function validateGmxGmWithdrawGuards(staleOracleOk: boolean): { ok: boolean; reasons: string[] } {
  if (isGmxGmWithdrawGasGuardBypassed()) {
    console.warn("[gmx-gm-withdraw] BYPASS_GAS_GUARD=true — skipping Arbitrum gas guard");
    return { ok: true, reasons: [] };
  }
  return validateGmxExecutionGuards(staleOracleOk);
}
