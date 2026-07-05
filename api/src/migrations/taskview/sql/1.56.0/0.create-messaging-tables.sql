-- Messaging integrations (Slack / Telegram): outbound delivery targets, pending
-- binding tokens, and the map between a TaskView user and their external account.
-- See promo/integrations.md for the full design.

CREATE TABLE IF NOT EXISTS tasks.messaging_connections (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    provider VARCHAR(20) NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    owner_id INTEGER NOT NULL,
    target_chat_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    external_team_id VARCHAR(255),
    access_token_encrypted VARCHAR,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- One delivery target per (provider, owner, chat) — re-connecting the same chat updates instead of duplicating.
CREATE UNIQUE INDEX IF NOT EXISTS messaging_connection_unique
    ON tasks.messaging_connections (provider, owner_type, owner_id, target_chat_id);

-- Pending binding intent, redeemed from the messenger. Owner is polymorphic
-- (user / project / organization); permission to bind is checked when the token is minted.
CREATE TABLE IF NOT EXISTS tasks.messaging_link_tokens (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    token VARCHAR(128) NOT NULL UNIQUE,
    provider VARCHAR(20) NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    owner_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks.messaging_identity_map (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    external_user_id VARCHAR(255),
    linked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- One identity per provider per user.
CREATE UNIQUE INDEX IF NOT EXISTS messaging_identity_unique
    ON tasks.messaging_identity_map (user_id, provider);
