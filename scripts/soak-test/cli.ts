/** Soak test CLI + mock fetch. */
import {
  SOAK_ROLLING_MAX_TICKS,
  SOAK_TELEMETRY_COINS,
} from "../../src/services/soak-telemetry";

export const DEFAULT_ITERATIONS = SOAK_ROLLING_MAX_TICKS;
export const WARMUP_ITERATIONS = 5;
export const MAX_HEAP_VARIANCE_RATIO = 0.2;
const MOCK_LATENCY_MS = 12;
const MOCK_FAULT_EVERY = 173;

const SAMPLE_BOOK = {
  coin: "BTC",
  levels: [
    [{ px: "65000", sz: "1000" }],
    [{ px: "65002", sz: "8000" }],
  ],
  time: Date.now(),
};

const ETH_BOOK = {
  coin: "ETH",
  levels: [
    [{ px: "3500", sz: "1200" }],
    [{ px: "3500.5", sz: "9000" }],
  ],
  time: Date.now(),
};

export interface SoakCliOptions {
  iterations: number;
  useMock: boolean;
}

export function parseCliOptions(argv: readonly string[]): SoakCliOptions {
  const iterationsFlag = argv.indexOf("--iterations");
  const parsed =
    iterationsFlag >= 0 ? Number(argv[iterationsFlag + 1]) : DEFAULT_ITERATIONS;

  return {
    iterations:
      Number.isFinite(parsed) && parsed > 0
        ? Math.floor(parsed)
        : DEFAULT_ITERATIONS,
    useMock: argv.includes("--mock"),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockFetch(iteration: number): typeof fetch {
  return (async (_input: RequestInfo | URL, init?: RequestInit) => {
    await sleep(MOCK_LATENCY_MS);

    if (iteration > 0 && iteration % MOCK_FAULT_EVERY === 0) {
      throw new Error("SOAK_INJECTED_NETWORK_FAULT");
    }

    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const coin = String(body.coin ?? "BTC").toUpperCase();
    return Response.json(coin === "ETH" ? ETH_BOOK : SAMPLE_BOOK);
  }) as typeof fetch;
}

export function heapMb(bytes: number): number {
  return Number((bytes / (1024 * 1024)).toFixed(3));
}
