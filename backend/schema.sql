-- Signals (Crawler output)
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  sourceId TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  author TEXT,
  publishedAt INTEGER,
  trust REAL,
  hype REAL,
  sentiment REAL,
  createdAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_signals_publishedAt ON signals(publishedAt);

-- Cards (EA ratings)
CREATE TABLE IF NOT EXISTS cards (
  cardId TEXT PRIMARY KEY,
  eaPlayerId TEXT,
  name TEXT,
  keywords TEXT,
  tags TEXT,
  overall INTEGER,
  position TEXT,
  clubName TEXT,
  leagueName TEXT,
  nationName TEXT,
  releaseDate INTEGER,
  price INTEGER,
  updatedAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_cards_price ON cards(price);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT,
  confidence REAL,
  startAt INTEGER,
  endAt INTEGER,
  mentions INTEGER,
  updatedAt INTEGER,
  keywords TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_endAt ON events(endAt);

-- Prediction runs (for learning)
CREATE TABLE IF NOT EXISTS prediction_runs (
  id TEXT PRIMARY KEY,
  createdAt INTEGER,
  budget INTEGER,
  minProfitPct INTEGER,
  eaTaxPct INTEGER,
  json TEXT
);
CREATE INDEX IF NOT EXISTS idx_prediction_runs_createdAt ON prediction_runs(createdAt);
