import { HL_TESTNET_INFO_URL } from "../../../../config/constants";
import {
  HL_SESSION_KEY_AGENT_NAME,
  type ApproveAgentAction,
} from "../../auth";
import {
  HL_AGENT_REGISTRATION_TIMEOUT_MS,
  type HlExtraAgentRecord,
} from "./agentRegister-types";

/** Hyperliquid rejects approveAgent when agentName is empty or longer than 16 chars. */
export function withValidApproveAgentName(action: ApproveAgentAction): ApproveAgentAction {
  const raw = action.agentName?.trim();
  const agentName =
    raw && raw.length >= 1 && raw.length <= 16 ? raw : HL_SESSION_KEY_AGENT_NAME;
  return agentName === action.agentName ? action : { ...action, agentName };
}

/** Query HL info API for wallet-authorized session-key agents. */
export async function fetchHlExtraAgents(
  user: string,
  options: {
    fetchFn?: typeof fetch;
    infoUrl?: string;
    timeoutMs?: number;
  } = {},
): Promise<HlExtraAgentRecord[]> {
  const fetchFn = options.fetchFn ?? fetch;
  const infoUrl = options.infoUrl ?? HL_TESTNET_INFO_URL;
  const timeoutMs = options.timeoutMs ?? HL_AGENT_REGISTRATION_TIMEOUT_MS;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetchFn(infoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "extraAgents", user }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((entry) => {
        const row = entry as {
          name?: unknown;
          address?: unknown;
          validUntil?: unknown;
        };
        const address = String(row.address ?? "").trim();
        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return null;
        const validUntilRaw = row.validUntil;
        const validUntil =
          validUntilRaw == null || validUntilRaw === ""
            ? null
            : Number(validUntilRaw);
        return {
          name: String(row.name ?? ""),
          address: address.toLowerCase(),
          validUntil: Number.isFinite(validUntil) ? validUntil : null,
        };
      })
      .filter((entry): entry is HlExtraAgentRecord => entry != null);
  } catch {
    return [];
  }
}

/** True when the deterministic session-key agent is already authorized on HL L2. */
export function findActiveRegisteredSessionKeyAgent(
  agents: readonly HlExtraAgentRecord[],
  agentAddress: string,
  options: {
    agentName?: string;
    nowMs?: number;
  } = {},
): HlExtraAgentRecord | null {
  const agentName = options.agentName ?? HL_SESSION_KEY_AGENT_NAME;
  const nowMs = options.nowMs ?? Date.now();
  const normalized = agentAddress.toLowerCase();
  return (
    agents.find(
      (agent) =>
        agent.address === normalized &&
        agent.name === agentName &&
        (agent.validUntil == null || agent.validUntil > nowMs),
    ) ?? null
  );
}

export async function isSessionKeyAgentRegisteredOnL2(
  walletAddress: string,
  agentAddress: string,
  options: {
    fetchFn?: typeof fetch;
    infoUrl?: string;
    agentName?: string;
  } = {},
): Promise<HlExtraAgentRecord | null> {
  const agents = await fetchHlExtraAgents(walletAddress, options);
  return findActiveRegisteredSessionKeyAgent(agents, agentAddress, {
    agentName: options.agentName,
  });
}
