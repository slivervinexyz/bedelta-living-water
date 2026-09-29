# FW-11 Browser UI Demo

Judge-facing **visual harness** for infinite-approve interception.

```bash
pnpm demo:FW-11-ui
# → http://127.0.0.1:4173/
```

## Honesty boundaries

- **Mock EIP-1193** — stub `eth_accounts` / `0xmock` tx hash; not MetaMask or Rabby.
- **`preferWasm: false`** — TS approve gate; does not load `soil_core.wasm` in browser.
- **Tailwind via CDN** — offline = unstyled UI; guard logic still runs (esbuild bundle).

## Proof

| Layer | Command |
|-------|---------|
| Authoritative | `npx vitest run tests/sdk/retail-guard-provider.test.ts` (**35/35**) |
| Automated UI | `pnpm test:e2e` (Playwright; first run: `pnpm test:e2e:install`; WSL without sudo: `pnpm test:e2e:libs`; else `sudo pnpm test:e2e:deps`) |
| Wasm depth | `pnpm demo:gmx -- --trip` (separate lane) |
