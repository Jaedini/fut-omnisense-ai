type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function chatgptJSON(env: any, messages: ChatMsg[], jsonSchemaHint?: string) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = env.OPENAI_MODEL ?? "gpt-4o-mini";
  const timeoutMs = Number(env.OPENAI_TIMEOUT_MS ?? 12000);

  // Ask model to return strict JSON (no markdown)
  const system = messages[0]?.role === "system"
    ? messages
    : [{ role: "system" as const, content: "Return ONLY valid JSON. No markdown, no commentary." }, ...messages];

  const body = {
    model,
    messages: system,
    temperature: 0.2,
    response_format: { type: "json_object" }
  };

  if (jsonSchemaHint) {
    (body as any).messages = [
      { role: "system", content: `Return ONLY valid JSON matching this shape:\n${jsonSchemaHint}` },
      ...messages.filter(m => m.role !== "system")
    ];
  }

  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }, timeoutMs);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${txt}`);
  }

  const data = await res.json() as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No OpenAI content");
  return JSON.parse(content);
}
