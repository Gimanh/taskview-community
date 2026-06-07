CREATE TABLE IF NOT EXISTS tasks.recurrence_template_assignees (
    rule_id        INTEGER NOT NULL REFERENCES tasks.recurrence_rules(id) ON DELETE CASCADE,
    collab_user_id INTEGER NOT NULL REFERENCES collaboration.users(id) ON DELETE CASCADE,
    PRIMARY KEY (rule_id, collab_user_id)
);
