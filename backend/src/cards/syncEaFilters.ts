import { mongoUpdateOne } from "../db/mongo/dataApi";

function buildEndpointBase(env: any) {
  const base = String(env.EA_RATINGS_BASE ?? "https://drop-api.ea.com/rating").replace(/\/$/, "");
  const game = String(env.EA_GAME_CODE ?? "ea-sports-fc").trim();
  return `${base}/${encodeURIComponent(game)}`;
}

export async function syncEaFilters(env: any) {
  const endpointBase = buildEndpointBase(env);
  const url = `${endpointBase}/filters`;

  const res = await fetch(url, { headers: { "User-Agent": "fut-omnisense-ai/1.0" } });
  if (!res.ok) throw new Error(`EA filters fetch failed ${res.status}`);
  const json = await res.json();

  await mongoUpdateOne(env, {
    collection: "ea_filters",
    filter: { _id: "ea_filters_latest" },
    update: { $set: { _id: "ea_filters_latest", fetchedAt: Date.now(), endpoint: url, raw: json } },
    upsert: true
  });

  return { endpoint: url, saved: true };
}
