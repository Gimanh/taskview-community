ALTER TABLE tasks.goals
    ADD COLUMN IF NOT EXISTS is_inbox BOOLEAN NOT NULL DEFAULT FALSE;
    -- Flags a project as the user's personal Inbox. One Inbox per personal organization;
    -- drives auto-create at signup, the backfill below, and the delete/archive guard.
