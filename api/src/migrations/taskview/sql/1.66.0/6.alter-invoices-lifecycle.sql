ALTER TABLE tv_billing.invoices ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP;
ALTER TABLE tv_billing.invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE tv_billing.invoices ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP;
ALTER TABLE tv_billing.invoices ADD COLUMN IF NOT EXISTS replaces_invoice_id INTEGER REFERENCES tv_billing.invoices(id) ON DELETE SET NULL;
ALTER TABLE tv_billing.invoices ADD COLUMN IF NOT EXISTS template_version SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE tv_billing.invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);
ALTER TABLE tv_billing.invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2);
ALTER TABLE tv_billing.invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2);
ALTER TABLE tv_billing.invoices ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_replaces ON tv_billing.invoices(replaces_invoice_id);
