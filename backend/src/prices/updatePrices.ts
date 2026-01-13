import { d1All } from "../db/d1";
import { upsertCardPrice } from "../cards/store";
import { estimatePrice } from "./estimatedPrice";

export async function updatePrices(env: any, opts: { limit: number }) {
  const cards = await d1All<any>(env, `
    SELECT c.*,
           IFNULL(s.hype,0) AS hype,
           IFNULL(s.sentiment,0) AS sentiment,
           IFNULL(s.mentions,0) AS mentions
    FROM cards c
    LEFT JOIN signals s ON s.text LIKE '%' || c.name || '%'
    ORDER BY c.updatedAt DESC
    LIMIT ?
  `, [Math.min(300, opts.limit)]);

  let updated = 0;

  for (const card of cards) {
    const price = estimatePrice(card, {
      hype: card.hype,
      sentiment: card.sentiment,
      mentions: card.mentions
    });

    if (price > 500) {
      await upsertCardPrice(env, card.cardId, price, "estimated");
      updated++;
    }
  }

  return {
    ok: true,
    mode: "ESTIMATED_MULTI_SOURCE",
    updated
  };
}
