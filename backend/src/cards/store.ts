import { d1All, d1Exec } from "../db/d1";

export async function listCards(env: any, opts: { limit: number }) {
  const limit = Math.min(1000, Math.max(1, opts.limit));
  const cards = await d1All(env, `SELECT * FROM cards ORDER BY updatedAt DESC LIMIT ?`, [limit]);
  return { count: cards.length, cards };
}

export async function upsertCard(env: any, card: any) {
  const keywords = Array.isArray(card.keywords) ? card.keywords.join("|") : (card.keywords ?? "");
  const tags = Array.isArray(card.tags) ? card.tags.join("|") : (card.tags ?? "");

  await d1Exec(env, `
    INSERT INTO cards (
      cardId, eaPlayerId, name, keywords, tags, overall, position, clubName, leagueName, nationName,
      releaseDate, price, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(cardId) DO UPDATE SET
      eaPlayerId=excluded.eaPlayerId,
      name=excluded.name,
      keywords=excluded.keywords,
      tags=excluded.tags,
      overall=excluded.overall,
      position=excluded.position,
      clubName=excluded.clubName,
      leagueName=excluded.leagueName,
      nationName=excluded.nationName,
      releaseDate=excluded.releaseDate,
      price=COALESCE(excluded.price, cards.price),
      updatedAt=excluded.updatedAt
  `, [
    String(card.cardId),
    card.eaPlayerId ?? null,
    card.name ?? null,
    keywords,
    tags,
    card.overall ?? null,
    card.position ?? null,
    card.clubName ?? null,
    card.leagueName ?? null,
    card.nationName ?? null,
    card.releaseDate ?? null,
    card.price ?? null,
    card.updatedAt ?? Date.now()
  ]);
}

export async function upsertCardPrice(env: any, cardId: string, price: number, source: string) {
  await d1Exec(env, `
    UPDATE cards
    SET price = ?, updatedAt = ?, 
        tags = CASE WHEN tags IS NULL THEN ? ELSE tags END
    WHERE cardId = ?
  `, [Math.round(price), Date.now(), "EA_RATINGS", cardId]);

  // optional: you could store price history in another table later
}
