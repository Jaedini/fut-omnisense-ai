export const DECISION_SCHEMA = `
{
  "action": "BUY" | "SKIP",
  "expectedGainPct": number,
  "confidence": number,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "sellMultiplierHint": number,
  "reasons": string[]
}`;
