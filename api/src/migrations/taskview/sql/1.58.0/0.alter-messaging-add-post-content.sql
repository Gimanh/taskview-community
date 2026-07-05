-- Project channels: opt-out flag for including the RBAC-gated task description in the
-- channel message. Default TRUE (channel is a deliberate broadcast). Personal DMs are
-- unaffected — they always gate the description per recipient (COMPONENT_CAN_WATCH_CONTENT).
ALTER TABLE tasks.messaging_connections
    ADD COLUMN IF NOT EXISTS post_content BOOLEAN NOT NULL DEFAULT TRUE;
