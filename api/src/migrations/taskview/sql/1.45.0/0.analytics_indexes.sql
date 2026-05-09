drop index if exists tasks.idx_tasks_goal_id_date_creation;
create index idx_tasks_goal_id_date_creation on tasks.tasks (goal_id, date_creation);

drop index if exists tasks.idx_tasks_goal_id_date_complete;
create index idx_tasks_goal_id_date_complete on tasks.tasks (goal_id, date_complete) where complete = true;

drop index if exists tasks.idx_tasks_goal_id_end_date_open;
create index idx_tasks_goal_id_end_date_open on tasks.tasks (goal_id, end_date) where complete is not true;

drop index if exists tasks.idx_tasks_goal_id_edit_date_open;
create index idx_tasks_goal_id_edit_date_open on tasks.tasks (goal_id, edit_date) where complete is not true;

drop index if exists tasks.idx_tasks_goal_id_transaction_type;
create index idx_tasks_goal_id_transaction_type on tasks.tasks (goal_id, transaction_type) where amount is not null;
