import { Signal } from "../types";

export function dedupSignals(signals: Signal[]) {
  const seen = new Set<string>();
  const kept: Signal[] = [];
  let deduped = 0;

  for (const s of signals) {
    if (seen.has(s.id)) { deduped++; continue; }
    seen.add(s.id);
    kept.push(s);
  }
  return { kept, deduped };
}
