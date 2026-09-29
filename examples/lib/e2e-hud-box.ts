/** E2E HUD box-drawing primitives — unified with venue-demo-hud styling. */
import { BOLD, RESET, stripAnsi, useColor } from "./e2e-hud-ansi";

export const E2E_BOX_W = 74;
export const MODULE_A_TAG = "[Module A: ExoMesh]";
export const MODULE_B_TAG = "[Module B: Sanctuary]";

function paint(color: string, text: string): string {
  return useColor ? `${color}${text}${RESET}` : text;
}

export function e2eBoxLine(inner: string, color: string, width = E2E_BOX_W): void {
  const pad = Math.max(0, width - 2 - stripAnsi(inner).length);
  console.log(`${paint(color, "│")}${inner}${" ".repeat(pad)}${paint(color, "│")}`);
}

export function e2eBoxOpen(title: string, color: string, width = E2E_BOX_W): void {
  console.log(paint(color, `┌${"─".repeat(width - 2)}┐`));
  e2eBoxLine(` ${BOLD}${title}${RESET}`, color, width);
}

export function e2eBoxRule(color: string, width = E2E_BOX_W): void {
  console.log(paint(color, `├${"─".repeat(width - 2)}┤`));
}

export function e2eBoxClose(color: string, width = E2E_BOX_W): void {
  console.log(paint(color, `└${"─".repeat(width - 2)}┘`));
}

export function e2eDoubleBoxLine(inner: string, color: string, width = E2E_BOX_W): void {
  const pad = Math.max(0, width - 2 - stripAnsi(inner).length);
  console.log(`${paint(color, "║")}${inner}${" ".repeat(pad)}${paint(color, "║")}`);
}

export function e2eDoubleBoxOpen(lines: readonly string[], color: string, width = E2E_BOX_W): void {
  console.log(paint(color, `╔${"═".repeat(width - 2)}╗`));
  for (const line of lines) e2eDoubleBoxLine(line, color, width);
}

export function e2eDoubleBoxClose(color: string, width = E2E_BOX_W): void {
  console.log(paint(color, `╚${"═".repeat(width - 2)}╝`));
}

export function e2eBoxStepBlock(
  step: number,
  title: string,
  moduleTag: string,
  pillarLines: readonly string[],
  color: string,
): void {
  e2eBoxOpen(`Step ${step}: ${title}`, color);
  e2eBoxLine(` ${BOLD}${moduleTag}${RESET}`, color);
  for (const line of pillarLines) {
    e2eBoxLine(` ${line}`, color);
  }
  e2eBoxClose(color);
}
