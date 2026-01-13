import { useState } from "react";
import { CardsList } from "./components/CardsList";
import { Recommendations } from "./components/Recommendations";
import { RulesPanel } from "./components/RulesPanel";

export default function App() {
  const [budget, setBudget] = useState(50000);
  const [minProfit, setMinProfit] = useState(10);
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className="app">
      <h1>FUT Omnisense</h1>

      <RulesPanel
        budget={budget}
        setBudget={setBudget}
        minProfit={minProfit}
        setMinProfit={setMinProfit}
      />

      <button
        onClick={() => setRefreshToken(t => t + 1)}
        style={{ margin: "12px 0" }}
      >
        Refresh
      </button>

      <h2>Empfehlungen</h2>
      <Recommendations
        budget={budget}
        minProfitPct={minProfit}
        refreshToken={refreshToken}
      />

      <h2>Karten</h2>
      <CardsList />
    </div>
  );
}
