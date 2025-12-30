INSERT INTO tv_auth.permissions (name, description)
VALUES ('task_can_edit_tags', 'User can edit task tags'),
       ('task_can_watch_tags', 'User can watch task tags'),
       ('task_can_watch_priority', 'User can watch task priority'),
       ('task_can_edit_priority', 'User can edit task priority')
on conflict do nothing;


insert into tasks_auth.user_task_permissions (
    select id                                                                     as task_id,
           owner                                                                  as user_id,
           (select id from tv_auth.permissions where name = 'task_can_edit_tags') as permission_id
    from tasks.tasks
)
on conflict do nothing;

insert into tasks_auth.user_task_permissions (
    select id                                                                      as task_id,
           owner                                                                   as user_id,
           (select id from tv_auth.permissions where name = 'task_can_watch_tags') as permission_id
    from tasks.tasks
)
on conflict do nothing;

insert into tasks_auth.user_task_permissions (
    select id                                                                          as task_id,
           owner                                                                       as user_id,
           (select id from tv_auth.permissions where name = 'task_can_watch_priority') as permission_id
    from tasks.tasks
)
on conflict do nothing;

insert into tasks_auth.user_task_permissions (
    select id                                                                         as task_id,
           owner                                                                      as user_id,
           (select id from tv_auth.permissions where name = 'task_can_edit_priority') as permission_id
    from tasks.tasks
)
on conflict do nothing;

