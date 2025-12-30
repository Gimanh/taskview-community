create table if not exists tv_auth.permissions_group (
    id serial primary key,
    name varchar unique
);

insert into
    tv_auth.permissions_group (id, name)
values
    (1, 'app'),
    (2, 'goal'),
    (3, 'lists'),
    (4, 'tasks');

alter table
    tv_auth.permissions
add
    column permission_group int constraint fr_permission_group references tv_auth.permissions_group (id) on delete
set
    null;

update
    tv_auth.permissions
set
    permission_group = 1
where
    name in (
        'app_access',
        'access_create_goals',
        'access_edit_goals',
        'access_delete_goals',
        'access_create_components',
        'access_edit_components',
        'access_delete_components',
        'access_create_tasks',
        'access_edit_tasks',
        'access_delete_tasks'
    );

update
    tv_auth.permissions
set
    permission_group = 2
where
    name in (
        'goal_can_delete',
        'goal_can_edit',
        'goal_can_add_users'
    );

update
    tv_auth.permissions
set
    permission_group = 3
where
    name in (
        'component_can_delete',
        'component_can_edit',
        'component_can_watch_content',
        'component_can_add_tasks',
        'component_can_add_subtasks',
        'component_can_edit_all_tasks',
        'component_can_edit_their_tasks'
    );

update
    tv_auth.permissions
set
    permission_group = 4
where
    name in (
        'task_can_delete',
        'task_can_edit_description',
        'task_can_edit_status',
        'task_can_edit_note',
        'task_can_edit_deadline',
        'task_can_watch_details',
        'task_can_watch_subtasks',
        'task_can_add_subtasks',
        'task_can_edit_tags',
        'task_can_watch_tags',
        'task_can_watch_priority',
        'task_can_edit_priority',
        'task_can_access_history',
        'task_can_recovery_history'
    );