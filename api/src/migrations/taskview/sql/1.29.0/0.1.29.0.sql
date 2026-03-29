CREATE TABLE IF NOT EXISTS tv_auth.api_tokens (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    allowed_permissions VARCHAR[] NOT NULL DEFAULT '{}',
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON tv_auth.api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON tv_auth.api_tokens(user_id);
