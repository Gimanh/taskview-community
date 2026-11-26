CREATE TABLE IF NOT EXISTS tv_auth.user_onboarding (
    user_id    INTEGER PRIMARY KEY REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT user_onboarding_status_check CHECK (status IN ('completed', 'dismissed'))
);
