-- A series anchored to a wall-clock time (incl. exactly 00:00) vs a date-only
-- series ("every day", no time) used to be told apart by inspecting dtstart:
-- midnight meant "no time". That collapses an explicit midnight into date-only.
-- Store the distinction explicitly instead.
ALTER TABLE tasks.recurrence_rules
    ADD COLUMN IF NOT EXISTS has_time BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill reproduces the old inference exactly: any series whose dtstart
-- carries a non-midnight wall-clock time was a timed series. Existing
-- midnight/date-only series keep has_time = FALSE — no behavior change.
UPDATE tasks.recurrence_rules
    SET has_time = TRUE
    WHERE dtstart::time <> '00:00:00';
