const POS = ["buy", "invest", "meta", "op", "must", "rise", "profit", "cheap", "underrated", "snipe", "flip"];
const NEG = ["sell", "crash", "panic", "drop", "nerf", "overpriced", "avoid", "loss"];

export function quickSentiment(text: string): number {
  const t = text.toLowerCase();
  let score = 0;
  for (const w of POS) if (t.includes(w)) score += 1;
  for (const w of NEG) if (t.includes(w)) score -= 1;
  // normalize to -1..1
  return Math.max(-1, Math.min(1, score / 6));
}
