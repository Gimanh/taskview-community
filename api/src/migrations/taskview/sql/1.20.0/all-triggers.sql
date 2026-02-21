--1.
--Trigger set previous version
create or replace function app.trigger_set_previous_version()
    returns trigger as
$date_complete$
begin
    new.prev_version = old.version;
    return new;
end;
$date_complete$
    language plpgsql;

drop trigger if exists trigger_set_previous_version on app.version;
create trigger trigger_set_previous_version
    before insert
    on app.version
    for each row
execute procedure app.trigger_set_previous_version();

--2.
--Trigger for adding owner for taskList from goal
create or replace function tasks.trigger_set_owner_for_component()
    returns trigger as
$date_complete$
begin
    new.owner = (select owner from tasks.goals where id = new.goal_id);
    return new;
end;
$date_complete$
    language plpgsql;

drop trigger if exists trigger_set_owner_for_component on tasks.goal_lists;
create trigger trigger_set_owner_for_component
    before insert
    on tasks.goal_lists
    for each row
execute procedure tasks.trigger_set_owner_for_component();

--3.
--Trigger for updating date_complete for task
create or replace function tasks.update_date_complete()
    returns trigger as
$date_complete$
begin
    if new.complete != old.complete
    then
        if new.complete = true
        then
            update tasks.tasks set date_complete = now() where id = old.id;
        else
            update tasks.tasks set date_complete = null where id = old.id;
        end if;
    end if;
    return new;
end;
$date_complete$
    language plpgsql;

drop trigger if exists tr_update_date_complete on tasks.tasks;
create trigger tr_update_date_complete
    after update
    on tasks.tasks
    for each row
execute procedure tasks.update_date_complete();

--4.
-- Delete user from collaboration if not assigned to any goal
create or replace function collaboration.delete_user_if_not_assigned_to_goal()
returns trigger as $$
declare
    count int;
begin
    if not exists (
        select 1
        from collaboration.users_to_goals
        where user_id = old.user_id
        limit 1
    ) then
        delete from collaboration.users where id = old.user_id;
    end if;

    return old;
end;
$$ language plpgsql;

drop trigger if exists trigger_delete_user_if_not_assigned_to_goal on collaboration.users_to_goals;
create trigger trigger_delete_user_if_not_assigned_to_goal 
    after delete 
    on collaboration.users_to_goals 
    for each row 
execute function collaboration.delete_user_if_not_assigned_to_goal();

--5.
--Trigger for checking task graph relation goal to avoid connection between tasks from different goals
create or replace function tasks.check_task_graph_relation_goal()
returns trigger as $$
declare
    from_goal int;
    to_goal   int;
begin
    select goal_id into from_goal from tasks.tasks where id = new.from_task_id;
    select goal_id into to_goal   from tasks.tasks where id = new.to_task_id;

    if from_goal is null or to_goal is null then
        raise exception 'Invalid task reference in relation';
    end if;

    if from_goal <> to_goal then
        raise exception 'Relation goal_id must match both tasks'' goal_id';
    end if;

    new.goal_id := from_goal;

    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_task_relation_goal on tasks.task_relations;
create trigger trigger_task_relation_goal
before insert or update on tasks.task_relations
for each row execute function tasks.check_task_graph_relation_goal();

--6.
--Trigger for logging changes in taskList to history table
create or replace function tasks.log_changes_tasks_goal_lists()
    returns trigger as
$body$
begin
    if tg_op = 'DELETE' then
        insert into history.tasks_goal_lists (goal_list_id, edit_date, task, deleted) values (old.id, now(), to_jsonb(old), 1);
        return old;
    elseif tg_op = 'UPDATE' then
        insert into history.tasks_goal_lists (goal_list_id, edit_date, task, deleted)
        VALUES (old.id, new.date_creation, to_jsonb(old), 0);
        new.edit_date = now();
        return new;
    end if;
end
$body$
    language plpgsql;

drop trigger if exists trigger_log_changes_tasks_goal_lists on tasks.goal_lists;
create trigger trigger_log_changes_tasks_goal_lists
    before update or delete
    on tasks.goal_lists
    for each row
