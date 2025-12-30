alter table tasks.tasks add column if not exists start_time timetz;
alter table tasks.tasks add column if not exists end_time timetz;

alter table tasks.tasks alter column start_date TYPE DATE;
alter table tasks.tasks alter column end_date TYPE DATE;

drop trigger if exists check_dates_before_insert_update on tasks.tasks;
drop function if exists tasks.check_task_dates;