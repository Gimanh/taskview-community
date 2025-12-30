create table collaboration.users_to_roles (
    user_id int constraint fk_clb_user_id references collaboration.users (id) on delete cascade,
    role_id int constraint fk_clb_role_id references collaboration.roles (id) on delete cascade,
    primary key (user_id, role_id)
);