execute procedure tasks.log_changes_tasks_goal_lists();

--7.
--Trigger for logging changes in goal to history table
create or replace function tasks.log_changes_tasks_goals()
    returns trigger as
$body$
begin
    if tg_op = 'DELETE' then
        insert into history.tasks_goals (goal_id, edit_date, task, deleted) values (old.id, now(), to_jsonb(old), 1);
        return old;
    elseif tg_op = 'UPDATE' then
        insert into history.tasks_goals (goal_id, edit_date, task, deleted)
        VALUES (old.id, new.date_creation, to_jsonb(old), 0);
        new.edit_date = now();
        return new;
    end if;
end
$body$
    language plpgsql;

drop trigger if exists trigger_log_changes_tasks_goals on tasks.goals;
create trigger trigger_log_changes_tasks_goals
    before update or delete
    on tasks.goals
    for each row
execute procedure tasks.log_changes_tasks_goals();

--8.
--Trigger for logging changes in task to history table
create or replace function tasks.log_changes_tasks_tasks()
    returns trigger as
$body$
begin
    if tg_op = 'DELETE' then
        insert into history.tasks_tasks (task_id, edit_date, task, deleted) values (old.id, now(), to_jsonb(old), 1);
        return old;
    elseif tg_op = 'UPDATE' then
        insert into history.tasks_tasks (task_id, edit_date, task, deleted)
        VALUES (old.id, new.date_creation, to_jsonb(old), 0);
        new.edit_date = now();
        return new;
    end if;
end
$body$
    language plpgsql;

drop trigger if exists trigger_log_changes_tasks_tasks on tasks.tasks;
create trigger trigger_log_changes_tasks_tasks
    before update or delete
    on tasks.tasks
    for each row
execute procedure tasks.log_changes_tasks_tasks();

--9.
--Trigger for setting goal_id default for task
CREATE OR REPLACE FUNCTION tasks.set_goal_id_default_for_task()
    RETURNS TRIGGER AS
$$
DECLARE
    goal_id INT;
BEGIN
    
    SELECT gl.goal_id
    INTO goal_id
    FROM tasks.goal_lists gl
    WHERE gl.id = NEW.goal_list_id;

    IF goal_id IS NOT NULL THEN
        NEW.goal_id := goal_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists before_insert_set_goal_id_for_task on tasks.tasks;

CREATE TRIGGER before_insert_set_goal_id_for_task
    BEFORE INSERT OR UPDATE
    ON tasks.tasks
    FOR EACH ROW
EXECUTE FUNCTION tasks.set_goal_id_default_for_task();


--10.
--Trigger for adding default roles and permissions for goal
CREATE OR REPLACE FUNCTION tasks.add_roles_and_permissions()
    RETURNS TRIGGER AS
$$
DECLARE
    editor_role_id  INTEGER;
    executor_role_id INTEGER;
BEGIN
    -- 1. Create role "editor"
    INSERT INTO collaboration.roles (name, goal_id)
    VALUES ('editor', NEW.id)
    RETURNING id INTO editor_role_id;

    -- 2. Create role "executor"
    INSERT INTO collaboration.roles (name, goal_id)
    VALUES ('executor', NEW.id)
    RETURNING id INTO executor_role_id;

    -- 3. Add permissions for role "editor"
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
                   'task_can_edit_note',
                   'kanban_can_manage',
                   'kanban_can_view',
                   'graph_can_manage',
                   'graph_can_view'
        );

    -- 4. Add permissions for role "viewver"
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
    ON tasks.goals 
    FOR EACH ROW
EXECUTE FUNCTION tasks.add_roles_and_permissions();


--11.
--Trigger for adjusting start and end dates for task
CREATE OR REPLACE FUNCTION tasks.adjust_start_and_end_dates()
    RETURNS TRIGGER AS
$$
DECLARE
    start_timestamp TIMESTAMPTZ;
    end_timestamp   TIMESTAMPTZ;
