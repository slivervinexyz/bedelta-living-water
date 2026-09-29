import type { FHENIX_MOCK_PAYLOAD_VERSION } from "./constants";
import type { ConfidentialPolicyLimit } from "./risk-config";

export interface EncryptedIntentPayload {
  version: typeof FHENIX_MOCK_PAYLOAD_VERSION;
  /** Hex-encoded 32-byte mock ciphertext (inEuint32.data). */
  ciphertext: `0x${string}`;
  /** Deterministic handle for audit correlation. */
  handle: string;
  /** Plaintext slippage bps used to build mock ciphertext (never broadcast in production). */
  slippageBps: number;
}

export interface ConfidentialIngressResult {
  ok: boolean;
  circuitSevered: boolean;
  reasons: string[];
}

export interface PreBroadcastGateInput {
  intent: EncryptedIntentPayload;
  policyLimit: ConfidentialPolicyLimit;
  bridgeDirection?: {
    sourceChainId: number;
    destChainId: number;
  };
}

export interface PreBroadcastGateResult {
  ok: boolean;
  circuitSevered: boolean;
  inboundBlocked: boolean;
  reasons: string[];
}
