CREATE INDEX IF NOT EXISTS idx_tasks_to_tags_task_id
    ON tasks.tasks_to_tags(task_id);

CREATE INDEX IF NOT EXISTS idx_tasks_to_tags_tag_id
    ON tasks.tasks_to_tags(tag_id);
