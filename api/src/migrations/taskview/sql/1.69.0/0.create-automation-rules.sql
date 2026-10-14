CREATE SCHEMA IF NOT EXISTS tv_automations;

CREATE TABLE IF NOT EXISTS tv_automations.rules (
    id             SERIAL PRIMARY KEY,
    goal_id        INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    creator_id     INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    trigger_module VARCHAR(64) NOT NULL,
    trigger_event  VARCHAR(64) NOT NULL,
    trigger_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_module  VARCHAR(64) NOT NULL,
    action_name    VARCHAR(64) NOT NULL,
    action_params  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rules_goal_enabled_idx ON tv_automations.rules(goal_id, enabled);
