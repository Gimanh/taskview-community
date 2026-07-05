-- Per-connection event subscription: which events this messaging connection delivers.
-- Default covers the common task events; users opt into sprint events in the UI.
ALTER TABLE tasks.messaging_connections
    ADD COLUMN IF NOT EXISTS events VARCHAR[] NOT NULL
    DEFAULT ARRAY['task.created','task.assigned','task.statusChanged','task.completed']::VARCHAR[];
