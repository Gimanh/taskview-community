-- One row per (user, client) authorization — this is what the user sees and
-- revokes as a "connected app". The refresh token hangs off the grant and is
-- rotated on every use; refresh_token_prev_hash keeps the previous value so a
-- replayed refresh token can be detected and the whole grant revoked.
CREATE TABLE IF NOT EXISTS tv_auth.oauth_grants (
    id                      INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id                 INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    client_id               VARCHAR(64) NOT NULL REFERENCES tv_auth.oauth_clients(client_id) ON DELETE CASCADE,
    allowed_permissions     VARCHAR[] NOT NULL DEFAULT '{}',
    allowed_goal_ids        INTEGER[] NOT NULL DEFAULT '{}',
    resource                VARCHAR,
    refresh_token_hash      VARCHAR(64) UNIQUE,
    refresh_token_prev_hash VARCHAR(64),
    refresh_expires_at      TIMESTAMP,
    last_used_at            TIMESTAMP,
    revoked_at              TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_grants_user_id ON tv_auth.oauth_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_grants_refresh_token_hash ON tv_auth.oauth_grants(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_grants_prev_refresh_hash ON tv_auth.oauth_grants(refresh_token_prev_hash);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'oauth_auth_codes_grant_id_fkey'
    ) THEN
        ALTER TABLE tv_auth.oauth_auth_codes
            ADD CONSTRAINT oauth_auth_codes_grant_id_fkey
            FOREIGN KEY (grant_id) REFERENCES tv_auth.oauth_grants(id) ON DELETE SET NULL;
    END IF;
END $$;
