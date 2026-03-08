CREATE TABLE IF NOT EXISTS tasks.integrations (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('github', 'gitlab')),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    repo_external_id VARCHAR(255),
    repo_full_name VARCHAR(255),
    project_id INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    webhook_id VARCHAR(255),
    webhook_secret_encrypted TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks.integration_task_map (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    integration_id INTEGER NOT NULL REFERENCES tasks.integrations(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    issue_number INTEGER NOT NULL,
    issue_state VARCHAR(20) NOT NULL DEFAULT 'open',
    synced_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(integration_id, issue_number)
);
