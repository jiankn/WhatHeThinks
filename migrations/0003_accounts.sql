-- Optional accounts for keeping reports together and managing stored data.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  name TEXT,
  image_url TEXT,
  password_hash TEXT,
  google_sub TEXT,
  email_verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE UNIQUE INDEX idx_users_google_sub ON users (google_sub) WHERE google_sub IS NOT NULL;

CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX idx_auth_sessions_expiry ON auth_sessions (expires_at);

CREATE TABLE password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_password_reset_user ON password_reset_tokens (user_id);

ALTER TABLE reports ADD COLUMN user_id TEXT;
CREATE INDEX idx_reports_user_created ON reports (user_id, created_at DESC);
