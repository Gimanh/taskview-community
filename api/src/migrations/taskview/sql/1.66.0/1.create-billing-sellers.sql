CREATE TABLE IF NOT EXISTS tv_billing.sellers (
    id              INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    organization_id INTEGER NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    legal_name      VARCHAR(300) NOT NULL DEFAULT '',
    address         VARCHAR(1000) NOT NULL DEFAULT '',
    email           VARCHAR(320) NOT NULL DEFAULT '',
    phone           VARCHAR(50) NOT NULL DEFAULT '',
    logo_url        VARCHAR(1000) NOT NULL DEFAULT '',
    currency_code   CHAR(3) NOT NULL DEFAULT 'USD' REFERENCES tv_billing.currencies(code),
    bank            JSONB NOT NULL DEFAULT '{}'::jsonb,
    requisites      JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_terms   VARCHAR(2000) NOT NULL DEFAULT '',
    tax_note        VARCHAR(500) NOT NULL DEFAULT '',
    archived        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_sellers_org ON tv_billing.sellers(organization_id, archived);
