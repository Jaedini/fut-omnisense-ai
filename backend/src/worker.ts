import app from "./index";

async function runPipeline(env: any) {
  const base = env.WORKER_PUBLIC_BASE.replace(/\/$/, "");
  const url =
    `${base}/pipeline/run?budget=${env.DEFAULT_BUDGET}` +
    `&minProfitPct=${env.DEFAULT_MIN_PROFIT}` +
    `&updatePrices=1&save=1`;

  await fetch(url, {
    method: "POST",
    headers: {
      "x-admin-token": env.ADMIN_TOKEN
    }
  });
}

export default {
  fetch: app.fetch,
  scheduled: (_: any, env: any, ctx: any) => {
    ctx.waitUntil(runPipeline(env));
  }
};
