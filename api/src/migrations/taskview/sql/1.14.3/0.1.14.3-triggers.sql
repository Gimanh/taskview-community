-- Delete user if not assigned to any goal
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