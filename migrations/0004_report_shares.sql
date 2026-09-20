CREATE TABLE report_shares (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_report_shares_expires ON report_shares(expires_at);
