-- An organization admin links a SCIM group to a project: people who join the group are added
-- to the project with the default role. Only additions follow, the project is managed in TaskView
CREATE TABLE IF NOT EXISTS tv_auth.scim_group_projects (
    group_id   INTEGER NOT NULL REFERENCES tv_auth.scim_groups(id) ON DELETE CASCADE,
    goal_id    INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    role_id    INTEGER NOT NULL REFERENCES collaboration.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, goal_id)
);

CREATE INDEX IF NOT EXISTS scim_group_projects_goal_id_idx ON tv_auth.scim_group_projects (goal_id);
