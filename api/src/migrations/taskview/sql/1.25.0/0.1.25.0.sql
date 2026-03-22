ALTER TABLE tasks.notifications
    ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'deadline';

CREATE TABLE IF NOT EXISTS tasks.device_tokens (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_device_token UNIQUE (user_id, token)
);
