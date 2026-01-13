import React, { useMemo, useState } from "react";

type ConsentData = {
  acceptedAt: number;
  budget: number;
  minProfitPct: number;
  rules: {
    noNewCards7Days: boolean;
    eventCooldown: boolean;
    minProfit10: boolean;
  };
};

export function ConsentBox(props: {
  defaultBudget: number;
  defaultMinProfit: number;
  onAccept: (data: ConsentData) => void;
}) {
  const [budget, setBudget] = useState(props.defaultBudget);
  const [minProfitPct, setMinProfitPct] = useState(props.defaultMinProfit);

  const [agree, setAgree] = useState(false);

  const [noNewCards7Days, setNoNewCards7Days] = useState(true);
  const [eventCooldown, setEventCooldown] = useState(true);
  const [minProfit10, setMinProfit10] = useState(true);

  const canContinue = useMemo(() => agree && budget > 0 && minProfitPct >= 5, [agree, budget, minProfitPct]);

  return (
    <div className="cardGlass rounded-3xl p-5 shadow-glow">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 ring-1 ring-white/10 grid place-items-center">
          <span className="text-sm font-bold">✓</span>
        </div>
        <div>
          <h1 className="text-base font-semibold">Bevor du startest</h1>
          <p className="mt-1 text-sm text-slate-300">
            Dieses Tool analysiert öffentliche Signale und erstellt Empfehlungen. Keine Garantie – du entscheidest.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">Deine Regeln</div>

          <label className="mt-3 flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={noNewCards7Days} onChange={(e) => setNoNewCards7Days(e.target.checked)} />
            <span className="text-slate-200">Keine Karten innerhalb der ersten 7 Tage nach Release</span>
          </label>

          <label className="mt-2 flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={eventCooldown} onChange={(e) => setEventCooldown(e.target.checked)} />
            <span className="text-slate-200">Event-Cooldown aktiv (kein Kauf in Event-Nähe)</span>
          </label>

          <label className="mt-2 flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={minProfit10} onChange={(e) => setMinProfit10(e.target.checked)} />
            <span className="text-slate-200">Mindestens {minProfitPct}% Zielgewinn (inkl. EA-Tax)</span>
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Budget</div>
            <div className="text-xs text-slate-300">{budget.toLocaleString()} Coins</div>
          </div>
          <input
            className="mt-3 w-full accent-blue-500"
            type="range"
            min={1000}
            max={500000}
            step={500}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-medium">Min. Profit</div>
            <div className="text-xs text-slate-300">{minProfitPct}%</div>
          </div>
          <input
            className="mt-3 w-full accent-emerald-500"
            type="range"
            min={5}
            max={30}
            step={1}
            value={minProfitPct}
            onChange={(e) => setMinProfitPct(Number(e.target.value))}
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <div className="text-sm text-slate-200">
            Ich verstehe, dass Prognosen keine Garantie sind und ich selbst entscheide.
          </div>
        </label>

        <button
          disabled={!canContinue}
          onClick={() =>
            props.onAccept({
              acceptedAt: Date.now(),
              budget,
              minProfitPct,
              rules: { noNewCards7Days, eventCooldown, minProfit10 }
            })
          }
          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            canContinue
              ? "bg-blue-500 text-white shadow-glow hover:bg-blue-400 active:scale-[0.99]"
              : "bg-white/10 text-slate-400"
          }`}
        >
          Dashboard öffnen
        </button>

        <div className="text-xs text-slate-400">
          Tipp: Du kannst Budget/Profit später im Dashboard ändern.
        </div>
      </div>
    </div>
  );
}
