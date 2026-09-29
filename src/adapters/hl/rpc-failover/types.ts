export type RpcEndpointRole = "primary" | "backup" | "public";
export type RpcChannel = "info" | "exchange";

export interface RpcEndpoint {
  id: string;
  role: RpcEndpointRole;
  url: string;
}

export interface RpcHealthLog {
  channel: RpcChannel;
  endpointId: string;
  role: RpcEndpointRole;
  url: string;
  latencyMs: number;
  ok: boolean;
  switched: boolean;
  reason?: "LATENCY" | "TIMEOUT" | "HTTP_ERROR" | "NETWORK";
  timestamp: string;
}

export interface RpcHealthStatus {
  primaryOk: boolean;
  backupOk: boolean;
  fallbackBuffered: boolean;
}

export interface RpcFailoverFetchOptions {
  fetchFn?: typeof fetch;
  latencyMs?: number;
  timeoutMs?: number;
  endpoints?: readonly RpcEndpoint[];
  extraHosts?: readonly string[];
}

export class RpcFailoverGracefulError extends Error {
  readonly health: RpcHealthStatus;

  constructor(health: RpcHealthStatus) {
    super("RPC_FAILOVER_BUFFERED");
    this.name = "RpcFailoverGracefulError";
    this.health = health;
  }
}
