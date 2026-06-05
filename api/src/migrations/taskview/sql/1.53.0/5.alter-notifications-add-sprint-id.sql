ALTER TABLE tasks.notifications
    ADD COLUMN IF NOT EXISTS sprint_id INTEGER REFERENCES tasks.sprints(id) ON DELETE CASCADE;
    -- Lets the client deep-link a notification to "open sprint N" without
    -- stuffing metadata into the body.
