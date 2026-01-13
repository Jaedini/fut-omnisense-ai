import { chatgptJSON } from "../gptClient";
import { SYSTEM_PROMPT } from "../prompts/system";
import { DECISION_SCHEMA } from "../prompts/decisionSchema";

export async function chatgptDecision(env: any, input: {
  card: any;
  stats: {
    mentions: number;
    avgTrust: number;
    avgSentiment: number;
    avgHype: number;
  };
  constraints: {
    minProfitPct: number;
    eaTaxPct: number;
    minDaysAfterRelease: number;
    excludedEventTags: string[];
    budget: number;
  };
}) {
  const userPrompt = `
CARD:
${JSON.stringify({
  cardId: input.card.cardId,
  name: input.card.name,
  price: input.card.price,
  releaseDate: input.card.releaseDate,
  tags: input.card.tags,
  keywords: input.card.keywords
}, null, 2)}

SIGNAL_STATS_LAST_6H:
${JSON.stringify(input.stats, null, 2)}

HARD_CONSTRAINTS:
${JSON.stringify(input.constraints, null, 2)}

TASK:
Decide BUY or SKIP.
If BUY, estimate expectedGainPct (must be >= minProfitPct to be considered viable),
confidence 0-100, risk, and a sellMultiplierHint (e.g. 1.10 to 1.30).
Reasons should be short bullet strings.
`;

  const out = await chatgptJSON(env, [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt }
  ], DECISION_SCHEMA);

  // Defensive parsing / clamping
  const action = (out.action === "BUY") ? "BUY" : "SKIP";
  const expectedGainPct = Number(out.expectedGainPct ?? 0);
  const confidence = Math.max(0, Math.min(100, Number(out.confidence ?? 0)));
  const risk = (out.risk === "HIGH" || out.risk === "MEDIUM") ? out.risk : "LOW";
  const sellMultiplierHint = Math.max(1.0, Math.min(2.0, Number(out.sellMultiplierHint ?? 1.10)));
  const reasons = Array.isArray(out.reasons) ? out.reasons.slice(0, 6).map(String) : [];

  return { action, expectedGainPct, confidence, risk, sellMultiplierHint, reasons };
}
