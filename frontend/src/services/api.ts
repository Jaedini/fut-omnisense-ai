export class Api {
  constructor(private base: string) {}
  private url(path: string) { return `${this.base.replace(/\/$/, "")}${path}`; }

  async recommendations(budget: number, minProfitPct: number) {
    const res = await fetch(this.url(`/predictions/recommendations?budget=${budget}&minProfitPct=${minProfitPct}`));
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async sourcesStatus() {
    const res = await fetch(this.url(`/sources/status`));
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}
