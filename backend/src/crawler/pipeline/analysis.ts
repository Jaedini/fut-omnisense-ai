import { Signal } from "../types";
import { quickSentiment } from "../../analysis/sentiment/quickSentiment";
import { hypeFromVelocityHint } from "../../analysis/trends/hypeHeuristics";

export function analyzeSignals(signals: Signal[]): Signal[] {
  return signals.map((s) => {
    s.sentiment = quickSentiment(s.text);
    s.hype = Math.max(s.hype, hypeFromVelocityHint(s));
    return s;
  });
}
