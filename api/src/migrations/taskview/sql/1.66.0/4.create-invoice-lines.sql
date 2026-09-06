CREATE TABLE IF NOT EXISTS tv_billing.invoice_lines (
    id          INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    invoice_id  INTEGER NOT NULL REFERENCES tv_billing.invoices(id) ON DELETE CASCADE,
    position    SMALLINT NOT NULL DEFAULT 0,
    task_id     INTEGER REFERENCES tasks.tasks(id) ON DELETE SET NULL,
    description VARCHAR(1000) NOT NULL,
    unit        VARCHAR(20) NOT NULL DEFAULT 'service',
    quantity    NUMERIC(12, 2) NOT NULL DEFAULT 1,
    unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    CONSTRAINT invoice_lines_unit_check CHECK (unit IN ('service', 'hours', 'pcs'))
);

CREATE INDEX IF NOT EXISTS idx_billing_invoice_lines_invoice ON tv_billing.invoice_lines(invoice_id, position);
