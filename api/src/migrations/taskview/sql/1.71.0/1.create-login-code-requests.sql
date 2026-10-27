-- Log of emailed login codes, used to cap how many codes one account can request per hour.
-- Rows older than an hour are pruned before each new code is issued.
CREATE TABLE IF NOT EXISTS tv_auth.login_code_requests (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_code_requests_user_requested ON tv_auth.login_code_requests(user_id, requested_at);
