-- Log of sent project-invite emails, used to rate-limit sending:
-- a 24h per-recipient cooldown and an hourly cap per initiator.
-- Rows older than 24 hours are pruned opportunistically before each insert.
CREATE TABLE IF NOT EXISTS collaboration.invite_emails (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    initiator_id INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL,
    goal_id      INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    sent_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_emails_initiator_sent ON collaboration.invite_emails(initiator_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_invite_emails_goal_email_sent ON collaboration.invite_emails(goal_id, email, sent_at);
