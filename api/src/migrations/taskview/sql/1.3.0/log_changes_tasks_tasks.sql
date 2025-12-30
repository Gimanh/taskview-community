--drop history_section column
alter table tasks.tasks
    drop column if exists history_section;
alter table tasks.goal_lists
    drop column if exists history_section;
alter table tasks.goals
    drop column if exists history_section;
drop table if exists tasks.history_list cascade;


create schema if not exists history;
create table if not exists history.tasks_tasks
(
    id        serial unique,
    task_id   int,
    edit_date timestamp,
    task      jsonb,
    deleted   int default 0,
    primary key (id, task_id)
);

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
