CREATE TABLE IF NOT EXISTS tasks.sprint_user_capacity (
    sprint_id       INTEGER NOT NULL REFERENCES tasks.sprints(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    hours           NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (sprint_id, user_id)
);