BEGIN
    -- If start_date is NULL, then start_time should be NULL
    IF NEW.start_date IS NULL THEN
        NEW.start_time := NULL;
    END IF;

    -- If end_date is NULL, then end_time should be NULL
    IF NEW.end_date IS NULL THEN
        NEW.end_time := NULL;
    END IF;

    -- If both dates are set
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
        -- Adjust dates
        IF NEW.start_date > NEW.end_date THEN
            -- If start_date is greater than end_date, set end_date to start_date
            NEW.end_date := NEW.start_date;
            -- end_time remains unchanged
        ELSIF NEW.end_date < NEW.start_date THEN
            -- If end_date is less than start_date, set start_date to end_date
            NEW.start_date := NEW.end_date;
            -- start_time remains unchanged
        END IF;

        -- Prepare timestamps for comparison
        start_timestamp := (NEW.start_date::text || ' ' || COALESCE(NEW.start_time::text, '00:00:00+00'))::timestamptz;
        end_timestamp := (NEW.end_date::text || ' ' || COALESCE(NEW.end_time::text, '00:00:00+00'))::timestamptz;

        -- If start_timestamp is greater than end_timestamp, adjust end_date and end_time
        IF start_timestamp > end_timestamp THEN
            NEW.end_date := NEW.start_date;
            -- Assign end_time only if start_time is not NULL
            IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
                NEW.end_time := NEW.start_time;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


drop trigger if exists adjust_dates_and_times_trigger on tasks.tasks;
CREATE TRIGGER adjust_dates_and_times_trigger
    BEFORE INSERT OR UPDATE
    ON tasks.tasks
    FOR EACH ROW
EXECUTE FUNCTION tasks.adjust_start_and_end_dates();

--12.
--Trigger for adding self/owner to collaboration table to be able to assign tasks to self
create or replace function tasks.add_self_to_collaboration()
returns trigger as $$
DECLARE
    owner_email TEXT;
BEGIN

    select email into owner_email
    from tv_auth.users
    where id = NEW.owner;

    if owner_email is not null then
        insert into collaboration.users (email) values (owner_email) ON CONFLICT (email) DO NOTHING;
        insert into collaboration.users_to_goals (goal_id, user_id) values (NEW.id, (select id from collaboration.users where email = owner_email));
    end if;

    return NEW;
END;
$$ language plpgsql;

drop trigger if exists add_selt_to_collaboration_trg on tasks.goals;

create trigger add_selt_to_collaboration_trg
    after insert on tasks.goals
    for each row
    execute function tasks.add_self_to_collaboration();

--13.
--Trigger for adding default kanban columns for new goal
CREATE OR REPLACE FUNCTION tasks.kanban_add_default_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Add default columns for new goal
    INSERT INTO tasks.statuses (name, goal_id, view_order)
    VALUES 
        ('TODO', NEW.id, 1),
        ('In Progress', NEW.id, 2),
        ('Done', NEW.id, 3);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kanban_add_default_columns_trg ON tasks.goals;

CREATE TRIGGER kanban_add_default_columns_trg
AFTER INSERT ON tasks.goals
FOR EACH ROW
EXECUTE FUNCTION tasks.kanban_add_default_columns();

--14.
--Trigger for validating the correct statusId for the inserted value. To avoid assigning a status that does not belong to the goal.
CREATE OR REPLACE FUNCTION tasks.check_task_status_goal()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if there is a record in tasks.statuses with the same goal_id
    IF NOT EXISTS (
        SELECT 1 FROM tasks.statuses s 
        WHERE s.id = NEW.status_id AND s.goal_id = NEW.goal_id
    ) THEN
        RAISE EXCEPTION 'Status ID % is not valid for goal ID %', NEW.status_id, NEW.goal_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists enforce_task_status_goal on tasks.tasks;

CREATE TRIGGER enforce_task_status_goal
BEFORE INSERT OR UPDATE ON tasks.tasks
FOR EACH ROW
WHEN (NEW.status_id IS NOT NULL)
EXECUTE FUNCTION tasks.check_task_status_goal();

--15.
--Trigger for setting default orders value for task
CREATE OR REPLACE FUNCTION tasks.set_order_value()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.task_order IS NULL THEN
        NEW.task_order := NEW.id;
    END IF;
    IF NEW.kanban_order IS NULL THEN
        NEW.kanban_order := NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists set_order_trigger on tasks.tasks;
