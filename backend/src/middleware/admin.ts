import type { Context, Next } from "hono";

export async function requireAdmin(c: Context, next: Next) {
  const token = c.env.ADMIN_TOKEN;
  if (!token) return c.json({ ok: false, error: "ADMIN_TOKEN not configured" }, 500);

  const got = c.req.header("x-admin-token") || c.req.query("admin");
  if (got !== token) return c.json({ ok: false, error: "unauthorized" }, 401);

  await next();
}
