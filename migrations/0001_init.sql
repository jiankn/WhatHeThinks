-- WhatHeThinks 初始表结构。详见 docs/PRD.md §6。

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  question TEXT NOT NULL,
  custom_question TEXT,
  -- preview | paid | generating | ready | failed
  status TEXT NOT NULL DEFAULT 'preview',
  preview_json TEXT NOT NULL,
  -- 完整确定性分析结果（不含证据正文），付费前不对外返回
  analysis_json TEXT NOT NULL,
  report_json TEXT,
  email TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  evidence_expires_at INTEGER NOT NULL
);

CREATE TABLE evidence (
  report_id TEXT NOT NULL,
  msg_id INTEGER NOT NULL,
  ts INTEGER NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (report_id, msg_id)
);
CREATE INDEX idx_evidence_report ON evidence (report_id);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_session_id TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_orders_session ON orders (stripe_session_id);

CREATE TABLE followups (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  email TEXT,
  question TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  report_id TEXT,
  props TEXT,
  ts INTEGER NOT NULL
);
CREATE INDEX idx_events_name_ts ON events (name, ts);
