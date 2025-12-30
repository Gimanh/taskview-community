create table if not exists tasks_auth.task_assignee(
    task_id int constraint fr_task_assign_task_id references tasks.tasks(id) on delete cascade,
    collab_user_id int constraint fr_task_assign_collab_user_id references collaboration.users(id) on delete cascade
);