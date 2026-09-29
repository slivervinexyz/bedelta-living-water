import { HL_INFO_URL, HL_L2_STALE_THRESHOLD_MS } from "../../src/config/constants";
import {
  assertMaxOrderClipUsd,
  HARD_STOP_LOSS_PCT,
  MAX_ORDER_CLIP_USD,
  MICRO_CAPITAL_USD,
  STALE_THRESHOLD_MS,
} from "../../src/config/risk-parameters";

export const LIVE = process.argv.includes("--live");
export const CLIP_USD = MAX_ORDER_CLIP_USD;
export const BALANCE_PASS_FLOOR_USD = MICRO_CAPITAL_USD * 0.85;

export {
  HL_INFO_URL,
  HL_L2_STALE_THRESHOLD_MS,
  STALE_THRESHOLD_MS,
  MICRO_CAPITAL_USD,
  MAX_ORDER_CLIP_USD,
  HARD_STOP_LOSS_PCT,
  assertMaxOrderClipUsd,
};
