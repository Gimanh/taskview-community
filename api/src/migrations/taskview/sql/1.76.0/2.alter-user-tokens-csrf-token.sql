-- CSRF token of a session, stored as a SHA-256 hash. The client gets the token
-- itself when it signs in and sends it back in a header when it refreshes the
-- session by cookie alone; the server compares it with this hash.
ALTER TABLE tv_auth.user_tokens
    ADD COLUMN IF NOT EXISTS csrf_token_hash VARCHAR(64);
