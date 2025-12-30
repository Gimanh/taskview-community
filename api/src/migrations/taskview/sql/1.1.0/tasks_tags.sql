create table if not exists tasks.tags
(
    id    serial unique,
    name  varchar,
    color varchar,
    owner int
        constraint fr_tag_owner
            references tv_auth.users (id)
            on delete cascade
);
