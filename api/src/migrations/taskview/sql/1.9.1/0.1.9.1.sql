--Trigger for adding owner for task, extend owner from component
CREATE OR REPLACE FUNCTION tasks.trigger_set_owner_for_task()
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
execute procedure tasks.trigger_set_owner_for_task();


--update order 
UPDATE tasks.tasks 
SET task_order = id WHERE task_order IS NULL;
UPDATE tasks.tasks 
SET kanban_order = id WHERE kanban_order IS NULL;