--Trigger for adding task permissions for user
create or replace function tasks.add_task_permissions_for_user()
    returns trigger as
$date_complete$
begin
    insert into tasks_auth.user_task_permissions (task_id, user_id, permission_id)
    values (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_delete')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_edit_description')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_edit_status')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_edit_note')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_edit_deadline')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_watch_details')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_watch_subtasks')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_add_subtasks')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_edit_tags')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_watch_tags')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_watch_priority')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_edit_priority')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_access_history')),
           (new.id, new.owner, (select id from tv_auth.permissions where name = 'task_can_recovery_history'));
    return new;
end;
$date_complete$
    language plpgsql;

drop trigger if exists trigger_add_task_permissions_for_user on tasks.tasks;
create trigger trigger_add_task_permissions_for_user
    after insert
    on tasks.tasks
    for each row
execute procedure tasks.add_task_permissions_for_user();
