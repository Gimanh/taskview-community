-- Failed password sign-ins, counted in a fixed time window per key so that
-- every API worker sees the same numbers. A key stands for an account from one
-- address, an account from anywhere, or an address; accounts are stored hashed.
-- Expired rows are pruned when a new failure is recorded.
CREATE TABLE IF NOT EXISTS tv_auth.login_attempts (
    key               VARCHAR(80) PRIMARY KEY,
    failures          INTEGER NOT NULL,
    window_started_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_window_started_at ON tv_auth.login_attempts(window_started_at);
