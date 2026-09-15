CREATE TABLE IF NOT EXISTS tv_billing.invoices (
    id                    INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    organization_id       INTEGER NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
    goal_id               INTEGER REFERENCES tasks.goals(id) ON DELETE SET NULL,
    goal_name             VARCHAR(500) NOT NULL DEFAULT '',
    seller_id             INTEGER NOT NULL REFERENCES tv_billing.sellers(id) ON DELETE RESTRICT,
    counterparty_id       INTEGER NOT NULL REFERENCES tv_billing.counterparties(id) ON DELETE RESTRICT,
    number                VARCHAR(50) NOT NULL,
    status                VARCHAR(10) NOT NULL DEFAULT 'draft',
    reference             VARCHAR(200) NOT NULL DEFAULT '',
    currency_code         CHAR(3) NOT NULL REFERENCES tv_billing.currencies(code),
    issue_date            DATE NOT NULL,
    payment_terms         VARCHAR(20) NOT NULL DEFAULT 'net14',
    due_date              DATE,
    period_from           DATE,
    period_to             DATE,
    discount_type         VARCHAR(10) NOT NULL DEFAULT 'percent',
    discount_value        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate              NUMERIC(5, 2) NOT NULL DEFAULT 0,
    tax_exempt            BOOLEAN NOT NULL DEFAULT FALSE,
    tax_note              VARCHAR(500) NOT NULL DEFAULT '',
    notes                 VARCHAR(2000) NOT NULL DEFAULT '',
    terms                 VARCHAR(2000) NOT NULL DEFAULT '',
    seller_snapshot       JSONB NOT NULL,
    counterparty_snapshot JSONB NOT NULL,
    created_by            INTEGER REFERENCES tv_auth.users(id) ON DELETE SET NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'issued', 'paid', 'void')),
    CONSTRAINT invoices_discount_type_check CHECK (discount_type IN ('percent', 'amount')),
    CONSTRAINT invoices_payment_terms_check CHECK (payment_terms IN ('on_receipt', 'net7', 'net14', 'net30', 'custom')),
    CONSTRAINT invoices_number_per_org UNIQUE (organization_id, number)
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_org_issue ON tv_billing.invoices(organization_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_counterparty ON tv_billing.invoices(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_seller ON tv_billing.invoices(seller_id);
