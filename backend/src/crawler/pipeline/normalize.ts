import { RawItem, Signal } from "../types";
import { stableId } from "../../utils/stableId";
import { stripHtml, compactText } from "../../utils/text";

export function normalizeRawItems(items: RawItem[]): Signal[] {
  const now = Date.now();

  return items.map((it) => {
    const title = compactText(stripHtml(it.title ?? ""));
    const snippet = compactText(stripHtml(it.snippet ?? ""));
    const text = compactText(`${title}\n${snippet}`.trim());

    return {
      id: stableId(`${it.sourceId}|${it.url}|${title}`),
      sourceId: it.sourceId,
      url: it.url,
      title,
      text,
      author: it.author,
      publishedAt: it.publishedAt,
      tags: (it.tags ?? []).slice(0, 15),
      trust: 0.5,
      hype: 0,
      sentiment: 0,
      createdAt: now,
      meta: it.meta ?? {}
    };
  }).filter(x => x.url && x.title && x.text);
}
