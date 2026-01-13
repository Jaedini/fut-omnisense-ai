export type RawItem = {
  sourceId: string;     // e.g. "reddit:r/FUTTrading"
  url: string;
  title: string;
  snippet?: string;
  author?: string;
  publishedAt?: number; // unix ms
  tags?: string[];
  meta?: Record<string, any>;
};

export type Signal = {
  id: string;           // stable hash
  sourceId: string;
  url: string;
  title: string;
  text: string;         // normalized combined text
  author?: string;
  publishedAt?: number;
  tags: string[];
  trust: number;        // 0..1
  hype: number;         // 0..1
  sentiment: number;    // -1..1
  createdAt: number;
  meta: Record<string, any>;
};

export type CrawlResult = {
  query: string;
  fetched: number;
  kept: number;
  deduped: number;
  saved: number;
  sources: Record<string, { fetched: number; kept: number }>;
};
