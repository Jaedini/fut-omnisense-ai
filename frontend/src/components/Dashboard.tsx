import React, { useEffect, useMemo, useState } from "react";
import type { Api } from "../services/api";
import { formatRisk, formatPct } from "../services/format";

type Recommendation = {
  cardId: string;
  buy: number;
  minSell: number;
  expectedSell: number;
  expectedProfitPct: number;
  confidence: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  signals: { mentions: number; avgTrust: number; avgSentiment: number; avgHype: number };
  reasons: string[];
};

export function Dashboard(props: {
  api: Api;
  budget: number;
  minProfitPct: number;
  onUpdateSettings: (budget: number, minProfitPct: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const [budget, setBudget] = useState(props.budget);
  const [minProfitPct, setMinProfitPct] = useState(props.minProfitPct);

  const top = useMemo(() => recs.slice(0, 25), [recs]);
  
  const cards = await fetchCards(100);
	setCards(cards.cards);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const s = await props.api.sourcesStatus();
      setStatus(s?.lastRun ?? null);

      const data = await props.api.recommendations(budget, minProfitPct);
      setRecs(data.recommendations ?? []);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="cardGlass rounded-3xl p-4 shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Dashboard</div>
            <div className="mt-1 text-xs text-slate-300">
              Daten werden automatisch aktualisiert (Cron). Du kannst jederzeit Refresh drücken.
            </div>
          </div>
          <div className="flex gap-2">
		<div className="flex gap-2">
			<button
				onClick={refresh}
				disabled={loading}
				className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
			>
				Refresh
			</button>
			
			<p className="mt-2 text-xs text-slate-300">
				Daten werden automatisch aktualisiert (Cron).
			</p>
			
		</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-300">Budget</div>
            <div className="text-xs font-semibold">{budget.toLocaleString()} Coins</div>
          </div>
          <input
            className="w-full accent-blue-500"
            type="range"
            min={1000}
            max={500000}
            step={500}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            onMouseUp={() => props.onUpdateSettings(budget, minProfitPct)}
            onTouchEnd={() => props.onUpdateSettings(budget, minProfitPct)}
          />

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-300">Min. Profit</div>
            <div className="text-xs font-semibold">{minProfitPct}%</div>
          </div>
          <input
            className="w-full accent-emerald-500"
            type="range"
            min={5}
            max={30}
            step={1}
            value={minProfitPct}
            onChange={(e) => setMinProfitPct(Number(e.target.value))}
            onMouseUp={() => props.onUpdateSettings(budget, minProfitPct)}
            onTouchEnd={() => props.onUpdateSettings(budget, minProfitPct)}
          />
        </div>

        {status && (
          <div className="mt-3 text-xs text-slate-300">
            Letzter Crawl:{" "}
            <span className="font-semibold text-slate-100">
              {new Date(status.endedAt ?? status.finishedAt ?? Date.now()).toLocaleString()}
            </span>
            {" · "}Saved: <span className="font-semibold">{status.totalSaved ?? status.saved ?? "?"}</span>
          </div>
        )}
      </div>
	  
	  {cards.map(c => (
		<div key={c.cardId} className="card">
			<b>{c.name}</b>
			<div>ID: {c.cardId}</div>
			<div>Price: {c.price ?? "—"}</div>
		</div>
	))}

      {err && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="grid gap-3">
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Lädt…
          </div>
        )}

        {!loading && top.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Keine Empfehlungen gefunden. (Mehr Daten sammeln oder Budget/Profit anpassen)
          </div>
        )}

        {top.map((r) => (
          <div key={r.cardId} className="cardGlass rounded-3xl p-4 shadow-glow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  {r.cardId}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    Profit: <b>{formatPct(r.expectedProfitPct)}</b>
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    Confidence: <b>{r.confidence}%</b>
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    Risk: <b>{formatRisk(r.risk)}</b>
                  </span>
                </div>
              </div>

              <div className="text-right text-xs text-slate-300">
                <div>Buy</div>
                <div className="text-sm font-semibold text-slate-100">{r.buy.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-300">Min Sell (Tax-safe)</div>
                <div className="mt-1 text-sm font-semibold">{r.minSell.toLocaleString()}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-300">Expected Sell</div>
                <div className="mt-1 text-sm font-semibold">{r.expectedSell.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Mentions: <b>{r.signals?.mentions ?? 0}</b>
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Trust: <b>{Math.round((r.signals?.avgTrust ?? 0) * 100)}%</b>
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Sent: <b>{(r.signals?.avgSentiment ?? 0).toFixed(2)}</b>
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Hype: <b>{(r.signals?.avgHype ?? 0).toFixed(2)}</b>
                </span>
              </div>

              {Array.isArray(r.reasons) && r.reasons.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-200">Warum</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {r.reasons.slice(0, 5).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="h-16" />
    </div>
  );
}
