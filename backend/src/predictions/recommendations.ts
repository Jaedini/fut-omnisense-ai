import { useEffect, useState } from "react";
import { apiGet } from "../api";

type Rec = {
  cardId: string;
  buy: number;
  minSell: number;
  expectedSell: number;
  expectedProfitPct: number;
  confidence: number;
  risk: string;
};

export function Recommendations({ budget, minProfit }: {
  budget: number;
  minProfit: number;
}) {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiGet<any>(
        `/predictions/recommendations?budget=${budget}&minProfitPct=${minProfit}`
      );
      setRecs(res.recommendations || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [budget, minProfit]);

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!recs.length) {
    return <div>Keine Empfehlungen gefunden.</div>;
  }

  return (
    <div className="recs">
      {recs.map(r => (
        <div key={r.cardId} className="rec">
          <b>{r.cardId}</b>
          <div>Buy: {r.buy}</div>
          <div>Min Sell: {r.minSell}</div>
          <div>Profit: {r.expectedProfitPct}%</div>
          <div>Confidence: {r.confidence}</div>
          <div>Risk: {r.risk}</div>
        </div>
      ))}
    </div>
  );
}
