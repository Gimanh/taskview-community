DROP TRIGGER IF EXISTS trigger_add_component_permissions_for_user on tasks.goal_lists;

DROP TRIGGER IF EXISTS trigger_set_goal_permissions on tasks.goals;

drop trigger if exists trigger_add_task_permissions_for_user on tasks.tasks;

delete from
    tv_auth.permissions
where
    name = 'component_can_add_subtasks';

delete from
    tasks_auth.user_component_permissions;

delete from
    tasks_auth.user_goal_permissions;

delete from
    tasks_auth.user_task_permissions;

alter table
    tasks.tasks drop column if exists deadline;