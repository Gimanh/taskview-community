update
    tv_auth.permissions
set
    description = 'User can manage project users',
    name = 'goal_can_manage_users'
where
    name = 'goal_can_add_users';

insert into
    tv_auth.permissions (name, description, permission_group)
values
    (
        'task_can_assign_users',
        'User can assing all project users to tasks',
        4
    ),
    (
        'task_can_watch_assigned_users',
        'User can see assigned users to tasks',
        4
    );