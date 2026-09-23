import { Wallet } from "ethers";
import { MAX_ORDER_CLIP_USD } from "../../src/config/risk-parameters";
import { executeSignedAction } from "../../src/adapters/hl/execution-transport";
import {
  buildFlashUnwindPlan,
  executeFlashUnwindPlan,
  FLASH_UNWIND_BUDGET_MS,
} from "../../src/services/risk/flash-unwind";
import {
  auditSessionKeyConstraints,
  SESSION_KEY_AUTO_EXPIRE_MS,
} from "../../src/services/risk/session-audit";
import {
  fundingEpochGuard,
  negativeFundingTrap,
} from "../../src/services/risk/soil-protection";
import { sendPanicAlert } from "../../src/services/telemetry/telegram-alert";
import { loadEnvProduction, requireEnv } from "../_shared/mainnet-env";
import { buildPanicCtx, LIVE } from "./panic-flash.ctx";
import { postInfo, snapshotPortfolio } from "./panic-flash.hl";

export async function main(): Promise<void> {
  console.log("");
  console.log("═══ PANIC FLASH-UNWIND ═══");
  console.log(
    `Mode: ${LIVE ? "LIVE" : "DRY_RUN"}  budget=<${FLASH_UNWIND_BUDGET_MS}ms`,
  );

  loadEnvProduction();
  const sessionPk = requireEnv("HYPERLIQUID_MAINNET_SESSION_PK");
  const userAddress = requireEnv("HYPERLIQUID_MAINNET_USER_ADDRESS");
  const wallet = new Wallet(sessionPk);

  const epoch = fundingEpochGuard();
  console.log(`Epoch:  ${epoch.locked ? "LOCKED" : "CLEAR"}  ${epoch.reason}`);

  const audit = auditSessionKeyConstraints({
    agentAddress: wallet.address,
    maxOrderClipUsd: MAX_ORDER_CLIP_USD,
    expiresAtMs: Date.now() + SESSION_KEY_AUTO_EXPIRE_MS,
  });
  console.log(
    `Session: clip=$${audit.clipLimitUsd}  expiryOk=${audit.expiryOk}  ok=${audit.ok}`,
  );

  console.log("── Snapshot open orders + Spot/Perp legs ──");
  const { openOrders, positions } = await snapshotPortfolio(userAddress);
  console.log(
    `Orders: ${openOrders.length}  Positions: ${positions.length} (${positions.map((p) => `${p.market}:${p.coin}:${p.szi}`).join(", ") || "none"})`,
  );

  try {
    const meta = (await postInfo({ type: "metaAndAssetCtxs" })) as [
      { universe?: Array<{ name?: string }> },
      Array<{ funding?: string }>,
    ];
    const firstPos = positions.find((p) => p.market === "perp");
    if (firstPos?.coin) {
      const idx = (meta[0]?.universe ?? []).findIndex(
        (u) => (u.name ?? "").toUpperCase() === firstPos.coin,
      );
      if (idx >= 0) {
        const hourly = parseFloat(meta[1]?.[idx]?.funding ?? "0") || 0;
        const apy = hourly * 24 * 365;
        const trap = negativeFundingTrap(apy, { alert: false });
        console.log(
          `Funding: apy=${(apy * 100).toFixed(2)}%  trap=${trap.unwind ? "UNWIND" : "OK"}`,
        );
      }
    }
  } catch {
    /* non-fatal */
  }

  const plan = buildFlashUnwindPlan({ openOrders, positions });
  console.log(
    `Plan:   cancel=${plan.cancelCount}  reduceOnlyCloses=${plan.closeActions.length}`,
  );

  await sendPanicAlert(
    `FLASH_UNWIND_${LIVE ? "LIVE" : "DRY"} cancel=${plan.cancelCount} closes=${plan.closeActions.length}`,
  );

  if (!LIVE) {
    console.log("── DRY_RUN envelope (no L2 broadcast) ──");
    console.log(
      JSON.stringify(
        {
          mode: "DRY_RUN",
          liveFlagRequired: "--live",
          cancelAction: plan.cancelAction,
          cancelCount: plan.cancelCount,
          closeActions: plan.closeActions.map((c) => ({
            market: c.market,
            asset: c.asset,
            isBuy: c.isBuy,
            size: c.size,
            limitPx: c.limitPx,
            reduceOnly: true,
          })),
          preparedAt: plan.preparedAt,
        },
        null,
        2,
      ),
    );
    const timed = await executeFlashUnwindPlan(plan, async () => {
      /* dry-run: intentionally no exchange POST */
    });
    console.log(
      `RESULT: DRY_RUN  elapsed=${timed.elapsedMs}ms  withinBudget=${timed.withinBudget}  ok=${timed.ok}  (pass --live to broadcast)`,
    );
    console.log("");
    return;
  }

  console.log("── LIVE broadcast armed (--live) ──");

  if (plan.cancelCount === 0 && plan.closeActions.length === 0) {
    console.log("RESULT: LIVE noop — no open orders or positions");
    console.log("");
    return;
  }

  const ctx = buildPanicCtx(sessionPk, userAddress);
  let nonce = Date.now();
  const timed = await executeFlashUnwindPlan(plan, async (action) => {
    await executeSignedAction(action, ctx, {
      skipPreTrade: true,
      nonce: nonce++,
    });
  });

  console.log(
    `RESULT: ${timed.ok ? "LIVE OK" : "LIVE FAIL"}  elapsed=${timed.elapsedMs}ms  budget=${timed.budgetMs}ms  withinBudget=${timed.withinBudget}`,
  );
  if (timed.errors.length) {
    console.log(`Errors: ${timed.errors.join(" | ")}`);
  }
  console.log("");
  if (!timed.ok) process.exit(1);
}
