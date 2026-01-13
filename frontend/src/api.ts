const API_BASE = "https://fut-omnisense-api.jaedenhommel.workers.dev";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "API error");
  }
  return res.json();
}