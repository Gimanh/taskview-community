CREATE TABLE IF NOT EXISTS tv_billing.counterparties (
    id              INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    organization_id INTEGER NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
    kind            VARCHAR(20) NOT NULL DEFAULT 'organization',
    name            VARCHAR(200) NOT NULL,
    legal_name      VARCHAR(300) NOT NULL DEFAULT '',
    address         VARCHAR(1000) NOT NULL DEFAULT '',
    email           VARCHAR(320) NOT NULL DEFAULT '',
    phone           VARCHAR(50) NOT NULL DEFAULT '',
    contact_person  VARCHAR(200) NOT NULL DEFAULT '',
    requisites      JSONB NOT NULL DEFAULT '[]'::jsonb,
    archived        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT counterparties_kind_check CHECK (kind IN ('organization', 'person'))
);

CREATE INDEX IF NOT EXISTS idx_billing_counterparties_org ON tv_billing.counterparties(organization_id, archived);
