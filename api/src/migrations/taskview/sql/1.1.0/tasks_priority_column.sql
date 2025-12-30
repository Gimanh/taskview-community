ALTER TABLE tasks.tasks
    ADD COLUMN IF NOT EXISTS priority_id integer default 1;

alter table tasks.tasks drop constraint if exists tasks_priority_id_fk;
alter table tasks.tasks
    add constraint tasks_priority_id_fk
        foreign key (priority_id)
            references tasks.priority (id);
