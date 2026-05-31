CREATE TABLE IF NOT EXISTS tasks.sprint_cadence (
    goal_id             INTEGER PRIMARY KEY REFERENCES tasks.goals(id) ON DELETE CASCADE,
    enabled             BOOLEAN NOT NULL DEFAULT FALSE,
    length_days         INTEGER NOT NULL DEFAULT 14,
    start_date          DATE NOT NULL,
    lookahead           INTEGER NOT NULL DEFAULT 2,
    name_template       VARCHAR(100) NOT NULL DEFAULT 'Sprint {n}',
    last_generated_date DATE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Per-project sprint cadence (Linear-style auto-generation). A background job
-- keeps the current + `lookahead` future sprints created, every `length_days`
-- starting from `start_date`. `last_generated_date` = start_date of the last
-- auto-created sprint, so generation is idempotent and only moves forward.
