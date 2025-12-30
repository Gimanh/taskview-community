create table tasks.tasks
(
    id              serial UNIQUE,
    parent_id       int       default null
        constraint fr_task_parent_id
            references tasks.tasks (id)
            ON DELETE CASCADE,
    description     varchar,
    complete        bool      default false,
    goal_list_id    int not null
        constraint fr_goal_list_id
            references tasks.goal_lists (id)
            ON DELETE CASCADE,
    date_creation   timestamp default now(),
    owner           int
        constraint fr_task_user_id
            references tv_auth.users (id)
            ON DELETE CASCADE,
    history_section int
        constraint fr_tasks_history_list
            references tasks.history_list (code)
            ON DELETE SET NULL,
    responsible_id  int
        constraint fr_task_responsible_id
            references tv_auth.users (id)
            ON DELETE SET NULL,
    creator_id      int
        constraint fr_task_creator_id
            references tv_auth.users (id)
            ON DELETE SET NULL,
    deadline        timestamp,
    date_complete   timestamp,
    note            varchar,
    edit_date       timestamp
);

create or replace function tasks.update_date_complete()
    returns trigger as
$date_complete$
begin
    if new.complete != old.complete
    then
        if new.complete = true
        then
            update tasks.tasks set date_complete = now() where id = old.id;
        else
            update tasks.tasks set date_complete = null where id = old.id;
        end if;
    end if;
    return new;
end;
$date_complete$
    language plpgsql;

drop trigger if exists tr_update_date_complete on tasks.tasks;
create trigger tr_update_date_complete
    after update
    on tasks.tasks
    for each row
execute procedure tasks.update_date_complete();
