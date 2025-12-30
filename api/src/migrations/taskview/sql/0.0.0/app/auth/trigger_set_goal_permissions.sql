--Trigger for adding goal permissions for user
create or replace function tasks.trigger_set_goal_permissions()
    returns trigger as
$permissions$
begin
    insert into tasks_auth.user_goal_permissions (goal_id, user_id, permission_id)
    values (new.id, new.owner, (select id from tv_auth.permissions where name = 'goal_can_delete')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'goal_can_edit')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'goal_can_add_users'));
    return new;
end;
$permissions$
    language plpgsql;

drop trigger if exists trigger_set_goal_permissions on tasks.goals;
create trigger trigger_set_goal_permissions
    after insert
    on tasks.goals
    for each row
execute procedure tasks.trigger_set_goal_permissions();
