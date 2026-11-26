-- Repeats 1.76.0/2 for databases that applied 1.76.0 before the CSRF column was added to it.
ALTER TABLE tv_auth.user_tokens
    ADD COLUMN IF NOT EXISTS csrf_token_hash VARCHAR(64);
