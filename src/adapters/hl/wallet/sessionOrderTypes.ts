import type { TerminalLogLevel } from "../../../lib/gui-bridge/terminal-log";

export interface BrowserLive5TxLogEntry {
  level: TerminalLogLevel;
  message: string;
}

export interface BrowserLive5TxProgress {
  onLog: (entry: BrowserLive5TxLogEntry) => void;
  onSessionBound?: () => void;
  onOrderSubmitted?: (index: number, side: string, latencyMs: number) => void;
  onFillConfirmed?: (
    index: number,
    side: "BUY" | "SHORT",
    txHash: string,
    latencyMs: number,
  ) => void;
}

export const LIVE_5TX_ORDER_SIDES: readonly ("BUY" | "SHORT")[] = [
  "BUY",
  "SHORT",
  "BUY",
  "SHORT",
  "BUY",
];

export const LIVE_5TX_ACCOUNT_BALANCE_USD = 50_000;
