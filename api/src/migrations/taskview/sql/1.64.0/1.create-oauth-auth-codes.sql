-- Short-lived, single-use authorization codes issued by the consent screen and
-- redeemed once at the token endpoint. Only the hash is stored, mirroring
-- tv_auth.api_tokens. used_at is set on redemption: a second redemption of the
-- same code is treated as replay and revokes the grant it produced.
CREATE TABLE IF NOT EXISTS tv_auth.oauth_auth_codes (
    id                    INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code_hash             VARCHAR(64) NOT NULL UNIQUE,
    client_id             VARCHAR(64) NOT NULL REFERENCES tv_auth.oauth_clients(client_id) ON DELETE CASCADE,
    user_id               INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    redirect_uri          VARCHAR NOT NULL,
    code_challenge        VARCHAR(128) NOT NULL,
    code_challenge_method VARCHAR(8) NOT NULL DEFAULT 'S256',
    allowed_permissions   VARCHAR[] NOT NULL DEFAULT '{}',
    allowed_goal_ids      INTEGER[] NOT NULL DEFAULT '{}',
    resource              VARCHAR,
    expires_at            TIMESTAMP NOT NULL,
    used_at               TIMESTAMP,
    grant_id              INTEGER,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT oauth_auth_codes_challenge_method_check CHECK (code_challenge_method = 'S256')
);

CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_code_hash ON tv_auth.oauth_auth_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_expires_at ON tv_auth.oauth_auth_codes(expires_at);
