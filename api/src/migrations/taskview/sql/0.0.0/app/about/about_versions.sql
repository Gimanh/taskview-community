create table about.versions
(
    id          serial unique,
    version     varchar unique,
    description varchar,
    date        timestamp default now()
);
