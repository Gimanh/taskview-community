create table about.version_description
(
    version_id     int not null
        constraint fr_version_id
            references about.versions (id)
            on delete cascade,
    description varchar unique
);
