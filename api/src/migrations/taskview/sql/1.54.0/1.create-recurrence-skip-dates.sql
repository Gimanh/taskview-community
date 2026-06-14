CREATE TABLE IF NOT EXISTS tasks.recurrence_skip_dates (
    rule_id    INTEGER NOT NULL REFERENCES tasks.recurrence_rules(id) ON DELETE CASCADE,
    skip_date  DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (rule_id, skip_date)
);
