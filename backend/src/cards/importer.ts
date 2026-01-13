import { mongoUpdateOne } from "../db/mongo/dataApi";
import { stableId } from "../utils/stableId";
import { parseCsv } from "./parseCsv";

type ImportOpts = { contentType: string; payload: string };

type CardDoc = {
  cardId: string;
  name?: string;
  releaseDate?: number; // unix ms
  tags?: string[];      // e.g. ["GOLD","TOTW"]
  keywords?: string[];  // used for entity matching
  price?: number;       // current
  updatedAt?: number;
};

function normalizeCard(x: any): CardDoc | null {
  const cardId = String(x.cardId ?? x.id ?? x.card_id ?? "").trim();
  if (!cardId) return null;

  const name = x.name ? String(x.name) : undefined;

  let releaseDate: number | undefined;
  if (x.releaseDate) releaseDate = Number(x.releaseDate);
  if (x.release_date) releaseDate = Number(x.release_date);
  if (x.releaseDateISO) {
    const t = Date.parse(String(x.releaseDateISO));
    if (Number.isFinite(t)) releaseDate = t;
  }

  const tags = Array.isArray(x.tags) ? x.tags.map(String) :
    (typeof x.tags === "string" ? x.tags.split("|").map((s: string) => s.trim()).filter(Boolean) : []);

  const keywords = Array.isArray(x.keywords) ? x.keywords.map(String) :
    (typeof x.keywords === "string" ? x.keywords.split("|").map((s: string) => s.trim()).filter(Boolean) : []);

  const price = x.price != null && x.price !== "" ? Number(x.price) : undefined;

  return {
    cardId,
    name,
    releaseDate: releaseDate && Number.isFinite(releaseDate) ? releaseDate : undefined,
    tags,
    keywords,
    price: price && Number.isFinite(price) ? price : undefined,
    updatedAt: Date.now()
  };
}

async function upsertCard(env: any, card: CardDoc) {
  await mongoUpdateOne(env, {
    collection: "cards",
    filter: { cardId: card.cardId },
    update: { $set: card, $setOnInsert: { createdAt: Date.now(), _id: stableId(`card:${card.cardId}`) } },
    upsert: true
  });
}

export async function importCards(env: any, opts: ImportOpts) {
  const ct = opts.contentType.toLowerCase();
  let items: any[] = [];

  if (ct.includes("application/json")) {
    const parsed = JSON.parse(opts.payload);
    items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.cards) ? parsed.cards : []);
  } else if (ct.includes("text/csv") || ct.includes("application/csv") || ct.includes("text/plain")) {
    items = parseCsv(opts.payload);
  } else {
    // try JSON fallback
    try {
      const parsed = JSON.parse(opts.payload);
      items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.cards) ? parsed.cards : []);
    } catch {
      items = parseCsv(opts.payload);
    }
  }

  let ok = 0, bad = 0;
  for (const raw of items) {
    const card = normalizeCard(raw);
    if (!card) { bad++; continue; }
    await upsertCard(env, card);
    ok++;
  }

  return { imported: ok, rejected: bad };
}
