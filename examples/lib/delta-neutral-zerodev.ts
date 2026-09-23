/** Delta-neutral demo — ZeroDev AA CLI resolution + graceful native signer fallback. */
import { probeBundler } from "../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-bundler";
import { ARBITRUM_ONE_CHAIN_ID, buildZeroDevRpcUrl } from "../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-constants";
import { resolveZeroDevProjectId } from "../../scripts/_shared/mainnet-env";
import { e2eLog } from "./e2e-hud-renderer";

export type ZeroDevAaSignerMode = "zerodev_kernel_v3" | "native_eip1193";

export interface DeltaNeutralZeroDevState {
  requested: boolean;
  active: boolean;
  mode: ZeroDevAaSignerMode;
  degraded: boolean;
  sessionMandates: "ERC-7715" | null;
  paymaster: "ERC-7710" | null;
  zeroGasSponsored: boolean;
  message: string;
  probeError?: string;
}

const DEGRADATION_LOG =
  "[AA DEGRADATION] ZeroDev Paymaster unreachable -> Fallback to Native EIP-1193 Signer";
const DISABLED_LOG = "[AA STATE] ZeroDev Account Abstraction Disabled (--zerodev=off)";
const ACTIVE_LOG =
  "[AA STATE] ZeroDev Kernel v3 · ERC-7715 Session Mandates · ERC-7710 Paymaster · 0-Gas Sponsored";

export const ZERODEV_AA_READY_BADGE =
  "ZeroDev AA Ready · Kernel v3 AA · ERC-7715 Session Mandates · Paymaster 0-Gas Sponsored (ERC-7710 Expiry Sinker)";

export const ZERODEV_AA_BANNER_READY =
  "Account Abstraction: 🟢 ZeroDev Kernel v3 Ready · ERC-7715 Mandates Active";

export function formatZeroDevAaBannerLine(state: DeltaNeutralZeroDevState): string {
  if (state.active) return ZERODEV_AA_BANNER_READY;
  if (!state.requested) {
    return "Account Abstraction: ⚪ ZeroDev Disabled (--zerodev=off) · Native EIP-1193 Signer";
  }
  return "Account Abstraction: 🟡 ZeroDev AA Ready (degraded) · Native EIP-1193 Fallback";
}

export function parseZeroDevRequested(argv: readonly string[] = process.argv): boolean {
  for (const arg of argv) {
    if (!arg.startsWith("--zerodev=")) continue;
    const value = arg.slice("--zerodev=".length).trim().toLowerCase();
    if (value === "off") return false;
    if (value === "on") return true;
  }
  return true;
}

function nativeState(message: string, requested: boolean, degraded: boolean, probeError?: string): DeltaNeutralZeroDevState {
  if (requested && degraded) process.env.USE_ZERODEV_AA = "false";
  return {
    requested,
    active: false,
    mode: "native_eip1193",
    degraded,
    sessionMandates: null,
    paymaster: null,
    zeroGasSponsored: false,
    message,
    probeError,
  };
}

function activeState(): DeltaNeutralZeroDevState {
  process.env.USE_ZERODEV_AA = "true";
  return {
    requested: true,
    active: true,
    mode: "zerodev_kernel_v3",
    degraded: false,
    sessionMandates: "ERC-7715",
    paymaster: "ERC-7710",
    zeroGasSponsored: true,
    message: ACTIVE_LOG,
  };
}

export async function resolveDeltaNeutralZeroDevState(
  argv: readonly string[] = process.argv,
): Promise<DeltaNeutralZeroDevState> {
  const requested = parseZeroDevRequested(argv);
  if (!requested) return nativeState(DISABLED_LOG, false, false);

  const projectId = resolveZeroDevProjectId();
  if (!projectId) {
    return nativeState(DEGRADATION_LOG, true, true, "ZERODEV_PROJECT_ID missing");
  }

  const probe = await probeBundler(buildZeroDevRpcUrl(projectId, ARBITRUM_ONE_CHAIN_ID));
  if (!probe.reachable || !probe.supportsEntryPoint07) {
    return nativeState(DEGRADATION_LOG, true, true, probe.error ?? "bundler unreachable");
  }

  return activeState();
}

export function logDeltaNeutralZeroDevState(state: DeltaNeutralZeroDevState): void {
  e2eLog(state.message);
  if (state.probeError) e2eLog(`  └─ ${state.probeError}`);
}
