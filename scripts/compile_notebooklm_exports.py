#!/usr/bin/env python3
"""Compile NotebookLM-ready exports from public docs + chaos audit sources."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "docs" / "audit"
OUT_PATH = OUT_DIR / "notebooklm-compiled-export.txt"

SOURCES = [
    ROOT / "docs" / "ARCHITECTURE.md",
    ROOT / "docs" / "ARBITRUM_ONE_PAGER.md",
    ROOT / "docs" / "Buildaton.md",
    ROOT / "docs" / "grant" / "ARCHITECTURE.md",
    ROOT / "docs" / "grant" / "GRANT_PROPOSAL.md",
    ROOT / "docs" / "00_ARB_Buildathon" / "SUBMISSION.md",
    ROOT / "docs" / "grant" / "GMX_BUILDERS_PITCH.md",
    ROOT / "scripts" / "chaos-blackswan-stress.ts",
    ROOT / "docs" / "audit" / "chaos-blackswan-metrics.json",
    ROOT / "docs" / "audit" / "zerodev-aa-metrics.json",
]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    parts: list[str] = [
        "# SliverVine NotebookLM Compiled Export\n",
        f"# sources={len(SOURCES)}\n",
    ]
    compiled = 0
    for path in SOURCES:
        if not path.exists():
            continue
        rel = path.relative_to(ROOT)
        parts.append(f"\n\n===== SOURCE: {rel} =====\n\n")
        parts.append(path.read_text(encoding="utf-8"))
        compiled += 1
    OUT_PATH.write_text("".join(parts), encoding="utf-8")
    print(f"[notebooklm] compiled {compiled}/{len(SOURCES)} sources → {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
