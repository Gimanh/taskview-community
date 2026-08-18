ALTER TABLE tv_auth.sso_configs
  DROP CONSTRAINT IF EXISTS sso_configs_email_domain_restriction_key;

CREATE UNIQUE INDEX IF NOT EXISTS sso_configs_verified_domain_uniq
  ON tv_auth.sso_configs (email_domain_restriction)
  WHERE domain_verified_at IS NOT NULL;
