import { Hono } from "hono";

export const rulesRoute = new Hono();

rulesRoute.get("/", async (c) => {
  return c.json({
    ok: true,
    rules: {
      minConfidence: 70,
      allowedRisk: ["LOW", "MEDIUM"],
      requirePrice: true
    }
  });
});

rulesRoute.post("/", async (c) => {
  // später persistieren (KV oder D1)
  const body = await c.req.json();
  return c.json({ ok: true, saved: body });
});
