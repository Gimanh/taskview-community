-- Notifications
CREATE TABLE IF NOT EXISTS tasks.notifications (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks.tasks(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    body VARCHAR(1000),
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON tasks.notifications (user_id, created_at DESC) WHERE NOT read;
