CREATE TABLE IF NOT EXISTS tasks.webhooks (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    goal_id INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    secret_encrypted VARCHAR NOT NULL,
    events VARCHAR[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks.webhook_deliveries (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    webhook_id INTEGER NOT NULL REFERENCES tasks.webhooks(id) ON DELETE CASCADE,
    event VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    response_code INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_goal_id ON tasks.webhooks(goal_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON tasks.webhook_deliveries(webhook_id);
