CREATE TABLE IF NOT EXISTS tv_files.file_to_task (
    file_id         UUID NOT NULL REFERENCES tv_files.files(id) ON DELETE CASCADE,
    task_id         INTEGER NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    linked_by_id    INTEGER REFERENCES tv_auth.users(id) ON DELETE SET NULL,
    linked_by_email VARCHAR(255) NOT NULL,
    linked_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (file_id, task_id)
);

CREATE INDEX IF NOT EXISTS file_to_task_task_idx ON tv_files.file_to_task(task_id);
