import {
  HL_EXCHANGE_URL,
  HL_INFO_URL,
  HL_RPC_BACKUP_EXCHANGE_URL,
  HL_RPC_BACKUP_INFO_URL,
  HL_RPC_PUBLIC_EXCHANGE_URL,
  HL_RPC_PUBLIC_INFO_URL,
} from "../../../config/constants";
import type { RpcEndpoint } from "./types";

export function defaultInfoEndpoints(): readonly RpcEndpoint[] {
  return [
    { id: "hl-info-primary", role: "primary", url: HL_INFO_URL },
    { id: "hl-info-backup", role: "backup", url: HL_RPC_BACKUP_INFO_URL },
    { id: "hl-info-public", role: "public", url: HL_RPC_PUBLIC_INFO_URL },
  ];
}

export function defaultExchangeEndpoints(): readonly RpcEndpoint[] {
  return [
    { id: "hl-ex-primary", role: "primary", url: HL_EXCHANGE_URL },
    { id: "hl-ex-backup", role: "backup", url: HL_RPC_BACKUP_EXCHANGE_URL },
    { id: "hl-ex-public", role: "public", url: HL_RPC_PUBLIC_EXCHANGE_URL },
  ];
}
