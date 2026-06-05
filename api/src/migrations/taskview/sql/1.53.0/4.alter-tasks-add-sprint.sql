ALTER TABLE tasks.tasks
    ADD COLUMN IF NOT EXISTS sprint_id INTEGER REFERENCES tasks.sprints(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS estimate_value NUMERIC(10, 2);
    -- estimate_value: task estimate in story points (unitless).

CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks.tasks(sprint_id) WHERE sprint_id IS NOT NULL;
