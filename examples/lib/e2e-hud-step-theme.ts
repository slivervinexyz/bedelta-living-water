/** E2E pipeline step theme — SSOT for roadmap colors and step title inheritance. */
import { BLUE, BOLD, BOLD_RED, BRIGHT_CYAN, BRIGHT_MAGENTA, YELLOW } from "./e2e-hud-ansi";

export const E2E_EXECUTION_PIPELINE_STEPS = [
  { step: 1, label: "Intent Clearing", color: BRIGHT_CYAN },
  { step: 2, label: "Compliance Escort", color: BRIGHT_MAGENTA },
  { step: 3, label: "GMX GM Deposit", color: `${BOLD}${YELLOW}` },
  { step: 4, label: "HL Session Hedge", color: BLUE },
] as const;

export const E2E_R20_SHIELD = {
  label: "R20 Physical Deadlock & Panic Flash (Always-On Circuit Breaker)",
  color: BOLD_RED,
} as const;

export const E2E_PIPELINE_STEPS = [
  ...E2E_EXECUTION_PIPELINE_STEPS,
  { step: 5, label: "ExoMesh R20 Exercise", color: BOLD_RED },
] as const;

export function e2eStepThemeColor(step: number): string {
  return E2E_PIPELINE_STEPS[step - 1]?.color ?? BRIGHT_CYAN;
}

export function formatE2eSoilTripReason(reason: string): string {
  return reason.replace(
    /CROSS_VENUE_SLIPPAGE=([0-9.]+)%>([0-9.]+)%/g,
    (_match, actual: string, limit: string) =>
      `CROSS_VENUE_SLIPPAGE=${parseFloat(actual).toFixed(2)}%>${parseFloat(limit).toFixed(2)}%`,
  );
}

export function formatE2eSoilTripReasons(reasons: string[]): string {
  return reasons.map(formatE2eSoilTripReason).join(" · ");
}
