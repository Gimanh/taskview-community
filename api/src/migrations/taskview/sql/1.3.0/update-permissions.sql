INSERT INTO tv_auth.permissions (name, description)
VALUES ('task_can_access_history', 'User can access task history'),
       ('task_can_recovery_history', 'User can recovery task history state')
on conflict do nothing;


insert into tasks_auth.user_task_permissions (
    select id                                                                     as task_id,
           owner                                                                  as user_id,
           (select id from tv_auth.permissions where name = 'task_can_access_history') as permission_id
    from tasks.tasks
)
on conflict do nothing;

insert into tasks_auth.user_task_permissions (
    select id                                                                      as task_id,
           owner                                                                   as user_id,
           (select id from tv_auth.permissions where name = 'task_can_recovery_history') as permission_id
    from tasks.tasks
)
on conflict do nothing;
