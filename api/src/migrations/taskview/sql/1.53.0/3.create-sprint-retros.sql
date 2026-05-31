CREATE TABLE IF NOT EXISTS tasks.sprint_retros (
    sprint_id       INTEGER PRIMARY KEY REFERENCES tasks.sprints(id) ON DELETE CASCADE,
    went_well       TEXT,
    went_bad        TEXT,
    action_items    TEXT,
    edited_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_by       INTEGER REFERENCES tv_auth.users(id)
);
