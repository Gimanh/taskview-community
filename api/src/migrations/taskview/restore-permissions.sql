INSERT INTO tv_auth.permissions (name, description)
VALUES ('app_access', 'Access to the app'),
       ('access_create_goals', 'Create goals in own account'),
       ('access_edit_goals', 'Edit goals in own account'),
       ('access_delete_goals', 'Delete goals in own account'),
       ('access_create_components', 'Create components in own account'),
       ('access_edit_components', 'Edit components in own account'),
       ('access_delete_components', 'Delete components in own account'),
       ('access_create_tasks', 'Create tasks in own account'),
       ('access_edit_tasks', 'Edit tasks in own account'),
       ('access_delete_tasks', 'Delete tasks in own account');

INSERT INTO tv_auth.permissions (name, description)
VALUES ('goal_can_delete', 'User can delete goal'),
       ('goal_can_edit', 'User can edit goal'),
       ('goal_can_add_users', 'User can add goal users');

INSERT INTO tv_auth.permissions (name, description)
VALUES ('component_can_delete', 'User can delete component'),
       ('component_can_edit', 'User can edit component'),
       ('component_can_watch_content', 'User can watch component content'),
       ('component_can_add_tasks', 'User can add tasks into component'),
       ('component_can_add_subtasks', 'User can add subtasks in component'),
       ('component_can_edit_all_tasks', 'User can edit all tasks in component'),
       ('component_can_edit_their_tasks', 'User can edit their tasks');

INSERT INTO tv_auth.permissions (name, description)
VALUES ('task_can_delete', 'User can delete task'),
       ('task_can_edit_description', 'User can edit task description'),
       ('task_can_edit_status', 'User can change task status'),
       ('task_can_edit_note', 'User can edit task note'),
       ('task_can_edit_deadline', 'User can edit task deadline'),
       ('task_can_watch_details', 'User can watch task detail form'),
       ('task_can_watch_subtasks', 'User can watch subtasks'),
       ('task_can_add_subtasks', 'User can add subtasks into main task');

INSERT INTO tv_auth.permissions (name, description)
VALUES ('task_can_edit_tags', 'User can edit task tags'),
       ('task_can_watch_tags', 'User can watch task tags'),
       ('task_can_watch_priority', 'User can watch task priority'),
       ('task_can_edit_priority', 'User can edit task priority')
on conflict do nothing;

INSERT INTO tv_auth.permissions (name, description)
VALUES ('task_can_access_history', 'User can access task history'),
       ('task_can_recovery_history', 'User can recovery task history state')
on conflict do nothing;


update
    tv_auth.permissions
set permission_group = 1
where name in (
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
set permission_group = 2
where name in (
               'goal_can_delete',
               'goal_can_edit',
               'goal_can_add_users'
    );

update
    tv_auth.permissions
set permission_group = 3
where name in (
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
set permission_group = 4
where name in (
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

insert into tv_auth.permissions (name, description, permission_group)
values ('goal_can_watch_content',
        'User can watch Task lists in goal',
        2),
       ('goal_can_add_task_list',
        'User can add Task list into goal',
        2),
       ('task_can_watch_note',
        'User can watch Task note',
        4);

delete
from tv_auth.permissions
where name = 'component_can_add_subtasks';


update
    tv_auth.permissions
set description = 'User can manage project users',
    name        = 'goal_can_manage_users'
where name = 'goal_can_add_users';

insert into tv_auth.permissions (name, description, permission_group)
values ('task_can_assign_users',
        'User can assing all project users to tasks',
        4),
       ('task_can_watch_assigned_users',
        'User can see assigned users to tasks',
        4);
