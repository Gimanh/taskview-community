CREATE TABLE IF NOT EXISTS tv_auth.scim_groups (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sso_config_id INTEGER NOT NULL REFERENCES tv_auth.sso_configs(id) ON DELETE CASCADE,
    scim_id       VARCHAR(255) NOT NULL,
    display_name  VARCHAR(255) NOT NULL,
    external_id   VARCHAR(255),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS scim_groups_config_scim_id_uidx ON tv_auth.scim_groups (sso_config_id, scim_id);
-- displayName is not unique (RFC 7643, Pocket ID repeats friendly names); the index serves the displayName filter
CREATE INDEX IF NOT EXISTS scim_groups_config_display_name_idx ON tv_auth.scim_groups (sso_config_id, lower(display_name));
CREATE UNIQUE INDEX IF NOT EXISTS scim_groups_config_external_id_uidx ON tv_auth.scim_groups (sso_config_id, external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS tv_auth.scim_group_members (
    group_id     INTEGER NOT NULL REFERENCES tv_auth.scim_groups(id) ON DELETE CASCADE,
    scim_user_id INTEGER NOT NULL REFERENCES tv_auth.scim_users(id) ON DELETE CASCADE,
    -- When the person joined: a reactivated person gets the projects of groups joined while deactivated
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, scim_user_id)
);

CREATE INDEX IF NOT EXISTS scim_group_members_scim_user_id_idx ON tv_auth.scim_group_members (scim_user_id);
