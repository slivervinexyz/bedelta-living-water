import { validateAcrossBridgeDirection } from "../across-ingress-bridge";
import { INGRESS_SANCTUARY_INBOUND_BLOCKED } from "../across-ingress-bridge-types";
import {
  FHENIX_CONFIDENTIAL_POLICY_BREACH,
  SANCTUARY_CIRCUIT_SEVERED,
} from "./constants";
import type {
  ConfidentialIngressResult,
  EncryptedIntentPayload,
  PreBroadcastGateInput,
  PreBroadcastGateResult,
} from "./encrypted-intent-types";
import { buildMockEncryptedIntent, decodeMockSlippageBps } from "./fhe-mock-crypto";
import type { ConfidentialPolicyLimit, RiskConfig } from "./risk-config";

export class FhenixSanctuaryAdapter {
  async encryptAgentIntent(intentParams: RiskConfig): Promise<EncryptedIntentPayload> {
    return buildMockEncryptedIntent(intentParams);
  }

  evaluateConfidentialIngress(
    payload: EncryptedIntentPayload,
    policyLimit: ConfidentialPolicyLimit,
  ): ConfidentialIngressResult {
    const intentBps = decodeMockSlippageBps(payload.ciphertext);
    const withinLimit = intentBps <= policyLimit.maxSlippageBps;
    if (withinLimit) {
      return { ok: true, circuitSevered: false, reasons: [] };
    }
    return {
      ok: false,
      circuitSevered: true,
      reasons: [SANCTUARY_CIRCUIT_SEVERED, FHENIX_CONFIDENTIAL_POLICY_BREACH],
    };
  }

  evaluatePreBroadcastGate(input: PreBroadcastGateInput): PreBroadcastGateResult {
    const confidential = this.evaluateConfidentialIngress(input.intent, input.policyLimit);
    if (!confidential.ok) {
      return {
        ok: false,
        circuitSevered: confidential.circuitSevered,
        inboundBlocked: false,
        reasons: confidential.reasons,
      };
    }

    const reasons: string[] = [];
    let inboundBlocked = false;

    if (input.bridgeDirection) {
      const direction = validateAcrossBridgeDirection(input.bridgeDirection);
      if (!direction.ok) {
        reasons.push(...direction.reasons);
        inboundBlocked = direction.inboundBlocked;
      }
    }

    return {
      ok: reasons.length === 0,
      circuitSevered: false,
      inboundBlocked,
      reasons,
    };
  }
}

export { INGRESS_SANCTUARY_INBOUND_BLOCKED };
