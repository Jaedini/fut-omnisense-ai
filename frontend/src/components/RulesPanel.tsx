type Props = {
  budget: number;
  setBudget: (v: number) => void;
  minProfit: number;
  setMinProfit: (v: number) => void;
};

export function RulesPanel({
  budget,
  setBudget,
  minProfit,
  setMinProfit
}: Props) {
  return (
    <div className="rules">
      <div>
        <label>Budget: {budget}</label>
        <input
          type="range"
          min={1000}
          max={200000}
          step={1000}
          value={budget}
          onChange={e => setBudget(+e.target.value)}
        />
      </div>

      <div>
        <label>Min Profit %: {minProfit}</label>
        <input
          type="range"
          min={5}
          max={50}
          step={1}
          value={minProfit}
          onChange={e => setMinProfit(+e.target.value)}
        />
      </div>
    </div>
  );
}
