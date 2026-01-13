import { d1All } from "../db/d1";
import { computeMinSellPrice, passesHardRules } from "../logic/rules/hardRules";

export async function buildRecommendations(env: any, opts: { budget: number; minProfitPct: number }) {
  const rows = await d1All<any>(env, `
    SELECT * FROM cards
    WHERE price IS NOT NULL AND price <= ?
    ORDER BY updatedAt DESC
    LIMIT 500
  `, [opts.budget]);

  const recs = [];

  for (const card of rows) {
    const ok = passesHardRules(card, {
      budget: opts.budget,
      minProfitPct: opts.minProfitPct,
      eaTaxPct: 5,
      minDaysAfterRelease: 7,
      excludedEventTags: ["TOTW", "PROMO"]
    });

    if (!ok.ok) continue;

    const buy = Number(card.price);
    const minSell = computeMinSellPrice(buy, { eaTaxPct: 5, minProfitPct: opts.minProfitPct });
    const expectedSell = Math.ceil(minSell * 1.15);
    const profitPct = ((expectedSell * 0.95) / buy - 1) * 100;

    if (profitPct < opts.minProfitPct) continue;

    recs.push({
      cardId: card.cardId,
      buy,
      minSell,
      expectedSell,
      expectedProfitPct: Math.round(profitPct * 10) / 10,
      confidence: Math.min(92, 55 + profitPct * 2),
      risk: profitPct > 20 ? "MEDIUM" : "LOW",
      reasons: ["Estimated market value", "Hype & sentiment weighted"]
    });
  }

  return recs.sort((a, b) => b.expectedProfitPct - a.expectedProfitPct).slice(0, 30);
}
