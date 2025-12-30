--Trigger for adding owner for task, extend owner from component
drop trigger if exists trigger_kanban_create_default_columns on tasks.goals;
drop function if exists tasks.function_kanban_create_default_columns();