--Trigger for adding owner for task, extend owner from component
CREATE OR REPLACE FUNCTION tasks.function_kanban_create_default_columns()
RETURNS TRIGGER AS
$body$
BEGIN

    insert into tasks.statuses (name, goal_id, view_order) 
    values 
    ('TODO', new.id, 1),
    ('In Progress', new.id, 2),
    ('Done', new.id, 3);

    RETURN NEW;
END;
$body$
LANGUAGE plpgsql;

drop trigger if exists trigger_kanban_create_default_columns on tasks.goals;
create trigger trigger_kanban_create_default_columns
    after insert
    on tasks.goals
    for each row
execute procedure tasks.function_kanban_create_default_columns();