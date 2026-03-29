ALTER TABLE tv_auth.user_tokens
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token,
  ADD COLUMN IF NOT EXISTS device_name varchar(200),
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamp;
