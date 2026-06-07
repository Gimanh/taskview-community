CREATE TABLE IF NOT EXISTS tasks.recurrence_rules (
    id                        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    goal_id                   INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    template_task_id          INTEGER REFERENCES tasks.tasks(id) ON DELETE SET NULL,
    template_description      VARCHAR(2000),
    template_note             VARCHAR(2000),
    template_priority_id      INTEGER,
    template_status_id        INTEGER,
    template_goal_list_id     INTEGER,
    template_duration_minutes INTEGER,
    rrule                     TEXT NOT NULL,
    dtstart                   TIMESTAMP NOT NULL,
    timezone                  VARCHAR(50) NOT NULL,
    state                     VARCHAR(20) NOT NULL DEFAULT 'active',
    last_instance_date        DATE NOT NULL,
    instances_created         INTEGER NOT NULL DEFAULT 1,
    notify_on_occurrence      BOOLEAN NOT NULL DEFAULT FALSE,
    creator_id                INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_at                 TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT recurrence_state_valid CHECK (state IN ('active', 'paused', 'ended'))
);

CREATE INDEX IF NOT EXISTS idx_recurrence_rules_goal ON tasks.recurrence_rules(goal_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_active ON tasks.recurrence_rules(id) WHERE state = 'active';
