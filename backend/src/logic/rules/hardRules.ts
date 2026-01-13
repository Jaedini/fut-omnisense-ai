export type RuleContext = {
  budget: number;
  minProfitPct: number;     // e.g. 10
  eaTaxPct: number;         // e.g. 5
  minDaysAfterRelease: number; // 7
  excludedEventTags: string[]; // e.g. ["TOTW","PROMO"]
};

export function computeMinSellPrice(buy: number, ctx: RuleContext): number {
  // You must net at least minProfitPct after EA tax.
  // revenue after tax = sell * (1 - tax)
  // need revenue >= buy * (1 + profit)
  const needNet = buy * (1 + ctx.minProfitPct / 100);
  const sell = needNet / (1 - ctx.eaTaxPct / 100);
  return Math.ceil(sell);
}

export function passesHardRules(card: any, ctx: RuleContext): { ok: boolean; reason?: string } {
  const price = Number(card.price ?? 0);
  if (!price || price <= 0) return { ok: false, reason: "no_price" };
  if (price > ctx.budget) return { ok: false, reason: "over_budget" };

  const releaseDate = Number(card.releaseDate ?? 0);
  if (releaseDate) {
    const days = (Date.now() - releaseDate) / (1000 * 60 * 60 * 24);
    if (days < ctx.minDaysAfterRelease) return { ok: false, reason: "too_new" };
  }

  const tags = (card.tags ?? []) as string[];
  if (tags.some(t => ctx.excludedEventTags.includes(String(t).toUpperCase()))) {
    return { ok: false, reason: "event_excluded" };
  }

  return { ok: true };
}
