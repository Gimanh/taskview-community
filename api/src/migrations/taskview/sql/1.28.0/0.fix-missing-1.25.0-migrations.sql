-- Fix: these migrations were missing from 1.25.0 migrate.json scripts list

-- Convert TIMETZ columns to TIME (without timezone)
-- Existing values are converted to UTC automatically by "AT TIME ZONE 'UTC'"
ALTER TABLE tasks.tasks
  ALTER COLUMN start_time TYPE TIME USING start_time AT TIME ZONE 'UTC',
  ALTER COLUMN end_time TYPE TIME USING end_time AT TIME ZONE 'UTC';

ALTER TABLE tasks.device_tokens
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'UTC';
