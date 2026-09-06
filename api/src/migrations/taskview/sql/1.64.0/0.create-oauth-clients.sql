-- OAuth 2.1 client registry. Clients are either seeded manually by an operator
-- or created through Dynamic Client Registration (RFC 7591) when it is enabled.
-- Public clients (MCP clients such as ChatGPT or Claude) hold no secret and are
-- authenticated by PKCE alone, so client_secret_hash stays NULL for them.
CREATE TABLE IF NOT EXISTS tv_auth.oauth_clients (
    id                 INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    client_id          VARCHAR(64) NOT NULL UNIQUE,
    client_secret_hash VARCHAR(64),
    name               VARCHAR(200) NOT NULL,
    redirect_uris      VARCHAR[] NOT NULL DEFAULT '{}',
    created_via        VARCHAR(16) NOT NULL DEFAULT 'manual',
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT oauth_clients_created_via_check CHECK (created_via IN ('manual', 'dcr'))
);

CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON tv_auth.oauth_clients(client_id);
