create extension IF NOT EXISTS pg_trgm with schema pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA tasks;

drop index if exists tasks.tasks_description_trgm_idx;

CREATE INDEX tasks_description_trgm_idx ON tasks.tasks USING GIN (description gin_trgm_ops);

drop index if exists tasks.idx_tasks_goals;

CREATE INDEX idx_tasks_goals ON tasks.goals (owner, creator_id);

drop index if exists tasks.idx_tasks_goal_lists;

CREATE INDEX idx_tasks_goal_lists ON tasks.goal_lists (goal_id, owner);

drop index if exists tasks.idx_tasks_tasks;

CREATE INDEX idx_tasks_tasks ON tasks.tasks (goal_list_id, owner, parent_id);

drop index if exists tasks.idx_tasks_tags;

CREATE INDEX idx_tasks_tags ON tasks.tags (owner, goal_id);

--no need this index
DROP INDEX if exists tv_auth.permissions_id;

CREATE INDEX idx_tv_auth_permissions_group ON tv_auth.permissions (permission_group);

drop index if exists collaboration.idx_collaboration_users_email;

create index idx_collaboration_users_email on collaboration.users(email);

drop index if exists collaboration.idx_roles_goal_id;

create index idx_roles_goal_id on collaboration.roles(goal_id);

CREATE INDEX idx_users_to_roles_user_id ON collaboration.users_to_roles(user_id);

CREATE INDEX idx_users_to_roles_role_id ON collaboration.users_to_roles(role_id);

CREATE INDEX idx_permissions_to_role_role_id ON collaboration.permissions_to_role(role_id);

CREATE INDEX idx_permissions_to_role_permission_id ON collaboration.permissions_to_role (permission_id);