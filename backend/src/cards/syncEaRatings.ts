import { upsertCard } from "./store";

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

function s(x: any): string {
  if (x == null) return "";
  if (typeof x === "string") return x.trim();
  if (typeof x === "number" || typeof x === "boolean") return String(x);
  // objects/arrays -> ignore (avoid "[object Object]")
  return "";
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map(v => s(v)).filter(Boolean)));
}

function buildEndpointBase(env: any) {
  const base = String(env.EA_RATINGS_BASE ?? "https://drop-api.ea.com/rating").replace(/\/$/, "");
  const game = String(env.EA_GAME_CODE ?? "ea-sports-fc").trim();
  return `${base}/${encodeURIComponent(game)}`;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { "User-Agent": "fut-omnisense-ai/1.0" } });
    if (!res.ok) throw new Error(`EA fetch failed ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function normalizeEaPlayer(p: any) {
  const id = s(p?.id ?? p?.playerId ?? p?.player_id);
  const firstName = s(p?.firstName);
  const lastName = s(p?.lastName);
  const commonName = s(p?.commonName);
  const name = s(p?.name) || commonName || s(`${firstName} ${lastName}`);

  if (!id || !name) return null;

  const overallRaw = Number(p?.overallRating ?? p?.overall ?? p?.ovr ?? 0);
  const overall = Number.isFinite(overallRaw) && overallRaw > 0 ? overallRaw : null;

  const position = s(p?.position ?? p?.preferredPosition ?? p?.positionShort).toUpperCase() || null;

  const clubName = s(p?.club?.name ?? p?.clubName) || null;
  const leagueName = s(p?.league?.name ?? p?.leagueName) || null;
  const nationName = s(p?.nation?.name ?? p?.nationality ?? p?.nationName) || null;

  const tags = uniq([
    "EA_RATINGS",
    position ? `POS_${position}` : ""
  ]);

  const keywords = uniq([
    name,
    commonName,
    lastName,
    firstName,
    position ?? "",
    clubName ?? "",
    leagueName ?? "",
    nationName ?? "",
    overall ? `ovr ${overall}` : "",
    overall ? String(overall) : ""
  ]);

  return {
    cardId: `ea:${id}`,
    eaPlayerId: id,
    name,
    overall,
    position,
    clubName,
    leagueName,
    nationName,
    tags,
    keywords,
    updatedAt: Date.now()
  };
}

export async function syncCardsFromEA(env: any) {
  const endpointBase = buildEndpointBase(env);
  const pageSize = clamp(Number(env.EA_SYNC_PAGE_SIZE ?? 100), 10, 200);
  const maxPages = clamp(Number(env.EA_SYNC_MAX_PAGES ?? 10), 1, 300);
  const timeoutMs = clamp(Number(env.EA_SYNC_TIMEOUT_MS ?? 12000), 3000, 30000);

  let imported = 0, rejected = 0, pages = 0, errors = 0;

  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const url = `${endpointBase}?limit=${pageSize}&offset=${offset}`;
    const data = await fetchJsonWithTimeout(url, timeoutMs);

    const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
    if (!items.length) break;

    for (const p of items) {
      const card = normalizeEaPlayer(p);
      if (!card) { rejected++; continue; }
      try {
        await upsertCard(env, card);
        imported++;
      } catch {
        errors++;
      }
    }

    pages++;
    if (items.length < pageSize) break;
  }

  return { ok: true, endpoint: endpointBase, pages, imported, rejected, errors };
}
