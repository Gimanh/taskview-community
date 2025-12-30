--Trigger for adding goal component permissions for user
create or replace function tasks.add_component_permissions_for_user()
    returns trigger as
$permissions$
begin
    insert into tasks_auth.user_component_permissions (component_id, user_id, permission_id)
    values (new.id, new.owner, (select id from tv_auth.permissions where name = 'component_can_delete')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'component_can_edit')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'component_can_watch_content')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'component_can_add_tasks')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'component_can_add_subtasks')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'component_can_edit_all_tasks')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'component_can_edit_their_tasks'));
    return new;
end;
$permissions$
    language plpgsql;

drop trigger if exists trigger_add_component_permissions_for_user on tasks.goal_lists;
create trigger trigger_add_component_permissions_for_user
    after insert
    on tasks.goal_lists
    for each row
execute procedure tasks.add_component_permissions_for_user();
