drop index if exists tasks_auth.idx_task_assignee_task_id;
create index idx_task_assignee_task_id on tasks_auth.task_assignee (task_id);

drop index if exists tasks_auth.idx_task_assignee_user_task;
create index idx_task_assignee_user_task on tasks_auth.task_assignee (collab_user_id, task_id);

drop index if exists collaboration.idx_users_to_goals_user_goal;
create index idx_users_to_goals_user_goal on collaboration.users_to_goals (user_id, goal_id);

drop index if exists collaboration.idx_users_to_goals_goal_id;
create index idx_users_to_goals_goal_id on collaboration.users_to_goals (goal_id);

drop index if exists tasks.idx_task_relations_to_task;
create index idx_task_relations_to_task on tasks.task_relations (to_task_id, from_task_id);

drop index if exists tasks.idx_goals_org_active;
create index idx_goals_org_active on tasks.goals (organization_id) where archive = 0;

drop index if exists tasks.idx_tasks_goal_id_open;
create index idx_tasks_goal_id_open on tasks.tasks (goal_id) where complete is not true;
