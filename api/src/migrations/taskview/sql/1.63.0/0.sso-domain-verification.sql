ALTER TABLE tv_auth.sso_configs
  ADD COLUMN IF NOT EXISTS domain_verify_token VARCHAR,
  ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMP;
