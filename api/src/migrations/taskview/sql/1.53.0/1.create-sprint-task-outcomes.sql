CREATE TABLE IF NOT EXISTS tasks.sprint_task_outcomes (
    sprint_id       INTEGER NOT NULL REFERENCES tasks.sprints(id) ON DELETE CASCADE,
    task_id         INTEGER NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    outcome         VARCHAR(20) NOT NULL,
                    -- 'accepted' | 'carried-over' | 'dropped' | 'incomplete'
    carried_over_to INTEGER REFERENCES tasks.sprints(id) ON DELETE SET NULL,
    decided_by      INTEGER REFERENCES tv_auth.users(id),
    decided_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (sprint_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_sprint_outcomes_task ON tasks.sprint_task_outcomes(task_id);
