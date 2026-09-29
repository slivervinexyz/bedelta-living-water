import { FHENIX_MOCK_PAYLOAD_VERSION } from "./constants";
import type { EncryptedIntentPayload } from "./encrypted-intent-types";
import type { RiskConfig } from "./risk-config";

const MOCK_DOMAIN = "fhenix-mock-v1";

function toPaddedWordHex(slippageBps: number): `0x${string}` {
  const clamped = Math.max(0, Math.min(0xffff_ffff, Math.floor(slippageBps)));
  const hex = clamped.toString(16).padStart(64, "0");
  return `0x${hex}`;
}

export function packMockInEuint32(slippageBps: number): `0x${string}` {
  return toPaddedWordHex(slippageBps);
}

export function decodeMockSlippageBps(ciphertext: `0x${string}`): number {
  const body = ciphertext.startsWith("0x") ? ciphertext.slice(2) : ciphertext;
  if (body.length < 8) return 0;
  const tail = body.slice(-8);
  return Number.parseInt(tail, 16);
}

export function buildMockEncryptedIntent(intent: RiskConfig): EncryptedIntentPayload {
  const slippageBps = Math.max(0, Math.floor(intent.maxSlippageBps));
  const ciphertext = packMockInEuint32(slippageBps);
  const handle = `${MOCK_DOMAIN}:${slippageBps}:${intent.maxIntentExposureUsd ?? 0}`;
  return {
    version: FHENIX_MOCK_PAYLOAD_VERSION,
    ciphertext,
    handle,
    slippageBps,
  };
}
