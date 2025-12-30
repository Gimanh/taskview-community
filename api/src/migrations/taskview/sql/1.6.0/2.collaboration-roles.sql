create table if not exists collaboration.roles (
    id serial primary key,
    name varchar not null,
    goal_id int constraint fr_colab_roles references tasks.goals (id) on delete cascade,
    created timestamptz default (now() at time zone 'UTC'),
    unique (goal_id, name),
    check (name <> '')
);

create table collaboration.permissions_to_role (
    role_id int constraint fk_colab_perm_role_id references collaboration.roles (id) on delete cascade,
    permission_id int constraint fk_colab_perm_perm_id references tv_auth.permissions (id) on delete cascade,
    primary key (role_id, permission_id)
);