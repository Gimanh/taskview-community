alter table
    tasks.tasks
add
    column start_date timestamptz;

alter table
    tasks.tasks
add
    column end_date timestamptz;