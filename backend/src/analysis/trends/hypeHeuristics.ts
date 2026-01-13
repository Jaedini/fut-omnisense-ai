import { Signal } from "../../crawler/types";

export function hypeFromVelocityHint(s: Signal): number {
  // If it's very fresh and high-trust, treat as higher hype.
  const ageMin = s.publishedAt ? (Date.now() - s.publishedAt) / 60000 : 9999;
  let h = 0.15;
  if (ageMin < 60) h += 0.25;
  if (ageMin < 15) h += 0.25;
  h += (s.trust - 0.5) * 0.6;
  return Math.max(0, Math.min(1, h));
}
