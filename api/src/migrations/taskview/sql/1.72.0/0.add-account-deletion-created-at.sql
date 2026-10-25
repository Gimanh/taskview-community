ALTER TABLE tv_auth.account_deletion ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT now();
