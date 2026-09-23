import type { Eip712Signer } from "../../eip712-signer";
import type { SessionKeyContext } from "../../execution-types";
import type { SystemState } from "../../../../core/state";
import type { LiveBookSoilAudit } from "../../../../services/check-soil-resistance";
import type { Verified5TxFillRecord } from "../../../../data/verified-5tx";
import type { BrowserLive5TxProgress } from "../sessionOrderTypes";

export interface SubmitSingleLive5TxOrderInput {
  index: number;
  side: "BUY" | "SHORT";
  walletAddress: string;
  symbol: string;
  notionalUsd: number;
  soilAudit: LiveBookSoilAudit;
  masterSigner: Eip712Signer;
  agentSigner: Eip712Signer;
  sessionKeyCtx: SessionKeyContext;
  systemState: SystemState;
  walletChainIdHex: string;
  assetIndex: number;
  szDecimals: number;
  fetchFn: typeof fetch;
  seenFillHashes: Set<string>;
  progress: BrowserLive5TxProgress;
}

export type SubmitSingleLive5TxOrderResult =
  | { ok: true; record: Verified5TxFillRecord }
  | { ok: false; error: Error };
