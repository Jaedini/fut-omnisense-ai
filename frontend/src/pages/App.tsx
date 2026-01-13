import React, { useEffect, useMemo, useState } from "react";
import { ConsentBox } from "../components/ConsentBox";
import { Dashboard } from "../components/Dashboard";
import { getConsent, setConsent } from "../services/consent";
import { Api } from "../services/api";

export function App() {
  // 🔧 SET THIS:
  const API_BASE = useMemo(() => {
    // Example: "https://fut-omnisense-api.<user>.workers.dev"
    // For local dev: "http://127.0.0.1:8787"
    return (import.meta as any).env?.VITE_API_BASE || "https://YOUR_WORKER_DOMAIN";
  }, []);

  const api = useMemo(() => new Api(API_BASE), [API_BASE]);

  const [consented, setConsented] = useState<boolean>(getConsent());
  const [budget, setBudget] = useState<number>(50000);
  const [minProfit, setMinProfit] = useState<number>(10);

  useEffect(() => {
    document.title = "FUT Omnisense AI";
  }, []);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-blue-500/15 ring-1 ring-white/10 grid place-items-center shadow-glow">
              <span className="text-sm font-bold">AI</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">FUT Omnisense</div>
              <div className="text-xs text-slate-300">Mobile Trading Intelligence</div>
            </div>
          </div>
          <div className="text-xs text-slate-300">
            <span className="rounded-full border border-white/10 px-2 py-1">v1</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-xl px-4 py-4">
        {!consented ? (
          <ConsentBox
            defaultBudget={budget}
            defaultMinProfit={minProfit}
            onAccept={(data) => {
              setBudget(data.budget);
              setMinProfit(data.minProfitPct);
              setConsent(data);
              setConsented(true);
            }}
          />
        ) : (
          <Dashboard
            api={api}
            budget={budget}
            minProfitPct={minProfit}
            onUpdateSettings={(b, p) => {
              setBudget(b);
              setMinProfit(p);
              setConsent({ budget: b, minProfitPct: p, acceptedAt: Date.now(), rules: getConsent()?.rules || {} });
            }}
          />
        )}

        <footer className="mt-10 pb-8 text-center text-xs text-slate-400">
          <div className="opacity-80">
            Hinweis: Prognosen sind keine Garantie. Nutze das Tool als Entscheidungs-Hilfe.
          </div>
        </footer>
      </main>
    </div>
  );
}
