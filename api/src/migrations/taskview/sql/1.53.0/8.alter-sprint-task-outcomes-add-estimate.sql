ALTER TABLE tasks.sprint_task_outcomes
    ADD COLUMN IF NOT EXISTS estimate_value NUMERIC(10, 2);
    -- Snapshot of tasks.estimate_value taken AT sprint close. Sprint history is
    -- frozen: later edits to the task's estimate, or moving it to another sprint,
    -- must NOT change a closed sprint's velocity. Velocity reads this snapshot,
    -- not the live task estimate.
