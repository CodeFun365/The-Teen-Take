-- Run once in the Cloudflare D1 console (Storage & Databases > D1 > your database > Console).
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post TEXT NOT NULL,
  name TEXT,
  body TEXT NOT NULL,
  impression TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  voter TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post, status);
CREATE TABLE IF NOT EXISTS reactions (
  post TEXT NOT NULL,
  kind TEXT NOT NULL,
  voter TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post, kind, voter)
);
