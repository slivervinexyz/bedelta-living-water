import { Wallet } from "ethers";
import type { Eip712Signer } from "../eip712-signer";

const STORAGE_PREFIX = "hl-browser-session-key:";

export interface BrowserSessionKeyMaterial {
  agentAddress: string;
  agentSigner: Eip712Signer;
}

function storageKey(masterWallet: string): string {
  return `${STORAGE_PREFIX}${masterWallet.toLowerCase()}`;
}

/** Load persisted ephemeral agent keypair for this master wallet (browser session). */
export function loadBrowserSessionKeyMaterial(
  masterWallet: string,
): BrowserSessionKeyMaterial | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey(masterWallet));
  if (!raw?.startsWith("0x")) return null;
  try {
    const wallet = new Wallet(raw);
    return {
      agentAddress: wallet.address.toLowerCase(),
      agentSigner: wallet,
    };
  } catch {
    return null;
  }
}

export function clearBrowserSessionKeyMaterial(masterWallet: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(storageKey(masterWallet));
}

/**
 * Create or reuse a single ephemeral agent keypair per master wallet.
 * Same private key signs L1 orders; its address is registered via approveAgent.
 */
export function createBrowserSessionKeyMaterial(
  masterWallet: string,
): BrowserSessionKeyMaterial {
  const existing = loadBrowserSessionKeyMaterial(masterWallet);
  if (existing) return existing;

  const wallet = Wallet.createRandom();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(storageKey(masterWallet), wallet.privateKey);
  }
  return {
    agentAddress: wallet.address.toLowerCase(),
    agentSigner: wallet,
  };
}
