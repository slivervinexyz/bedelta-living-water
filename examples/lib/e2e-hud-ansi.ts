/** Shared ANSI helpers for E2E HUD modules. */
export const RESET = "\x1b[0m";
export const GREEN = "\x1b[32m";
export const BRIGHT_GREEN = "\x1b[92m";
export const YELLOW = "\x1b[33m";
export const BLUE = "\x1b[34m";
export const CYAN = "\x1b[36m";
export const BRIGHT_CYAN = "\x1b[96m";
export const BRIGHT_MAGENTA = "\x1b[95m";
export const BOLD = "\x1b[1m";
export const BOLD_CYAN = "\x1b[1m\x1b[36m";
export const BOLD_GREEN = "\x1b[1m\x1b[32m";
export const BOLD_YELLOW = "\x1b[1m\x1b[33m";
export const BOLD_RED = "\x1b[1m\x1b[31m";
export const RED_BOLD = "\x1b[1m\x1b[31m";
export const ORANGE = "\x1b[38;5;208m";
export const GRAY = "\x1b[90m";
export const useColor = process.env.NO_COLOR !== "1";

export function wrap(color: string, text: string): string {
  return useColor ? `${color}${text}${RESET}` : text;
}

export function stripAnsi(line: string): string {
  return line.replace(/\x1b\[[0-9;]*m/g, "");
}

export function e2eLogColored(line: string): void {
  console.log(useColor ? line : stripAnsi(line));
}
