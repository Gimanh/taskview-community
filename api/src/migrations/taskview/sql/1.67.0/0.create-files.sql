CREATE SCHEMA IF NOT EXISTS tv_files;

CREATE TABLE IF NOT EXISTS tv_files.files (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id          INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    uploader_id      INTEGER REFERENCES tv_auth.users(id) ON DELETE SET NULL,
    uploader_email   VARCHAR(255) NOT NULL,
    name             VARCHAR(255) NOT NULL,
    original_name    VARCHAR(255) NOT NULL,
    mime_type        VARCHAR(255) NOT NULL,
    size_bytes       BIGINT NOT NULL,
    checksum_sha256  VARCHAR(64) NOT NULL,
    storage_provider VARCHAR(20) NOT NULL,
    storage_key      VARCHAR(512) NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT files_storage_provider_check CHECK (storage_provider IN ('local', 's3'))
);

CREATE INDEX IF NOT EXISTS files_goal_created_idx ON tv_files.files(goal_id, created_at);
CREATE INDEX IF NOT EXISTS files_goal_name_idx ON tv_files.files(goal_id, name);
CREATE INDEX IF NOT EXISTS files_provider_idx ON tv_files.files(storage_provider);
