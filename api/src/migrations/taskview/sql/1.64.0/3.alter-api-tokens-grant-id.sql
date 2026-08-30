-- OAuth access tokens live in tv_auth.api_tokens alongside manually issued
-- tvk_ tokens: same opaque-token storage, same validation path, same permission
-- intersection. grant_id ties an access token to the OAuth grant that minted it,
-- so revoking a connected app deletes its live access tokens immediately.
ALTER TABLE tv_auth.api_tokens
    ADD COLUMN IF NOT EXISTS grant_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'api_tokens_grant_id_fkey'
    ) THEN
        ALTER TABLE tv_auth.api_tokens
            ADD CONSTRAINT api_tokens_grant_id_fkey
            FOREIGN KEY (grant_id) REFERENCES tv_auth.oauth_grants(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_api_tokens_grant_id ON tv_auth.api_tokens(grant_id);
