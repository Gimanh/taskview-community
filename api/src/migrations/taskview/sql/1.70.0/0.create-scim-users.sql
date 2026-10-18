CREATE TABLE IF NOT EXISTS tv_auth.scim_users (
    id                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sso_config_id        INTEGER NOT NULL REFERENCES tv_auth.sso_configs(id) ON DELETE CASCADE,
    scim_id              VARCHAR(255) NOT NULL,
    user_name            VARCHAR(255) NOT NULL,
    external_id          VARCHAR(255),
    email                VARCHAR(255) NOT NULL,
    member_email         VARCHAR(255) NOT NULL,
    display_name         VARCHAR(255),
    given_name           VARCHAR(255),
    family_name          VARCHAR(255),
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    suspended_membership JSONB,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS scim_users_config_scim_id_uidx ON tv_auth.scim_users (sso_config_id, scim_id);
CREATE UNIQUE INDEX IF NOT EXISTS scim_users_config_user_name_uidx ON tv_auth.scim_users (sso_config_id, lower(user_name));
CREATE UNIQUE INDEX IF NOT EXISTS scim_users_config_email_uidx ON tv_auth.scim_users (sso_config_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS scim_users_config_external_id_uidx ON tv_auth.scim_users (sso_config_id, external_id) WHERE external_id IS NOT NULL;
