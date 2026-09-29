/** E2E financial accounting — thin wrapper over src/core/capital-invariant-ledger SSOT. */
import {
  assertCapitalInvariantLedger,
  buildCapitalInvariantSnapshot,
  computeCapitalInvariantLedger,
  PROTOCOL_TREASURY_RECEIVER_SHORT,
  type CapitalInvariantLedger,
  type CapitalInvariantSnapshot,
  type CapitalLedgerParams,
} from "../../src/core/capital-invariant-ledger";
import { GMX_UI_FEE_RECEIVER } from "../../src/config/gmx-revenue";
import { CAPITAL_DEFAULT_ETH_PRICE_USD } from "../../src/config/capital-invariant-defaults";

export const E2E_PROTOCOL_TREASURY_RECEIVER = GMX_UI_FEE_RECEIVER;
export const E2E_PROTOCOL_TREASURY_RECEIVER_SHORT = PROTOCOL_TREASURY_RECEIVER_SHORT;

export type E2eFinancialLedger = CapitalInvariantLedger;
export type E2eCapitalInvariant = CapitalInvariantSnapshot;

export function computeE2eFinancialLedger(
  ethPriceUsd = CAPITAL_DEFAULT_ETH_PRICE_USD,
  silent = false,
): E2eFinancialLedger {
  return computeCapitalInvariantLedger({ ethPriceUsd, grantNarrativeFallback: true, silent });
}

export function buildE2eCapitalInvariant(ethPriceUsd = CAPITAL_DEFAULT_ETH_PRICE_USD): E2eCapitalInvariant {
  return buildCapitalInvariantSnapshot({ ethPriceUsd, grantNarrativeFallback: true });
}

export function assertE2eFinancialInvariants(ledger: E2eFinancialLedger): void {
  assertCapitalInvariantLedger(ledger);
}

export type { CapitalLedgerParams };
