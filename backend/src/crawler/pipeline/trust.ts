export function trustScoreForSource(sourceId: string, url: string): number {
  // Very simple baseline. You can expand with historical accuracy later.
  if (sourceId.startsWith("news:ea")) return 1.0;
  if (sourceId.startsWith("news:google")) return 0.85;
  if (sourceId.startsWith("youtube:rss")) return 0.75;
  if (sourceId.startsWith("reddit:rss")) return 0.65;
  if (sourceId.startsWith("blogs:rss")) return 0.55;
  return 0.5;
}
