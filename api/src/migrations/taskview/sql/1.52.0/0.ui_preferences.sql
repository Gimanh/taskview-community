CREATE TABLE IF NOT EXISTS tv_auth.ui_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
