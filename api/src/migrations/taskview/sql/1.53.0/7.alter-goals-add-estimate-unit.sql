ALTER TABLE tasks.goals
    ADD COLUMN IF NOT EXISTS estimate_unit VARCHAR(10) NOT NULL DEFAULT 'points';
    -- 'hours' | 'points' — unit the project measures sprint estimates & capacity in.
