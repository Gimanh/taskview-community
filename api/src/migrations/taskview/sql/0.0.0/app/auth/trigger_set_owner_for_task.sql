--Trigger for adding owner for task, extend owner from component
create or replace function tasks.trigger_set_owner_for_task()
    returns trigger as
$body$
begin
    new.owner = (select owner from tasks.goal_lists where id = new.goal_list_id);
    return new;
end;
$body$
    language plpgsql;

drop trigger if exists trigger_set_owner_for_task on tasks.tasks;
create trigger trigger_set_owner_for_task
    before insert
    on tasks.tasks
    for each row
execute procedure tasks.trigger_set_owner_for_task();
