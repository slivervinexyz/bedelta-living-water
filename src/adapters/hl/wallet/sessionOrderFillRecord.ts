import type { HlUserFill } from "../../../data/verified-5tx";
import {
  buildHlTestnetExplorerUrl,
  estimateSlippageBps,
  pickFillTxMeta,
  type Verified5TxFillRecord,
} from "../../../data/verified-5tx";
import type { LiveBookSoilAudit } from "../../../services/check-soil-resistance";

export function buildLive5TxFillRecord(args: {
  index: number;
  side: "BUY" | "SHORT";
  symbol: string;
  notionalUsd: number;
  soilAudit: LiveBookSoilAudit;
  latest: HlUserFill;
  orderLimitPx: number;
  w01DepthRefillBps: number;
}): Verified5TxFillRecord {
  const meta = pickFillTxMeta(args.latest);
  const fillPx = args.latest.px ? Number(args.latest.px) : args.orderLimitPx;
  const { rawSlippageBps, gatedSlippageBps } = estimateSlippageBps(
    args.soilAudit.probe.midPx,
    fillPx,
  );
  const savedUsd = Number(
    (args.notionalUsd * Math.max(0, rawSlippageBps - gatedSlippageBps) / 10_000).toFixed(4),
  );
  return {
    index: args.index,
    side: args.side,
    symbol: args.symbol,
    notionalUsd: args.notionalUsd,
    txHash: meta.txHash,
    fillTimeSec: meta.fillTimeSec,
    timestamp: meta.timestamp,
    explorerUrl: buildHlTestnetExplorerUrl(meta.txHash),
    soilPassed: args.soilAudit.ok && !args.soilAudit.tripped,
    w01DepthRefillBps: args.w01DepthRefillBps,
    rawSlippageBps,
    gatedSlippageBps,
    savedUsd,
    dryRun: false,
  };
}
