CREATE TABLE IF NOT EXISTS tasks.recurrence_template_tags (
    rule_id INTEGER NOT NULL REFERENCES tasks.recurrence_rules(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tasks.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (rule_id, tag_id)
);
