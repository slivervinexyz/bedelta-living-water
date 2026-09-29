import { describe, expect, it } from "vitest";
import {
  ARBITRUM_ONE_CHAIN_ID,
  ROBINHOOD_MAINNET_CHAIN_ID,
} from "../src/adapters/across-ingress-bridge-types";
import {
  FHENIX_MOCK_PAYLOAD_VERSION,
  FhenixSanctuaryAdapter,
  INGRESS_SANCTUARY_INBOUND_BLOCKED,
  SANCTUARY_CIRCUIT_SEVERED,
} from "../src/adapters/fhenix";
import { buildMockEncryptedIntent } from "../src/adapters/fhenix/fhe-mock-crypto";

describe("FhenixSanctuaryAdapter — confidential ingress (mock FHE)", () => {
  const adapter = new FhenixSanctuaryAdapter();

  it("wraps agent intent into deterministic encrypted payload", async () => {
    const a = await adapter.encryptAgentIntent({ maxSlippageBps: 42, maxIntentExposureUsd: 1_000 });
    const b = buildMockEncryptedIntent({ maxSlippageBps: 42, maxIntentExposureUsd: 1_000 });
    expect(a.version).toBe(FHENIX_MOCK_PAYLOAD_VERSION);
    expect(a.ciphertext).toMatch(/^0x[0-9a-f]{64}$/i);
    expect(a.handle).toBe(b.handle);
    expect(a.ciphertext).toBe(b.ciphertext);
  });

  it("passes confidential boundary when intent slippage is within policy limit", () => {
    const intent = buildMockEncryptedIntent({ maxSlippageBps: 30 });
    const result = adapter.evaluateConfidentialIngress(intent, { maxSlippageBps: 50 });
    expect(result.ok).toBe(true);
    expect(result.circuitSevered).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("returns SANCTUARY_CIRCUIT_SEVERED when encrypted policy is breached", () => {
    const intent = buildMockEncryptedIntent({ maxSlippageBps: 120 });
    const result = adapter.evaluateConfidentialIngress(intent, { maxSlippageBps: 50 });
    expect(result.ok).toBe(false);
    expect(result.circuitSevered).toBe(true);
    expect(result.reasons).toContain(SANCTUARY_CIRCUIT_SEVERED);
  });

  it("merges INGRESS_SANCTUARY_INBOUND_BLOCKED when confidential pass but route is inbound", () => {
    const intent = buildMockEncryptedIntent({ maxSlippageBps: 25 });
    const gate = adapter.evaluatePreBroadcastGate({
      intent,
      policyLimit: { maxSlippageBps: 50 },
      bridgeDirection: {
        sourceChainId: ARBITRUM_ONE_CHAIN_ID,
        destChainId: ROBINHOOD_MAINNET_CHAIN_ID,
      },
    });
    expect(gate.ok).toBe(false);
    expect(gate.circuitSevered).toBe(false);
    expect(gate.inboundBlocked).toBe(true);
    expect(gate.reasons).toContain(INGRESS_SANCTUARY_INBOUND_BLOCKED);
  });

  it("prioritizes confidential sever over legal bridge route", () => {
    const intent = buildMockEncryptedIntent({ maxSlippageBps: 200 });
    const gate = adapter.evaluatePreBroadcastGate({
      intent,
      policyLimit: { maxSlippageBps: 50 },
      bridgeDirection: {
        sourceChainId: ROBINHOOD_MAINNET_CHAIN_ID,
        destChainId: ARBITRUM_ONE_CHAIN_ID,
      },
    });
    expect(gate.ok).toBe(false);
    expect(gate.circuitSevered).toBe(true);
    expect(gate.reasons).toContain(SANCTUARY_CIRCUIT_SEVERED);
    expect(gate.reasons).not.toContain(INGRESS_SANCTUARY_INBOUND_BLOCKED);
  });
});
