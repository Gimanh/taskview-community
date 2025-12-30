--Trigger for adding owner for component
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
