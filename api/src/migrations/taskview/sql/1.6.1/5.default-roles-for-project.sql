alter table collaboration.roles
    alter column goal_id set not null;

CREATE OR REPLACE FUNCTION tasks.add_roles_and_permissions()
    RETURNS TRIGGER AS
$$
DECLARE
    editor_role_id  INTEGER;
    executor_role_id INTEGER;
BEGIN
    -- 1. Создаем роль "editor"
    INSERT INTO collaboration.roles (name, goal_id)
    VALUES ('editor', NEW.id)
    RETURNING id INTO editor_role_id;

    -- 2. Создаем роль "executor"
    INSERT INTO collaboration.roles (name, goal_id)
    VALUES ('executor', NEW.id)
    RETURNING id INTO executor_role_id;

    -- 3. Добавляем разрешения для роли "editor"
    INSERT INTO collaboration.permissions_to_role (role_id, permission_id)
    SELECT editor_role_id, id
    FROM tv_auth.permissions
    WHERE name IN (
                   'goal_can_watch_content',
                   'goal_can_edit',
                   'goal_can_add_task_list',
                   'goal_can_manage_users',
                   'component_can_watch_content',
                   'component_can_edit',
                   'component_can_delete',
                   'component_can_add_tasks',
                   'task_can_edit_deadline',
                   'task_can_watch_subtasks',
                   'task_can_watch_note',
                   'task_can_recovery_history',
                   'task_can_watch_assigned_users',
                   'task_can_edit_priority',
                   'task_can_delete',
                   'task_can_watch_details',
                   'task_can_assign_users',
                   'task_can_add_subtasks',
                   'task_can_watch_tags',
                   'task_can_watch_priority',
                   'task_can_access_history',
                   'task_can_edit_tags',
                   'task_can_edit_description',
                   'task_can_edit_status',
                   'task_can_edit_note'
        );

    -- 4. Добавляем разрешения для роли "viewver"
    INSERT INTO collaboration.permissions_to_role (role_id, permission_id)
    SELECT executor_role_id, id
    FROM tv_auth.permissions
    WHERE name IN (
                   'goal_can_watch_content',
                   'component_can_watch_content',
                   'component_can_add_tasks',
                   'task_can_watch_subtasks',
                   'task_can_watch_note',
                   'task_can_watch_assigned_users',
                   'task_can_watch_details',
                   'task_can_add_subtasks',
                   'task_can_watch_tags',
                   'task_can_watch_priority'
        );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


drop trigger if exists add_roles_after_insert on tasks.goals;

CREATE TRIGGER add_roles_after_insert
    AFTER INSERT
    ON tasks.goals -- или другая нужная таблица
    FOR EACH ROW
EXECUTE FUNCTION tasks.add_roles_and_permissions();
