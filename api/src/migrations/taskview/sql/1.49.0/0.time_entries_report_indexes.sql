CREATE INDEX IF NOT EXISTS idx_time_entries_goal_started_user
    ON tasks.time_entries(goal_id, started_at DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_goal_started_task
    ON tasks.time_entries(goal_id, started_at DESC, task_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_billable_goal_started
    ON tasks.time_entries(goal_id, started_at DESC)
    WHERE billable = TRUE;
