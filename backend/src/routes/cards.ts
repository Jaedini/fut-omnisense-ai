import { Hono } from "hono";
import { listCards } from "../cards/store";
import { syncCardsFromEA } from "../cards/syncEaRatings";
import { upsertCardPrice } from "../cards/store";

function requireAdmin(c: any) {
  const token = c.env.ADMIN_TOKEN;
  const got = c.req.header("x-admin-token") || c.req.query("admin");
  return token && got === token;
}

export const cardsRoute = new Hono();

cardsRoute.get("/", async (c) => {
  const limit = Number(c.req.query("limit") ?? 100);
  const res = await listCards(c.env, { limit });
  return c.json({ ok: true, ...res });
});

cardsRoute.post("/sync", async (c) => {
  if (!requireAdmin(c)) return c.json({ ok: false, error: "unauthorized" }, 401);

  try {
    // Cap pages hard to avoid worker timeouts (you can increase later)
    const old = c.env.EA_SYNC_MAX_PAGES;
    c.env.EA_SYNC_MAX_PAGES = String(Math.min(Number(old ?? 10), 10));

    const res = await syncCardsFromEA(c.env);
    return c.json(res);
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message ?? e), where: "cards/sync" }, 500);
  }
});

cardsRoute.post("/setPrice", async (c) => {
  if (!requireAdmin(c)) return c.json({ ok: false, error: "unauthorized" }, 401);

  const body = await c.req.json().catch(() => null);
  const cardId = String(body?.cardId ?? "");
  const price = Number(body?.price ?? 0);
  const source = String(body?.source ?? "manual");

  if (!cardId || !Number.isFinite(price) || price <= 0) {
    return c.json({ ok: false, error: "cardId + price required" }, 400);
  }

  await upsertCardPrice(c.env, cardId, price, source);
  return c.json({ ok: true, cardId, price, source });
});
