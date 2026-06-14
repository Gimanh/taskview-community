ALTER TABLE tasks.tasks
    ADD COLUMN IF NOT EXISTS recurrence_rule_id INTEGER REFERENCES tasks.recurrence_rules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS recurrence_instance_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tasks_recurrence_instance
    ON tasks.tasks(recurrence_rule_id, recurrence_instance_date)
    WHERE recurrence_rule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_rule_id
    ON tasks.tasks(recurrence_rule_id)
    WHERE recurrence_rule_id IS NOT NULL;
