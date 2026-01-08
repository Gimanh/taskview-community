--Delete orphaned records from history.tasks_tasks table
delete from history.tasks_tasks h
where not exists (
  select 1
  from tasks.tasks t
  where t.id = h.task_id
);

--Delete orphaned records from history.tasks_goal_lists table
delete from history.tasks_goal_lists h 
where not exists (
    select  1 
    from tasks.goal_lists gl 
    where gl.id = h.goal_list_id
);

--Delete orphaned records from history.tasks_goals table
delete from history.tasks_goals h 
where not exists (
    select  1 
    from tasks.goals g 
    where g.id = h.goal_id
);

alter table history.tasks_tasks 
add constraint fk_history_tasks_tasks_task_id 
foreign key (task_id) 
references tasks.tasks (id) on delete cascade;

alter table history.tasks_goal_lists
add constraint fk_history_tasks_goal_lists_goal_list_id 
foreign key (goal_list_id) 
references tasks.goal_lists (id) on delete cascade;

alter table history.tasks_goals
add constraint fk_history_tasks_goals_goal_id 
foreign key (goal_id) 
references tasks.goals (id) on delete cascade;



