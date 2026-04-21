ALTER TABLE tv_auth.sso_configs ADD COLUMN IF NOT EXISTS saml_signing_key TEXT;
ALTER TABLE tv_auth.sso_configs ADD COLUMN IF NOT EXISTS saml_signing_cert TEXT;