CREATE TRIGGER set_order_trigger
BEFORE INSERT ON tasks.tasks
FOR EACH ROW
EXECUTE FUNCTION tasks.set_order_value();

--16.
--Trigger for setting default view order for new status
CREATE OR REPLACE FUNCTION tasks.status_set_default_view_order()
RETURNS TRIGGER AS $$
DECLARE
    new_view_order INT;
BEGIN
    -- Determine the next view_order for the given goal_id
    SELECT COALESCE(MAX(view_order), 0) + 1 INTO new_view_order
    FROM tasks.statuses
    WHERE goal_id = NEW.goal_id;

    -- Assign the calculated value to the view_order field
    NEW.view_order := new_view_order;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists set_default_status_view_order on tasks.statuses;

CREATE TRIGGER set_default_status_view_order
BEFORE INSERT ON tasks.statuses
FOR EACH ROW
EXECUTE FUNCTION tasks.status_set_default_view_order();

--17.
--Trigger for validating the correct user_id for the inserted value. To avoid assigning a user that does not belong to the goal.
CREATE OR REPLACE FUNCTION tasks_auth.control_user_id_is_from_same_goal_as_task()
RETURNS TRIGGER AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM tasks.tasks tt    
        LEFT JOIN collaboration.users_to_goals utg ON utg.goal_id = tt.goal_id
        WHERE tt.id = NEW.task_id AND utg.user_id = NEW.collab_user_id
    ) INTO user_exists;

    IF NOT user_exists THEN
        RAISE EXCEPTION 'User % is not associated with the goal of task %', NEW.collab_user_id, NEW.task_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists trigger_control_user_id_is_from_same_goal_as_task on tasks_auth.task_assignee;

CREATE TRIGGER trigger_control_user_id_is_from_same_goal_as_task
BEFORE INSERT ON tasks_auth.task_assignee
FOR EACH ROW
EXECUTE FUNCTION tasks_auth.control_user_id_is_from_same_goal_as_task();

--18.
--Trigger for adding owner for task, extend owner from goal or taskList

--delete old function with wrong name
drop trigger if exists trigger_set_owner_for_task on tasks.tasks;
drop function if exists tasks.trigger_set_owner_for_task();

CREATE OR REPLACE FUNCTION tasks.fn_set_owner_for_task()
RETURNS TRIGGER AS
$body$
BEGIN
    NEW.owner := COALESCE(
        (SELECT owner FROM tasks.goal_lists WHERE id = NEW.goal_list_id),
        (SELECT owner FROM tasks.goals WHERE id = NEW.goal_id)
    );
    
    IF NEW.owner IS NULL THEN
        RAISE EXCEPTION 'Can not insert task without owner';
    END IF;

    RETURN NEW;
END;
$body$
LANGUAGE plpgsql;

drop trigger if exists trigger_set_owner_for_task on tasks.tasks;
create trigger trigger_set_owner_for_task
    before insert
    on tasks.tasks
    for each row
execute procedure tasks.fn_set_owner_for_task();

--19.
--Trigger for validating that tag and task belong to the same project (goal_id)
drop trigger if exists trigger_check_tag_task_same_goal on tasks.tasks_to_tags;
drop function if exists tasks.check_tag_task_same_goal();

create or replace function tasks.check_tag_task_same_goal()
returns trigger as $$
declare
    v_tag_goal_id integer;
    v_task_goal_id integer;
begin
    select goal_id into v_tag_goal_id from tasks.tags where id = new.tag_id;
    select goal_id into v_task_goal_id from tasks.tasks where id = new.task_id;

    if v_tag_goal_id is null or v_tag_goal_id != v_task_goal_id then
        raise exception 'Tag (id=%) and task (id=%) belong to different projects', new.tag_id, new.task_id;
    end if;

    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_check_tag_task_same_goal on tasks.tasks_to_tags;
create trigger trigger_check_tag_task_same_goal
    before insert on tasks.tasks_to_tags
    for each row
execute function tasks.check_tag_task_same_goal();

