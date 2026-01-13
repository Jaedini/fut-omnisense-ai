import { Signal } from "../types";
import { trustScoreForSource } from "./trust";

export function scoreSignals(signals: Signal[]): Signal[] {
  return signals.map((s) => {
    s.trust = trustScoreForSource(s.sourceId, s.url);
    // simple hype proxy: short-term signals later improved by analytics
    s.hype = Math.min(1, 0.2 + (s.tags.length * 0.03));
    return s;
  });
}
