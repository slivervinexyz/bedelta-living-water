/**
 * v0.8 — RPC Multi-Endpoint Failover Relay (Primary → Backup → Public).
 * Auto-switch when latency >150ms or timeout; emits RPC Health Log.
 */

export * from "./rpc-failover/types";
export * from "./rpc-failover/endpoints";
export {
  probeRpcHealth,
  getRpcHealthLogs,
  getActiveRpcEndpointId,
  __resetRpcFailoverForTests,
} from "./rpc-failover/health";
export { fetchWithRpcFailover } from "./rpc-failover/fetch";
