create table tv_auth.account_deletion(
    id serial,
    code varchar,
    user_id int constraint fr_user_id_deletion references tv_auth.users (id) on delete cascade
);