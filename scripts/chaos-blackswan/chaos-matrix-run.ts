/** Single matrix case runner. */
import { blockedResult } from "./chaos-gate-helpers";
import { evaluateGatewayRules } from "./chaos-gateway-rules";
import {
  expectedReasonPrefixForId,
  reasonMatchesExpectedPrefix,
} from "./chaos-matrix-expected";
import { groupForId, specForIdTail } from "./chaos-matrix-spec";
import type { ChaosAttackResult } from "./chaos-types";

export function runMatrixCase(id: number): ChaosAttackResult {
  const group = groupForId(id);
  const input = specForIdTail(id);
  const expectedReasonPrefix = expectedReasonPrefixForId(id);
  const gw = evaluateGatewayRules(input);
  const reasonPrefixMatched = reasonMatchesExpectedPrefix(gw.reasons, expectedReasonPrefix);
  const blocked = gw.failClosed && !gw.crashed && reasonPrefixMatched;
  return blockedResult(
    group,
    gw.reasons[0] ?? "FAIL_CLOSED",
    gw.reasons,
    blocked,
    id,
    { expectedReasonPrefix, reasonPrefixMatched, crashed: gw.crashed },
  );
}
