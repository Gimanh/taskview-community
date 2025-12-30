CREATE SCHEMA IF NOT EXISTS tv_auth;
CREATE TABLE IF NOT EXISTS tv_auth.users
(
    id                   serial PRIMARY KEY,
    login                varchar(50),
    email                varchar(50),
    password             varchar(256),
    block                integer default 0,
    confirm_email_code   varchar(256),
    remind_password_code varchar(256),
    remind_password_time int,
    remember_token       varchar(256)
);
CREATE UNIQUE INDEX IF NOT EXISTS users_id ON tv_auth.users (id);
CREATE UNIQUE INDEX IF NOT EXISTS users_email ON tv_auth.users (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_login ON tv_auth.users (login);

CREATE TABLE IF NOT EXISTS tv_auth.user_tokens
(
    id            serial PRIMARY KEY,
    user_id       integer
        constraint fr_user_id_user_tokens
            references tv_auth.users (id)
            on delete cascade,
    access_token  varchar,
    refresh_token varchar,
    user_ip       varchar(50),
    time_creation timestamp default now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_tokens_id ON tv_auth.user_tokens (id);

CREATE TABLE IF NOT EXISTS tv_auth.sessions
(
    id            serial PRIMARY KEY,
    user_id       integer
        constraint fr_user_id_sessions
            references tv_auth.users (id)
            on delete cascade,
    session_id    varchar(32),
    session_data  varchar,
    user_ip       varchar(50),
    time_creation timestamp default now()
);
CREATE UNIQUE INDEX IF NOT EXISTS session_id ON tv_auth.sessions (id);
CREATE UNIQUE INDEX IF NOT EXISTS session_session_id ON tv_auth.sessions (session_id);

CREATE TABLE IF NOT EXISTS tv_auth.permissions
(
    id          serial PRIMARY KEY,
    name        varchar(50) UNIQUE,
    description varchar(100)
);
CREATE UNIQUE INDEX IF NOT EXISTS permissions_id ON tv_auth.permissions (id);

CREATE TABLE IF NOT EXISTS tv_auth.roles
(
    id          serial PRIMARY KEY,
    name        varchar(50),
    description varchar(100)
);
CREATE UNIQUE INDEX IF NOT EXISTS role_id ON tv_auth.roles (id);

CREATE TABLE IF NOT EXISTS tv_auth.groups
(
    id          serial PRIMARY KEY,
    name        varchar(50),
    description varchar(100)
);
CREATE UNIQUE INDEX IF NOT EXISTS group_id ON tv_auth.groups (id);

CREATE TABLE IF NOT EXISTS tv_auth.group_to_roles
(
    group_id int
        constraint fr_group_id_group_to_roles
            references tv_auth.groups (id)
            on delete cascade,
    role_id  int
        constraint fr_role_id_group_to_roles
            references tv_auth.roles (id)
            on delete cascade,
    PRIMARY KEY (group_id, role_id)
);

CREATE TABLE IF NOT EXISTS tv_auth.role_to_permissions
(
    role_id       int
        constraint fr_role_id_role_to_permissions
            references tv_auth.roles (id)
            on delete cascade,
    permission_id int
        constraint fr_permission_id_role_to_permissions
            references tv_auth.permissions (id)
            on delete cascade,
    PRIMARY KEY (permission_id, role_id)
);


CREATE TABLE IF NOT EXISTS tv_auth.user_to_groups
(
    user_id  int
        constraint fk_user_to_groups_users_id
            references tv_auth.users (id)
            on delete cascade,
    group_id int
        constraint user_to_groups_groups_id_fk
            references tv_auth.groups (id)
            on delete cascade,
    PRIMARY KEY (user_id, group_id)
);
