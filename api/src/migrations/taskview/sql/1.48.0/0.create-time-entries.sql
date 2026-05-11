CREATE TABLE IF NOT EXISTS tasks.time_entries (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    goal_id INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP NULL,
    duration_seconds INTEGER NULL,
    description VARCHAR(500) NULL,
    source SMALLINT NOT NULL DEFAULT 0,
    billable BOOLEAN NOT NULL DEFAULT TRUE,
    auto_stopped BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT time_entries_end_after_start CHECK (ended_at IS NULL OR ended_at > started_at),
    CONSTRAINT time_entries_duration_non_negative CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_started
    ON tasks.time_entries(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_goal_started
    ON tasks.time_entries(goal_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_task
    ON tasks.time_entries(task_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_time_entries_active_per_user
    ON tasks.time_entries(user_id) WHERE ended_at IS NULL;
