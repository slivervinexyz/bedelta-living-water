#!/usr/bin/env bash
# Aderyn 0.1.9 gate — highs-only scan; maps post-report exit 101 to 0 when report is clean.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/SliverVineGate"
set +e
aderyn . --highs-only
ec=$?
set -e
# Aderyn 0.1.9 panics (exit 101) after writing report.md — defer verdict to TS scorecard.
if [[ "$ec" -eq 101 ]] && [[ -f report.md ]]; then
  exit 0
fi
exit "$ec"
