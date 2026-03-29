ALTER TABLE tv_auth.api_tokens ADD COLUMN IF NOT EXISTS allowed_goal_ids INTEGER[] NOT NULL DEFAULT '{}';
