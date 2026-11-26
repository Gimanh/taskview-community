-- Refresh token rotation: a session remembers the id of the refresh token it
-- handed out last and of the one before it. A refresh by the current token
-- rotates it; a refresh by the previous one is tolerated for a short moment
-- after the rotation (two tabs, a retried request); any other token of the
-- session means it leaked, and the session is ended.
-- Sessions opened before this migration have no token id and cannot be
-- refreshed: their users sign in again once the access token expires.
ALTER TABLE tv_auth.user_tokens
    ADD COLUMN IF NOT EXISTS refresh_jti        VARCHAR(36),
    ADD COLUMN IF NOT EXISTS prev_refresh_jti   VARCHAR(36),
    ADD COLUMN IF NOT EXISTS refresh_rotated_at TIMESTAMP;
