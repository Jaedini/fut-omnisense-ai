const API_BASE = "https://fut-omnisense-api.jaedenhommel.workers.dev";

export const api = {
  async recommendations(budget: number, minProfitPct: number) {
    const r = await fetch(
      `${API_BASE}/predictions/recommendations?budget=${budget}&minProfitPct=${minProfitPct}`
    );
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
};
