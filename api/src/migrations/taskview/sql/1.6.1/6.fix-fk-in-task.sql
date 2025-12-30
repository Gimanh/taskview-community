alter table tasks.tasks drop constraint fr_task_goal_id;

alter table tasks.tasks add constraint fr_task_goal_id foreign key (goal_id) references tasks.goals (id) on delete cascade;