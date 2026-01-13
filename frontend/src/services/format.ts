export function formatPct(p: number) {
  const n = Number(p ?? 0);
  return `${n.toFixed(1)}%`;
}

export function formatRisk(r: "LOW" | "MEDIUM" | "HIGH") {
  if (r === "HIGH") return "HIGH ⚠️";
  if (r === "MEDIUM") return "MEDIUM";
  return "LOW";
}
