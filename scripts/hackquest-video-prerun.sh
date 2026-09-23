#!/usr/bin/env bash
# HackQuest Demo Video — Dual Pillar timing prerun (non-interactive).
set -euo pipefail
cd "$(dirname "$0")/.."

now_ms() {
  node -e 'process.stdout.write(String(Date.now()))'
}

echo "=== HackQuest Demo Prerun — Dual Pillar 120s ==="
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

TOTAL_START=$(now_ms)

run_step() {
  local label="$1"
  shift
  echo "--- $label ---"
  local start end elapsed
  start=$(now_ms)
  "$@"
  end=$(now_ms)
  elapsed=$((end - start))
  printf "  → %s: %d.%03ds\n\n" "$label" $((elapsed / 1000)) $((elapsed % 1000))
}

run_step "1/5 demo:exomesh --non-interactive" \
  pnpm demo:exomesh -- --non-interactive

run_step "2/5 demo:gmx --trip" \
  pnpm demo:gmx -- --trip

run_step "3/5 vitest retail-guard 35/35" \
  npx vitest run tests/sdk/retail-guard-provider.test.ts

run_step "4/5 demo:sanctuary --non-interactive" \
  pnpm demo:sanctuary -- --non-interactive

run_step "5/5 demo:ingress --non-interactive" \
  pnpm demo:ingress -- --non-interactive

TOTAL_END=$(now_ms)
TOTAL_ELAPSED=$((TOTAL_END - TOTAL_START))
printf "=== TOTAL: %d.%03ds (target ≤120s · hard cap 180s) ===\n" \
  $((TOTAL_ELAPSED / 1000)) $((TOTAL_ELAPSED % 1000))

if (( TOTAL_ELAPSED > 180000 )); then
  echo "WARN: Over 180s — use demo:exomesh -- --trip --non-interactive for Step 1"
  exit 1
fi
if (( TOTAL_ELAPSED > 120000 )); then
  echo "NOTE: Over 120s target — consider --trip for exomesh or post-edit cuts"
else
  echo "OK: Within 120s target — full Dual Pillar path fits demo video"
fi
