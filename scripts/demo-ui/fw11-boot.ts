/**
 * Demo-only EIP-1193 wrap. Imports SDK; does not edit src/.
 */
import {
  encodeApproveCalldata,
  RetailGuardRejectedError,
  UINT256_MAX,
  withRetailGuardProvider,
  type EIP1193Provider,
  type RetailGuardConfig,
  type RetailGuardReasonCode,
} from "../../src/sdk/exomesh-agentic-wallet-guard";

const WALLET = "0x1111111111111111111111111111111111111111";
const USDC = "0xaf88d065e77c1c4911f8fc5294f1c277b22c5e9c";
const MALICIOUS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const TRIGGER_LABEL = "Trigger Agent Infinite Approve (Permit2 / ERC20)";
const TRIGGER_BUSY = "Intercepting...";

interface InterceptResult {
  code: RetailGuardReasonCode;
  message: string;
  plainTextWarning: string;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

let guardedProvider: EIP1193Provider | null = null;

function mockEthereum(): EIP1193Provider {
  return {
    request: async (args) => {
      if (args.method === "eth_accounts" || args.method === "eth_requestAccounts") {
        return [WALLET];
      }
      if (args.method === "eth_chainId") return "0xa4b1";
      return "0xmock";
    },
  };
}

function demoConfig(): RetailGuardConfig {
  return {
    walletAddress: WALLET,
    preferWasm: false,
    allowedVenueMask: 0b1,
    allowedVenues: [USDC.toLowerCase()],
    allowedSpenders: ["0xdddddddddddddddddddddddddddddddddddddddd"],
    contractVenueIndex: { [USDC.toLowerCase()]: 0 },
    maxApprovalUsd: 10_000,
    approvalTokenPriceUsd: 1,
    approvalTokenDecimals: 6,
  };
}

function dismissToast(): void {
  const el = document.getElementById("fw11-toast");
  const code = document.getElementById("fw11-toast-code");
  const json = document.getElementById("fw11-toast-json");
  el?.classList.add("hidden");
  if (code) {
    code.textContent = "";
    code.classList.add("hidden");
  }
  if (json) {
    json.textContent = "";
    json.classList.add("hidden");
  }
}

function showToast(text: string): void {
  const el = document.getElementById("fw11-toast");
  const msg = document.getElementById("fw11-toast-msg");
  const code = document.getElementById("fw11-toast-code");
  const json = document.getElementById("fw11-toast-json");
  if (!el || !msg) {
    window.alert(text);
    return;
  }
  msg.textContent = text;
  code?.classList.add("hidden");
  json?.classList.add("hidden");
  el.classList.remove("hidden");
}

function showInterceptResult(payload: InterceptResult): void {
  const el = document.getElementById("fw11-toast");
  const msg = document.getElementById("fw11-toast-msg");
  const code = document.getElementById("fw11-toast-code");
  const json = document.getElementById("fw11-toast-json");
  if (!el || !msg || !code || !json) {
    window.alert(payload.plainTextWarning);
    return;
  }
  console.log("[FW-11]", payload);
  msg.textContent = payload.plainTextWarning;
  code.textContent = payload.code;
  code.classList.remove("hidden");
  json.textContent = JSON.stringify(payload, null, 2);
  json.classList.remove("hidden");
  el.classList.remove("hidden");
}

function installGuard(): EIP1193Provider {
  const base = window.ethereum ?? mockEthereum();
  guardedProvider = withRetailGuardProvider(base, demoConfig());
  return guardedProvider;
}

function infiniteApproveTx() {
  return {
    from: WALLET,
    to: USDC,
    data: encodeApproveCalldata(MALICIOUS, UINT256_MAX),
  };
}

function setTriggerBusy(busy: boolean): void {
  const btn = document.getElementById("fw11-trigger");
  if (!btn) return;
  btn.toggleAttribute("disabled", busy);
  btn.textContent = busy ? TRIGGER_BUSY : TRIGGER_LABEL;
}

function toInterceptResult(err: RetailGuardRejectedError): InterceptResult {
  return {
    code: err.code,
    message: err.message,
    plainTextWarning: err.plainTextWarning,
  };
}

async function onTrigger(): Promise<void> {
  const eth = guardedProvider;
  if (!eth) {
    showToast("Guard not initialized");
    return;
  }
  setTriggerBusy(true);
  try {
    const hash = await eth.request({
      method: "eth_sendTransaction",
      params: [infiniteApproveTx()],
    });
    showToast(`Passthrough allowed (demo mock tx: ${String(hash)})`);
  } catch (err) {
    if (err instanceof RetailGuardRejectedError) {
      showInterceptResult(toInterceptResult(err));
      return;
    }
    if ((err as { name?: string })?.name === "RetailGuardRejectedError") {
      const guardErr = err as RetailGuardRejectedError;
      showInterceptResult(toInterceptResult(guardErr));
      return;
    }
    showToast(String((err as Error)?.message ?? err));
  } finally {
    setTriggerBusy(false);
  }
}

document.getElementById("fw11-trigger")?.addEventListener("click", () => {
  void onTrigger();
});
document.getElementById("fw11-toast-close")?.addEventListener("click", dismissToast);

try {
  installGuard();
} catch (err) {
  showToast(`Guard init failed: ${String((err as Error)?.message ?? err)}`);
}
