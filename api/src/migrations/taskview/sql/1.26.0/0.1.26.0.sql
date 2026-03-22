CREATE TABLE IF NOT EXISTS tasks.notification_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'
);
