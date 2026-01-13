import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://fut-omnisense-api.jaedenhommel.workers.dev";

type Recommendation = {
  cardId: string;
  buy: number;
  minSell: number;
  expectedSell: number;
  expectedProfitPct: number;
  confidence: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
};

type ApiResponse = {
  ok: boolean;
  budget: number;
  minProfitPct: number;
  count: number;
  recommendations: Recommendation[];
};

export function Recommendations({
  budget,
  minProfitPct,
  refreshToken,
}: {
  budget: number;
  minProfitPct: number;
  refreshToken: number;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE}/predictions/recommendations?budget=${budget}&minProfitPct=${minProfitPct}`
        );

        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || "Unknown error");
        }

        if (!cancelled) {
          setData(json);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "Internal Server Error");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [budget, minProfitPct, refreshToken]);

  if (loading) {
    return (
      <div className="panel info">
        Lade Empfehlungen…
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel error">
        {error}
      </div>
    );
  }

  if (!data || data.count === 0) {
    return (
      <div className="panel muted">
        Keine Empfehlungen gefunden. (Mehr Daten sammeln oder Budget/Profit anpassen)
      </div>
    );
  }

  return (
    <div className="panel">
      <h3 className="panel-title">
        Empfehlungen ({data.count})
      </h3>

      <div className="recommendations">
        {data.recommendations.map((r) => (
          <div key={r.cardId} className={`rec risk-${r.risk.toLowerCase()}`}>
            <div className="rec-header">
              <strong>{r.cardId}</strong>
              <span className="confidence">{r.confidence}%</span>
            </div>

            <div className="rec-body">
              <div>Kaufen: <b>{r.buy.toLocaleString()}</b></div>
              <div>Mind. Verkauf: {r.minSell.toLocaleString()}</div>
              <div>Erwartet: {r.expectedSell.toLocaleString()}</div>
              <div className="profit">
                +{r.expectedProfitPct.toFixed(1)}%
              </div>
            </div>

            {Array.isArray(r.reasons) && r.reasons.length > 0 && (
              <ul className="reasons">
                {r.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
