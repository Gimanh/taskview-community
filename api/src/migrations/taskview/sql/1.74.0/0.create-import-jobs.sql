CREATE TABLE IF NOT EXISTS tasks.import_jobs (
    id                    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id       INTEGER NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
    created_by            INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    provider              VARCHAR(32) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'draft',
    credentials_encrypted TEXT,
    account_name          VARCHAR(255),
    external_project_id   VARCHAR(255),
    external_project_name VARCHAR(255),
    goal_id               INTEGER REFERENCES tasks.goals(id) ON DELETE SET NULL,
    config                JSONB,
    progress              JSONB,
    stats                 JSONB,
    error                 VARCHAR(1000),
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at            TIMESTAMP,
    finished_at           TIMESTAMP,
    CONSTRAINT import_jobs_status_check CHECK (status IN ('draft', 'pending', 'running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS import_jobs_org_creator_idx ON tasks.import_jobs(organization_id, created_by, created_at);
CREATE INDEX IF NOT EXISTS import_jobs_status_created_idx ON tasks.import_jobs(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS import_jobs_one_active_per_user_idx ON tasks.import_jobs(created_by) WHERE status IN ('pending', 'running');
