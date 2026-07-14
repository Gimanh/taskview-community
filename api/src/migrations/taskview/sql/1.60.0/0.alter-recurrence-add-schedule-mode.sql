-- 'fixed' — occurrences follow the calendar schedule (rrule anchored at dtstart);
-- 'after-completion' — the next occurrence is one FREQ/INTERVAL step after the
-- day the current instance was completed (Todoist "every!"), no calendar anchor.
ALTER TABLE tasks.recurrence_rules
    ADD COLUMN IF NOT EXISTS schedule_mode VARCHAR(20) NOT NULL DEFAULT 'fixed';

ALTER TABLE tasks.recurrence_rules
    DROP CONSTRAINT IF EXISTS recurrence_schedule_mode_valid;
ALTER TABLE tasks.recurrence_rules
    ADD CONSTRAINT recurrence_schedule_mode_valid CHECK (schedule_mode IN ('fixed', 'after-completion'));
