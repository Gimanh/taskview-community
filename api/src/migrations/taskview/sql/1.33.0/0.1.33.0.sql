CREATE TABLE IF NOT EXISTS tv_auth.sso_configs (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  organization_id INTEGER NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
  protocol VARCHAR NOT NULL,
  display_name VARCHAR NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,

  saml_entry_point VARCHAR,
  saml_issuer VARCHAR,
  saml_cert TEXT,
  saml_callback_url VARCHAR,

  oidc_issuer VARCHAR,
  oidc_client_id VARCHAR,
  oidc_client_secret VARCHAR,
  oidc_callback_url VARCHAR,
  oidc_scope VARCHAR,

  default_org_role VARCHAR NOT NULL DEFAULT 'member',
  email_domain_restriction VARCHAR NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(email_domain_restriction)
);

CREATE TABLE IF NOT EXISTS tv_auth.sso_identities (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
  sso_config_id INTEGER NOT NULL REFERENCES tv_auth.sso_configs(id) ON DELETE CASCADE,
  external_id VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sso_config_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_sso_identities_user_id ON tv_auth.sso_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_identities_email ON tv_auth.sso_identities(email);

CREATE TABLE IF NOT EXISTS tv_auth.saml_request_cache (
  key VARCHAR PRIMARY KEY,
  value VARCHAR NOT NULL,
  created_at BIGINT NOT NULL
);
