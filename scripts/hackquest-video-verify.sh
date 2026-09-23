#!/usr/bin/env bash
# HackQuest submission — keyword self-verify for demo video claims.
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

check() {
  local label="$1"
  local pattern="$2"
  shift 2
  echo "--- $label ---"
  if output=$("$@" 2>&1); then
    if echo "$output" | rg -m1 -q "$pattern"; then
      echo "  PASS: matched /$pattern/"
      echo "$output" | rg -m1 "$pattern" | sed 's/^/    /'
      PASS=$((PASS + 1))
    else
      echo "  FAIL: no match for /$pattern/"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "  FAIL: command exited non-zero"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

echo "=== HackQuest Video Self-Verify ==="
echo ""

check "exomesh FAIL_CLOSED / 0-Gas" \
  'FAIL_CLOSED|0-Gas|CHANNEL_SEVERED|0 Bytes' \
  pnpm demo:exomesh -- --trip --non-interactive

check "gmx GMX_FAIL_CLOSED" \
  'GMX_FAIL_CLOSED|FAIL_CLOSED' \
  pnpm demo:gmx -- --trip

check "vitest 35/35" \
  '35 passed' \
  npx vitest run tests/sdk/retail-guard-provider.test.ts

check "sanctuary REJECT / FAIL" \
  'FAIL_CLOSED|REJECT|REJECT_SLIPPAGE' \
  pnpm demo:sanctuary -- --non-interactive

check "ingress AML block" \
  'AML_INBOUND|BLOCKED' \
  pnpm demo:ingress -- --non-interactive

echo "=== Summary: $PASS PASS · $FAIL FAIL ==="

if (( FAIL > 0 )); then
  exit 1
fi
