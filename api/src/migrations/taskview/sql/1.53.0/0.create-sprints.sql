CREATE TABLE IF NOT EXISTS tasks.sprints (
    id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    goal_id           INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    goal_text         VARCHAR(2000),
    goal_achieved     BOOLEAN,
    status            VARCHAR(20) NOT NULL DEFAULT 'draft',
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    capacity          NUMERIC(10, 2),
    paused_at         TIMESTAMP,
    creator_id        INTEGER REFERENCES tv_auth.users(id),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    review_started_at TIMESTAMP,
    completed_at      TIMESTAMP,
    CONSTRAINT sprint_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_sprints_goal_status ON tasks.sprints(goal_id, status);

-- At most one active OR in-review sprint per project, enforced at the DB level
-- (no race). 'review' also holds the slot: the previous sprint must be closed
-- before the next can start.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_sprint_per_goal
    ON tasks.sprints(goal_id) WHERE status IN ('active', 'review');
