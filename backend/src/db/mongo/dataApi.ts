async function dataApiFetch(env: any, path: string, body: any) {
  const url = `${env.MONGO_DATA_API_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.MONGO_DATA_API_KEY
    },
    body: JSON.stringify({
      dataSource: env.MONGO_DATA_SOURCE,
      database: env.MONGO_DB,
      ...body
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Mongo Data API error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function mongoInsertMany(env: any, args: { collection: string; documents: any[] }) {
  return dataApiFetch(env, "/action/insertMany", args);
}

export async function mongoFind(env: any, args: { collection: string; filter: any; limit?: number; sort?: any; projection?: any }) {
  return dataApiFetch(env, "/action/find", args);
}

export async function mongoUpdateOne(env: any, args: { collection: string; filter: any; update: any; upsert?: boolean }) {
  return dataApiFetch(env, "/action/updateOne", args);
}

export async function mongoUpdateMany(env: any, args: { collection: string; filter: any; update: any }) {
  return dataApiFetch(env, "/action/updateMany", args);
}
