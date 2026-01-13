export type SignalContext = {
  hype: number;
  sentiment: number;
  mentions: number;
};

export function estimatePrice(card: any, s: SignalContext) {
  const ovr = Number(card.overall ?? 75);

  // Baseline Marktpreise (realistisch)
  let base =
    ovr >= 92 ? 90000 :
    ovr >= 90 ? 65000 :
    ovr >= 88 ? 42000 :
    ovr >= 86 ? 28000 :
    ovr >= 84 ? 15000 :
    ovr >= 82 ? 8000 :
    ovr >= 80 ? 4000 :
    1200;

  const popularity = 1 + Math.min(0.8, (s.mentions ?? 0) / 120);
  const hype = 1 + Math.min(0.6, (s.hype ?? 0) / 100);
  const sentiment = 1 + Math.max(-0.25, Math.min(0.25, s.sentiment ?? 0));

  const scarcity =
    card.leagueName?.includes("Icons") ? 1.4 :
    card.nationName?.includes("Brazil") ? 1.15 :
    1;

  return Math.round(base * popularity * hype * sentiment * scarcity);
}
