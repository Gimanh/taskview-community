create table tasks_auth.user_task_permissions
(
    task_id       int
        constraint fr_task_id_user_task_permissions
            references tasks.tasks (id)
            on delete cascade,
    user_id       int
        constraint fr_user_id_user_task_permissions
            references tv_auth.users (id)
            on delete cascade,
    permission_id int
        constraint fr_permission_id_user_task_permissions
            references tv_auth.permissions (id)
            on delete cascade,
    PRIMARY KEY (task_id, user_id, permission_id)
);
