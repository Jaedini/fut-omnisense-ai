export async function d1Exec(env: any, sql: string, params: any[] = []) {
  return env.DB.prepare(sql).bind(...params).run();
}

export async function d1All<T = any>(env: any, sql: string, params: any[] = []): Promise<T[]> {
  const r = await env.DB.prepare(sql).bind(...params).all();
  return (r.results ?? []) as T[];
}

export async function d1Get<T = any>(env: any, sql: string, params: any[] = []): Promise<T | null> {
  const r = await env.DB.prepare(sql).bind(...params).first();
  return (r ?? null) as T | null;
}
