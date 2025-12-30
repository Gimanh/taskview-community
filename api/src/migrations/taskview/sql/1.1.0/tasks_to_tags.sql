CREATE TABLE IF NOT EXISTS tasks.tasks_to_tags
(
    task_id int
        constraint fr_task_id
            references tasks.tasks (id)
            on delete cascade,
    tag_id  int
        constraint fr_tag_id
            references tasks.tags (id)
            on delete cascade,
    PRIMARY KEY (task_id, tag_id)
);
