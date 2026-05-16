CREATE SCHEMA IF NOT EXISTS history;

CREATE TABLE IF NOT EXISTS history.time_entries (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER NOT NULL REFERENCES tasks.time_entries(id) ON DELETE CASCADE,
    edit_date TIMESTAMP NOT NULL DEFAULT NOW(),
    entry JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_time_entries_entry
    ON history.time_entries(entry_id, edit_date DESC);
